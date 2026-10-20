type RateFee = {
  formula: string;
  components: Array<{ name: string; value: number | string }>;
};

export type TopUpQuote = {
  totalFee: number;
  netAmount: number;
};

type Token =
  | { type: 'number'; value: string }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '(' | ')' };

type Rational = { numerator: bigint; denominator: bigint };

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
}

function rational(numerator: bigint, denominator = 1n): Rational {
  if (denominator === 0n) throw new Error('Division by zero');
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator < 0n ? -denominator : denominator) / divisor,
  };
}

function parseRational(value: number | string): Rational {
  const text = String(value)
    .trim()
    .replace(/^([+-]?)\./, '$10.');
  const fraction = /^([+-]?\d+)\/([+-]?\d+)$/.exec(text);
  if (fraction) return rational(BigInt(fraction[1]), BigInt(fraction[2]));

  const decimal = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!decimal) throw new Error('Invalid rational value');
  const fractionDigits = decimal[3] ?? '';
  const exponent = Number(decimal[4] ?? '0') - fractionDigits.length;
  if (!Number.isSafeInteger(exponent)) throw new Error('Invalid exponent');
  const sign = decimal[1] === '-' ? -1n : 1n;
  const digits = BigInt(`${decimal[2]}${fractionDigits}`) * sign;
  return exponent >= 0
    ? rational(digits * 10n ** BigInt(exponent))
    : rational(digits, 10n ** BigInt(-exponent));
}

function add(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtract(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function multiply(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divide(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const remaining = formula.slice(index);
    const whitespace = /^\s+/.exec(remaining)?.[0];
    if (whitespace) {
      index += whitespace.length;
      continue;
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(
      remaining,
    )?.[0];
    if (number) {
      tokens.push({ type: 'number', value: number });
      index += number.length;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(remaining)?.[0];
    if (identifier) {
      tokens.push({ type: 'identifier', value: identifier });
      index += identifier.length;
      continue;
    }
    const operator = remaining[0];
    if (operator && '+-*/()'.includes(operator)) {
      tokens.push({
        type: 'operator',
        value: operator as '+' | '-' | '*' | '/' | '(' | ')',
      });
      index += 1;
      continue;
    }
    throw new Error(`Unsupported rate formula token at ${index}`);
  }
  return tokens;
}

function evaluateRateFormulaToAtoms(
  fee: RateFee,
  sourceAtoms: bigint,
): bigint | null {
  if (!fee.formula.trim()) return null;

  try {
    const variables = new Map<string, Rational>([
      ['amount_src', rational(sourceAtoms, 100n)],
    ]);
    for (const component of fee.components) {
      variables.set(component.name, parseRational(component.value));
    }
    const tokens = tokenize(fee.formula);
    let index = 0;
    const parsePrimary = (): Rational => {
      const token = tokens[index];
      if (!token) throw new Error('Unexpected end of rate formula');
      if (token.type === 'number') {
        index += 1;
        return parseRational(token.value);
      }
      if (token.type === 'identifier') {
        index += 1;
        const value = variables.get(token.value);
        if (value === undefined) throw new Error('Unknown rate variable');
        return value;
      }
      if (token.value === '(') {
        index += 1;
        const value = parseAdditive();
        if (
          tokens[index]?.type !== 'operator' ||
          tokens[index]?.value !== ')'
        ) {
          throw new Error('Missing closing parenthesis');
        }
        index += 1;
        return value;
      }
      if (token.value === '+' || token.value === '-') {
        index += 1;
        const value = parsePrimary();
        return token.value === '-'
          ? rational(-value.numerator, value.denominator)
          : value;
      }
      throw new Error('Invalid rate formula');
    };
    const parseMultiplicative = (): Rational => {
      let value = parsePrimary();
      while (
        tokens[index]?.type === 'operator' &&
        (tokens[index]?.value === '*' || tokens[index]?.value === '/')
      ) {
        const operator = tokens[index]?.value;
        index += 1;
        const operand = parsePrimary();
        value =
          operator === '*' ? multiply(value, operand) : divide(value, operand);
      }
      return value;
    };
    const parseAdditive = (): Rational => {
      let value = parseMultiplicative();
      while (
        tokens[index]?.type === 'operator' &&
        (tokens[index]?.value === '+' || tokens[index]?.value === '-')
      ) {
        const operator = tokens[index]?.value;
        index += 1;
        const operand = parseMultiplicative();
        value =
          operator === '+' ? add(value, operand) : subtract(value, operand);
      }
      return value;
    };
    const result = parseAdditive();
    if (index !== tokens.length || result.numerator < 0n) return null;
    return (result.numerator * 100n) / result.denominator;
  } catch {
    return null;
  }
}

function calculateLegacyPseNetAtoms(grossAtoms: bigint): bigint {
  const grossAmount = Number(grossAtoms) / 100;
  const amountAfterProvider = Math.max(0, grossAmount - 2_500);
  const remainingAmount = amountAfterProvider - amountAfterProvider * 0.01;
  return BigInt(Math.floor(remainingAmount * 100));
}

export function calculatePseTopUpQuote(
  grossAmount: number,
  rateFee?: RateFee,
): TopUpQuote {
  const grossAtoms = BigInt(Math.round(grossAmount * 100));
  const quotedNetAtoms = rateFee
    ? evaluateRateFormulaToAtoms(rateFee, grossAtoms)
    : null;
  const netAtoms =
    quotedNetAtoms !== null && quotedNetAtoms < grossAtoms
      ? quotedNetAtoms
      : calculateLegacyPseNetAtoms(grossAtoms);

  return {
    totalFee: Number(grossAtoms - netAtoms) / 100,
    netAmount: Number(netAtoms) / 100,
  };
}
