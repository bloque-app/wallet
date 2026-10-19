type RateFee = {
  formula: string;
  components: Array<{ name: string; value: number | string }>;
};

export type TopUpQuote = {
  totalFee: number;
  netAmount: number;
};

type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '(' | ')' };

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
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(remaining)?.[0];
    if (number) {
      tokens.push({ type: 'number', value: Number(number) });
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

function evaluateRateFormula(fee: RateFee, amountSrc: number): number | null {
  if (!fee.formula.trim()) return null;
  const variables = new Map<string, number>([['amount_src', amountSrc]]);
  for (const component of fee.components) {
    const value = Number(component.value);
    if (!Number.isFinite(value)) return null;
    variables.set(component.name, value);
  }

  try {
    const tokens = tokenize(fee.formula);
    let index = 0;
    const parsePrimary = (): number => {
      const token = tokens[index];
      if (!token) throw new Error('Unexpected end of rate formula');
      if (token.type === 'number') {
        index += 1;
        return token.value;
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
        return token.value === '-' ? -value : value;
      }
      throw new Error('Invalid rate formula');
    };
    const parseMultiplicative = (): number => {
      let value = parsePrimary();
      while (
        tokens[index]?.type === 'operator' &&
        (tokens[index]?.value === '*' || tokens[index]?.value === '/')
      ) {
        const operator = tokens[index]?.value;
        index += 1;
        const operand = parsePrimary();
        value = operator === '*' ? value * operand : value / operand;
      }
      return value;
    };
    const parseAdditive = (): number => {
      let value = parseMultiplicative();
      while (
        tokens[index]?.type === 'operator' &&
        (tokens[index]?.value === '+' || tokens[index]?.value === '-')
      ) {
        const operator = tokens[index]?.value;
        index += 1;
        const operand = parseMultiplicative();
        value = operator === '+' ? value + operand : value - operand;
      }
      return value;
    };
    const result = parseAdditive();
    return index === tokens.length && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function calculateLegacyPseNet(grossAmount: number): number {
  const amountAfterProvider = Math.max(0, grossAmount - 2_500);
  return amountAfterProvider - Math.floor(amountAfterProvider * 0.01);
}

export function calculatePseTopUpQuote(
  grossAmount: number,
  rateFee?: RateFee,
): TopUpQuote {
  const quotedNet = rateFee ? evaluateRateFormula(rateFee, grossAmount) : null;
  const netAmount = Math.max(
    0,
    Math.min(
      grossAmount,
      quotedNet !== null && quotedNet < grossAmount
        ? Math.floor(quotedNet * 100) / 100
        : calculateLegacyPseNet(grossAmount),
    ),
  );

  return {
    totalFee: grossAmount - netAmount,
    netAmount,
  };
}
