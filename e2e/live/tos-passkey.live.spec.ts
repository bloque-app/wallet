import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * The TOS enrolment flow, in a real browser, against the deployed test stack.
 *
 * Deliberately **not** mocked, unlike `e2e/accounts.spec.ts`. The whole point
 * is the part no mock can stand in for: a real browser's WebAuthn stack. Our
 * headless harness in payment-rails polyfills `navigator.credentials` outright,
 * so it has never once exercised the browser's own implementation — the
 * Permissions Policy, the rp-id/origin check, or `getPublicKey()`. This does.
 *
 * Runs against the deployed wallet rather than a local build so the origin is
 * `account.dev-bloque.app`. That matters: the gate derives its rp id from the
 * page host, and only real Bloque origins produce a real answer.
 *
 * Needs a human for the OTP, so it is excluded from the default run:
 *
 *   npx playwright test --config playwright.live.config.ts --headed
 *
 * It fills the email, then **waits for you to type the six digits into the
 * browser it just opened** — no file passing, no clipboard. That is both
 * simpler and closer to what a real person does, and it avoids the code
 * expiring while it is relayed through a third place.
 */

const EMAIL = process.env.BLOQUE_TEST_EMAIL ?? 'pablo+test.1@bloque.team';
/** Long, because a human has to read an email and type six digits. */
const LOGIN_TIMEOUT_MS = Number(
  process.env.BLOQUE_LOGIN_TIMEOUT_MS ?? 15 * 60_000,
);
/**
 * Where the logged-in session is kept between runs.
 *
 * An OTP costs a human round-trip, so paying it once per session beats paying
 * it per run. Delete this file (or set BLOQUE_FRESH_LOGIN=1) to force a new
 * login — needed when switching test accounts, or once the session expires.
 */
const SESSION_FILE =
  process.env.BLOQUE_SESSION_FILE ?? '.auth/live-session.json';

test('enrols a passkey through the hosted TOS gate', async ({ page }) => {
  // Generous: a human is in the loop, and the chain legs take minutes.
  test.setTimeout(15 * 60_000);

  // ── a real, virtual authenticator ────────────────────────────────────────
  // CDP-only, which is why this suite is Chromium-only. This is the browser's
  // genuine WebAuthn implementation driven against a software authenticator —
  // not a polyfill over it.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        // The gate asks for `residentKey: "required"` and offers only ES256,
        // so an authenticator without these can't satisfy it.
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );

  // ── log in, or resume ────────────────────────────────────────────────────
  const haveSession =
    existsSync(SESSION_FILE) && process.env.BLOQUE_FRESH_LOGIN !== '1';

  if (haveSession) {
    await page
      .context()
      .addCookies(JSON.parse(readFileSync(SESSION_FILE, 'utf8')).cookies);
    await page.goto('/');
    if (page.url().includes('/login')) {
      throw new Error(
        `The saved session at ${SESSION_FILE} is no longer valid. ` +
          'Re-run with BLOQUE_FRESH_LOGIN=1 to log in again.',
      );
    }
    console.log('  ✅ resumed the saved session (no OTP needed)');
  } else {
    await page.goto('/login');
    await page.getByRole('button', { name: /Continuar con correo/i }).click();
    await page.locator('#login-input').fill(EMAIL);
    await page
      .getByRole('button', { name: /Continuar|Enviar/i })
      .first()
      .click();

    console.log(
      `\n  ⏳ An OTP has been sent to ${EMAIL}.\n` +
        `     Type it into the browser window that just opened.\n` +
        `     Waiting up to ${LOGIN_TIMEOUT_MS / 60_000} minutes…\n`,
    );

    // Landing anywhere authenticated is enough — the session cookie is all the
    // rest of this needs. Waiting on navigation rather than on the code itself
    // means a mistyped digit just gets retried in the browser, instead of
    // failing the run.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: LOGIN_TIMEOUT_MS,
    });
    console.log('  ✅ logged in');

    mkdirSync('.auth', { recursive: true });
    await page.context().storageState({ path: SESSION_FILE });
    console.log(`  ✅ session saved to ${SESSION_FILE}`);
  }

  // ── the wallet routes to the gate on its own ─────────────────────────────
  // Waiting rather than minting a gate link here is the whole point: that the
  // *wallet* sends an unaccepted identity to the gate is the behaviour under
  // test, so a test that navigated there itself would pass with the wallet
  // wiring absent entirely — which is exactly what happened. An earlier
  // version of this file minted its own gate, saw `?tos=accepted`, and I read
  // that as proof the wallet had driven the flow. It had not; the spec had.
  // `src/domain/tos` and `src/infra/bloque/tos-repository.ts` existed but were
  // referenced by nothing.
  //
  // So: whether the gate appears at all, unprompted, is the assertion.
  const onGate = page.url().includes('/tos-gate');
  if (!onGate) {
    await page
      .waitForURL(/tos-gate/, { timeout: 30_000 })
      .catch(() => undefined);
  }

  if (page.url().includes('tos=accepted')) {
    throw new Error(
      'The terms were already accepted for this identity, so the gate was ' +
        'skipped. Use a fresh account, or bump the TOS document version to ' +
        're-gate this one.',
    );
  }

  expect(
    page.url(),
    `Expected to land on the TOS gate, got ${page.url()}`,
  ).toContain('tos-gate');

  // The intro screen animates in on timers, and whether it shows at all
  // depends on the origin's `show_home`. Wait for whichever appears.
  const review = page.getByRole('button', { name: /Revisar el acuerdo/i });
  const accept = page.getByRole('button', { name: /Aceptar|Ir al final/i });

  await expect(review.or(accept).first()).toBeVisible({ timeout: 30_000 });
  if (await review.isVisible()) {
    await review.click();
  }

  // Only rendered once the review screen opens — `hidden` before that.
  await expect(accept).toBeVisible({ timeout: 30_000 });

  // Clicking while not at the bottom scrolls instead of accepting, so keep
  // clicking until the label changes to the accept action.
  for (let i = 0; i < 12; i++) {
    const label = (await accept.textContent())?.trim() ?? '';
    if (/Aceptar/i.test(label)) break;
    await accept.click();
    await page.waitForTimeout(600);
  }
  await expect(accept).toHaveText(/Aceptar/i);
  await accept.click();

  // ── the passkey should have been created and the terms accepted ──────────
  // The gate shows its completion screen, then redirects back to the wallet
  // with `?tos=accepted` — either is proof the acceptance went through.
  await page.waitForURL(/tos=accepted/, { timeout: 90_000 });
  console.log('  ✅ terms accepted, redirected back to the wallet');

  const credentials = await cdp.send('WebAuthn.getCredentials', {
    authenticatorId,
  });
  expect(
    credentials.credentials.length,
    'No credential was created. If the terms were still accepted, the passkey ' +
      'step failed silently — check the console for [bloque] passkey step failed.',
  ).toBeGreaterThan(0);

  const created = credentials.credentials[0];
  console.log(`  ✅ passkey created, rpId=${created.rpId}`);

  // The property the whole rp-id derivation exists for: scoped to the
  // registrable root, so the credential also works from account.dev-bloque.app
  // and any future auth./api. host.
  expect(created.rpId).toBe('dev-bloque.app');
  expect(created.isResidentCredential).toBe(true);
});
