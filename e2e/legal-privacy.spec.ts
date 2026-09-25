import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test('profile opens the privacy policy and back returns to profile', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/profile');
  await page.getByText('Política de privacidad').click();

  await expect(page).toHaveURL(/\/legal\/privacy/);
  await expect(
    page.getByRole('heading', {
      name: '1. IDENTIFICACIÓN DEL RESPONSABLE DEL TRATAMIENTO',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '25. VIGENCIA' }),
  ).toBeVisible();
  await expect(page.getByText('Próximamente')).toHaveCount(0);
  await expect(page.getByText('Kontigo')).toHaveCount(0);

  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
