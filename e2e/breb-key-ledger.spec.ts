import { expect, type Page, test } from '@playwright/test';
import { brebKey, installMockApi, mockAccounts } from './fixtures/mock-api';

const orphanPocket = mockAccounts.filter(
  (account) => account.ledger_account_id === 'ledger-orphan',
);

const cardWithoutPocket = {
  ...mockAccounts.find((account) => account.urn === 'urn:card-bloque'),
  urn: 'urn:card-solo',
  id: 'urn:card-solo',
  ledger_account_id: 'ledger-solo',
};

function waitForKeyCreation(page: Page) {
  return page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/mediums/breb',
  );
}

async function registerDocumentKey(page: Page) {
  const row = page
    .getByText('@bq1012345678', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await row.getByRole('button', { name: 'Registrar' }).click();
}

test('with one virtual account the new key is anchored to it', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...orphanPocket, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys');

  const request = waitForKeyCreation(page);
  await registerDocumentKey(page);

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-orphan',
  );
});

test('a ledgerId from the URL that is not a virtual account is ignored', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...orphanPocket, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys?ledgerId=ledger-solo');

  const request = waitForKeyCreation(page);
  await registerDocumentKey(page);

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-orphan',
  );
});

test('with several virtual accounts the user picks among pockets only', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [...mockAccounts, cardWithoutPocket],
  });
  await page.goto('/breb-keys/manage-keys');

  await registerDocumentKey(page);
  await expect(
    page.getByText('Elige el bolsillo para tu nueva llave'),
  ).toBeVisible();

  const options = page
    .getByRole('listbox', { name: 'Bolsillos disponibles' })
    .getByRole('button');
  await expect(options).toHaveCount(4);

  await options.filter({ hasText: 'PawHaus' }).click();
  const request = waitForKeyCreation(page);
  await page.getByRole('button', { name: 'Confirmar' }).click();

  expect((await request).postDataJSON().ledger_account_id).toBe(
    'ledger-pawhaus',
  );
});

test('suggests four bq keys from the profile and never the email', async ({
  page,
}) => {
  await installMockApi(page, { accounts: orphanPocket });
  await page.goto('/breb-keys/manage-keys');

  for (const key of [
    '@bqadalovelace345678',
    '@bqadabloque345678',
    '@bq1012345678',
    '@bqalovelace345678',
  ]) {
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('ada@bloque.team', { exact: true })).toHaveCount(
    0,
  );
});

test('a failed or deleted key stays suggested, an in-progress one moves to ready keys', async ({
  page,
}) => {
  const key = (urn: string, keyValue: string, status: string) =>
    brebKey({
      urn,
      ledgerId: 'ledger-orphan',
      keyType: 'ALPHA',
      keyValue,
      createdAt: '2026-10-27T15:00:00.000Z',
      status,
    });
  await installMockApi(page, {
    accounts: [
      ...orphanPocket,
      key('urn:breb-failed', '@bq1012345678', 'creation_failed'),
      key('urn:breb-deleted', '@bqadabloque345678', 'deleted'),
      key('urn:breb-pending', '@bqalovelace345678', 'creation_in_progress'),
    ],
  });
  await page.goto('/breb-keys/manage-keys');

  const suggestions = page
    .getByText('Registra tus llaves en BRE-B')
    .locator('xpath=..');
  await expect(
    suggestions.getByText('@bq1012345678', { exact: true }),
  ).toBeVisible();
  await expect(
    suggestions.getByText('@bqadabloque345678', { exact: true }),
  ).toBeVisible();

  const ready = page.getByText('Llaves listas para usar').locator('xpath=..');
  await expect(
    ready.getByText('@bqalovelace345678', { exact: true }),
  ).toBeVisible();
  await expect(ready.getByText('En proceso', { exact: true })).toBeVisible();
  await expect(
    suggestions.getByText('@bqalovelace345678', { exact: true }),
  ).toHaveCount(0);
});

test('a key the provider failed stays suggested with the reason, even on an active account', async ({
  page,
}) => {
  await installMockApi(page, {
    accounts: [
      ...orphanPocket,
      brebKey({
        urn: 'urn:breb-taken',
        ledgerId: 'ledger-orphan',
        keyType: 'ALPHA',
        keyValue: '@bq1012345678',
        createdAt: '2026-10-27T15:00:00.000Z',
        keyStatus: 'failed',
        actionCode: 'KEY007',
      }),
    ],
  });
  await page.goto('/breb-keys/manage-keys');

  await expect(page.getByText('Llaves listas para usar')).toHaveCount(0);
  const row = page
    .getByText('@bq1012345678', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await expect(
    row.getByText('Ya está registrada en BRE-B. Prueba con otra.'),
  ).toBeVisible();
  await expect(row.getByRole('button', { name: 'Registrar' })).toBeVisible();
});

test('a key the provider rejects after accepting it shows the conflict drawer', async ({
  page,
}) => {
  const created = (keyStatus: string, actionCode?: string) =>
    brebKey({
      urn: 'urn:breb-new',
      ledgerId: 'ledger-orphan',
      keyType: 'ALPHA',
      keyValue: '@bq1012345678',
      createdAt: '2026-10-27T15:00:00.000Z',
      keyStatus,
      actionCode,
    });
  let posted = false;
  await installMockApi(page, { accounts: orphanPocket });
  await page.route(
    (url) => url.pathname === '/api/accounts',
    (route) =>
      route.fulfill({
        json: {
          accounts: posted
            ? [...orphanPocket, created('failed', 'KEY007')]
            : orphanPocket,
        },
      }),
  );
  await page.route(
    (url) => url.pathname === '/api/mediums/breb',
    (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      posted = true;
      return route.fulfill({
        json: { result: { account: created('processing') } },
      });
    },
  );
  await page.goto('/breb-keys/manage-keys');

  await registerDocumentKey(page);
  await expect(
    page.getByText(
      'Estamos registrando tu llave. Te avisamos en unos segundos.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Esta llave ya está registrada')).toBeVisible({
    timeout: 10_000,
  });
});
