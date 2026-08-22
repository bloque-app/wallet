import type {
  BrebKeyType as SdkBrebKeyType,
  BrebResolvedKey as SdkBrebResolvedKey,
} from '@bloque/sdk-accounts';
import i18n from '~/i18n/config';

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

export function getBrebKeyTypes(): Array<{
  value: BrebKeyType;
  label: string;
  placeholder: string;
}> {
  return [
    {
      value: 'PHONE',
      label: i18n.t('brebKeys.keyTypes.phone'),
      placeholder: '3001234567',
    },
    {
      value: 'EMAIL',
      label: i18n.t('brebKeys.keyTypes.email'),
      placeholder: 'nombre@correo.com',
    },
    {
      value: 'ID',
      label: i18n.t('brebKeys.keyTypes.id'),
      placeholder: '123456789',
    },
    {
      value: 'ALPHA',
      label: i18n.t('brebKeys.keyTypes.alpha'),
      placeholder: 'nestor.bloque',
    },
    {
      value: 'BCODE',
      label: i18n.t('brebKeys.keyTypes.bcode'),
      placeholder: '0016027228',
    },
  ];
}

/**
 * Stands in for `resolveKey` while Cobre — the active BRE-B provider — has no
 * equivalent (`resolve-breb-key.command.ts` throws `E_BREB_RESOLVE_KEY_UNSUPPORTED`
 * for it by product decision, not as a bug: it's billed per call with no free
 * alternative). Cobre addresses the payee by `destinationKey` directly and
 * never looks up `resolutionId` against a real resolution — it's only an
 * idempotency seed — so there is no owner name to show up front, and none of
 * this needs a network call. Kept behind this one function so re-wiring a
 * real `resolveKey` call back in (e.g. if a future provider supports it) only
 * means replacing this function, not every call site.
 */
export function buildUnverifiedRecipient(
  keyType: BrebKeyType,
  keyValue: string,
): ResolvedRecipient {
  return {
    id: crypto.randomUUID(),
    resolutionId: crypto.randomUUID(),
    customerId: '',
    key: { keyType, keyValue },
    owner: null,
    participant: null,
    account: null,
    receptorNode: null,
    resolvedAt: null,
    expiresAt: null,
    raw: {},
  };
}

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
    i18n.t('brebKeys.defaultRecipientName')
  );
}

export function getBrebStatusLabel(status?: string) {
  switch (status) {
    case 'active':
      return i18n.t('brebKeys.status.active');
    case 'frozen':
      return i18n.t('brebKeys.status.frozen');
    case 'deleted':
      return i18n.t('brebKeys.status.deleted');
    default:
      return status ?? i18n.t('brebKeys.status.none');
  }
}
