/**
 * Alphanumeric BRE-B keys suggested from the person's verified data. A key
 * is registrable when it has at most {@link MAX_KEY_LENGTH} letters and
 * digits, and at least {@link MIN_VERIFIED_COVERAGE} of it is made of runs of
 * {@link MIN_RUN_LENGTH}+ characters from their name, last name, ID digits,
 * phone or email (before the `@`).
 */

export type BrebKeyProfile = {
  firstName: string;
  lastName: string;
  personalIdNumber: string;
  phone: string;
  email: string;
};

export type BrebKeySuggestionKind =
  | 'name'
  | 'bloque'
  | 'document'
  | 'phone'
  | 'initial';

export type BrebKeySuggestion = {
  kind: BrebKeySuggestionKind;
  /** Display value, with the leading `@`. */
  value: string;
};

export const MAX_KEY_LENGTH = 20;
export const MIN_VERIFIED_COVERAGE = 0.5;
export const MIN_RUN_LENGTH = 3;

const PREFIX = 'bq';
const DOCUMENT_DIGITS = 6;

/** Letters and digits only, lowercase, as the key is compared everywhere. */
export function normalizeBrebKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/** Like {@link normalizeBrebKey}, but keeps `ñ`/accented letters as plain ones. */
function toKeyPart(value: string): string {
  return normalizeBrebKey(value.normalize('NFD').replace(/\p{M}/gu, ''));
}

function firstWord(value: string): string {
  return toKeyPart(value.trim().split(/\s+/)[0] ?? '');
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Colombian mobiles are 10 digits; drop the country code when present. */
function localPhone(phone: string): string {
  const phoneDigits = digits(phone);
  return phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;
}

function verifiedFields(profile: BrebKeyProfile): string[] {
  const phoneDigits = digits(profile.phone);
  return [
    normalizeBrebKey(profile.firstName),
    normalizeBrebKey(profile.lastName),
    digits(profile.personalIdNumber),
    phoneDigits,
    phoneDigits.length > 10 ? phoneDigits.slice(-10) : '',
    normalizeBrebKey(profile.email.split('@')[0] ?? ''),
  ].filter((field) => field.length > 0);
}

/**
 * Share of the key covered by runs found in the person's verified data,
 * matching the longest run at each position.
 */
export function verifiedCoverage(key: string, profile: BrebKeyProfile): number {
  const normalized = normalizeBrebKey(key);
  if (normalized.length === 0) return 0;
  const fields = verifiedFields(profile);

  let covered = 0;
  let i = 0;
  while (i < normalized.length) {
    let match = 0;
    for (
      let length = normalized.length - i;
      length >= MIN_RUN_LENGTH;
      length--
    ) {
      const run = normalized.slice(i, i + length);
      if (fields.some((field) => field.includes(run))) {
        match = length;
        break;
      }
    }
    covered += match;
    i += match > 0 ? match : 1;
  }
  return covered / normalized.length;
}

export function isRegistrableBrebKey(
  key: string,
  profile: BrebKeyProfile,
): boolean {
  const normalized = normalizeBrebKey(key);
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_KEY_LENGTH &&
    verifiedCoverage(normalized, profile) >= MIN_VERIFIED_COVERAGE
  );
}

/** `bq` + `body` + `suffix`, cutting `body` so the key fits. */
function build(body: string, suffix = ''): string {
  const room = MAX_KEY_LENGTH - PREFIX.length - suffix.length;
  return `@${PREFIX}${body.slice(0, Math.max(room, 0))}${suffix}`;
}

/**
 * Up to four keys, in order: name + last name, name + "bloque", document,
 * and phone (or initial + last name when there is no phone). Keys that would
 * not pass the checks, or that repeat, are left out.
 */
export function suggestBrebKeys(profile: BrebKeyProfile): BrebKeySuggestion[] {
  const firstName = firstWord(profile.firstName);
  const lastName = firstWord(profile.lastName);
  const document = toKeyPart(profile.personalIdNumber);
  const documentTail = digits(profile.personalIdNumber).slice(-DOCUMENT_DIGITS);
  const phone = localPhone(profile.phone);

  const candidates: BrebKeySuggestion[] = [];
  if (firstName && lastName) {
    candidates.push({
      kind: 'name',
      value: build(`${firstName}${lastName}`, documentTail),
    });
  }
  if (firstName) {
    candidates.push({
      kind: 'bloque',
      value: build(firstName, `bloque${documentTail}`),
    });
  }
  if (document) {
    candidates.push({ kind: 'document', value: build(document) });
  }
  if (phone) {
    candidates.push({ kind: 'phone', value: build(phone) });
  } else if (firstName && lastName) {
    candidates.push({
      kind: 'initial',
      value: build(`${firstName[0]}${lastName}`, documentTail),
    });
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const normalized = normalizeBrebKey(candidate.value);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return isRegistrableBrebKey(candidate.value, profile);
  });
}

/** A BRE-B key the backend refused to create, with its error code. */
export class BrebKeyCreationError extends Error {
  /** Backend or provider code. Never shown to users. */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'BrebKeyCreationError';
    this.code = code;
  }
}
