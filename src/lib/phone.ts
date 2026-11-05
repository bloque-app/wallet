export interface PhoneCountry {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  nationalLength?: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    code: 'CO',
    dialCode: '57',
    flag: '🇨🇴',
    name: 'Colombia',
    nationalLength: 10,
  },
  {
    code: 'US',
    dialCode: '1',
    flag: '🇺🇸',
    name: 'Estados Unidos',
    nationalLength: 10,
  },
  { code: 'MX', dialCode: '52', flag: '🇲🇽', name: 'México' },
  { code: 'AR', dialCode: '54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'BR', dialCode: '55', flag: '🇧🇷', name: 'Brasil' },
  { code: 'CL', dialCode: '56', flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dialCode: '51', flag: '🇵🇪', name: 'Perú' },
  { code: 'EC', dialCode: '593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'VE', dialCode: '58', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'BO', dialCode: '591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'PY', dialCode: '595', flag: '🇵🇾', name: 'Paraguay' },
  { code: 'UY', dialCode: '598', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'PA', dialCode: '507', flag: '🇵🇦', name: 'Panamá' },
  { code: 'CR', dialCode: '506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'GT', dialCode: '502', flag: '🇬🇹', name: 'Guatemala' },
  { code: 'HN', dialCode: '504', flag: '🇭🇳', name: 'Honduras' },
  { code: 'SV', dialCode: '503', flag: '🇸🇻', name: 'El Salvador' },
  { code: 'NI', dialCode: '505', flag: '🇳🇮', name: 'Nicaragua' },
  {
    code: 'DO',
    dialCode: '1',
    flag: '🇩🇴',
    name: 'República Dominicana',
    nationalLength: 10,
  },
  {
    code: 'CA',
    dialCode: '1',
    flag: '🇨🇦',
    name: 'Canadá',
    nationalLength: 10,
  },
  { code: 'ES', dialCode: '34', flag: '🇪🇸', name: 'España' },
  { code: 'PT', dialCode: '351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'GB', dialCode: '44', flag: '🇬🇧', name: 'Reino Unido' },
];

export function normalizeInternationalPhone(
  dialCode: string,
  value: string,
): string {
  const countryDigits = dialCode.replace(/\D/g, '');
  const phoneDigits = value.replace(/\D/g, '');

  if (phoneDigits.length > 10 && phoneDigits.startsWith(countryDigits)) {
    return phoneDigits;
  }

  return `${countryDigits}${phoneDigits}`;
}

export function isValidInternationalPhone(
  value: string,
  country?: PhoneCountry,
): boolean {
  if (!/^\d{8,15}$/.test(value)) return false;
  if (!country?.nationalLength) return true;

  return (
    value.startsWith(country.dialCode) &&
    value.length - country.dialCode.length === country.nationalLength
  );
}

export function findPhoneCountry(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((country) => country.code === code);
}

/**
 * Joins a country's dial code with the national number typed for it. The
 * dial code is only taken as already typed when the country has a fixed
 * length and the digits are exactly dial code + national number.
 */
export function joinInternationalPhone(
  country: PhoneCountry,
  nationalNumber: string,
): string {
  const digits = nationalNumber.replace(/\D/g, '');
  if (
    country.nationalLength &&
    digits.length === country.dialCode.length + country.nationalLength &&
    digits.startsWith(country.dialCode)
  ) {
    return digits;
  }
  return `${country.dialCode}${digits}`;
}

/**
 * Splits a stored phone into the country it belongs to and its national
 * digits. `countryCode` is empty when the country can't be told apart:
 * a code not in the list, or 10 digits without `+` that don't look like a
 * Colombian mobile (they may be a US number saved without its code).
 */
export function splitInternationalPhone(
  value: string,
  defaultCountry = 'CO',
): { countryCode: string; nationalNumber: string } {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { countryCode: defaultCountry, nationalNumber: '' };
  const hasCountryCode = value.trim().startsWith('+') || digits.length > 10;

  if (hasCountryCode) {
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => digits.startsWith(country.dialCode));
    if (!match) return { countryCode: '', nationalNumber: digits };
    const preferred =
      PHONE_COUNTRIES.find(
        (country) =>
          country.dialCode === match.dialCode &&
          country.code === defaultCountry,
      ) ?? match;
    return {
      countryCode: preferred.code,
      nationalNumber: digits.slice(match.dialCode.length),
    };
  }

  if (defaultCountry === 'CO' && !/^3\d{9}$/.test(digits)) {
    return { countryCode: '', nationalNumber: digits };
  }
  return { countryCode: defaultCountry, nationalNumber: digits };
}

export const BRAZIL_DIAL_CODE = '55';

/**
 * Digits of a Brazilian phone typed without its country code (area code +
 * number). A pasted `+55…` keeps only the national part.
 */
export function normalizeBrazilPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') || digits.length > 11) {
    if (digits.startsWith(BRAZIL_DIAL_CODE)) {
      digits = digits.slice(BRAZIL_DIAL_CODE.length);
    }
  }
  return digits.slice(0, 11);
}

/** Area code (11–99) + 8 or 9 digits. */
export function isValidBrazilPhone(nationalNumber: string): boolean {
  return /^[1-9][1-9]\d{8,9}$/.test(nationalNumber);
}
