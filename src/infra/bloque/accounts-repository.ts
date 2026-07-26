import type {
  BrebKeyAccount,
  CardAccount,
  PolygonAccount,
} from '@bloque/sdk-accounts';
import type {
  AccountsRepository,
  CreateBrebKeyInput,
  CreateCardInput,
  CreatePolygonAccountInput,
  CreateVirtualAccountInput,
  GetMovementsParams,
  GetTransactionsParams,
  MovementEntry,
  MovementsPage,
} from '~/domain/accounts/ports';
import type { AssetBalance, Product } from '~/domain/accounts/types';
import { bloque } from '~/lib/bloque';

type ListedAccount = Awaited<
  ReturnType<typeof bloque.accounts.list>
>['accounts'][number];

type RawBalance = Record<string, { current: string; pending: string }>;

function mapBalances(balance?: RawBalance): AssetBalance[] {
  if (!balance) return [];
  return Object.entries(balance).map(([asset, tokenBalance]) => ({
    asset,
    current: tokenBalance.current,
    pending: tokenBalance.pending,
  }));
}

/**
 * `bloque.accounts.list()` (the medium-agnostic call) only sets an explicit
 * `medium` field for BRE-B accounts — every other type omits it. Duck-type
 * from shape instead of trusting `.medium`. Tracked against a future SDK
 * version (v0.3/v1.0) that's expected to tag `medium` properly on every
 * type — delete this once that ships and `list()` can be trusted directly.
 */
function isBrebKeyAccount(account: ListedAccount): account is BrebKeyAccount {
  return 'keyType' in account && 'key' in account;
}

function isCardAccount(account: ListedAccount): account is CardAccount {
  return 'lastFour' in account && 'cardType' in account;
}

function isPolygonAccount(account: ListedAccount): account is PolygonAccount {
  return 'address' in account && 'network' in account;
}

function isBancolombiaAccount(account: ListedAccount): boolean {
  return 'referenceCode' in account;
}

function isUsAccount(account: ListedAccount): boolean {
  return 'accountNumber' in account && 'routingNumber' in account;
}

function stringField(account: ListedAccount, key: string): string | undefined {
  const value = (account as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function metaString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

/** BrebKeyAccount only exposes `createdAt` nested under `details.created_at`. */
function getCreatedAt(account: ListedAccount): string | undefined {
  if ('createdAt' in account) return account.createdAt;
  if (
    'details' in account &&
    account.details &&
    typeof account.details === 'object' &&
    'created_at' in account.details
  ) {
    return (
      (account.details as { created_at?: string | null }).created_at ??
      undefined
    );
  }
  return undefined;
}

function mapToProduct(account: ListedAccount): Product {
  const base = {
    urn: account.urn,
    ledgerId: account.ledgerId,
    status: account.status,
    createdAt: getCreatedAt(account),
    balances: mapBalances(account.balance as RawBalance | undefined),
    metadata: account.metadata as Record<string, unknown> | undefined,
  };

  if (isBrebKeyAccount(account)) {
    return {
      ...base,
      kind: 'breb',
      keyType: account.keyType,
      keyValue: account.key,
      displayName: account.displayName,
      label:
        metaString(base.metadata, 'name') || account.displayName || account.key,
    };
  }

  if (isCardAccount(account)) {
    return {
      ...base,
      kind: 'card',
      lastFour: account.lastFour,
      cardType: account.cardType,
      label:
        metaString(base.metadata, 'card_name') ||
        metaString(base.metadata, 'name') ||
        `Tarjeta •• ${account.lastFour}`,
    };
  }

  if (isPolygonAccount(account)) {
    return {
      ...base,
      kind: 'polygon',
      address: account.address,
      network: account.network,
      label: metaString(base.metadata, 'name') || account.address,
    };
  }

  if (isBancolombiaAccount(account) || isUsAccount(account)) {
    return {
      ...base,
      kind: 'other',
      medium: 'medium' in account ? String(account.medium) : undefined,
      label: metaString(base.metadata, 'name') || 'Cuenta',
    };
  }

  // Fallback: a named pocket/virtual account. Deliberately the catch-all
  // (rather than requiring `firstName`/`lastName` presence) — those fields
  // are typed as always-present on VirtualAccount but aren't reliably
  // populated in production, and a pocket is the closest real shape for
  // "not recognizably any other medium" in this app.
  const firstName = stringField(account, 'firstName');
  const lastName = stringField(account, 'lastName');

  return {
    ...base,
    kind: 'pocket',
    firstName,
    lastName,
    label:
      metaString(base.metadata, 'name') ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      'Cuenta',
  };
}

async function listProducts(): Promise<Product[]> {
  const result = await bloque.accounts.list();
  return result.accounts.map(mapToProduct);
}

async function getBalance(urn: string): Promise<AssetBalance[]> {
  const balance = await bloque.accounts.balance(urn);
  return mapBalances(balance as unknown as RawBalance);
}

async function getMovements(
  params: GetMovementsParams,
): Promise<MovementsPage> {
  const result = await bloque.accounts.movements({
    urn: params.urn,
    asset: params.asset as Parameters<
      typeof bloque.accounts.movements
    >[0]['asset'],
    direction: params.direction,
    limit: params.limit,
    next: params.next,
  });

  return {
    movements: result.data.map((movement) => ({
      id: movement.reference,
      asset: movement.asset,
      amount: movement.amount,
      direction: movement.direction,
      status: movement.status,
      createdAt: movement.createdAt,
      reference: movement.reference,
      counterparty:
        movement.direction === 'in'
          ? movement.fromAccountId
          : movement.toAccountId,
      railName: movement.railName,
      type: movement.type,
    })),
    hasMore: result.hasMore,
    next: result.next,
  };
}

/** `bloque.accounts.transactions()`'s param shape, properly typed by the
 * installed SDK (0.2.7) — no `as never` casts needed here. */
type TransactionsParams = NonNullable<
  Parameters<typeof bloque.accounts.transactions>[0]
>;

async function getTransactions(
  params: GetTransactionsParams,
): Promise<MovementsPage> {
  const result = await bloque.accounts.transactions({
    asset: params.asset as TransactionsParams['asset'],
    direction: params.direction,
    limit: params.limit,
    next: params.next,
  });

  return {
    movements: result.data.map(
      (transaction): MovementEntry => ({
        id: transaction.reference,
        asset: transaction.asset,
        amount: transaction.amount,
        direction: transaction.direction,
        status: transaction.status,
        createdAt: transaction.createdAt,
        reference: transaction.reference,
        counterparty:
          transaction.direction === 'in'
            ? transaction.fromAccountId
            : transaction.toAccountId,
        railName: transaction.railName,
        type: transaction.type,
      }),
    ),
    hasMore: result.hasMore,
    next: result.next,
  };
}

async function createCard(input: CreateCardInput): Promise<Product> {
  const account = await bloque.accounts.card.create({
    name: input.name,
    ledgerId: input.ledgerId,
  });
  return mapToProduct(account as ListedAccount);
}

async function freezeCard(urn: string): Promise<void> {
  await bloque.accounts.card.freeze(urn);
}

async function activateCard(urn: string): Promise<void> {
  await bloque.accounts.card.activate(urn);
}

async function updateCardName(urn: string, name: string): Promise<void> {
  await bloque.accounts.card.updateName(urn, name);
}

async function createBrebKey(input: CreateBrebKeyInput): Promise<Product> {
  const result = await bloque.accounts.breb.createKey(input);
  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? 'No se pudo crear la llave BRE-B.',
    );
  }
  return mapToProduct(result.data as ListedAccount);
}

async function resolveBrebKey(input: { keyType: string; key: string }) {
  const result = await bloque.accounts.breb.resolveKey(
    input as Parameters<typeof bloque.accounts.breb.resolveKey>[0],
  );
  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? 'No se pudo resolver la llave BRE-B.',
    );
  }
  return result.data;
}

async function decodeBrebQr(qrCodeData: string) {
  const result = await bloque.accounts.breb.decodeQr({ qrCodeData });
  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? 'No se pudo decodificar el QR BRE-B.',
    );
  }
  return result.data;
}

async function suspendBrebKey(urn: string): Promise<void> {
  const result = await bloque.accounts.breb.suspendKey({ accountUrn: urn });
  if (result.error) throw new Error(result.error.message);
}

async function activateBrebKey(urn: string): Promise<void> {
  const result = await bloque.accounts.breb.activateKey({ accountUrn: urn });
  if (result.error) throw new Error(result.error.message);
}

async function deleteBrebKey(urn: string): Promise<void> {
  const result = await bloque.accounts.breb.deleteKey({ accountUrn: urn });
  if (result.error) throw new Error(result.error.message);
}

async function createPolygonAccount(
  input: CreatePolygonAccountInput,
): Promise<Product> {
  const account = await bloque.accounts.polygon.create(
    input.name
      ? { name: input.name, ledgerId: input.ledgerId }
      : { ledgerId: input.ledgerId },
  );
  return mapToProduct(account as ListedAccount);
}

async function createVirtualAccount(
  input: CreateVirtualAccountInput,
): Promise<Product> {
  const account = await bloque.accounts.virtual.create(
    input.name ? { name: input.name } : {},
  );
  return mapToProduct(account as ListedAccount);
}

export const bloqueAccountsRepository: AccountsRepository = {
  listProducts,
  getBalance,
  getMovements,
  getTransactions,
  createCard,
  freezeCard,
  activateCard,
  updateCardName,
  createBrebKey,
  resolveBrebKey,
  decodeBrebQr,
  suspendBrebKey,
  activateBrebKey,
  deleteBrebKey,
  createPolygonAccount,
  createVirtualAccount,
};
