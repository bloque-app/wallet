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

test('only pockets funded in the selected currency are available', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/send/bloque-friends');

  await fillForm(page, 'friend@bloque.team');
  const sendButton = page.getByRole('button', { name: 'Enviar dinero' });
  await expect(sendButton).toBeEnabled();
  const accountPicker = page.getByRole('listbox', {
    name: 'Bolsillos disponibles',
  });
  await expect(accountPicker.getByRole('button')).toHaveCount(1);
  await expect(
    accountPicker.getByRole('button', { name: /Bolsillo Main/ }),
  ).toBeVisible();
  await expect(accountPicker.getByText('PawHaus')).toHaveCount(0);

  const transfer = waitForTransfer(page);
  await confirmSend(page);

  expect(new URL((await transfer).url()).pathname).toBe(
    '/api/accounts/urn:pocket-main/transfer',
  );
});

test('changing to a currency without a funded pocket clears the source', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/send/bloque-friends');

  await fillForm(page, 'friend@bloque.team');
  await expect(
    page.getByRole('button', { name: 'Enviar dinero' }),
  ).toBeEnabled();

  await page.getByRole('button', { name: 'MXN' }).click();

  await expect(
    page.getByText('No encontramos un bolsillo origen disponible.'),
  ).toBeVisible();
  await expect(
    page.getByRole('listbox', { name: 'Bolsillos disponibles' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Enviar dinero' }),
  ).toBeDisabled();
});

test('an amount above the selected pocket balance cannot be sent', async ({
  page,
}) => {
  await installMockApi(page, { accounts: singlePocket });
  await page.goto('/send/bloque-friends');

  await page.locator('#friend-alias').fill('friend@bloque.team');
  await page.locator('#friend-amount').fill('5001');

  await expect(
    page.getByText(
      'El saldo de este bolsillo no alcanza para la transferencia.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enviar dinero' }),
  ).toBeDisabled();
});
