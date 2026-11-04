import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { TopUpAmountStep } from './amount-step';
import { TopUpConfirmStep } from './confirm-step';
import { TopUpErrorStep } from './error-step';
import { TopUpPendingStep } from './pending-step';

describe('quoted transfer summaries', () => {
  test('shows gross, fee and net on the Colombian-bank amount step', () => {
    render(
      <TopUpAmountStep
        amount="10000"
        fee={5_500}
        isLoadingRate={false}
        rateError={null}
        rateSummary={{ amountDst: 4_500, ratio: 1 }}
        onAmountChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        showTotalToDebit={false}
        disclaimer={null}
        arrivalLabel={null}
      />,
    );

    expect(screen.getByText('Volver')).toBeInTheDocument();
    expect(screen.getByText('$ 5.500')).toBeInTheDocument();
    expect(screen.getByText('$ 4.500')).toBeInTheDocument();
    expect(screen.getByText('1 COPM = 1.0000 COP')).toBeInTheDocument();
  });

  test('keeps fee and net visible in bank confirmation', () => {
    render(
      <TopUpConfirmStep
        amount={10_000}
        amountDst={4_500}
        fee={5_500}
        ratio={1}
        bankName="Nubank"
        bankAccountType="savings"
        bankAccountNumber="123"
        bankAccountHolderName="Vanesa"
        identificationLabel="CC"
        identificationValue="100"
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/5\.500 COP/)).toBeInTheDocument();
    expect(screen.getByText(/4\.500 COP/)).toBeInTheDocument();
    expect(screen.getByText('1 COPM = 1.0000 COP')).toBeInTheDocument();
  });

  test('uses a recipient label for payout pending state', () => {
    render(
      <TopUpPendingStep
        amount={10_000}
        fee={5_500}
        receivedAmount={4_500}
        receivedLabel="Se recibe"
        onRefresh={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText(/Se recibe:/)).toBeInTheDocument();
    expect(screen.queryByText(/Recibirás:/)).not.toBeInTheDocument();
  });

  test('links failed payments to support email', () => {
    render(<TopUpErrorStep onRetry={vi.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Enviar email a soporte@bloque.team',
      }),
    ).toHaveAttribute('href', 'mailto:soporte@bloque.team');
  });
});
