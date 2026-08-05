import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

/**
 * Asks a signed-in user to accept updated terms, for the case where their
 * session went stale underneath them.
 *
 * Sign-in already routes an unaccepted identity straight to the hosted gate, so
 * this only ever appears for someone who was *already* signed in when a new
 * document version activated or a grace period lapsed — most visibly, everyone
 * with a tab open at the moment we deploy.
 *
 * Deliberately has no cancel action. Accepting the terms is a Level 0
 * requirement, so offering "not now" would imply a choice the policy does not
 * actually give. `AlertDialog` also does not close on escape or an outside
 * click, which is the behaviour we want here and the reason for using it over a
 * plain `<dialog>`.
 *
 * It does not navigate on its own, though. The user picks the moment — they may
 * be halfway through a transfer, and a hosted page appearing unbidden would
 * lose that work.
 */
export function TosRequiredDialog({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();

  return (
    <AlertDialog open>
      <AlertDialogContent size="sm">
        <AlertDialogHeader className="items-start text-left">
          <AlertDialogTitle>{t('tos.required.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('tos.required.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinue}>
            {t('tos.required.cta')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
