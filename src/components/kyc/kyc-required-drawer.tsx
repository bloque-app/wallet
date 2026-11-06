import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { useAuth } from '~/contexts/auth/auth-context';
import { kycGateState } from '~/contexts/auth/kyc-gate';

/** Asks for KYC at the moment a single action needs it, instead of gating a whole screen. */
export function KycRequiredDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const state = kycGateState(user?.kycStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (state === 'allowed') return null;

  const copyKey =
    state === 'not_started' ? 'kycGate.brebKey' : `kycGate.${state}`;

  const handleAction = async () => {
    if (state !== 'unconfirmed') {
      void navigate({ to: '/kyc' });
      return;
    }
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
            {t(`${copyKey}.title`)}
          </DrawerTitle>
          <DrawerDescription className="mt-1 text-sm leading-relaxed">
            {t(`${copyKey}.description`)}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button
            className="h-12 w-full rounded-2xl text-sm font-medium"
            disabled={isRefreshing}
            onClick={() => void handleAction()}
          >
            {t(`kycGate.${state}.cta`)}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
