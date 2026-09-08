/** ISO 3166-1 alpha-3 codes, the format `country_of_birth_code` /
 * `country_of_residence_code` require (see payment-rails
 * `update-identity.command.ts`'s `COUNTRY_CODE_REGEX`). Curated to the
 * countries Bloque's user base is realistically drawn from rather than
 * the full ISO list — extend as new markets open. */
export interface Country {
  code: string;
  nameEs: string;
  nameEn: string;
}

export const COUNTRIES: Country[] = [
  { code: 'COL', nameEs: 'Colombia', nameEn: 'Colombia' },
  { code: 'USA', nameEs: 'Estados Unidos', nameEn: 'United States' },
  { code: 'MEX', nameEs: 'México', nameEn: 'Mexico' },
  { code: 'ARG', nameEs: 'Argentina', nameEn: 'Argentina' },
  { code: 'BRA', nameEs: 'Brasil', nameEn: 'Brazil' },
  { code: 'CHL', nameEs: 'Chile', nameEn: 'Chile' },
  { code: 'PER', nameEs: 'Perú', nameEn: 'Peru' },
  { code: 'ECU', nameEs: 'Ecuador', nameEn: 'Ecuador' },
  { code: 'VEN', nameEs: 'Venezuela', nameEn: 'Venezuela' },
  { code: 'BOL', nameEs: 'Bolivia', nameEn: 'Bolivia' },
  { code: 'PRY', nameEs: 'Paraguay', nameEn: 'Paraguay' },
  { code: 'URY', nameEs: 'Uruguay', nameEn: 'Uruguay' },
  { code: 'PAN', nameEs: 'Panamá', nameEn: 'Panama' },
  { code: 'CRI', nameEs: 'Costa Rica', nameEn: 'Costa Rica' },
  { code: 'GTM', nameEs: 'Guatemala', nameEn: 'Guatemala' },
  { code: 'HND', nameEs: 'Honduras', nameEn: 'Honduras' },
  { code: 'SLV', nameEs: 'El Salvador', nameEn: 'El Salvador' },
  { code: 'NIC', nameEs: 'Nicaragua', nameEn: 'Nicaragua' },
  { code: 'DOM', nameEs: 'República Dominicana', nameEn: 'Dominican Republic' },
  { code: 'CUB', nameEs: 'Cuba', nameEn: 'Cuba' },
  { code: 'CAN', nameEs: 'Canadá', nameEn: 'Canada' },
  { code: 'ESP', nameEs: 'España', nameEn: 'Spain' },
  { code: 'PRT', nameEs: 'Portugal', nameEn: 'Portugal' },
  { code: 'FRA', nameEs: 'Francia', nameEn: 'France' },
  { code: 'DEU', nameEs: 'Alemania', nameEn: 'Germany' },
  { code: 'ITA', nameEs: 'Italia', nameEn: 'Italy' },
  { code: 'GBR', nameEs: 'Reino Unido', nameEn: 'United Kingdom' },
  { code: 'NLD', nameEs: 'Países Bajos', nameEn: 'Netherlands' },
  { code: 'CHE', nameEs: 'Suiza', nameEn: 'Switzerland' },
  { code: 'IRL', nameEs: 'Irlanda', nameEn: 'Ireland' },
  { code: 'AUS', nameEs: 'Australia', nameEn: 'Australia' },
  { code: 'NZL', nameEs: 'Nueva Zelanda', nameEn: 'New Zealand' },
  { code: 'CHN', nameEs: 'China', nameEn: 'China' },
  { code: 'JPN', nameEs: 'Japón', nameEn: 'Japan' },
  { code: 'KOR', nameEs: 'Corea del Sur', nameEn: 'South Korea' },
  { code: 'IND', nameEs: 'India', nameEn: 'India' },
  {
    code: 'ARE',
    nameEs: 'Emiratos Árabes Unidos',
    nameEn: 'United Arab Emirates',
  },
  { code: 'ZAF', nameEs: 'Sudáfrica', nameEn: 'South Africa' },
];

export function countryName(code: string, language: string): string {
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) return code;
  return language === 'en' ? country.nameEn : country.nameEs;
}
