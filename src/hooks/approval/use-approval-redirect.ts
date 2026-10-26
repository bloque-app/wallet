import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  type ApprovalDisplay,
  type ApprovalOperation,
  ApprovalRequiredError,
} from '~/domain/approval/types';
import { savePendingApproval } from '~/lib/pending-approval';

/**
 * Handles an operation's `ApprovalRequiredError`: saves the operation and
 * sends the person to approve it with their passkey. The identity app sends
 * them back to `/approval`, which repeats it once.
 *
 * The returned function is true when the error was an approval one (the page
 * is leaving, or the person was told why it can't), false otherwise.
 */
export function useApprovalRedirect() {
  const { t } = useTranslation();
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
