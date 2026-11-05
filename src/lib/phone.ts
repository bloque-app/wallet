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
  { code: 'US', dialCode: '1', flag: '🇺🇸', name: 'Estados Unidos' },
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
  { code: 'DO', dialCode: '1', flag: '🇩🇴', name: 'República Dominicana' },
  { code: 'CA', dialCode: '1', flag: '🇨🇦', name: 'Canadá' },
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
