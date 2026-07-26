import { beforeEach, describe, expect, mock, test } from 'bun:test';

type WireVerification = {
  status: 'awaiting_compliance_verification' | 'approved' | 'rejected';
  url: string;
  completedAt: string | null;
  documentsStatus?: string;
};

const getVerificationMock = mock(
  (): Promise<WireVerification> =>
    Promise.resolve({
      status: 'awaiting_compliance_verification',
      url: 'https://verify.example.com/session',
      completedAt: null,
    }),
);
const startVerificationMock = mock(
  (): Promise<WireVerification> =>
    Promise.resolve({
      status: 'awaiting_compliance_verification',
      url: 'https://verify.example.com/session',
      completedAt: null,
    }),
);

mock.module('~/lib/bloque', () => ({
  bloque: {
    compliance: {
      kyc: {
        getVerification: getVerificationMock,
        startVerification: startVerificationMock,
      },
    },
  },
}));

const { bloqueComplianceRepository } = await import('./compliance-repository');

describe('bloqueComplianceRepository.getVerification — wire status mapping', () => {
  beforeEach(() => {
    getVerificationMock.mockClear();
    startVerificationMock.mockClear();
  });

  test('maps wire "rejected" to domain "rejected" — this is the bug being fixed', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'rejected' as const,
        url: 'https://verify.example.com/session',
        completedAt: '2026-07-20T00:00:00.000Z',
      }),
    );

    const verification = await bloqueComplianceRepository.getVerification(
      'did:bloque:origin:user-1',
    );

    expect(verification.status).toBe('rejected');
    expect(verification.completedAt).toBe('2026-07-20T00:00:00.000Z');
  });

  test('maps wire "approved" to domain "approved"', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'approved' as const,
        url: 'https://verify.example.com/session',
        completedAt: '2026-07-20T00:00:00.000Z',
      }),
    );

    const verification = await bloqueComplianceRepository.getVerification(
      'did:bloque:origin:user-1',
    );

    expect(verification.status).toBe('approved');
  });

  test('maps wire "awaiting_compliance_verification" to domain "awaiting_verification"', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'awaiting_compliance_verification' as const,
        url: 'https://verify.example.com/session',
        completedAt: null as string | null,
      }),
    );

    const verification = await bloqueComplianceRepository.getVerification(
      'did:bloque:origin:user-1',
    );

    expect(verification.status).toBe('awaiting_verification');
  });

  test('maps a null completedAt to undefined, and passes through url/documentsStatus', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'approved' as const,
        url: 'https://verify.example.com/session',
        completedAt: null as string | null,
        documentsStatus: 'complete',
      }),
    );

    const verification = await bloqueComplianceRepository.getVerification(
      'did:bloque:origin:user-1',
    );

    expect(verification.completedAt).toBeUndefined();
    expect(verification.url).toBe('https://verify.example.com/session');
    expect(verification.documentsStatus).toBe('complete');
  });

  test('calls the SDK with the given urn', async () => {
    await bloqueComplianceRepository.getVerification('did:bloque:origin:abc');

    expect(getVerificationMock).toHaveBeenCalledWith({
      urn: 'did:bloque:origin:abc',
    });
  });
});

describe('bloqueComplianceRepository.startVerification — wire status mapping', () => {
  beforeEach(() => {
    getVerificationMock.mockClear();
    startVerificationMock.mockClear();
  });

  test('maps the started verification status and passes urn through', async () => {
    startVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'awaiting_compliance_verification' as const,
        url: 'https://verify.example.com/new-session',
        completedAt: null as string | null,
      }),
    );

    const verification = await bloqueComplianceRepository.startVerification(
      'did:bloque:origin:user-1',
    );

    expect(verification.status).toBe('awaiting_verification');
    expect(verification.url).toBe('https://verify.example.com/new-session');
    expect(startVerificationMock).toHaveBeenCalledWith({
      urn: 'did:bloque:origin:user-1',
    });
  });
});
