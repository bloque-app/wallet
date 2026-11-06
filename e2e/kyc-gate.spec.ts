import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

const MOVE_MONEY_GATE = 'Verifica tu identidad para mover dinero';
const KEY_GATE = 'Verifica tu identidad para registrar tu llave';

test.describe('a user who never started verification', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page, { kycWireStatus: 'not_started' });
  });

  test('is not pushed to verify from home', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Completa tu verificación')).toHaveCount(0);
  });

  test('sees the send methods and their fees, and is stopped inside one', async ({
    page,
  }) => {
    await page.goto('/send');
    const method = page.getByRole('link', { name: /Bancos ACH/ });
    await expect(method).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/0\.4%/).first()).toBeVisible();
    await expect(page.getByText(MOVE_MONEY_GATE)).toHaveCount(0);

    await method.click();
    await expect(page.getByText(MOVE_MONEY_GATE)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/\/kyc/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/send$/);
  });

  test('a deep link to a send method is stopped and verifies only on demand', async ({
    page,
  }) => {
    await page.goto('/send/colombian-banks');

    await expect(page.getByText(MOVE_MONEY_GATE)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Verificar identidad' }).click();
    await expect(page).toHaveURL(/\/kyc/);
  });

  test('sees the top-up methods, and the PSE flow is stopped', async ({
    page,
  }) => {
    await page.goto('/topup');
    await expect(page.getByText('Recargar saldo')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(MOVE_MONEY_GATE)).toHaveCount(0);

    await page
      .getByRole('button', { name: /^Bancos/ })
      .first()
      .click();
    await expect(page.getByText(MOVE_MONEY_GATE)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('Recargar saldo')).toBeVisible();
    await expect(page.getByText(MOVE_MONEY_GATE)).toHaveCount(0);
  });

  test('can browse BRE-B and see where to receive without verifying', async ({
    page,
  }) => {
    await page.goto('/breb-keys');
    await expect(
      page.getByText('Envía y recibe al instante desde cualquier banco'),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/breb-keys/deposit');
    await expect(page.getByText('Recibe con tus llaves BRE-B')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(KEY_GATE)).toHaveCount(0);
  });

  test('is asked to verify before the key registration screen', async ({
    page,
  }) => {
    await page.goto('/breb-keys/manage-keys');

    await expect(page.getByText(KEY_GATE)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Registrar' })).toHaveCount(
      0,
    );

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/breb-keys$/);
  });

  test('is stopped before paying with BRE-B', async ({ page }) => {
    await page.goto('/breb-keys/pay-transfer');

    await expect(page.getByText(MOVE_MONEY_GATE)).toBeVisible({
      timeout: 15_000,
    });
  });
});

test('a verification in review keeps the flow closed with its own copy', async ({
  page,
}) => {
  await installMockApi(page, {
    kycWireStatus: 'awaiting_compliance_verification',
  });

  await page.goto('/send/colombian-banks');

  await expect(page.getByText('Tu verificación está en revisión')).toBeVisible({
    timeout: 15_000,
  });
});
