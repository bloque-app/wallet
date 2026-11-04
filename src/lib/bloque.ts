import { SDK } from '@bloque/sdk';
import { PUBLIC_BLOQUE_MODE } from '../config/env';

export const createBloqueSdk = (origin?: string) => {
  return new SDK({
    origin,
    auth: { type: 'jwt' },
    mode: PUBLIC_BLOQUE_MODE,
    platform: 'browser',
  });
};

export type AuthenticatedBloque = Awaited<ReturnType<SDK['authenticate']>>;

const createBloque = async (): Promise<AuthenticatedBloque> => {
  const sdk = createBloqueSdk();
  return await sdk.authenticate();
};

const globalForBloque = globalThis as typeof globalThis & {
  bloqueSdk?: AuthenticatedBloque;
  bloqueSdkPromise?: Promise<AuthenticatedBloque>;
};

export const initBloque = async (): Promise<AuthenticatedBloque> => {
  if (globalForBloque.bloqueSdk) {
    return globalForBloque.bloqueSdk;
  }

  if (!globalForBloque.bloqueSdkPromise) {
    globalForBloque.bloqueSdkPromise = createBloque()
      .then((client) => {
        globalForBloque.bloqueSdk = client;
        return client;
      })
      .catch((error) => {
        globalForBloque.bloqueSdkPromise = undefined;
        throw error;
      });
  }

  return await globalForBloque.bloqueSdkPromise;
};

/**
 * Drops the cached authenticated client.
 *
 * The client is memoized on `globalThis` for the page's lifetime, and it holds
 * a session. So it must be discarded whenever the identity behind that session
 * changes — signing out, or registering a different account in the same tab.
 * Otherwise the next identity keeps making calls authenticated as the previous
 * one, which is both wrong and, on a shared device, a leak.
 */
export const resetBloque = (): void => {
  globalForBloque.bloqueSdk = undefined;
  globalForBloque.bloqueSdkPromise = undefined;
};

export const getBloque = (): AuthenticatedBloque => {
  if (!globalForBloque.bloqueSdk) {
    throw new Error(
      'Bloque SDK is not initialized. Call `await initBloque()` first.',
    );
  }

  return globalForBloque.bloqueSdk;
};

export const bloque = new Proxy({} as AuthenticatedBloque, {
  get(_target, prop, receiver) {
    const instance = getBloque();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(getBloque() as object, prop, value, receiver);
  },
}) as AuthenticatedBloque;
