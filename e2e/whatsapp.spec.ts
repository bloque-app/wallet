import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test('bottom nav opens the WhatsApp view', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'WhatsApp' })
    .click();

  await expect(page).toHaveURL(/\/whatsapp$/);
  await expect(page.getByText('Tu wallet en WhatsApp')).toBeVisible();
  await expect(page.getByText('Enviar por BRE-B')).toBeVisible();
  await expect(page.getByText('Recargar por PSE')).toBeVisible();
});

test('home card links to the WhatsApp view', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /Usa tu wallet por WhatsApp/ }).click();

  await expect(page).toHaveURL(/\/whatsapp$/);
});

test('CTA stays disabled until the number is configured', async ({ page }) => {
  await page.goto('/whatsapp');

  const ctas = page.getByRole('button', { name: /Abrir WhatsApp/ });
  await expect(ctas.first()).toBeDisabled();
  await expect(ctas.first()).toContainText('Próximamente');
});
