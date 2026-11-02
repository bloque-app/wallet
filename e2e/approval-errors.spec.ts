import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

/**
 * Error paths inside components' `catch` blocks, run against the production
 * build: the compiled output is what users get, and a miscompiled `catch`
 * only shows up there.
 */

const APPROVAL_URL = 'https://id.dev-bloque.app/approve#token=approval-token';

test('a transfer that needs a passkey opens the approval page', async ({
  page,
}) => {
  await installMockApi(page);
  await page.route('**/api/accounts/*/transfer', (route) =>
    route.fulfill({
      status: 428,
      json: {
        error: true,
        code: 'E_APPROVAL_REQUIRED',
        message: 'E_APPROVAL_REQUIRED',
        extra_details: {
          approval_token: 'approval-token',
          expires_at: Date.now() + 600_000,
          summary: { operation: 'accounts.transfer', fields: {} },
          approval_url: APPROVAL_URL,
        },
      },
    }),
  );
  await page.route('https://id.dev-bloque.app/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Aprobar</h1>' }),
  );
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/accounts/urn%3Apocket-main');
  await page.getByRole('button', { name: 'Transferir' }).first().click();
  await page.getByRole('button', { name: 'Orphan' }).click();
  await page.getByLabel(/Monto a transferir/).fill('3');
  await page.getByRole('button', { name: 'Transferir', exact: true }).click();

  await expect(page).toHaveURL(APPROVAL_URL);
  expect(pageErrors).toEqual([]);
});

test('the approval page explains a repeat whose outcome is unknown', async ({
  page,
}) => {
  await installMockApi(page);
  await page.route('**/api/origins/operation-approvals/result', (route) =>
    route.fulfill({ json: { status: 'ready', value: 'approval-1' } }),
  );
  await page.route('**/api/accounts/*/transfer', (route) =>
    route.fulfill({ status: 500, json: { message: 'E_INTERNAL' } }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'bloque:pending-approval',
      JSON.stringify({
        operation: {
          kind: 'transfer',
          input: {
            sourceUrn: 'urn:pocket-main',
            destinationUrn: 'urn:pocket-orphan',
            amount: '300',
            asset: 'COPM/2',
          },
        },
        pending: {
          approvalToken: 'approval-token',
          expiresAt: Date.now() + 600_000,
        },
        returnTo: '/accounts/urn%3Apocket-main',
      }),
    );
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/approval');

  await expect(
    page.getByText('No pudimos confirmar tu operación'),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
