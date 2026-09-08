import type { IdentityMeProfile } from '@bloque/sdk-identity';
import { bloque } from '~/lib/bloque';

async function getProfile(): Promise<IdentityMeProfile> {
  const me = await bloque.identity.me();
  return me.profile as IdentityMeProfile;
}

async function updateProfile(
  profile: Partial<IdentityMeProfile>,
): Promise<IdentityMeProfile> {
  const me = await bloque.identity.updateMe({ profile });
  return me.profile as IdentityMeProfile;
}

export const bloqueIdentityRepository = {
  getProfile,
  updateProfile,
};
