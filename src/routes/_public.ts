import { createFileRoute, redirect } from '@tanstack/react-router';
import { safeRedirectPath } from '~/lib/safe-redirect';

export const Route = createFileRoute('/_public')({
  validateSearch: (
    search: Record<string, string>,
  ): { redirect?: string; t?: string } => {
    return {
      redirect: search.redirect,
      t: search.t,
    };
  },
  beforeLoad: async ({ search, context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: safeRedirectPath(search.redirect) });
    }
  },
});
