export const PUBLIC_APP_ENV =
  (import.meta.env.PUBLIC_APP_ENV as 'dev' | 'prod') || 'prod';
export const PUBLIC_BLOQUE_MODE =
  PUBLIC_APP_ENV === 'dev' ? 'sandbox' : 'production';
