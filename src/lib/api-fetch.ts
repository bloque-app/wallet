import { PUBLIC_APP_ENV } from '../config/env';

/**
 * Mirrors the SDK's own `API_BASE_URLS` (`@bloque/core`'s constants), keyed off
 * the same env var that picks the SDK's mode. Previously this was hardcoded to
 * production, which meant every `apiFetch` call went to prod even when the rest
 * of the app was pointed at sandbox — logout, in particular, was ending the
 * wrong environment's session.
 */
const API_URL =
  PUBLIC_APP_ENV === 'dev'
    ? 'https://api.dev-bloque.app'
    : 'https://api.bloque.app';

export const apiFetch = async (
  path: `/${string}`,
  init?: RequestInit,
): Promise<Response> => {
  const url = `${API_URL}${path}`;
  return await fetch(url, {
    credentials: 'include',
    ...init,
  });
};
