import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test('/convert shows coming soon', async ({ page }) => {
  await installMockApi(page);
  await page.goto('/convert');

  await expect(
    page.getByText('Esta opción estará disponible muy pronto.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/\/$/);
});
