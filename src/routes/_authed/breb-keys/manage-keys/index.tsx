import { BloqueAPIError } from '@bloque/sdk';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  CreditCard,
  KeyRound,
  Mail,
  MoreVertical,
  Smartphone,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountCarousel } from '~/components/account/account-carousel';
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
import type { BrebKeyProduct } from '~/domain/accounts/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import {
  useActivateBrebKey,
  useCreateBrebKey,
  useDeleteBrebKey,
  useSuspendBrebKey,
} from '~/hooks/accounts/use-breb-keys';
import i18n from '~/i18n/config';
import { getAssetPrecision } from '~/lib/formatters';
import { goBackOrFallback } from '~/lib/navigation';
import {
  BrebKeyError,
  type BrebKeyType,
  getBrebStatusLabel,
} from '../-lib/breb';

export const Route = createFileRoute('/_authed/breb-keys/manage-keys/')({
  validateSearch: (search: Record<string, unknown>) => ({
    ledgerId: search.ledgerId as string | undefined,
  }),
  component: RouteComponent,
});

const FROM_ASSET = 'COPM/2';
const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

const DRAWER_PROVIDER_CODES = new Set(['P901', 'U807']);

function getProviderCode(error: unknown): string | undefined {
  if (error instanceof BrebKeyError) return error.providerCode;
  if (error instanceof BloqueAPIError) {
    const details = (error.response as Record<string, unknown> | undefined)
      ?.extra_details as Record<string, unknown> | undefined;
    if (details?.provider_code) return details.provider_code as string;
  }
  return undefined;
}

function getBrebKeyCreationError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.startsWith('E_')
  ) {
    return error.message;
  }
  return i18n.t('brebKeys.manageKeys.creationErrorFallback');
}

function stripCountryCode(phone: string): string {
  if (phone.startsWith('+57')) return phone.slice(3);
  if (phone.startsWith('57') && phone.length > 10) return phone.slice(2);
  return phone;
}

function isColombianPhone(phone: string): boolean {
  return !phone.startsWith('+') || phone.startsWith('+57');
}

type KeyOption = {
  keyType: BrebKeyType;
  value: string;
  label: string;
  icon: React.ElementType;
};

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ledgerId: contextLedgerId } = Route.useSearch();
  const [conflictDrawer, setConflictDrawer] = useState<{
    open: boolean;
    key: string;
  }>({ open: false, key: '' });
  const [actionsDrawer, setActionsDrawer] = useState<{
    open: boolean;
    urn: string;
    status: string;
    key: string;
  }>({ open: false, urn: '', status: '', key: '' });
  const [createDrawer, setCreateDrawer] = useState<{
    open: boolean;
    keyType: BrebKeyType;
    value: string;
  } | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  const { user, refreshUser } = useAuth();

  // Phone/personal-ID suggestions come from a once-per-session profile
  // snapshot, which can go stale if the user completes KYC (or otherwise
  // updates their profile) elsewhere before visiting this screen.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const accountsQuery = useAccounts();
  const brebProducts = useMemo(
    () =>
      (accountsQuery.data ?? []).flatMap((account) =>
        account.products.filter(
          (product): product is BrebKeyProduct => product.kind === 'breb',
        ),
      ),
    [accountsQuery.data],
  );

  const accountPicker = useAccountPicker();
  const pickerAccounts = accountPicker.accounts;
  const selectedAccount =
    pickerAccounts.find((account) => account.ledgerId === selectedLedgerId) ??
    null;

  const localPhone = user.phone ? stripCountryCode(user.phone) : null;
  const displayName =
    [user.name].filter(Boolean).join(' ') ||
    t('brebKeys.manageKeys.defaultDisplayName');

  const keyOptions: KeyOption[] = [];
  if (localPhone) {
    keyOptions.push({
      keyType: 'ALPHA',
      value: `@bl${localPhone}`,
      label: t('brebKeys.manageKeys.bloqueKey'),
      icon: KeyRound,
    });
    if (user.phone && isColombianPhone(user.phone)) {
      keyOptions.push({
        keyType: 'PHONE',
        value: localPhone,
        label: t('brebKeys.manageKeys.phone'),
        icon: Smartphone,
      });
    }
  }
  if (user.email) {
    keyOptions.push({
      keyType: 'EMAIL',
      value: user.email,
      label: t('brebKeys.manageKeys.email'),
      icon: Mail,
    });
  }
  if (user.personalIdNumber && user.personalIdType === 'CC') {
    keyOptions.push({
      keyType: 'ID',
      value: user.personalIdNumber,
      label: t('brebKeys.manageKeys.document'),
      icon: CreditCard,
    });
  }

  const registeredKeys = new Set(brebProducts.map((p) => p.keyValue));
  const activeAccounts = brebProducts.filter(
    (p) => p.status === 'active' || p.status === 'frozen',
  );
  const unregisteredOptions = keyOptions.filter(
    (o) => !registeredKeys.has(o.value),
  );

  const createMutation = useCreateBrebKey();
  const suspendMutation = useSuspendBrebKey();
  const activateMutation = useActivateBrebKey();
  const deleteMutation = useDeleteBrebKey();

  const isLoading = accountsQuery.isLoading;
  const actionsPending =
    suspendMutation.isPending ||
    activateMutation.isPending ||
    deleteMutation.isPending;

  const handleBack = () => {
    goBackOrFallback(() => {
      void navigate({ to: '/breb-keys' });
    });
  };

  const registerKey = (
    option: { keyType: BrebKeyType; value: string },
    ledgerId?: string,
  ) => {
    createMutation.mutate(
      {
        keyType: option.keyType,
        key: option.value,
        displayName,
        ledgerId,
        metadata: { source: 'wallet', purpose: 'breb-send' },
      },
      {
        onSuccess: () => {
          toast.success(t('brebKeys.manageKeys.keyRegisteredToast'));
          setCreateDrawer(null);
          setSelectedLedgerId(null);
        },
        onError: (error) => {
          const code = getProviderCode(error);
          if (code && DRAWER_PROVIDER_CODES.has(code)) {
            setConflictDrawer({ open: true, key: option.value });
            return;
          }
          toast.error(getBrebKeyCreationError(error));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('brebKeys.manageKeys.title')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('brebKeys.manageKeys.subtitle')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {['a', 'b', 'c', 'd'].map((k) => (
            <div
              key={k}
              className="h-16 animate-pulse rounded-2xl border border-border/75 bg-card/80"
            />
          ))}
        </div>
      ) : (
        <>
          {activeAccounts.length > 0 && (
            <section className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t('brebKeys.manageKeys.readyKeys')}
              </p>
              <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/75 bg-card/80 overflow-hidden">
                {activeAccounts.map((product) => (
                  <div
                    key={product.urn}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {product.keyValue}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.displayName ||
                          getBrebStatusLabel(product.status)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-primary">
                      BRE-B
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      onClick={() =>
                        setActionsDrawer({
                          open: true,
                          urn: product.urn,
                          status: product.status,
                          key: product.keyValue,
                        })
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {unregisteredOptions.length > 0 && (
            <section className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t('brebKeys.manageKeys.registerYourKeys')}
              </p>
              <div className="flex flex-col gap-3">
                {unregisteredOptions.map((option) => {
                  const Icon = option.icon;
                  const isPending =
                    createMutation.isPending &&
                    createMutation.variables?.key === option.value;
                  return (
                    <div
                      key={option.value}
                      className="flex items-center gap-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {option.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.label}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0 rounded-xl px-4 text-xs font-medium"
                        disabled={
                          createMutation.isPending || accountPicker.isLoading
                        }
                        onClick={() => {
                          if (contextLedgerId) {
                            registerKey(option, contextLedgerId);
                            return;
                          }
                          if (pickerAccounts.length > 1) {
                            setSelectedLedgerId(null);
                            setCreateDrawer({
                              open: true,
                              keyType: option.keyType,
                              value: option.value,
                            });
                            return;
                          }
                          registerKey(option, pickerAccounts[0]?.ledgerId);
                        }}
                      >
                        {isPending
                          ? t('brebKeys.manageKeys.registering')
                          : t('brebKeys.manageKeys.register')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeAccounts.length === 0 && unregisteredOptions.length === 0 && (
            <p className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
              {t('brebKeys.manageKeys.noKeysAvailable')}
            </p>
          )}
        </>
      )}

      {/* Conflict drawer (P901 / U807) */}
      <Drawer
        open={conflictDrawer.open}
        onOpenChange={(open) => setConflictDrawer((s) => ({ ...s, open }))}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              {t('brebKeys.manageKeys.conflictTitle')}
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm leading-relaxed">
              {t('brebKeys.manageKeys.conflictDescriptionPrefix')}{' '}
              <span className="font-medium text-foreground">
                {conflictDrawer.key}
              </span>{' '}
              {t('brebKeys.manageKeys.conflictDescriptionSuffix')}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              className="h-12 w-full rounded-2xl text-sm font-medium"
              onClick={() => setConflictDrawer((s) => ({ ...s, open: false }))}
            >
              {t('brebKeys.manageKeys.understood')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Actions drawer */}
      <Drawer
        open={actionsDrawer.open}
        onOpenChange={(open) => setActionsDrawer((s) => ({ ...s, open }))}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base font-semibold">
              {actionsDrawer.key}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {actionsDrawer.status === 'active'
                ? t('brebKeys.manageKeys.activeKey')
                : actionsDrawer.status === 'frozen'
                  ? t('brebKeys.manageKeys.suspendedKey')
                  : getBrebStatusLabel(actionsDrawer.status)}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            {actionsDrawer.status === 'active' && (
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl text-sm"
                disabled={actionsPending}
                onClick={() =>
                  suspendMutation.mutate(actionsDrawer.urn, {
                    onSuccess: () => {
                      toast.success(t('brebKeys.manageKeys.keySuspendedToast'));
                      setActionsDrawer((s) => ({ ...s, open: false }));
                    },
                    onError: () =>
                      toast.error(t('brebKeys.manageKeys.suspendErrorToast')),
                  })
                }
              >
                {suspendMutation.isPending
                  ? t('brebKeys.manageKeys.suspending')
                  : t('brebKeys.manageKeys.suspendKey')}
              </Button>
            )}
            {actionsDrawer.status === 'frozen' && (
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl text-sm"
                disabled={actionsPending}
                onClick={() =>
                  activateMutation.mutate(actionsDrawer.urn, {
                    onSuccess: () => {
                      toast.success(t('brebKeys.manageKeys.keyActivatedToast'));
                      setActionsDrawer((s) => ({ ...s, open: false }));
                    },
                    onError: () =>
                      toast.error(t('brebKeys.manageKeys.activateErrorToast')),
                  })
                }
              >
                {activateMutation.isPending
                  ? t('brebKeys.manageKeys.activating')
                  : t('brebKeys.manageKeys.activateKey')}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl text-sm text-destructive hover:text-destructive"
              disabled={actionsPending}
              onClick={() =>
                deleteMutation.mutate(actionsDrawer.urn, {
                  onSuccess: () => {
                    toast.success(t('brebKeys.manageKeys.keyDeletedToast'));
                    setActionsDrawer((s) => ({ ...s, open: false }));
                  },
                  onError: () =>
                    toast.error(t('brebKeys.manageKeys.deleteErrorToast')),
                })
              }
            >
              {deleteMutation.isPending
                ? t('brebKeys.manageKeys.deleting')
                : t('brebKeys.manageKeys.deleteKey')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Create-key drawer: pick which account the new key shares a balance with */}
      <Drawer
        open={createDrawer?.open ?? false}
        onOpenChange={(open) =>
          setCreateDrawer((s) => (s ? { ...s, open } : s))
        }
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              {t('brebKeys.manageKeys.chooseAccountTitle')}
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm leading-relaxed">
              {t('brebKeys.manageKeys.chooseAccountDescriptionPrefix')}{' '}
              <span className="font-medium text-foreground">
                {createDrawer?.value}
              </span>{' '}
              {t('brebKeys.manageKeys.chooseAccountDescriptionSuffix')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <AccountCarousel
              accounts={pickerAccounts}
              asset={FROM_ASSET}
              precision={FROM_PRECISION}
              unit="COP"
              value={selectedLedgerId}
              onChange={setSelectedLedgerId}
              label={t('brebKeys.manageKeys.linkedAccountLabel')}
            />
          </div>
          <DrawerFooter>
            <Button
              className="h-12 w-full rounded-2xl text-sm font-medium"
              disabled={!selectedAccount || createMutation.isPending}
              onClick={() => {
                if (!createDrawer || !selectedAccount) return;
                registerKey(createDrawer, selectedAccount.ledgerId);
              }}
            >
              {createMutation.isPending
                ? t('brebKeys.manageKeys.registering')
                : t('brebKeys.manageKeys.confirm')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
