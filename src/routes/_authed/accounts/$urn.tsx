import type { SupportedAsset } from '@bloque/sdk-accounts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowRightLeft,
  ChevronRight,
  CreditCard,
  KeyRound,
  Landmark,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getProductKindIcon,
  getProductKindLabel,
} from '~/components/account/product-presentation';
import { BackButton } from '~/components/back-button';
import { ComingSoonBadge } from '~/components/coming-soon';
import { MovementDetailDrawer } from '~/components/movement-detail-drawer';
import { MovementRow } from '~/components/movement-row';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  CARDS_ENABLED,
  US_RAILS_ENABLED,
  USD_ENABLED,
} from '~/config/features';
import {
  blocksUsBankLink,
  isLinkingUsBank,
  isPendingLinkUsBank,
  visibleProducts,
} from '~/domain/accounts/external-us-bank';
import {
  isDefaultPocket,
  minorUnitsToMajorInput,
  pocketDeletionBalances,
  pocketDeletionBlockers,
} from '~/domain/accounts/pocket-deletion';
import type { AssetBalance, Product } from '~/domain/accounts/types';
import { isActiveVirtualAccount } from '~/domain/accounts/virtual-account';
import { useAccountMovements } from '~/hooks/accounts/use-account-movements';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useAccount, useAccounts } from '~/hooks/accounts/use-accounts';
import { useCreateCard } from '~/hooks/accounts/use-cards';
import { useDeletePocket } from '~/hooks/accounts/use-delete-pocket';
import { useTransfer } from '~/hooks/accounts/use-transfer';
import { useApprovalRedirect } from '~/hooks/approval/use-approval-redirect';
import {
  currencyMajorToMinor,
  normalizeCurrencyInput,
} from '~/lib/currency-input';
import type { Asset, Movement } from '~/lib/formatters';
import {
  formatAmount,
  formatAmountWithCode,
  formatSdkAssetAmountWithCode,
  getDisplayAsset,
  isUsdAsset,
  sortBalancesForDisplay,
} from '~/lib/formatters';
import { skipDrawerHistoryOnce } from '~/lib/navigation';
import { cn } from '~/lib/utils';
import {
  ACCOUNTS_ORIGIN_ROUTES,
  type AccountsOrigin,
  parseAccountsOrigin,
} from './-lib/origin';

export const Route = createFileRoute('/_authed/accounts/$urn')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { from?: AccountsOrigin; list?: boolean } => {
    const from = parseAccountsOrigin(search.from);
    return {
      ...(from ? { from } : {}),
      ...(search.list === true || search.list === 'true' ? { list: true } : {}),
    };
  },
  component: RouteComponent,
});

const ASSET_LABELS: Record<string, Asset> = {
  COP: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  MXN: 'MXN',
  MXNB: 'MXN',
  BRL: 'BRL',
  BRLB: 'BRL',
  USD: 'USD',
  KSM: 'KSM',
};

type AddProductStep = 'closed' | 'pick' | 'card';

function parseAmount(rawAmount: string, rawAsset: string) {
  const [, precisionStr] = rawAsset.split('/');
  const parsed = Number.parseInt(rawAmount, 10);
  const precision = Number.parseInt(precisionStr, 10);

  if (Number.isNaN(parsed)) return 0;
  if (Number.isNaN(precision)) return parsed;

  return parsed / 10 ** precision;
}

function getAssetLabel(rawAsset: string): Asset | null {
  const [assetKey] = rawAsset.split('/');
  return ASSET_LABELS[assetKey] ?? null;
}

function getApiErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === 'string') return code;
  return typeof message === 'string' && message.startsWith('E_')
    ? message
    : undefined;
}

function majorToMinor(amountMajor: string, rawAsset: string): string {
  const [, precisionStr] = rawAsset.split('/');
  const precision = Number.parseInt(precisionStr, 10);
  return currencyMajorToMinor(
    amountMajor,
    Number.isNaN(precision) ? 0 : precision,
  );
}

/**
 * COP has no meaningful sub-unit in this app's UX (every other COP input is
 * digit-only, whole pesos) — a "." here would be a thousands separator, not
 * a decimal point, and `parseFloat` has no way to tell those apart. Only
 * assets with a real decimal convention (USD, KSM) get a "." at all, capped
 * to that asset's own on-chain precision rather than a fixed 2 places.
 */
function sanitizeTransferAmountInput(raw: string, rawAsset: string): string {
  if (getAssetLabel(rawAsset) === 'COP') return raw.replace(/\D/g, '');
  const [, precisionStr] = rawAsset.split('/');
  const precision = Number.parseInt(precisionStr, 10);
  const maxDecimals = Number.isNaN(precision) ? 2 : precision;
  return normalizeCurrencyInput(raw, maxDecimals);
}

function formatAssetBalance(balance: AssetBalance) {
  const asset = getAssetLabel(balance.asset);
  const amount = parseAmount(balance.current, balance.asset);
  return asset ? formatAmount(asset, amount) : balance.asset;
}

function getProductLink(
  product: Product,
): { to: string; params?: Record<string, string> } | null {
  if (product.kind === 'card') {
    return { to: '/card/details/$urn', params: { urn: product.urn } };
  }
  if (product.kind === 'breb') {
    return { to: '/breb-keys/manage-keys' };
  }
  return null;
}

function RouteComponent() {
  const { t } = useTranslation();
  const { urn } = Route.useParams();
  const { from = 'home', list } = Route.useSearch();
  const navigate = useNavigate();
  const accountsCount = useAccounts().data?.length ?? 0;
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [addProductStep, setAddProductStep] =
    useState<AddProductStep>('closed');
  const [productName, setProductName] = useState('');
  const [showTransferDrawer, setShowTransferDrawer] = useState(false);
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const accountQuery = useAccount(urn);
  const account = accountQuery.data;
  const balances = sortBalancesForDisplay(account?.balances ?? []);

  const createCardMutation = useCreateCard();
  const transferMutation = useTransfer();
  const deletePocketMutation = useDeletePocket();
  const redirectToApproval = useApprovalRedirect();
  const { accounts: ownAccounts } = useAccountPicker({
    requireVirtualAccount: true,
  });
  const transferDestinations = ownAccounts.filter(
    (candidate) => candidate.ledgerId !== account?.ledgerId,
  );
  const transferDestination =
    transferDestinations.find(
      (candidate) => candidate.ledgerId === transferDestinationId,
    ) ?? null;

  useEffect(() => {
    if (!selectedAsset && balances[0]) {
      setSelectedAsset(balances[0].asset);
    }
  }, [balances, selectedAsset]);

  const movementsAsset = selectedAsset || balances[0]?.asset || 'COPM/2';
  const movementsQuery = useAccountMovements(urn, movementsAsset);

  const movements = useMemo(
    () => (movementsQuery.data?.pages ?? []).flatMap((page) => page.movements),
    [movementsQuery.data?.pages],
  );

  const primaryProduct = account?.products.find(
    (product) => product.urn === account.primaryUrn,
  );
  const pocketProduct = account?.products.find(
    (product) => product.kind === 'pocket' && product.status !== 'deleted',
  );
  const canDeletePocket = pocketProduct
    ? !isDefaultPocket(pocketProduct)
    : false;
  const deletionBlockers = pocketProduct
    ? pocketDeletionBlockers(account?.products ?? [], pocketProduct.urn)
    : [];
  const deletionBalances = pocketDeletionBalances(balances);
  const nextFundedBalance = deletionBalances.funded[0];
  const shownProducts = visibleProducts(account?.products ?? []);
  const associatedProducts = shownProducts.filter(
    (product) => product.urn !== account?.primaryUrn,
  );
  const Icon = getProductKindIcon(primaryProduct?.kind ?? 'other');
  const canAddProduct = !!account && isActiveVirtualAccount(account);

  const handlePickProductKind = (kind: 'card' | 'breb' | 'plaid') => {
    if (!account || !canAddProduct) return;
    if (kind === 'card' && !CARDS_ENABLED) return;
    if (kind === 'breb') {
      setAddProductStep('closed');
      skipDrawerHistoryOnce();
      navigate({
        to: '/breb-keys/manage-keys',
        search: { ledgerId: account.ledgerId },
      });
      return;
    }
    if (kind === 'plaid') {
      setAddProductStep('closed');
      skipDrawerHistoryOnce();
      navigate({
        to: '/topup/us-banks',
        search: { ledgerId: account.ledgerId },
      });
      return;
    }
    setProductName('');
    setAddProductStep(kind);
  };

  const handleCreateProduct = async () => {
    if (!account || !canAddProduct) return;
    const input = {
      name: productName.trim() || t('accounts.detail.defaultCardName'),
      ledgerId: account.ledgerId,
    };
    try {
      if (addProductStep === 'card') {
        await createCardMutation.mutateAsync(input);
        toast.success(t('accounts.detail.cardCreatedToast'));
      }
      setAddProductStep('closed');
    } catch (error) {
      if (redirectToApproval(error, { kind: 'create-card', input })) return;
      toast.error(t('accounts.detail.createProductErrorToast'));
    }
  };

  const isCreatingProduct = createCardMutation.isPending;

  const transferAssetBalance = balances.find(
    (balance) => balance.asset === selectedAsset,
  );
  const transferAvailableMajor = transferAssetBalance
    ? parseAmount(transferAssetBalance.current, transferAssetBalance.asset)
    : 0;
  const parsedTransferAmount = Number.parseFloat(transferAmount) || 0;
  const isTransferAssetBlocked = !USD_ENABLED && isUsdAsset(selectedAsset);

  const handleOpenTransferDrawer = () => {
    setTransferDestinationId('');
    setTransferAmount('');
    setShowTransferDrawer(true);
  };

  const handleSubmitTransfer = async () => {
    if (!account || !transferDestination || isTransferAssetBlocked) return;
    if (
      parsedTransferAmount <= 0 ||
      parsedTransferAmount > transferAvailableMajor
    ) {
      toast.error(t('accounts.detail.transferInsufficientBalance'));
      return;
    }

    const input = {
      sourceUrn: account.primaryUrn,
      destinationUrn: transferDestination.primaryUrn,
      amount: majorToMinor(transferAmount, selectedAsset),
      asset: selectedAsset as SupportedAsset,
      metadata: { reference: `own-account-transfer-${Date.now()}` },
    };
    try {
      await transferMutation.mutateAsync(input);
      const transferredAsset = getDisplayAsset(selectedAsset);
      toast.success(
        t('accounts.detail.transferSuccessToast', {
          amount: transferredAsset
            ? formatAmountWithCode(transferredAsset, parsedTransferAmount)
            : `${parsedTransferAmount} ${selectedAsset}`,
        }),
      );
      setShowTransferDrawer(false);
    } catch (error) {
      const display = {
        amount: parsedTransferAmount,
        asset: getDisplayAsset(selectedAsset) ?? undefined,
      };
      if (redirectToApproval(error, { kind: 'transfer', input }, display)) {
        return;
      }
      toast.error(t('accounts.detail.transferErrorToast'));
    }
  };

  const handleOpenDeleteDrawer = () => {
    setTransferDestinationId('');
    setShowDeleteDrawer(true);
  };

  const handlePrepareDeleteTransfer = () => {
    if (!nextFundedBalance || !transferDestination) return;
    setSelectedAsset(nextFundedBalance.asset);
    setTransferAmount(
      minorUnitsToMajorInput(
        nextFundedBalance.current,
        nextFundedBalance.asset,
      ),
    );
    setShowDeleteDrawer(false);
    setShowTransferDrawer(true);
  };

  const handleDeletePocket = async () => {
    if (
      !pocketProduct ||
      deletionBalances.pending.length > 0 ||
      deletionBlockers.length > 0 ||
      deletionBalances.funded.length > 0
    ) {
      return;
    }

    try {
      await deletePocketMutation.mutateAsync(pocketProduct.urn);
      toast.success(t('accounts.detail.deleteSuccessToast'));
      skipDrawerHistoryOnce();
      setShowDeleteDrawer(false);
      void navigate({ to: '/accounts' });
    } catch (error) {
      if (
        redirectToApproval(error, {
          kind: 'delete-pocket',
          urn: pocketProduct.urn,
        })
      ) {
        return;
      }
      const code = getApiErrorCode(error);
      if (code === 'E_ACCOUNT_HAS_BALANCE') {
        toast.error(t('accounts.detail.deleteBalanceError'));
        return;
      }
      if (code === 'E_DEFAULT_ACCOUNT_UNDELETABLE') {
        toast.error(t('accounts.detail.deleteDefaultError'));
        return;
      }
      toast.error(t('accounts.detail.deleteErrorToast'));
    }
  };

  const handleBack = () => {
    if (list && accountsCount > 1) {
      void navigate({
        to: '/accounts',
        search: from === 'home' ? {} : { from },
      });
      return;
    }
    void navigate({ to: ACCOUNTS_ORIGIN_ROUTES[from] });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton onClick={handleBack} />
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          {t('accounts.detail.title')}
        </h1>
      </div>

      {accountQuery.isLoading ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          {t('accounts.detail.loadingAccount')}
        </div>
      ) : !account ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          {t('accounts.detail.notFound')}
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {account.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getProductKindLabel(primaryProduct?.kind ?? 'other')} •{' '}
                  {primaryProduct?.status ?? t('accounts.detail.noStatus')}
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t('accounts.detail.balances')}
              </h2>
            </div>

            {balances.length === 0 || !balances[0] ? (
              <p className="text-sm text-muted-foreground">
                {t('accounts.detail.noBalances')}
              </p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {balances.map((balance) => {
                    const asset = getAssetLabel(balance.asset);

                    return (
                      <button
                        key={balance.asset}
                        type="button"
                        onClick={() => setSelectedAsset(balance.asset)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          selectedAsset === balance.asset
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background/70 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {asset ?? balance.asset}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/75 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('accounts.detail.available')}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAssetBalance(
                        balances.find(
                          (balance) => balance.asset === selectedAsset,
                        ) ?? balances[0],
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                {transferDestinations.length > 0 && (
                  <Button
                    variant="outline"
                    className="h-10 w-full gap-1.5 rounded-xl text-xs font-medium"
                    onClick={handleOpenTransferDrawer}
                    disabled={isTransferAssetBlocked}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    {t('accounts.detail.transferToOwnAccount')}
                    {isTransferAssetBlocked ? <ComingSoonBadge /> : null}
                  </Button>
                )}
              </>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t('accounts.detail.associatedProducts')}
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                onClick={() => setAddProductStep('pick')}
                disabled={!canAddProduct}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('accounts.detail.addProduct')}
              </Button>
            </div>

            {canAddProduct ? null : (
              <p className="text-xs text-muted-foreground">
                {t('accounts.detail.addProductNeedsVirtualAccount')}
              </p>
            )}

            {associatedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('accounts.detail.noAssociatedProducts')}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {associatedProducts.map((product) => {
                  const ProductIcon = getProductKindIcon(product.kind);
                  const link = getProductLink(product);
                  const content = (
                    <>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                        <ProductIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getProductKindLabel(product.kind)} •{' '}
                          {isLinkingUsBank(product)
                            ? t('accounts.detail.usBankLinking')
                            : isPendingLinkUsBank(product)
                              ? t('accounts.detail.usBankPendingLink')
                              : product.status}
                        </p>
                      </div>
                      {link ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </>
                  );

                  if (link) {
                    return (
                      <Link
                        key={product.urn}
                        to={link.to}
                        params={link.params}
                        className="flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/40"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={product.urn}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t('accounts.detail.movements')}
              </h2>
              {selectedAsset ? (
                <span className="text-xs text-muted-foreground">
                  {getAssetLabel(selectedAsset) ?? selectedAsset}
                </span>
              ) : null}
            </div>

            {movementsQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                {t('home.loadingMovements')}
              </div>
            ) : movements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                {t('accounts.detail.noMovements')}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {movements.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    onClick={() => setSelectedMovement(movement)}
                  />
                ))}

                {movementsQuery.hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-11 rounded-2xl"
                    onClick={() => movementsQuery.fetchNextPage()}
                    disabled={movementsQuery.isFetchingNextPage}
                  >
                    {movementsQuery.isFetchingNextPage
                      ? t('common.loading')
                      : t('home.viewMore')}
                  </Button>
                ) : null}
              </div>
            )}
          </section>

          {canDeletePocket ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 rounded-2xl border-destructive/35 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={handleOpenDeleteDrawer}
            >
              <Trash2 className="h-4 w-4" />
              {t('accounts.detail.deletePocket')}
            </Button>
          ) : null}
        </>
      )}

      <MovementDetailDrawer
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />

      {/* Add-product drawer: type picker, then (for card/polygon) a name step. Ledger is already known here, so no account picker. */}
      <Drawer
        open={addProductStep !== 'closed'}
        onOpenChange={(open) => !open && setAddProductStep('closed')}
      >
        <DrawerContent>
          {addProductStep === 'pick' ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
                  {t('accounts.detail.addProduct')}
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-5 pb-4">
                {[
                  {
                    kind: 'card' as const,
                    matchKind: 'card',
                    label: t('accounts.detail.addProductCardLabel'),
                    icon: CreditCard,
                    comingSoon: !CARDS_ENABLED,
                  },
                  {
                    kind: 'breb' as const,
                    matchKind: 'breb',
                    label: t('accounts.detail.addProductBrebLabel'),
                    icon: KeyRound,
                  },
                  {
                    kind: 'plaid' as const,
                    matchKind: 'external-us-bank',
                    label: t('accounts.detail.addProductPlaidLabel'),
                    icon: Landmark,
                    comingSoon: !US_RAILS_ENABLED,
                  },
                ]
                  .filter(
                    (option) =>
                      !shownProducts.some((product) =>
                        option.matchKind === 'external-us-bank'
                          ? blocksUsBankLink(product)
                          : product.kind === option.matchKind,
                      ),
                  )
                  .map((option) => (
                    <button
                      key={option.kind}
                      type="button"
                      onClick={() => handlePickProductKind(option.kind)}
                      disabled={option.comingSoon}
                      className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60 disabled:hover:bg-background/70"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                        <option.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      {option.comingSoon ? <ComingSoonBadge /> : null}
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
                  {t('accounts.detail.newCard')}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-5 pb-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="product-name" className="text-sm font-medium">
                    {t('accounts.detail.cardNameLabel')}
                  </Label>
                  <Input
                    id="product-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProduct();
                    }}
                    placeholder={t('accounts.detail.cardNamePlaceholder')}
                    maxLength={40}
                    disabled={isCreatingProduct}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('accounts.detail.sharesBalanceOf', {
                      label: account?.label,
                    })}
                  </p>
                </div>
              </div>
              <DrawerFooter>
                <Button
                  onClick={handleCreateProduct}
                  disabled={isCreatingProduct || !productName.trim()}
                  className="h-12 w-full rounded-xl text-sm font-medium"
                >
                  {isCreatingProduct
                    ? t('common.creating')
                    : t('common.create')}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showTransferDrawer}
        onOpenChange={(open) => !open && setShowTransferDrawer(false)}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              {t('accounts.detail.transferDrawerTitle')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-4 px-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">
                {t('accounts.detail.transferDestinationLabel')}
              </Label>
              <div className="flex flex-col gap-2">
                {transferDestinations.map((destination) => (
                  <button
                    key={destination.ledgerId}
                    type="button"
                    onClick={() =>
                      setTransferDestinationId(destination.ledgerId)
                    }
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                      transferDestinationId === destination.ledgerId
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border/75 bg-background/70 hover:bg-muted/60',
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {destination.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-amount" className="text-sm font-medium">
                {t('accounts.detail.transferAmountLabel')}
              </Label>
              <Input
                id="transfer-amount"
                inputMode="decimal"
                value={transferAmount}
                onChange={(e) =>
                  setTransferAmount(
                    sanitizeTransferAmountInput(e.target.value, selectedAsset),
                  )
                }
                placeholder="0"
                disabled={transferMutation.isPending}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                {t('accounts.detail.transferAvailable', {
                  amount: transferAssetBalance
                    ? formatAssetBalance(transferAssetBalance)
                    : '-',
                })}
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button
              onClick={handleSubmitTransfer}
              disabled={
                transferMutation.isPending ||
                !transferDestination ||
                parsedTransferAmount <= 0
              }
              className="h-12 w-full rounded-xl text-sm font-medium"
            >
              {transferMutation.isPending
                ? t('accounts.detail.transferring')
                : t('accounts.detail.transferSubmit')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDeleteDrawer}
        onOpenChange={(open) => !open && setShowDeleteDrawer(false)}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              {t('accounts.detail.deleteDrawerTitle')}
            </DrawerTitle>
            <DrawerDescription>
              {t('accounts.detail.deleteDrawerDescription', {
                label: account?.label,
              })}
            </DrawerDescription>
          </DrawerHeader>

          {deletionBalances.pending.length > 0 ? (
            <div className="px-5 pb-4 text-sm text-muted-foreground">
              {t('accounts.detail.deletePendingBalance')}
            </div>
          ) : deletionBlockers.length > 0 ? (
            <div className="flex flex-col gap-3 px-5 pb-2">
              <p className="text-sm text-muted-foreground">
                {t('accounts.detail.deleteRemoveProducts')}
              </p>
              <ul className="flex flex-col gap-2">
                {deletionBlockers.map((product) => (
                  <li
                    key={product.urn}
                    className="rounded-2xl border border-border/75 bg-background/70 px-4 py-3 text-sm font-medium"
                  >
                    {getProductKindLabel(product.kind)} • {product.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : nextFundedBalance ? (
            <div className="flex flex-col gap-4 px-5 pb-2">
              <p className="text-sm text-muted-foreground">
                {t('accounts.detail.deleteMoveBalance', {
                  amount: formatSdkAssetAmountWithCode(
                    nextFundedBalance.asset,
                    nextFundedBalance.current,
                  ),
                })}
              </p>
              {transferDestinations.length === 0 ? (
                <p className="rounded-2xl border border-border/75 bg-background/70 p-3 text-sm text-muted-foreground">
                  {t('accounts.detail.deleteNeedsDestination')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">
                    {t('accounts.detail.transferDestinationLabel')}
                  </Label>
                  {transferDestinations.map((destination) => (
                    <button
                      key={destination.ledgerId}
                      type="button"
                      onClick={() =>
                        setTransferDestinationId(destination.ledgerId)
                      }
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                        transferDestinationId === destination.ledgerId
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border/75 bg-background/70 hover:bg-muted/60',
                      )}
                    >
                      {destination.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 pb-2 text-sm text-muted-foreground">
              {t('accounts.detail.deleteConfirmation')}
            </div>
          )}

          <DrawerFooter>
            {deletionBalances.pending.length > 0 ||
            deletionBlockers.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteDrawer(false)}
                className="h-12 w-full rounded-xl text-sm font-medium"
              >
                {t('common.close')}
              </Button>
            ) : nextFundedBalance ? (
              <Button
                onClick={handlePrepareDeleteTransfer}
                disabled={!transferDestination}
                className="h-12 w-full rounded-xl text-sm font-medium"
              >
                {t('accounts.detail.deleteTransferBalance')}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeletePocket}
                disabled={deletePocketMutation.isPending}
                className="h-12 w-full rounded-xl text-sm font-medium"
              >
                {deletePocketMutation.isPending
                  ? t('accounts.detail.deletingPocket')
                  : t('accounts.detail.confirmDeletePocket')}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
