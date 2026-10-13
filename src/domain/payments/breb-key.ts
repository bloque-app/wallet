import type { BrebKeyType } from '@bloque/sdk-accounts';

const COLOMBIA_DIAL_CODE = '57';
const PHONE_LENGTH = 10;

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

/** Best guess of a recipient key's type from what the user typed. */
export function inferBrebKeyType(value: string): BrebKeyType | null {
  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.startsWith('@')) return 'ALPHA';
  if (trimmed.includes('@')) return 'EMAIL';

  if (/^[\d\s().+-]+$/.test(trimmed)) {
    const phone = normalizeBrebKeyValue('PHONE', trimmed);
    return isValidBrebKeyValue('PHONE', phone) ? 'PHONE' : 'ID';
  }

  return 'ALPHA';
}

/** Canonical key value sent to BRE-B for the given key type. */
export function normalizeBrebKeyValue(
  keyType: BrebKeyType,
  value: string,
): string {
  const trimmed = value.trim();

  switch (keyType) {
    case 'PHONE': {
      const digits = digitsOnly(trimmed);
      return digits.length === PHONE_LENGTH + COLOMBIA_DIAL_CODE.length &&
        digits.startsWith(COLOMBIA_DIAL_CODE)
        ? digits.slice(COLOMBIA_DIAL_CODE.length)
        : digits;
    }
    case 'ID':
      return digitsOnly(trimmed);
    case 'EMAIL':
      return trimmed.toLowerCase();
    case 'BCODE':
      return trimmed.replace(/\s/g, '');
    default:
      return trimmed;
  }
}

/** Whether an already-normalized key value is well formed for its type. */
export function isValidBrebKeyValue(
  keyType: BrebKeyType,
  normalizedValue: string,
): boolean {
  switch (keyType) {
    case 'PHONE':
      return /^3\d{9}$/.test(normalizedValue);
    case 'ID':
      return /^\d{5,15}$/.test(normalizedValue);
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
    case 'ALPHA':
      return /^@\S+$/.test(normalizedValue);
    case 'BCODE':
      return /^[A-Za-z0-9]+$/.test(normalizedValue);
    default:
      return false;
  }
}
