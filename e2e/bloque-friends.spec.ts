import { expect, type Page, test } from '@playwright/test';
import { installMockApi, mockAccounts } from './fixtures/mock-api';

const singlePocket = mockAccounts.filter(
  (account) => account.ledger_account_id === 'ledger-main',
);

async function fillForm(page: Page, alias: string) {
  await page.locator('#friend-alias').fill(alias);
  await page.locator('#friend-amount').fill('10');
}

function waitForTransfer(page: Page) {
  return page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      /\/api\/accounts\/[^/]+\/transfer$/.test(new URL(request.url()).pathname),
  );
}

async function confirmSend(page: Page) {
  await page.getByRole('button', { name: 'Enviar dinero' }).click();
  await page.getByRole('button', { name: 'Confirmar envio' }).click();
}

test('an unknown alias shows a readable message instead of the raw code', async ({
  page,
}) => {
  await installMockApi(page, { accounts: singlePocket });
  await page.goto('/send/bloque-friends');

  await fillForm(page, 'nobody@bloque.team');
  await page.getByRole('button', { name: 'Enviar dinero' }).click();

  await expect(page.getByText('No encontramos ese alias.')).toBeVisible();
  await expect(page.getByText('E_ALIAS_NOT_FOUND')).toHaveCount(0);
});

test('a single pocket is the default source', async ({ page }) => {
  await installMockApi(page, { accounts: singlePocket });
  await page.goto('/send/bloque-friends');

  await fillForm(page, 'friend@bloque.team');
  const transfer = waitForTransfer(page);
  await confirmSend(page);

  expect(new URL((await transfer).url()).pathname).toBe(
    '/api/accounts/urn:pocket-main/transfer',
  );
});

test('with several pockets the user must pick the source', async ({ page }) => {
  await installMockApi(page);
  await page.goto('/send/bloque-friends');

  await fillForm(page, 'friend@bloque.team');
  const sendButton = page.getByRole('button', { name: 'Enviar dinero' });
  await expect(sendButton).toBeDisabled();

  await page
    .getByRole('listbox', { name: 'Bolsillos disponibles' })
    .getByRole('button')
    .filter({ hasText: 'PawHaus' })
    .click();
  await expect(sendButton).toBeEnabled();

  const transfer = waitForTransfer(page);
  await confirmSend(page);

  expect(new URL((await transfer).url()).pathname).toBe(
    '/api/accounts/urn:pocket-pawhaus/transfer',
  );
});
