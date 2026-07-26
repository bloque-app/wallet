import type {
  Bank,
  CreateBankTransferOrderParams,
  CreateBrebOrderParams,
  CreatePseOrderParams,
  FindRatesParams,
} from '@bloque/sdk-swap';
import type { ExecutionOutcome, PaymentOrder, Rate } from './types';

/**
 * The seam the rest of the app depends on for payments/swap data. Consumers
 * never import `bloque.swap` directly — only an adapter (src/infra/)
 * implements this against the SDK. Plain function-signature type, matching
 * `AccountsRepository`'s precedent.
 *
 * Param types reuse the SDK's own `FindRatesParams`/`CreatePseOrderParams`/
 * `CreateBankTransferOrderParams`/`CreateBrebOrderParams` directly (which in
 * turn reuse `SupportedBank`) rather than re-declaring them — same precedent
 * as `AccountsRepository` reusing `BrebResolvedKey`. Only the *results* get
 * translated into domain types (`PaymentOrder`, `ExecutionOutcome`), since
 * those are what UI code actually reads back.
 */
export type CreateOrderOptions = {
  idempotencyKey?: string;
};

export type CreateOrderResult = {
  order: PaymentOrder;
  execution?: ExecutionOutcome;
};

export type PaymentsRepository = {
  findRates(params: FindRatesParams): Promise<Rate[]>;
  listPseBanks(): Promise<Bank[]>;

  createPseOrder(
    params: CreatePseOrderParams,
    options?: CreateOrderOptions,
  ): Promise<CreateOrderResult>;

  createBankTransferOrder(
    params: CreateBankTransferOrderParams,
    options?: CreateOrderOptions,
  ): Promise<CreateOrderResult>;

  createBrebOrder(
    params: CreateBrebOrderParams,
    options?: CreateOrderOptions,
  ): Promise<CreateOrderResult>;
};
