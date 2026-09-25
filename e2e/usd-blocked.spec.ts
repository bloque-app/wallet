import { expect, test } from '@playwright/test';
import { installMockApi, mockAccounts } from './fixtures/mock-api';

const singlePocket = mockAccounts.filter(
  (account) => account.ledger_account_id === 'ledger-main',
);

test('Bloque Friends blocks USD and sends in COP', async ({ page }) => {
  await installMockApi(page, { accounts: singlePocket });
  await page.goto('/send/bloque-friends');

  const usd = page.getByRole('button', { name: /^USD/ });
  await expect(usd).toBeDisabled();
  await expect(usd).toContainText('Próximamente');

  await page.locator('#friend-alias').fill('friend@bloque.team');
  await page.locator('#friend-amount').fill('10');
  const transfer = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      /\/transfer$/.test(new URL(request.url()).pathname),
  );
  await page.getByRole('button', { name: 'Enviar dinero' }).click();
  await page.getByRole('button', { name: 'Confirmar envio' }).click();

  expect((await transfer).postDataJSON().asset).toBe('COPM/2');
});

test('own-account transfer is blocked while a USD balance is selected', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/accounts/urn%3Apocket-pawhaus');

  const transfer = page.getByRole('button', {
    name: /Transferir a otro bolsillo/,
  });
  await expect(transfer).toBeDisabled();
  await expect(transfer).toContainText('Próximamente');
});

test('own-account transfer stays available for COP', async ({ page }) => {
  await installMockApi(page);
  await page.goto('/accounts/urn%3Apocket-main');

  await expect(
    page.getByRole('button', { name: /Transferir a otro bolsillo/ }),
  ).toBeEnabled();
});

test('card cannot switch its preferred asset to USD', async ({ page }) => {
  await installMockApi(page);
  await page.goto('/card/details/urn%3Acard-pawhaus-1');

  const section = page
    .getByText('Activo de pago preferido')
    .locator('xpath=ancestor::section[1]');
  const usd = section.getByRole('button', { name: /USD/ });
  await expect(usd).toBeDisabled();
  await expect(usd).toContainText('Próximamente');
});
