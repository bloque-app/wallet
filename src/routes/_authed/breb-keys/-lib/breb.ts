import type {
  BrebKeyType as SdkBrebKeyType,
  BrebResolvedKey as SdkBrebResolvedKey,
} from '@bloque/sdk-accounts';

export type BrebKeyType = SdkBrebKeyType;
export type ResolvedRecipient = SdkBrebResolvedKey;

export class BrebKeyError extends Error {
  providerCode?: string;
  constructor(message: string, providerCode?: string) {
    super(message);
    this.name = 'BrebKeyError';
    this.providerCode = providerCode;
  }
}

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
  owner: ResolvedRecipient['owner'];
  participant: ResolvedRecipient['participant'];
}) {
  const owner = data.owner;
  const personalName = [
    owner?.name,
    owner?.firstName,
    owner?.secondName,
    owner?.firstLastName,
    owner?.secondLastName,
  ]
    .filter((value): value is string => !!value?.trim())
    .join(' ')
    .trim();
  const participantName = data.participant?.name ?? null;

  return (
    personalName ||
    owner?.businessName ||
    participantName ||
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
