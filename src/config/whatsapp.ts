import { PUBLIC_APP_ENV } from './env';

/**
 * Official Console WhatsApp number per environment, in international format
 * without `+` (as `wa.me` expects). `null` keeps the CTA disabled until the
 * number is assigned.
 */
const WHATSAPP_NUMBERS: Record<'dev' | 'prod', string | null> = {
  dev: null,
  prod: null,
};

export const WHATSAPP_NUMBER = WHATSAPP_NUMBERS[PUBLIC_APP_ENV];
