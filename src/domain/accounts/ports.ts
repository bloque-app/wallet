import type {
  BrebDecodedQr,
  BrebKeyType,
  BrebResolvedKey,
  SupportedAsset,
} from '@bloque/sdk-accounts';
import type { AssetBalance, Product } from './types';

export type MovementEntry = {
  id: string;
  asset: string;
  amount: string;
  direction: 'in' | 'out';
  status: string;
  createdAt: string;
  reference: string;
  counterparty?: string;
  railName?: string;
  type?: string;
  /** Only ever populated on the global feed — the SDK's `GlobalTransaction.type`
   * is optional and `details` is where a real type can still be recovered
   * from when it's missing. Per-account `Movement.type` is always present,
   * so this stays unset there. */
  details?: Record<string, unknown>;
};

export type MovementsPage = {
  movements: MovementEntry[];
  hasMore: boolean;
  next?: string;
};

export type GetMovementsParams = {
  urn: string;
  asset: string;
  direction?: 'in' | 'out';
  limit?: number;
  next?: string;
};

/**
 * Params for the medium-agnostic global transactions feed — the
 * cross-account equivalent of `GetMovementsParams`/`getMovements`. No
 * `urn`: this endpoint spans every account the user holds.
 */
export type GetTransactionsParams = {
  asset?: string;
  direction?: 'in' | 'out';
  limit?: number;
  next?: string;
};

export type CreateCardInput = { name: string; ledgerId?: string };

export type CreateBrebKeyInput = {
  keyType: BrebKeyType;
  key: string;
  displayName?: string;
  ledgerId?: string;
  metadata?: Record<string, unknown>;
};

export type CreatePolygonAccountInput = { name?: string; ledgerId?: string };

export type CreateVirtualAccountInput = { name?: string };

export type TransferInput = {
  sourceUrn: string;
  destinationUrn: string;
  /** Bigint string, scaled by the asset's precision. */
  amount: string;
  asset: SupportedAsset;
  metadata?: Record<string, unknown>;
};

export type TransferOutcome = {
  queueId: string;
  status: string;
  message: string;
};

/**
 * The seam the rest of the app depends on for accounts/products data.
 * Consumers never import `bloque` directly for this domain — only an
 * adapter (src/infra/) implements this against the SDK. Plain
 * function-signature type, not a class — matches this codebase's
 * all-functional style; there's no DI container, callers just import the
 * adapter singleton (the same way `bloque` itself is already consumed).
 *
 * `resolveBrebKey`/`decodeBrebQr` return rich BRE-B-specific recipient/QR
 * shapes with no meaningful domain abstraction beyond what the SDK already
 * models — reusing its types here directly is a deliberate, narrow
 * exception to "no SDK types past the port," not a precedent to generalize.
 *
 * `transfer` wraps `bloque.accounts.transfer` — a plain account-to-account
 * ledger transfer with no rate/order/execution involved, so it lives here
 * rather than in the Payments/Transfers domain (`~/domain/payments`), which
 * is scoped to swap-based rails (PSE, bank transfer, BRE-B payout, rates).
 */
export type AccountsRepository = {
  listProducts(): Promise<Product[]>;
  getBalance(urn: string): Promise<AssetBalance[]>;
  getMovements(params: GetMovementsParams): Promise<MovementsPage>;
  getTransactions(params: GetTransactionsParams): Promise<MovementsPage>;
  transfer(input: TransferInput): Promise<TransferOutcome>;

  createCard(input: CreateCardInput): Promise<Product>;
  freezeCard(urn: string): Promise<void>;
  activateCard(urn: string): Promise<void>;
  updateCardName(urn: string, name: string): Promise<void>;

  createBrebKey(input: CreateBrebKeyInput): Promise<Product>;
  resolveBrebKey(input: {
    keyType: string;
    key: string;
  }): Promise<BrebResolvedKey>;
  decodeBrebQr(qrCodeData: string): Promise<BrebDecodedQr>;
  suspendBrebKey(urn: string): Promise<void>;
  activateBrebKey(urn: string): Promise<void>;
  deleteBrebKey(urn: string): Promise<void>;

  createPolygonAccount(input: CreatePolygonAccountInput): Promise<Product>;

  createVirtualAccount(input: CreateVirtualAccountInput): Promise<Product>;
};
