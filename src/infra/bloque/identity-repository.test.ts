import { beforeEach, describe, expect, mock, test } from 'bun:test';

const meMock = mock(() =>
  Promise.resolve({
    urn: 'did:bloque:bloque:alice',
    origin: 'bloque-email',
    type: 'individual',
    profile: { first_name: 'Alice', phone: '+573001234567' },
    status: 'active',
    metadata: {},
  }),
);
const updateMeMock = mock((params: { profile?: Record<string, unknown> }) =>
  Promise.resolve({
    urn: 'did:bloque:bloque:alice',
    origin: 'bloque-email',
    type: 'individual',
    profile: { first_name: 'Alice', ...params.profile },
    status: 'active',
    metadata: {},
  }),
);

const bloqueClient = { identity: { me: meMock, updateMe: updateMeMock } };

mock.module('~/lib/bloque', () => ({ bloque: bloqueClient }));

const { bloqueIdentityRepository } = await import('./identity-repository');

describe('bloqueIdentityRepository', () => {
  beforeEach(() => {
    meMock.mockClear();
    updateMeMock.mockClear();
  });

  test('getProfile returns the individual profile from identity.me()', async () => {
    const profile = await bloqueIdentityRepository.getProfile();
    expect(profile).toEqual({
      first_name: 'Alice',
      phone: '+573001234567',
    });
  });

  test('updateProfile passes the partial profile through and returns the updated one', async () => {
    const profile = await bloqueIdentityRepository.updateProfile({
      phone: '+573009999999',
    });

    expect(updateMeMock).toHaveBeenCalledWith({
      profile: { phone: '+573009999999' },
    });
    expect(profile.phone).toBe('+573009999999');
  });
});
