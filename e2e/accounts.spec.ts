import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test('lands on the ledger-grouped accounts list with a mocked, authenticated session', async ({
  page,
}) => {
  await page.goto('/accounts');

  await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();

  await expect(page.getByText('Main', { exact: true })).toBeVisible();
  await expect(page.getByText('PawHaus', { exact: true })).toBeVisible();
  await expect(page.getByText('Bloque', { exact: true })).toBeVisible();
  await expect(page.getByText('Orphan', { exact: true })).toBeVisible();

  await expect(
    page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByText('Cuentas'),
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
