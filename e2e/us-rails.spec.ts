import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test('send lists US banks as coming soon without a link', async ({ page }) => {
  await page.goto('/send');

  const usOption = page
    .getByText('Bancos/billeteras')
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await expect(usOption).toContainText('Próximamente');
  await expect(usOption.getByRole('link')).toHaveCount(0);
});

test('top-up disables the US banks method as coming soon', async ({ page }) => {
  await page.goto('/topup');

  const usMethod = page.getByRole('button', { name: /Desde bancos/ });
  await expect(usMethod).toBeDisabled();
  await expect(
    usMethod.locator('xpath=..').getByText('Próximamente'),
  ).toBeVisible();
});

for (const path of ['/topup/us-banks', '/send/us-banks']) {
  test(`${path} opened directly shows coming soon instead of the flow`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(
      page.getByText('Esta opción estará disponible muy pronto.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
  });
}

test('legal fees no longer list a US section', async ({ page }) => {
  await page.goto('/legal/fees');

  await expect(page.getByText('Colombia', { exact: true })).toBeVisible();
  await expect(page.getByText('Estados Unidos', { exact: true })).toHaveCount(
    0,
  );
});
