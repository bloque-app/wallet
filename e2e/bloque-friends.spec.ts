import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test('an unknown alias shows a readable message instead of the raw code', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/send/bloque-friends');

  await page.locator('#friend-alias').fill('nobody@bloque.team');
  await page.locator('#friend-amount').fill('10');
  await page.getByRole('button', { name: 'Enviar dinero' }).click();

  await expect(page.getByText('No encontramos ese alias.')).toBeVisible();
  await expect(page.getByText('E_ALIAS_NOT_FOUND')).toHaveCount(0);
});
