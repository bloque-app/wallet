import { expect, type Page, test } from '@playwright/test';
import { installMockApi, mockAccounts } from './fixtures/mock-api';

const orphanPocket = mockAccounts.filter(
  (account) => account.ledger_account_id === 'ledger-orphan',
);

const cardWithoutPocket = {
  ...mockAccounts.find((account) => account.urn === 'urn:card-bloque'),
  urn: 'urn:card-solo',
  id: 'urn:card-solo',
  ledger_account_id: 'ledger-solo',
};

function waitForKeyCreation(page: Page) {
  return page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/mediums/breb',
  );
}

async function registerEmailKey(page: Page) {
  const row = page
    .getByText('ada@bloque.team', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await row.getByRole('button', { name: 'Registrar' }).click();
}

test('with one virtual account the new key is anchored to it', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...orphanPocket, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys');

  const request = waitForKeyCreation(page);
  await registerEmailKey(page);

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-orphan',
  );
});

test('a ledgerId from the URL that is not a virtual account is ignored', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...orphanPocket, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys?ledgerId=ledger-solo');

  const request = waitForKeyCreation(page);
  await registerEmailKey(page);

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-orphan',
  );
});

test('with several virtual accounts the user picks among pockets only', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...mockAccounts, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys');

  await registerEmailKey(page);
  await expect(
    page.getByText('Elige el bolsillo para tu nueva llave'),
  ).toBeVisible();

  const options = page
    .getByRole('listbox', { name: 'Bolsillos disponibles' })
    .getByRole('button');
  await expect(options).toHaveCount(4);

  await options.filter({ hasText: 'PawHaus' }).click();
  const request = waitForKeyCreation(page);
  await page.getByRole('button', { name: 'Confirmar' }).click();

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-pawhaus',
  );
});
