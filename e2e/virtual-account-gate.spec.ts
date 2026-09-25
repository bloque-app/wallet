import { expect, test } from '@playwright/test';
import { installMockApi, mockAccounts } from './fixtures/mock-api';

const cardOnlyLedger = mockAccounts.filter(
  (account) =>
    account.ledger_account_id === 'ledger-pawhaus' && account.medium === 'card',
);

const GATED_PATHS = [
  '/topup',
  '/topup/us-banks',
  '/send',
  '/send/bloque-friends',
  '/send/colombian-banks',
  '/breb-keys',
  '/breb-keys/manage-keys',
  '/breb-keys/deposit',
  '/breb-keys/pay-transfer',
];

for (const [scenario, accounts] of [
  ['no accounts', []],
  ['only a ledger without a pocket', cardOnlyLedger],
] as const) {
  test.describe(`without a virtual account (${scenario})`, () => {
    test.beforeEach(async ({ page }) => {
      await installMockApi(page, { accounts: [...accounts] });
    });

    test('home quick actions are disabled', async ({ page }) => {
      await page.goto('/');

      for (const label of ['Recargar', 'Enviar', 'BRE-B']) {
        await expect(page.getByRole('link', { name: label })).toHaveCount(0);
      }
      await page.getByRole('button', { name: 'Recargar' }).click();
      await expect(
        page.getByText('Crea un bolsillo primero para poder usar esta opción.'),
      ).toBeVisible();
    });

    for (const path of GATED_PATHS) {
      test(`${path} opened directly shows the pocket gate`, async ({
        page,
      }) => {
        await page.goto(path);

        await expect(page.getByText('Necesitas un bolsillo')).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Crear bolsillo' }),
        ).toBeVisible();
      });
    }
  });
}

test('add-product is disabled on a ledger without a pocket', async ({
  page,
}) => {
  await installMockApi(page, { accounts: cardOnlyLedger });
  await page.goto('/accounts/urn%3Acard-pawhaus-1');

  await expect(
    page.getByRole('button', { name: 'Agregar producto' }),
  ).toBeDisabled();
  await expect(
    page.getByText('Solo puedes agregar productos a un bolsillo activo.'),
  ).toBeVisible();
});

test('gated routes render normally with a virtual account', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/send');

  await expect(page.getByText('Necesitas un bolsillo')).toHaveCount(0);
  await expect(page.getByText('Bancos/billeteras')).toBeVisible();
});
