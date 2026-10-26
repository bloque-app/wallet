import type {
  ApprovalOutcome,
  ApprovalRepository,
} from '~/domain/approval/ports';
import {
  ApprovalFailedError,
  type ApprovalOperation,
  type PendingApproval,
} from '~/domain/approval/types';
import type { CreateOrderResult } from '~/domain/payments/ports';
import { bloque } from '~/lib/bloque';
import { bloqueAccountsRepository } from './accounts-repository';
import { withApprovalErrors } from './approval-errors';
import { bloquePaymentsRepository } from './payments-repository';

/**
 * Adapter for operation approvals, over the SDK's `approvals.collect` and
 * the accounts and payments adapters, which take the approval as an option.
 */

async function collect(pending: PendingApproval): Promise<string> {
  return await withApprovalErrors(() => bloque.approvals.collect(pending));
}

function orderOutcome(result: CreateOrderResult): ApprovalOutcome {
  return {
    kind: 'order',
    orderId: result.order.id,
    execution: result.execution ?? { kind: 'none' },
  };
}

async function runOperation(
  operation: ApprovalOperation,
  approval: string,
): Promise<ApprovalOutcome> {
  const options = { approval };
  switch (operation.kind) {
    case 'transfer':
      await bloqueAccountsRepository.transfer(operation.input, options);
      return { kind: 'done' };
    case 'bank-transfer-order':
      return orderOutcome(
        await bloquePaymentsRepository.createBankTransferOrder(
          operation.params,
          options,
        ),
      );
    case 'breb-order':
      return orderOutcome(
        await bloquePaymentsRepository.createBrebOrder(
          operation.params,
          options,
        ),
      );
    case 'rtp-order':
      return orderOutcome(
        await bloquePaymentsRepository.createRtpOrder(
          operation.params,
          options,
        ),
      );
    case 'external-us-bank-order':
      return orderOutcome(
        await bloquePaymentsRepository.createExternalUsBankOrder(
          operation.params,
          options,
        ),
      );
    case 'spei-order':
      return orderOutcome(
        await bloquePaymentsRepository.createSpeiOrder(
          operation.params,
          options,
        ),
      );
    case 'pix-order':
      return orderOutcome(
        await bloquePaymentsRepository.createPixOrder(
          operation.params,
          options,
        ),
      );
    case 'create-card':
      await bloqueAccountsRepository.createCard(operation.input, options);
      return { kind: 'done' };
    case 'activate-card':
      await bloqueAccountsRepository.activateCard(operation.urn, options);
      return { kind: 'done' };
    case 'card-preferred-asset':
      await bloqueAccountsRepository.updateCardPreferredAsset(
        operation.urn,
        operation.asset,
        options,
      );
      return { kind: 'done' };
  }
}

function isRateExpired(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'E_RATE_EXPIRED' ||
    (typeof message === 'string' && message.includes('E_RATE_EXPIRED'))
  );
}

async function run(
  operation: ApprovalOperation,
  approval: string,
): Promise<ApprovalOutcome> {
  try {
    return await runOperation(operation, approval);
  } catch (error) {
    // The approved rate expired while the person was approving: the order
    // can only be placed again from the start, with a new rate.
    if (isRateExpired(error)) {
      throw new ApprovalFailedError('rate_expired', { code: 'E_RATE_EXPIRED' });
    }
    throw error;
  }
}

export const bloqueApprovalRepository: ApprovalRepository = {
  collect,
  run,
};
