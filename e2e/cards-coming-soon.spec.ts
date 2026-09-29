import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

for (const path of ['/card', '/card/details/urn%3Acard-main']) {
  test(`${path} shows coming soon`, async ({ page }) => {
    await page.goto(path);

    await expect(
      page.getByText('Esta opción estará disponible muy pronto.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test('card in add-product is disabled as coming soon', async ({ page }) => {
  await page.goto('/accounts/urn%3Apocket-orphan');

  await page.getByRole('button', { name: 'Agregar producto' }).click();
  const card = page.getByRole('button', { name: /Tarjeta/ });
  await expect(card).toBeDisabled();
  await expect(card).toContainText('Próximamente');
});
