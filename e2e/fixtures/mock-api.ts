import type { Page, Route } from '@playwright/test';

/**
 * Wire-shaped (snake_case, `medium`-tagged) fixtures matching what
 * `@bloque/sdk-accounts`'s `AccountsClient._mapByMedium()` expects on the raw
 * `GET /api/accounts` response — NOT the SDK's already-mapped output shape.
 * Reproduces the real production 4-ledger shape also covered by
 * src/domain/accounts/grouping.test.ts (Main/PawHaus/Bloque/orphan-pocket).
 */

const OWNER_URN = 'did:bloque:bloque-email:e2e-user@bloque.team';

function balance(asset: string, current: string) {
  return { [asset]: { current, pending: '0' } };
}

function pocket(opts: {
  urn: string;
  ledgerId: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  balance?: Record<string, { current: string; pending: string }>;
}) {
  return {
    urn: opts.urn,
    id: opts.urn,
    medium: 'virtual',
    details: { first_name: opts.firstName, last_name: opts.lastName },
    status: 'active',
    owner_urn: OWNER_URN,
    ledger_account_id: opts.ledgerId,
    webhook_url: null,
    metadata: {},
    created_at: opts.createdAt,
    updated_at: opts.createdAt,
    balance: opts.balance ?? {},
  };
}

function card(opts: {
  urn: string;
  ledgerId: string;
  lastFour: string;
  createdAt: string;
  balance?: Record<string, { current: string; pending: string }>;
}) {
  return {
    urn: opts.urn,
    id: opts.urn,
    medium: 'card',
    details: {
      card_last_four: opts.lastFour,
      card_product_type: 'debit',
      card_type: 'virtual',
      card_url_details: null,
    },
    status: 'active',
    owner_urn: OWNER_URN,
    ledger_account_id: opts.ledgerId,
    webhook_url: null,
    metadata: {},
    created_at: opts.createdAt,
    updated_at: opts.createdAt,
    balance: opts.balance ?? {},
  };
}

function brebKey(opts: {
  urn: string;
  ledgerId: string;
  keyType: string;
  keyValue: string;
  displayName?: string;
  createdAt: string;
}) {
  return {
    urn: opts.urn,
    id: opts.urn,
    medium: 'breb',
    details: {
      remote_key_id: opts.urn,
      account_id: opts.urn,
      key: { key_type: opts.keyType, key_value: opts.keyValue },
      display_name: opts.displayName ?? null,
      created_at: opts.createdAt,
    },
    status: 'active',
    owner_urn: OWNER_URN,
    ledger_account_id: opts.ledgerId,
    webhook_url: null,
    metadata: {},
    balance: {},
  };
}

function polygon(opts: {
  urn: string;
  ledgerId: string;
  address: string;
  createdAt: string;
  balance?: Record<string, { current: string; pending: string }>;
}) {
  return {
    urn: opts.urn,
    id: opts.urn,
    medium: 'polygon',
    details: { address: opts.address, network: 'polygon-mainnet' },
    status: 'active',
    owner_urn: OWNER_URN,
    ledger_account_id: opts.ledgerId,
    webhook_url: null,
    metadata: {},
    created_at: opts.createdAt,
    updated_at: opts.createdAt,
    balance: opts.balance ?? {},
  };
}

export const mockAccounts = [
  polygon({
    urn: 'urn:polygon-main',
    ledgerId: 'ledger-main',
    address: '0xd5e46B8b4a309b2BDAB9A0e60A2EBb3D915E1eCc',
    createdAt: '2026-03-11T19:23:16.412Z',
    balance: balance('COPM/2', '500000'),
  }),
  pocket({
    urn: 'urn:pocket-main',
    ledgerId: 'ledger-main',
    firstName: 'Main',
    createdAt: '2026-03-11T19:22:29.689Z',
    balance: balance('COPM/2', '500000'),
  }),
  card({
    urn: 'urn:card-main',
    ledgerId: 'ledger-main',
    lastFour: '4242',
    createdAt: '2026-04-20T18:21:30.527Z',
    balance: balance('COPM/2', '500000'),
  }),
  brebKey({
    urn: 'urn:breb-main-1',
    ledgerId: 'ledger-main',
    keyType: 'email',
    keyValue: 'main-1@bloque.team',
    createdAt: '2026-07-24T20:30:47.711Z',
  }),
  brebKey({
    urn: 'urn:breb-main-2',
    ledgerId: 'ledger-main',
    keyType: 'phone',
    keyValue: '+573000000000',
    createdAt: '2026-07-24T21:38:02.599Z',
  }),
  pocket({
    urn: 'urn:pocket-pawhaus',
    ledgerId: 'ledger-pawhaus',
    firstName: 'PawHaus',
    createdAt: '2026-07-24T21:37:59.900Z',
    balance: balance('DUSD/6', '250000000'),
  }),
  card({
    urn: 'urn:card-pawhaus-1',
    ledgerId: 'ledger-pawhaus',
    lastFour: '1111',
    createdAt: '2026-07-25T23:09:39.484Z',
  }),
  card({
    urn: 'urn:card-pawhaus-2',
    ledgerId: 'ledger-pawhaus',
    lastFour: '2222',
    createdAt: '2026-07-25T23:09:41.211Z',
  }),
  brebKey({
    urn: 'urn:breb-pawhaus',
    ledgerId: 'ledger-pawhaus',
    keyType: 'email',
    keyValue: 'pawhaus@bloque.team',
    displayName: 'PawHaus',
    createdAt: '2026-07-24T21:38:54.923Z',
  }),
  pocket({
    urn: 'urn:pocket-bloque',
    ledgerId: 'ledger-bloque',
    firstName: 'Bloque',
    createdAt: '2026-04-27T18:21:05.215Z',
    balance: balance('KSM/12', '1500000000000'),
  }),
  card({
    urn: 'urn:card-bloque',
    ledgerId: 'ledger-bloque',
    lastFour: '9999',
    createdAt: '2026-04-27T18:21:16.865Z',
  }),
  pocket({
    urn: 'urn:pocket-orphan',
    ledgerId: 'ledger-orphan',
    firstName: 'Orphan',
    createdAt: '2026-07-24T21:38:00.012Z',
  }),
];

export const mockIdentity = {
  urn: OWNER_URN,
  origin: 'bloque-email',
  profile: {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@bloque.team',
  },
  metadata: { kyc_verified: true },
};

/** Path of the hosted TOS gate page, as compliance serves it. */
export const TOS_GATE_PATH = '/api/tos-gate';
const TOS_GATE_TOKEN = 'e2e-capability-token';

export type MockApiOptions = {
  /**
   * Requirement keys compliance still reports as outstanding, as
   * `missing_requirements` on `tier-status`.
   *
   * Defaults to none, so the wallet treats the terms as accepted and no
   * suite that predates the TOS gate starts redirecting.
   */
  missingRequirements?: string[];
  /**
   * Wire status for `GET /api/compliance/:urn`, the call `deriveKycStatus`
   * makes. Omit to leave it unmocked (404), which the repository reads as
   * "no verification started".
   */
  kycWireStatus?: 'awaiting_compliance_verification' | 'approved' | 'rejected';
};

/**
 * Intercepts every `/api/**` request the app makes and fulfills it from an
 * in-memory fixture — fully offline, no real dev-API credentials involved.
 * Any endpoint not explicitly mocked here fails loudly (404) instead of
 * silently reaching the real network.
 */
export async function installMockApi(page: Page, options: MockApiOptions = {}) {
  const missingRequirements = options.missingRequirements ?? [];

  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === '/api/identities/me') {
      return route.fulfill({ json: mockIdentity });
    }

    if (
      options.kycWireStatus &&
      pathname.startsWith('/api/compliance/') &&
      !pathname.endsWith('/tier-status') &&
      !pathname.endsWith('/documents')
    ) {
      return route.fulfill({
        json: {
          status: options.kycWireStatus,
          verification_url: 'https://verify.example.com/session',
          completed_at: null,
        },
      });
    }

    if (pathname.endsWith('/tier-status')) {
      return route.fulfill({
        json: {
          identity_urn: OWNER_URN,
          effective_level: 0,
          policy_version: 'e2e',
          levels: [],
          next_level: null,
          missing_requirements: missingRequirements,
          pending_requirements: [],
        },
      });
    }

    if (pathname === `${TOS_GATE_PATH}/start`) {
      return route.fulfill({
        json: {
          token: TOS_GATE_TOKEN,
          // Same origin as the app under test purely so this stays offline;
          // the real one is on compliance's host. What the wallet does with
          // it — a full-page navigation — is identical either way.
          url: `${url.origin}${TOS_GATE_PATH}#token=${TOS_GATE_TOKEN}`,
          expires_in: 600,
        },
      });
    }

    // Stands in for the hosted gate itself. Its contents don't matter here:
    // the gate's own behaviour is covered by the live suite against the real
    // page, and what this suite asserts is that the wallet *sends people to
    // it*.
    if (pathname === TOS_GATE_PATH) {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html lang="es"><body><h1>Terminos y condiciones</h1></body></html>',
      });
    }

    if (pathname === '/api/accounts') {
      return route.fulfill({ json: { accounts: mockAccounts } });
    }

    if (pathname.endsWith('/movements')) {
      return route.fulfill({
        json: { data: [], page_size: 10, has_more: false, next: null },
      });
    }

    if (pathname.endsWith('/balance')) {
      return route.fulfill({ json: { balance: {} } });
    }

    return route.fulfill({
      status: 404,
      json: {
        message: `Not mocked in e2e: ${route.request().method()} ${pathname}`,
      },
    });
  });
}
