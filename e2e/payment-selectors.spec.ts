import { expect, test } from '@playwright/test';
import { brebKey, installMockApi, mockAccounts } from './fixtures/mock-api';

const cardWithoutPocket = {
  ...mockAccounts.find((account) => account.urn === 'urn:card-bloque'),
  urn: 'urn:card-solo',
  id: 'urn:card-solo',
  ledger_account_id: 'ledger-solo',
};

const keyWithoutPocket = brebKey({
  urn: 'urn:breb-solo',
  ledgerId: 'ledger-solo',
  keyType: 'email',
  keyValue: 'solo@bloque.team',
  createdAt: '2026-08-01T00:00:00.000Z',
});

test('top-up only offers virtual accounts as destination', async ({ page }) => {
  await installMockApi(page, {
    accounts: [...mockAccounts, cardWithoutPocket],
  });
  await page.goto('/topup');
  await page.getByRole('button', { name: /^Bancos/ }).click();

  await expect(
    page
      .getByRole('listbox', { name: 'Bolsillos disponibles' })
      .getByRole('button'),
  ).toHaveCount(4);
});

test('BRE-B deposit hides keys on ledgers without a pocket', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...mockAccounts, keyWithoutPocket],
  });
  await page.goto('/breb-keys/deposit');

  await expect(page.getByText('pawhaus@bloque.team')).toBeVisible();
  await expect(page.getByText('solo@bloque.team')).toHaveCount(0);
});
