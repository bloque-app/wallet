import type { IdentityMeProfile } from '@bloque/sdk-identity';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloqueIdentityRepository } from '~/infra/bloque/identity-repository';

const IDENTITY_PROFILE_QUERY_KEY = ['identity', 'me'];

export function useIdentityProfile() {
  return useQuery({
    queryKey: IDENTITY_PROFILE_QUERY_KEY,
    queryFn: () => bloqueIdentityRepository.getProfile(),
    staleTime: 30_000,
  });
}

/** Saves a profile edit and refreshes both this query and the trimmed
 * `AuthContext.user` (which also reads `phone`/name off the same identity),
 * so neither goes stale relative to the other after a save. */
export function useUpdateIdentityProfile() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (profile: Partial<IdentityMeProfile>) =>
      bloqueIdentityRepository.updateProfile(profile),
    onSuccess: async (profile) => {
      queryClient.setQueryData(IDENTITY_PROFILE_QUERY_KEY, profile);
      await refreshUser();
    },
  });
}
