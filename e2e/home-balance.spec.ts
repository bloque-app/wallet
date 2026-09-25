import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

test('home shows COP by default and blocks switching to USD', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/');

  const usd = page.getByRole('button').filter({ hasText: /^USD/ });
  await expect(usd).toBeDisabled();
  await expect(usd).toContainText('Próximamente');
  await expect(
    page.getByRole('button').filter({ hasText: /^COP$/ }),
  ).toBeEnabled();
  await expect(
    page.getByText('Saldo disponible').locator('xpath=ancestor::section[1]'),
  ).toContainText('COP');
});

test('home carousel shows the COP balance as the main one', async ({
  page,
}) => {
  await installMockApi(page);
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Bolsillo Main' }),
  ).toContainText('5.000');
});
