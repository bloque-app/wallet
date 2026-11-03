import type {
  Bank,
  CreateBankTransferOrderParams,
  CreateBrebOrderParams,
  CreateExternalUsBankOrderParams,
  CreatePixDepositParams,
  CreatePixOrderParams,
  CreatePseOrderParams,
  CreateRtpOrderParams,
  CreateSpeiDepositParams,
  CreateSpeiOrderParams,
  ExecutionResult,
  FindRatesParams,
  SwapOrder,
} from '@bloque/sdk-swap';
import { resolveExecutionOutcome } from '~/domain/payments/execution';
import type {
  CreateOrderOptions,
  CreateOrderResult,
  PaymentsRepository,
} from '~/domain/payments/ports';
import type { PaymentOrder, Rate } from '~/domain/payments/types';
import { bloque } from '~/lib/bloque';
import { sdkApprovalOptions, withApprovalErrors } from './approval-errors';

/** A gated order's SDK options: idempotency key plus the approval ones. */
function orderOptions(options?: CreateOrderOptions) {
  return {
    ...(options?.idempotencyKey && { idempotencyKey: options.idempotencyKey }),
    ...sdkApprovalOptions(options),
  };
}

function mapOrder(order: SwapOrder): PaymentOrder {
  return {
    id: order.id,
    orderSig: order.orderSig,
    rateSig: order.rateSig,
    swapSig: order.swapSig,
    taker: order.taker,
    maker: order.maker,
    fromAsset: order.fromAsset,
    toAsset: order.toAsset,
    fromMedium: order.fromMedium,
    toMedium: order.toMedium,
    fromAmount: order.fromAmount,
    toAmount: order.toAmount,
    at: order.at,
    graphId: order.graphId,
    status: order.status,
    metadata: order.metadata,
    webhookUrl: order.webhookUrl,
    failureReason: order.failureReason,
    failureDetails: order.failureDetails,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function mapCreateResult(result: {
  order: SwapOrder;
  execution?: ExecutionResult;
}): CreateOrderResult {
  return {
    order: mapOrder(result.order),
    execution: resolveExecutionOutcome(result.execution?.result?.how),
  };
}

async function findRates(params: FindRatesParams): Promise<Rate[]> {
  const result = await bloque.swap.findRates(params);
  return result.rates.map((rate) => ({
    sig: rate.sig,
    ratio: rate.ratio,
    rate: rate.rate,
    fromAsset: rate.edge[0],
    toAsset: rate.edge[1],
    until: rate.until,
    fee: {
      formula: rate.fee.formula,
      components: rate.fee.components.map((component) => ({
        name: component.name,
        type: component.type,
        value: component.value,
      })),
    },
  }));
}

async function listPseBanks(): Promise<Bank[]> {
  const result = await bloque.swap.pse.banks();
  return result.banks;
}

async function createPseOrder(
  params: CreatePseOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const result = await withApprovalErrors(() =>
    bloque.swap.pse.create(params, orderOptions(options)),
  );
  return mapCreateResult(result);
}

async function createBankTransferOrder(
  params: CreateBankTransferOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const result = await withApprovalErrors(() =>
    bloque.swap.bankTransfer.create(params, orderOptions(options)),
  );
  return mapCreateResult(result);
}

async function createBrebOrder(
  params: CreateBrebOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const result = await withApprovalErrors(() =>
    bloque.swap.breb.create(params, orderOptions(options)),
  );
  return mapCreateResult(result);
}

async function createRtpOrder(
  params: CreateRtpOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const result = await withApprovalErrors(() =>
    bloque.swap.rtp.create(params, orderOptions(options)),
  );
  return mapCreateResult(result);
}

async function createExternalUsBankOrder(
  params: CreateExternalUsBankOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const result = await withApprovalErrors(() =>
    bloque.swap.externalUsBank.create(params, orderOptions(options)),
  );
  return mapCreateResult(result);
}

async function createSpeiDepositOrder(
  params: CreateSpeiDepositParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  return mapCreateResult(
    await withApprovalErrors(() =>
      bloque.swap.spei.createDeposit(params, orderOptions(options)),
    ),
  );
}

async function createSpeiOrder(
  params: CreateSpeiOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  return mapCreateResult(
    await withApprovalErrors(() =>
      bloque.swap.spei.create(params, orderOptions(options)),
    ),
  );
}

async function createPixDepositOrder(
  params: CreatePixDepositParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  return mapCreateResult(
    await withApprovalErrors(() =>
      bloque.swap.pix.createDeposit(params, orderOptions(options)),
    ),
  );
}

async function createPixOrder(
  params: CreatePixOrderParams,
  options?: CreateOrderOptions,
): Promise<CreateOrderResult> {
  return mapCreateResult(
    await withApprovalErrors(() =>
      bloque.swap.pix.create(params, orderOptions(options)),
    ),
  );
}

export const bloquePaymentsRepository: PaymentsRepository = {
  findRates,
  listPseBanks,
  createPseOrder,
  createBankTransferOrder,
  createBrebOrder,
  createRtpOrder,
  createExternalUsBankOrder,
  createSpeiDepositOrder,
  createSpeiOrder,
  createPixDepositOrder,
  createPixOrder,
};
