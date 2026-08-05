import { expect, test } from '@playwright/test';
import { installMockApi, TOS_GATE_PATH } from './fixtures/mock-api';

/**
 * That the wallet *routes* an unaccepted identity to the hosted TOS gate.
 *
 * This suite exists because the unit tests around it were not enough, in a
 * way worth recording. `src/domain/tos/` and `src/infra/bloque/tos-repository`
 * shipped complete, correct and covered — and referenced by nothing. Every
 * test passed; no user was ever sent to the gate. Coverage of the pieces said
 * nothing about whether they were plugged in.
 *
 * So these assert the wiring specifically: the effect in `__root.tsx`, the
 * `tosStatus` that `auth-context` hangs off `user`, and the repository call
 * between them. Delete any one of those and a test here fails — which is not
 * true of `tos-gate-redirect.test.ts`, whose subject is a pure function.
 */

test('sends an identity that still owes an acceptance to the hosted gate', async ({
  page,
}) => {
  await installMockApi(page, { missingRequirements: ['tos'] });

  await page.goto('/');

  await page.waitForURL(`**${TOS_GATE_PATH}**`, { timeout: 15_000 });
  expect(page.url()).toContain(TOS_GATE_PATH);
  // The capability token rides in the fragment, which browsers never send to
  // a server — losing it would break the gate in a way a URL-path assertion
  // alone would not catch.
  expect(page.url()).toContain('#token=');
});

test('leaves an identity that has already accepted alone', async ({ page }) => {
  await installMockApi(page, { missingRequirements: [] });

  await page.goto('/');

  // Give the redirect a chance to fire before concluding it did not.
  await page.waitForTimeout(2_000);
  expect(page.url()).not.toContain(TOS_GATE_PATH);
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();
});

test('does not bounce a returning user back into the gate', async ({
  page,
}) => {
  // The redirect loop. Compliance records the acceptance, not the wallet, so
  // on the render right after the gate hands the user back `tosStatus` is
  // still 'required' — the `tos=` parameter is the only thing that stops it
  // sending them straight back in, forever.
  await installMockApi(page, { missingRequirements: ['tos'] });

  await page.goto('/?tos=accepted');

  await page.waitForTimeout(2_000);
  expect(page.url()).not.toContain(TOS_GATE_PATH);
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();
});

test('lets the user in when the gate cannot be minted', async ({ page }) => {
  // Fails open, deliberately. A misconfigured allowlist or a compliance
  // outage should delay the prompt, not lock everyone out of their wallet
  // behind a blank screen.
  //
  // A 400 rather than a 5xx: the SDK retries 5xx with backoff, so that would
  // measure retry timing rather than the fail-open path. This is also the
  // likelier failure in practice — `return_url` not on the origin's
  // allowlist is a config mistake, not an outage.
  await installMockApi(page, { missingRequirements: ['tos'] });
  await page.route(`**${TOS_GATE_PATH}/start`, (route) =>
    route.fulfill({
      status: 400,
      json: {
        code: 'E_RETURN_URL_NOT_ALLOWED',
        message: 'return_url origin is not in the configured allowlist',
      },
    }),
  );

  await page.goto('/');

  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible({ timeout: 15_000 });
  expect(page.url()).not.toContain(TOS_GATE_PATH);
});

test('asks before redirecting when the session goes stale mid-use', async ({
  page,
}) => {
  // The deploy case. Sign-in already routes an unaccepted identity to the gate,
  // so this covers the one it cannot: a tab that was already open and compliant
  // when a new document version activated.
  //
  // Redirecting outright here would be wrong — they may be halfway through a
  // transfer — so the wallet asks, and they choose when to go.
  const api = await installMockApi(page, { missingRequirements: [] });

  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();

  // Compliance changes its mind underneath the open session.
  api.setMissingRequirements(['tos']);
  // The wallet re-reads on focus; dispatching it beats waiting out the timer.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  // Still on the wallet, not yanked to the gate.
  expect(page.url()).not.toContain(TOS_GATE_PATH);

  await dialog.getByRole('button').click();
  await page.waitForURL(`**${TOS_GATE_PATH}**`, { timeout: 15_000 });
  expect(page.url()).toContain('#token=');
});

test('does not nag an open session that is still compliant', async ({
  page,
}) => {
  // The recheck runs on every focus, so a bug here would put a dialog in front
  // of every compliant user who tabs back to the wallet.
  const api = await installMockApi(page, { missingRequirements: [] });

  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();

  api.setMissingRequirements([]);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(2_000);

  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(page.url()).not.toContain(TOS_GATE_PATH);
});
