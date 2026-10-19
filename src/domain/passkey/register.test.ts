import { describe, expect, mock, test } from 'bun:test';
import type { PasskeyRepository } from './ports';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  fromCreateError,
  registerPasskey,
  toPublicKeyCreationOptions,
} from './register';
import { type PasskeyCreationOptions, PasskeyRegistrationError } from './types';

const OPTIONS: PasskeyCreationOptions = {
  challenge: 'AQID-_8',
  expiresAt: 1_767_225_600_000,
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

function repository(
  register: PasskeyRepository['register'] = async () => {},
): PasskeyRepository & {
  register: ReturnType<typeof mock<PasskeyRepository['register']>>;
} {
  return {
    challenge: async () => OPTIONS,
    register: mock(register),
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

    expect(publicKey.rp.id).toBe('dev-bloque.app');
    expect([...new Uint8Array(publicKey.challenge as ArrayBuffer)]).toEqual([
      1, 2, 3, 251, 255,
    ]);
    expect(publicKey.authenticatorSelection).toEqual({
      residentKey: 'required',
      userVerification: 'required',
    });
    expect(publicKey.attestation).toBe('none');
  });
});

describe('fromCreateError', () => {
  test('a dismissed prompt reads as cancelled, not as a failure', () => {
    expect(fromCreateError({ name: 'NotAllowedError' }).reason).toBe(
      'cancelled',
    );
  });

  test('anything unrecognised is unavailable', () => {
    expect(fromCreateError(new Error('boom')).reason).toBe('unavailable');
  });
});

describe('registerPasskey', () => {
  test('sends the attestation the browser created, base64url', async () => {
    const repo = repository();

    await registerPasskey(repo, async () => credential);

    expect(repo.register).toHaveBeenCalledWith({
      clientDataJson: 'AQID',
      attestationObject: '-_8',
    });
  });

  test('a cancelled browser prompt never reaches the backend', async () => {
    const repo = repository();
    const create = async () => {
      throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    };

    await expect(registerPasskey(repo, create)).rejects.toMatchObject({
      reason: 'cancelled',
    });
    expect(repo.register).not.toHaveBeenCalled();
  });

  test('a null credential is treated as cancelled', async () => {
    const repo = repository();

    await expect(registerPasskey(repo, async () => null)).rejects.toMatchObject(
      { reason: 'cancelled' },
    );
    expect(repo.register).not.toHaveBeenCalled();
  });

  test('resends the same registration once when the alias was not recorded', async () => {
    let calls = 0;
    const repo = repository(async () => {
      calls += 1;
      if (calls === 1) {
        throw new PasskeyRegistrationError(
          'unavailable',
          'E_PASSKEY_ALIAS_NOT_RECORDED',
        );
      }
    });

    await registerPasskey(repo, async () => credential);

    expect(repo.register).toHaveBeenCalledTimes(2);
    expect(repo.register.mock.calls[1]).toEqual(repo.register.mock.calls[0]);
  });

  test('does not retry a rejected registration', async () => {
    const repo = repository(async () => {
      throw new PasskeyRegistrationError(
        'rejected',
        'E_PASSKEY_REGISTRATION_REJECTED',
      );
    });

    await expect(
      registerPasskey(repo, async () => credential),
    ).rejects.toMatchObject({ reason: 'rejected' });
    expect(repo.register).toHaveBeenCalledTimes(1);
  });
});
