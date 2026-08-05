import { expect, test } from '@playwright/test';
import { installMockApi } from './fixtures/mock-api';

/**
 * That the KYC status is actually resolved from the wire.
 *
 * Same class of bug as `tos-gate.spec.ts`, found the same way. `deriveKycStatus`
 * reached the `bloque` proxy, which throws until the SDK handshake has run —
 * and the handshake is kicked off by an effect that only fires once
 * `auth.isAuthenticated` is true, which is set *after* the status is derived.
 * So it threw every time, the catch turned it into `undefined`, and no KYC
 * status was ever read.
 *
 * That was invisible: `shouldShowKycBanner` correctly hides on `undefined`, so
 * a banner that never appeared looked like a banner that was working. Its unit
 * tests passed throughout — they cover the predicate, and the predicate was
 * never wrong. Only asserting on the rendered result catches this.
 */

test('shows the verification banner to a user who is not verified', async ({
  page,
}) => {
  await installMockApi(page, {
    kycWireStatus: 'awaiting_compliance_verification',
  });

  await page.goto('/');

  await expect(
    page.getByText('Completa tu verificación', { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
});

test('shows the rejected copy when the provider rejected them', async ({
  page,
}) => {
  // Distinguishing rejected from never-started is the whole reason
  // `getVerification` is consulted instead of a boolean on the profile.
  await installMockApi(page, { kycWireStatus: 'rejected' });

  await page.goto('/');

  await expect(
    page.getByText('No pudimos verificar tu identidad', { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
});

test('does not nag a verified user', async ({ page }) => {
  await installMockApi(page, { kycWireStatus: 'approved' });

  await page.goto('/');

  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Completa tu verificación')).toHaveCount(0);
});
