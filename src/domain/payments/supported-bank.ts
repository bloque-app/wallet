import type { SupportedBank } from '@bloque/sdk-swap';

/**
 * Runtime mirror of the SDK's `SupportedBank` literal union. The SDK only
 * exposes `SupportedBank` as a compile-time type — validating an arbitrary
 * UI string (e.g. free-text/select bank state) against it needs a
 * hand-kept runtime list. `_AssertNoMissingBanks` below fails to compile
 * if this list and the SDK's union type ever drift apart, so it can't
 * silently go stale.
 */
export const SUPPORTED_BANKS = [
  'banco_agrario_de_colombia',
  'banco_av_villas',
  'banco_bancamia',
  'banco_bbva_colombia',
  'banco_btg_pactual_colombia',
  'citibank_colombia',
  'banco_caja_social_bcsc',
  'davibank',
  'banco_cooperativo_coopcentral',
  'ban100',
  'banco_davivienda',
  'banco_de_bogota',
  'banco_de_occidente',
  'banco_gnb_sudameris',
  'banco_jp_morgan_colombia',
  'banco_popular',
  'banco_itau',
  'bancolombia',
  'banco_w',
  'banco_coomeva',
  'banco_finandina_bic',
  'banco_falabella',
  'banco_pichincha',
  'banco_santander_de_negocios_colombia',
  'banco_mundo_mujer',
  'banco_serfinanza',
  'mibanco',
  'lulo_bank',
  'banco_union',
  'daviplata',
  'nubank',
  'rappipay',
  'nequi',
  'bancoldex',
  'dale',
  'financiera_juriscoop',
  'cooperativa_financiera_de_antioquia',
  'jfk_cooperativa_financiera',
  'cootrafa',
  'confiar',
  'coltefinanciera',
  'pibank',
  'iris',
  'movii',
  'ding_tecnipagos',
  'powwi',
  'uala',
  'bold_cf',
  'coink',
  'global66',
  'alianza_fiduciaria',
  'crezcamos',
] as const satisfies readonly SupportedBank[];

type _AssertNoMissingBanks =
  SupportedBank extends (typeof SUPPORTED_BANKS)[number]
    ? true
    : 'SUPPORTED_BANKS is missing a member of SupportedBank — update the list above';
const _exhaustivenessCheck: _AssertNoMissingBanks = true;
void _exhaustivenessCheck;

const SUPPORTED_BANK_SET = new Set<string>(SUPPORTED_BANKS);

/** Validates a free-text/select bank code before casting it to `SupportedBank`. */
export function isSupportedBank(value: string): value is SupportedBank {
  return SUPPORTED_BANK_SET.has(value);
}

/**
 * Display names for `SUPPORTED_BANKS`. Typed as `Record<SupportedBank, string>`
 * so the compiler itself rejects a missing or stale entry — any UI that lists
 * bank options should build its list from here (or from `SUPPORTED_BANKS`
 * directly) rather than keeping a separate hardcoded array that can drift
 * out of sync with what `isSupportedBank` actually accepts.
 */
export const SUPPORTED_BANK_LABELS: Record<SupportedBank, string> = {
  banco_agrario_de_colombia: 'Banco Agrario de Colombia',
  banco_av_villas: 'Banco AV Villas',
  banco_bancamia: 'Banco Bancamia',
  banco_bbva_colombia: 'BBVA Colombia',
  banco_btg_pactual_colombia: 'Banco BTG Pactual Colombia',
  citibank_colombia: 'Citibank Colombia',
  banco_caja_social_bcsc: 'Banco Caja Social BCSC',
  davibank: 'Davibank',
  banco_cooperativo_coopcentral: 'Banco Cooperativo Coopcentral',
  ban100: 'Ban100',
  banco_davivienda: 'Banco Davivienda',
  banco_de_bogota: 'Banco de Bogotá',
  banco_de_occidente: 'Banco de Occidente',
  banco_gnb_sudameris: 'Banco GNB Sudameris',
  banco_jp_morgan_colombia: 'Banco JP Morgan Colombia',
  banco_popular: 'Banco Popular',
  banco_itau: 'Banco Itaú',
  bancolombia: 'Bancolombia',
  banco_w: 'Banco W',
  banco_coomeva: 'Banco Coomeva',
  banco_finandina_bic: 'Banco Finandina BIC',
  banco_falabella: 'Banco Falabella',
  banco_pichincha: 'Banco Pichincha',
  banco_santander_de_negocios_colombia: 'Banco Santander de Negocios Colombia',
  banco_mundo_mujer: 'Banco Mundo Mujer',
  banco_serfinanza: 'Banco Serfinanza',
  mibanco: 'Mibanco',
  lulo_bank: 'Lulo Bank',
  banco_union: 'Banco Unión',
  daviplata: 'Daviplata',
  nubank: 'Nubank',
  rappipay: 'RappiPay',
  nequi: 'Nequi',
  bancoldex: 'Bancoldex',
  dale: 'Dale',
  financiera_juriscoop: 'Financiera Juriscoop',
  cooperativa_financiera_de_antioquia: 'Cooperativa Financiera de Antioquia',
  jfk_cooperativa_financiera: 'JFK Cooperativa Financiera',
  cootrafa: 'Cootrafa',
  confiar: 'Confiar',
  coltefinanciera: 'Coltefinanciera',
  pibank: 'Pibank',
  iris: 'Iris',
  movii: 'Movii',
  ding_tecnipagos: 'Ding Tecnipagos',
  powwi: 'Powwi',
  uala: 'Ualá',
  bold_cf: 'Bold CF',
  coink: 'Coink',
  global66: 'Global66',
  alianza_fiduciaria: 'Alianza Fiduciaria',
  crezcamos: 'Crezcamos',
};
