import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  type ApprovalDisplay,
  type ApprovalOperation,
  ApprovalRequiredError,
} from '~/domain/approval/types';
import { APPROVAL_RETURN_PATH } from '~/infra/bloque/approval-errors';
import {
  readPendingApproval,
  savePendingApproval,
} from '~/lib/pending-approval';

/**
 * Handles an operation's `ApprovalRequiredError`: saves the operation and
 * sends the person to approve it with their passkey. The identity app sends
 * them back to `/approval`, which repeats it once.
 *
 * The approval page has no way back when the person cancels or doesn't
 * recognize the operation, so they come back with the browser's back button
 * to the page that started it. An operation still saved for this page then
 * goes to `/approval`, which says it was not approved (or repeats it, if they
 * approved before going back).
 *
 * The returned function is true when the error was an approval one (the page
 * is leaving, or the person was told why it can't), false otherwise.
 */
export function useApprovalRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const resume = () => {
      const saved = readPendingApproval();
      if (!saved) return;
      const [path] = saved.returnTo.split('?');
      if (path !== window.location.pathname) return;
      void navigate({ href: APPROVAL_RETURN_PATH, replace: true });
    };
    // Back from another site can restore this page from the back/forward
    // cache, without mounting it again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resume();
    };
    resume();
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [navigate]);

  return useCallback(
    (
      error: unknown,
      operation: ApprovalOperation,
      display?: ApprovalDisplay,
    ): boolean => {
      if (!(error instanceof ApprovalRequiredError)) return false;
      const { approvalUrl } = error.pending;
      const saved =
        !!approvalUrl &&
        savePendingApproval({
          operation,
          pending: error.pending,
          returnTo: `${window.location.pathname}${window.location.search}`,
          display,
        });
      if (!approvalUrl || !saved) {
        toast.error(t('approval.cannotStart'));
        return true;
      }
      toast.info(t('approval.redirecting'));
      // A full-page navigation: the identity app is another site.
      window.location.assign(approvalUrl);
      return true;
    },
    [t],
  );
}
