import { expect, test } from '@playwright/test';
import { installMockApi, mockAccounts } from './fixtures/mock-api';

const singleAccount = mockAccounts.filter(
  (account) => account.ledger_account_id === 'ledger-orphan',
);

test.describe('back button from account detail', () => {
  test('returns home when a single account was opened from home', async ({
    page,
  }) => {
    await installMockApi(page, { accounts: singleAccount });
    await page.goto('/');
    await page.getByRole('button', { name: 'Bolsillo Orphan' }).click();
    await expect(page).toHaveURL(/\/accounts\/urn(%3A|:)pocket-orphan/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('returns to profile when a single account was opened from profile', async ({
    page,
  }) => {
    await installMockApi(page, { accounts: singleAccount });
    await page.goto('/profile');
    await page.getByText('Todos los bolsillos').click();
    await expect(page).toHaveURL(/\/accounts\/urn(%3A|:)pocket-orphan/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('walks back through the list to profile with several accounts', async ({
    page,
  }) => {
    await installMockApi(page);
    await page.goto('/profile');
    await page.getByText('Todos los bolsillos').click();
    await page.getByText('Main', { exact: true }).click();
    await expect(page).toHaveURL(/\/accounts\/urn(%3A|:)pocket-main/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/accounts\?from=profile$/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('returns home when an account was opened from the home carousel', async ({
    page,
  }) => {
    await installMockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bolsillo Main' }).click();
    await expect(page).toHaveURL(/\/accounts\/urn(%3A|:)pocket-main/);

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('accounts', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page);
  });

  test('lands on the ledger-grouped accounts list with a mocked, authenticated session', async ({
    page,
  }) => {
    await page.goto('/accounts');

    await expect(
      page.getByRole('heading', { name: 'Bolsillos' }),
    ).toBeVisible();

    await expect(page.getByText('Main', { exact: true })).toBeVisible();
    await expect(page.getByText('PawHaus', { exact: true })).toBeVisible();
    await expect(page.getByText('Bloque', { exact: true })).toBeVisible();
    await expect(page.getByText('Orphan', { exact: true })).toBeVisible();

    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByText('Movimientos'),
    ).toBeVisible();
  });

  test('opens a single account and lists its associated products', async ({
    page,
  }) => {
    await page.goto('/accounts');
    await page.getByText('Main', { exact: true }).click();

    await expect(page).toHaveURL(/\/accounts\/urn(%3A|:)pocket-main/);
    await expect(page.getByText('Productos asociados')).toBeVisible();
  });

  /**
   * Regression for the add-product drawer's history bookkeeping racing a
   * same-tick navigate() away from the page (see `skipDrawerHistoryOnce` in
   * `src/lib/navigation.ts`): closing the drawer while navigating used to get
   * silently reverted by the drawer's own "rewind on close" history handling,
   * because it only checks whether the URL has changed *yet* — which it
   * hadn't, since navigate() hadn't committed. No console error, no failed
   * request, just a click that visibly did nothing.
   */
  test('picking BRE-B key or Plaid from add-product navigates away instead of silently no-op-ing', async ({
    page,
  }) => {
    await page.goto('/accounts/urn%3Apocket-orphan');

    await page.getByRole('button', { name: 'Agregar producto' }).click();
    await page.getByRole('button', { name: /Llave BRE-B/ }).click();
    await expect(page).toHaveURL(/breb-keys\/manage-keys/);

    await page.goto('/accounts/urn%3Apocket-orphan');
    await page.getByRole('button', { name: 'Agregar producto' }).click();
    await page.getByRole('button', { name: /Plaid/ }).click();
    await expect(page).toHaveURL(/topup\/us-banks/);
  });
});
