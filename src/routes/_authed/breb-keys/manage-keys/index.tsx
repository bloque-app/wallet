import { BloqueAPIError } from '@bloque/sdk';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CreditCard, KeyRound, MoreVertical, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountCarousel } from '~/components/account/account-carousel';
import { BackButton } from '~/components/back-button';
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
import { brebKeyAccounts } from '~/domain/accounts/breb-key-account';
import {
  BREB_KEY_ALREADY_REGISTERED_CODE,
  brebKeyState,
  isRetryableBrebKey,
} from '~/domain/accounts/breb-key-state';
import {
  BrebKeyCreationError,
  BrebKeyDeletionError,
  type BrebKeySuggestionKind,
  normalizeBrebKey,
  suggestBrebKeys,
} from '~/domain/accounts/breb-key-suggestions';
import type { Account, BrebKeyProduct } from '~/domain/accounts/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import {
  useCreateBrebKey,
  useDeleteBrebKey,
} from '~/hooks/accounts/use-breb-keys';
import { useApprovalRedirect } from '~/hooks/approval/use-approval-redirect';
import i18n from '~/i18n/config';
import { userFacingErrorMessage } from '~/lib/api-errors';
import { getAssetPrecision } from '~/lib/formatters';
import { type BrebKeyType, getBrebStatusLabel } from '../-lib/breb';

export const Route = createFileRoute('/_authed/breb-keys/manage-keys/')({
  validateSearch: (search: Record<string, unknown>) => ({
    ledgerId: search.ledgerId as string | undefined,
  }),
  component: RouteComponent,
});

const FROM_ASSET = 'COPM/2';
const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

const ALREADY_REGISTERED_CODES = new Set([
  'E_BREB_KEY_ALREADY_REGISTERED',
  BREB_KEY_ALREADY_REGISTERED_CODE,
]);

const NOT_VERIFIED_CODE = 'E_BREB_KEY_VALUE_NOT_VERIFIED';

const PENDING_KEY_POLL_MS = 3000;
const PENDING_KEY_TIMEOUT_MS = 60_000;

type PendingKey = { urn: string; value: string; since: number };

function brebKeysOf(accounts: Account[] | undefined): BrebKeyProduct[] {
  return (accounts ?? []).flatMap((account) =>
    account.products.filter(
      (product): product is BrebKeyProduct => product.kind === 'breb',
    ),
  );
}

const OPTION_ICONS: Record<BrebKeySuggestionKind, React.ElementType> = {
  name: KeyRound,
  bloque: KeyRound,
  document: CreditCard,
  phone: Smartphone,
  initial: KeyRound,
};

function getErrorCode(error: unknown): string | undefined {
  if (
    error instanceof BrebKeyCreationError ||
    error instanceof BrebKeyDeletionError
  ) {
    return error.code;
  }
  if (error instanceof BloqueAPIError) {
    const details = (error.response as Record<string, unknown> | undefined)
      ?.extra_details as Record<string, unknown> | undefined;
    if (details?.provider_code) return details.provider_code as string;
    return error.code;
  }
  return undefined;
}

function getBrebKeyCreationError(error: unknown): string {
  if (getErrorCode(error) === NOT_VERIFIED_CODE) {
    return i18n.t('brebKeys.manageKeys.notVerifiedError');
  }
  return userFacingErrorMessage(
    error,
    i18n.t('brebKeys.manageKeys.creationErrorFallback'),
  );
}

function getBrebKeyDeletionError(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'E_ACCOUNT_HAS_BALANCE':
      return i18n.t('brebKeys.manageKeys.deleteBalanceError');
    case 'E_BREB_KEY_DELETION_FAILED':
      return i18n.t('brebKeys.manageKeys.deleteProviderError');
    default:
      return i18n.t('brebKeys.manageKeys.deleteErrorToast');
  }
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

  // Key suggestions come from a once-per-session profile
  // snapshot, which can go stale if the user completes KYC (or otherwise
  // updates their profile) elsewhere before visiting this screen.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const [pendingKey, setPendingKey] = useState<PendingKey | null>(null);

  const accountsQuery = useAccounts({
    refetchInterval: (query) => {
      if (
        !pendingKey ||
        Date.now() - pendingKey.since > PENDING_KEY_TIMEOUT_MS
      ) {
        return false;
      }
      const product = brebKeysOf(query.state.data).find(
        (p) => p.urn === pendingKey.urn,
      );
      return !product || brebKeyState(product) === 'in_progress'
        ? PENDING_KEY_POLL_MS
        : false;
    },
  });
  const brebProducts = useMemo(
    () => brebKeysOf(accountsQuery.data),
    [accountsQuery.data],
  );
  const pocketLabelByKeyUrn = useMemo(
    () =>
      new Map(
        brebKeyAccounts(accountsQuery.data).map(({ product, accountLabel }) => [
          product.urn,
          accountLabel,
        ]),
      ),
    [accountsQuery.data],
  );

  const accountPicker = useAccountPicker({ requireVirtualAccount: true });
  const pickerAccounts = accountPicker.accounts;
  const contextAccount = contextLedgerId
    ? (pickerAccounts.find((account) => account.ledgerId === contextLedgerId) ??
      null)
    : null;
  const selectedAccount =
    pickerAccounts.find((account) => account.ledgerId === selectedLedgerId) ??
    null;

  const displayName =
    [user.name].filter(Boolean).join(' ') ||
    t('brebKeys.manageKeys.defaultDisplayName');

  const keyOptions: KeyOption[] = suggestBrebKeys({
    firstName: user.name,
    lastName: user.lastName,
    personalIdNumber: user.personalIdNumber,
    phone: user.phone,
    email: user.email,
  }).map((suggestion) => ({
    keyType: 'ALPHA',
    value: suggestion.value,
    label: t(`brebKeys.manageKeys.options.${suggestion.kind}`),
    icon: OPTION_ICONS[suggestion.kind],
  }));

  const activeAccounts = brebProducts.filter((p) => !isRetryableBrebKey(p));
  const registeredKeys = new Set(
    activeAccounts.map((p) => normalizeBrebKey(p.keyValue)),
  );
  const lastFailureByKey = new Map(
    brebProducts
      .filter((p) => brebKeyState(p) === 'failed')
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .map(
        (p) => [normalizeBrebKey(p.keyValue), p.keyFailureCode ?? ''] as const,
      ),
  );
  const unregisteredOptions = keyOptions.filter(
    (o) => !registeredKeys.has(normalizeBrebKey(o.value)),
  );

  const createMutation = useCreateBrebKey();
  const deleteMutation = useDeleteBrebKey();
  const redirectToApproval = useApprovalRedirect();

  const isLoading = accountsQuery.isLoading;

  const notifyRegistrationFailed = (key: string, code?: string) => {
    if (code && ALREADY_REGISTERED_CODES.has(code)) {
      setConflictDrawer({ open: true, key });
      return;
    }
    toast.error(t('brebKeys.manageKeys.registrationFailedToast', { key }));
  };

  useEffect(() => {
    if (!pendingKey) return;
    const product = brebProducts.find((p) => p.urn === pendingKey.urn);
    if (!product) return;
    const state = brebKeyState(product);
    if (state === 'ready' || state === 'suspended') {
      toast.success(t('brebKeys.manageKeys.keyRegisteredToast'));
      setPendingKey(null);
    } else if (state === 'failed' || state === 'removed') {
      notifyRegistrationFailed(pendingKey.value, product.keyFailureCode);
      setPendingKey(null);
    }
  });

  const handleBack = () => {
    void navigate({ to: '/breb-keys' });
  };

  const registerKey = (
    option: { keyType: BrebKeyType; value: string },
    ledgerId: string,
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
        onSuccess: (product) => {
          setCreateDrawer(null);
          setSelectedLedgerId(null);
          if (product.kind === 'breb' && brebKeyState(product) !== 'ready') {
            toast.info(t('brebKeys.manageKeys.registeringToast'));
            setPendingKey({
              urn: product.urn,
              value: option.value,
              since: Date.now(),
            });
            return;
          }
          toast.success(t('brebKeys.manageKeys.keyRegisteredToast'));
        },
        onError: (error) => {
          const code = getErrorCode(error);
          if (code && ALREADY_REGISTERED_CODES.has(code)) {
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
        <BackButton onClick={handleBack} />
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
                {activeAccounts.map((product) => {
                  const state = brebKeyState(product);
                  const isManageable =
                    state === 'ready' || state === 'suspended';
                  return (
                    <div
                      key={product.urn}
                      className="flex items-center gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {product.keyValue}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isManageable
                            ? product.displayName ||
                              getBrebStatusLabel(product.status)
                            : t('brebKeys.status.inProgress')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pocketLabelByKeyUrn.get(product.urn)
                            ? t('brebKeys.pocketLabel', {
                                label: pocketLabelByKeyUrn.get(product.urn),
                              })
                            : t('brebKeys.pocketUnavailable')}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-primary">
                        BRE-B
                      </span>
                      {isManageable && (
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
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {unregisteredOptions.length > 0 && (
            <section className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t('brebKeys.manageKeys.registerYourKeys')}
              </p>
              <p className="px-1 pb-1 text-xs text-muted-foreground">
                {t('brebKeys.manageKeys.validKeyHint')}
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
                        {lastFailureByKey.has(
                          normalizeBrebKey(option.value),
                        ) && (
                          <p className="text-xs text-destructive">
                            {lastFailureByKey.get(
                              normalizeBrebKey(option.value),
                            ) === BREB_KEY_ALREADY_REGISTERED_CODE
                              ? t(
                                  'brebKeys.manageKeys.lastAttemptAlreadyRegistered',
                                )
                              : t('brebKeys.manageKeys.lastAttemptFailed')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0 rounded-xl px-4 text-xs font-medium"
                        disabled={
                          createMutation.isPending || accountPicker.isLoading
                        }
                        onClick={() => {
                          if (contextAccount) {
                            registerKey(option, contextAccount.ledgerId);
                            return;
                          }
                          if (pickerAccounts.length === 0) {
                            toast.info(t('home.quickActions.needsAccount'));
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
                          registerKey(option, pickerAccounts[0].ledgerId);
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

      {/* Conflict drawer: the key already exists in BRE-B */}
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
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl text-sm text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(actionsDrawer.urn, {
                  onSuccess: () => {
                    toast.success(t('brebKeys.manageKeys.keyDeletedToast'));
                    setActionsDrawer((s) => ({ ...s, open: false }));
                  },
                  onError: (error) => {
                    if (
                      redirectToApproval(error, {
                        kind: 'delete-breb-key',
                        urn: actionsDrawer.urn,
                      })
                    ) {
                      return;
                    }
                    toast.error(getBrebKeyDeletionError(error));
                  },
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
