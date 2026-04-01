import { bloque } from '~/lib/bloque';

export type BrebKeyType = 'ID' | 'PHONE' | 'EMAIL' | 'ALPHA' | 'BCODE';

export type ResolvedRecipient = {
  resolutionId: string;
  key: { keyValue: string };
  owner: { name: string | null; businessName: string | null } | null;
  participant: { name: string | null } | null;
};

export type BrebAccountItem = {
  urn: string;
  medium: string;
  status: string;
  keyType?: string;
  key?: string;
  displayName?: string | null;
  metadata?: Record<string, unknown>;
};

export const BREB_KEY_TYPES: Array<{
  value: BrebKeyType;
  label: string;
  placeholder: string;
}> = [
  { value: 'PHONE', label: 'Celular', placeholder: '3001234567' },
  { value: 'EMAIL', label: 'Email', placeholder: 'nombre@correo.com' },
  { value: 'ID', label: 'Documento', placeholder: '123456789' },
  { value: 'ALPHA', label: 'Alfanumerica', placeholder: 'nestor.bloque' },
  { value: 'BCODE', label: 'Codigo bancario', placeholder: '0016027228' },
];

export function getRecipientName(data: {
  owner: { name: string | null; businessName: string | null } | null;
  participant: { name: string | null } | null;
}) {
  return (
    data.owner?.name ??
    data.owner?.businessName ??
    data.participant?.name ??
    'Destinatario BRE-B'
  );
}

export function getBrebStatusLabel(status?: string) {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'frozen':
      return 'Suspendida';
    case 'deleted':
      return 'Eliminada';
    default:
      return status ?? 'Sin estado';
  }
}

export async function listBrebAccounts() {
  const result = await bloque.accounts.list({ medium: 'breb' } as never);
  return ((result.accounts ?? []) as unknown as Array<BrebAccountItem>).filter(
    (account) => account.medium === 'breb',
  );
}

export async function createBrebKey(params: {
  keyType: BrebKeyType;
  key: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await (
    bloque.accounts as typeof bloque.accounts & {
      breb: {
        createKey: (input: {
          keyType: string;
          key: string;
          displayName?: string;
          metadata?: Record<string, unknown>;
        }) => Promise<{
          data: { urn: string } | null;
          error: { message: string } | null;
        }>;
      };
    }
  ).breb.createKey(params);

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? 'No se pudo crear la llave BRE-B.',
    );
  }

  return result.data;
}

export async function resolveBrebKey(params: { keyType: string; key: string }) {
  const result = await (
    bloque.accounts as typeof bloque.accounts & {
      breb: {
        resolveKey: (input: { keyType: string; key: string }) => Promise<{
          data: ResolvedRecipient | null;
          error: { message: string } | null;
        }>;
      };
    }
  ).breb.resolveKey(params);

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? 'No se pudo resolver la llave BRE-B.',
    );
  }

  return result.data;
}

export async function suspendBrebKey(accountUrn: string) {
  const result = await (
    bloque.accounts as typeof bloque.accounts & {
      breb: {
        suspendKey: (input: {
          accountUrn: string;
        }) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    }
  ).breb.suspendKey({ accountUrn });

  if (result.error) throw new Error(result.error.message);
}

export async function activateBrebKey(accountUrn: string) {
  const result = await (
    bloque.accounts as typeof bloque.accounts & {
      breb: {
        activateKey: (input: {
          accountUrn: string;
        }) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    }
  ).breb.activateKey({ accountUrn });

  if (result.error) throw new Error(result.error.message);
}

export async function deleteBrebKey(accountUrn: string) {
  const result = await (
    bloque.accounts as typeof bloque.accounts & {
      breb: {
        deleteKey: (input: {
          accountUrn: string;
        }) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    }
  ).breb.deleteKey({ accountUrn });

  if (result.error) throw new Error(result.error.message);
}

export async function createBrebOrder(params: {
  rateSig: string;
  amountSrc: string;
  resolutionId: string;
  sourceAccountUrn: string;
  metadata?: Record<string, unknown>;
}) {
  return await (
    bloque.swap as typeof bloque.swap & {
      breb: {
        create: (input: {
          rateSig: string;
          amountSrc: string;
          depositInformation: { resolutionId: string };
          args: { sourceAccountUrn: string };
          metadata?: Record<string, unknown>;
        }) => Promise<{
          order: { id: string };
          execution?: { result: { how?: { url?: string } } };
        }>;
      };
    }
  ).breb.create({
    rateSig: params.rateSig,
    amountSrc: params.amountSrc,
    depositInformation: {
      resolutionId: params.resolutionId,
    },
    args: {
      sourceAccountUrn: params.sourceAccountUrn,
    },
    metadata: params.metadata,
  });
}
