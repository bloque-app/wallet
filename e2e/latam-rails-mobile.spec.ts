import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

const speiRate = {
  id: 'rate-spei',
  sig: 'sig-spei',
  swap_sig: 'swap-sig-spei',
  maker: 'did:bloque:maker',
  edge: ['MXN/2', 'MXNB/2'],
  fee: {
    at: 1,
    value: '97995',
    formula: 'amount_src * (1 - provider_pct - bloque_pct) - provider_fixed',
    components: [
      {
        at: 1,
        name: 'provider_pct',
        type: 'percentage',
        value: '1/400',
        percentage: '0.25',
      },
      { at: 1, name: 'provider_fixed', type: 'fixed', value: '5', amount: '5' },
      {
        at: 1,
        name: 'bloque_pct',
        type: 'percentage',
        value: '7/400',
        percentage: '1.75',
        role: 'bloque_fee',
      },
    ],
  },
  at: '2026-01-01T00:00:00.000Z',
  until: '2099-01-01T00:00:00.000Z',
  from_medium: ['spei'],
  to_medium: ['kusama'],
  rate: [100000, 97995],
  ratio: 0.97995,
  from_limits: ['10000', '10000000'],
  to_limits: ['9300', '9799500'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

test.use({ viewport: { width: 320, height: 640 }, hasTouch: true });

test('SPEI top-up shows the fee breakdown without overflowing a 320px screen', async ({
  page,
}) => {
  await installMockApi(page);
  await page.route('**/api/rates?**', (route) => {
    const amount = Number(
      new URL(route.request().url()).searchParams.get('amount_src'),
    );
    return route.fulfill({
      json: { rates: amount >= 10000 ? [speiRate] : [] },
    });
  });

  await page.goto('/topup/spei');
  await page.getByRole('button', { name: /Bolsillo Main/ }).click();
  await page.getByLabel(/Monto/).fill('9999999.99');
  await expect(page.getByText(/Comisión \(2% \+ \$5\.00 MXN\)/)).toBeVisible();
  await page.screenshot({
    path: 'test-results/spei-mobile-amount.png',
    fullPage: true,
  });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);

  await page.getByLabel(/Monto/).fill('50');
  await expect(
    page.getByText('No hay una tasa disponible para este monto.', {
      exact: false,
    }),
  ).toBeVisible();

  await page.getByLabel(/Monto/).fill('1000');
  await expect(page.getByText('$975.00 MXN')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel(/Nombre completo/).fill('Ana Pérez');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(/Comisión \(2% \+ \$5\.00 MXN\)/)).toBeVisible();
  await expect(page.getByText('$25.00 MXN')).toBeVisible();
  await page.screenshot({
    path: 'test-results/spei-mobile-confirm.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});
