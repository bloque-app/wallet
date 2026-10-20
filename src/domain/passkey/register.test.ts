import { describe, expect, mock, test } from 'bun:test';
import type { PasskeyRepository } from './ports';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  type CreateCredential,
  createPasskeyRegistrar,
  fromCreateError,
  toPublicKeyCreationOptions,
} from './register';
import { type PasskeyCreationOptions, PasskeyRegistrationError } from './types';

const OPTIONS: PasskeyCreationOptions = {
  challenge: 'AQID-_8',
  expiresAt: 10_000,
  rpId: 'dev-bloque.app',
  user: {
    id: 'dXNlci0x',
    name: 'did:bloque:bloque-id:user-1',
    displayName: 'did:bloque:bloque-id:user-1',
  },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'required',
  },
  timeout: 120_000,
  attestation: 'none',
};

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

const credential = {
  response: {
    clientDataJSON: bytes(1, 2, 3),
    attestationObject: bytes(251, 255),
  },
} as unknown as Credential;

function repository(register: PasskeyRepository['register'] = async () => {}) {
  return {
    challenge: mock(async () => OPTIONS),
    register: mock(register),
  };
}

/** A registration error the way the adapter builds it. */
const failure = (
  reason: PasskeyRegistrationError['reason'],
  code: string,
  retryable = false,
) => new PasskeyRegistrationError(reason, { code, retryable });

/** Fails with each error in turn, then succeeds. */
const failingWith =
  (...errors: PasskeyRegistrationError[]) =>
  async () => {
    const error = errors.shift();
    if (error) throw error;
  };

function registrar(
  repo: ReturnType<typeof repository>,
  {
    create = async () => credential,
    now = () => 0,
  }: { create?: CreateCredential; now?: () => number } = {},
) {
  const wait = mock(async (_ms: number) => {});
  const create_ = mock(create);
  return {
    register: createPasskeyRegistrar(repo, create_, { now, wait }),
    create: create_,
    wait,
  };
}

describe('base64url', () => {
  test('round-trips bytes that need the url-safe alphabet', () => {
    const encoded = bytesToBase64Url(bytes(1, 2, 3, 251, 255));
    expect(encoded).toBe('AQID-_8');
    expect([...base64UrlToBytes(encoded)]).toEqual([1, 2, 3, 251, 255]);
  });
});

describe('toPublicKeyCreationOptions', () => {
  test('creates the passkey for exactly the rp_id Origins returned', () => {
    const publicKey = toPublicKeyCreationOptions(OPTIONS);

    expect(publicKey.rp).toEqual({ id: 'dev-bloque.app', name: 'Bloque' });
    expect([...new Uint8Array(publicKey.challenge as ArrayBuffer)]).toEqual([
      1, 2, 3, 251, 255,
    ]);
    expect(
      new TextDecoder().decode(publicKey.user.id as Uint8Array<ArrayBuffer>),
    ).toBe('user-1');
    expect(publicKey.user.name).toBe('did:bloque:bloque-id:user-1');
    expect(publicKey.pubKeyCredParams).toEqual([
      { type: 'public-key', alg: -7 },
    ]);
    expect(publicKey.authenticatorSelection).toEqual({
      residentKey: 'required',
      userVerification: 'required',
    });
    expect(publicKey.timeout).toBe(120_000);
    expect(publicKey.attestation).toBe('none');
  });
});

describe('fromCreateError', () => {
  test('a dismissed prompt reads as cancelled, not as a failure', () => {
    expect(fromCreateError({ name: 'NotAllowedError' }).reason).toBe(
      'cancelled',
    );
  });

  test('a browser without support is told so', () => {
    expect(fromCreateError({ name: 'NotSupportedError' }).reason).toBe(
      'unsupported_browser',
    );
  });

  test('an authenticator refusing the credential is rejected', () => {
    expect(fromCreateError({ name: 'InvalidStateError' }).reason).toBe(
      'rejected',
    );
  });

  test('anything unrecognised is unavailable', () => {
    expect(fromCreateError(new Error('boom')).reason).toBe('unavailable');
  });
});

describe('createPasskeyRegistrar', () => {
  test('sends the attestation the browser created, base64url', async () => {
    const repo = repository();

    await registrar(repo).register();

    expect(repo.register).toHaveBeenCalledWith({
      clientDataJson: 'AQID',
      attestationObject: '-_8',
    });
  });

  test('a cancelled browser prompt never reaches the backend', async () => {
    const repo = repository();
    const { register } = registrar(repo, {
      create: async () => {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
      },
    });

    await expect(register()).rejects.toMatchObject({ reason: 'cancelled' });
    expect(repo.register).not.toHaveBeenCalled();
  });

  test('a null credential is treated as cancelled', async () => {
    const repo = repository();

    await expect(
      registrar(repo, { create: async () => null }).register(),
    ).rejects.toMatchObject({ reason: 'cancelled' });
    expect(repo.register).not.toHaveBeenCalled();
  });

  test('resends a retryable failure unchanged, with a backoff', async () => {
    const repo = repository(
      failingWith(
        failure('unavailable', 'E_PASSKEY_ALIAS_NOT_RECORDED', true),
        failure('account_not_ready', 'E_IDENTITY_ACCOUNT_NOT_READY', true),
      ),
    );
    const { register, wait } = registrar(repo);

    await register();

    expect(repo.register).toHaveBeenCalledTimes(3);
    expect(repo.register.mock.calls[2]).toEqual(repo.register.mock.calls[0]);
    expect(wait.mock.calls).toEqual([[1_000], [3_000]]);
  });

  test('after the resends run out, trying again resends the same registration', async () => {
    const aliasNotRecorded = () =>
      failure('unavailable', 'E_PASSKEY_ALIAS_NOT_RECORDED', true);
    const repo = repository(
      failingWith(aliasNotRecorded(), aliasNotRecorded(), aliasNotRecorded()),
    );
    const { register, create } = registrar(repo);

    await expect(register()).rejects.toMatchObject({ retryable: true });
    await register();

    // One passkey, one prompt: the retry never created a second one.
    expect(create).toHaveBeenCalledTimes(1);
    expect(repo.challenge).toHaveBeenCalledTimes(1);
    expect(repo.register).toHaveBeenCalledTimes(4);
    expect(new Set(repo.register.mock.calls.map((c) => c[0]))).toEqual(
      new Set([repo.register.mock.calls[0][0]]),
    );
  });

  test('once the challenge expired, trying again starts over', async () => {
    let time = 0;
    const repo = repository(
      failingWith(
        failure('unavailable', 'E_PASSKEY_REGISTRATION_UNAVAILABLE', true),
        failure('unavailable', 'E_PASSKEY_REGISTRATION_UNAVAILABLE', true),
        failure('unavailable', 'E_PASSKEY_REGISTRATION_UNAVAILABLE', true),
      ),
    );
    const { register, create } = registrar(repo, { now: () => time });

    await expect(register()).rejects.toMatchObject({ retryable: true });
    time = OPTIONS.expiresAt;
    await register();

    expect(create).toHaveBeenCalledTimes(2);
    expect(repo.challenge).toHaveBeenCalledTimes(2);
  });

  test('a rate-limited registration is kept, but not resent on its own', async () => {
    const repo = repository(
      failingWith(failure('rate_limited', 'E_RATE_LIMITED')),
    );
    const { register, create, wait } = registrar(repo);

    await expect(register()).rejects.toMatchObject({ reason: 'rate_limited' });
    expect(wait).not.toHaveBeenCalled();
    await register();

    expect(create).toHaveBeenCalledTimes(1);
    expect(repo.register).toHaveBeenCalledTimes(2);
  });

  test('a rejected registration is not resent; trying again starts over', async () => {
    const repo = repository(
      failingWith(failure('rejected', 'E_PASSKEY_REGISTRATION_REJECTED')),
    );
    const { register, create, wait } = registrar(repo);

    await expect(register()).rejects.toMatchObject({ reason: 'rejected' });
    expect(repo.register).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
    await register();

    expect(create).toHaveBeenCalledTimes(2);
  });
});
