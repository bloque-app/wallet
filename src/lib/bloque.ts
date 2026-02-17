import { SDK } from '@bloque/sdk';

export const createBloqueSdk = (origin?: string) => {
  return new SDK({
    origin,
    auth: { type: 'jwt' },
    mode: 'production',
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
