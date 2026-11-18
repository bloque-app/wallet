import { describe, expect, test } from 'vitest';
import i18n from '~/i18n/config';
import { getRecipientName, type ResolvedRecipient } from './breb';

type Owner = NonNullable<ResolvedRecipient['owner']>;
type Participant = ResolvedRecipient['participant'];

const recipient = (
  owner: Partial<Owner> | null,
  participant?: Participant,
) => ({
  owner: owner as ResolvedRecipient['owner'],
  participant: (participant ?? null) as Participant,
});

describe('getRecipientName', () => {
  test('shows the full name once when the name parts also come', () => {
    expect(
      getRecipientName(
        recipient({
          name: 'MIG*** ANG** BOT** PAT***',
          firstName: 'MIG***',
          secondName: 'ANG**',
          firstLastName: 'BOT**',
          secondLastName: 'PAT***',
        }),
      ),
    ).toBe('MIG*** ANG** BOT** PAT***');
  });

  test('builds the name from its parts when there is no full name', () => {
    expect(
      getRecipientName(
        recipient({
          firstName: 'MIG***',
          firstLastName: 'BOT**',
          secondLastName: 'PAT***',
        }),
      ),
    ).toBe('MIG*** BOT** PAT***');
  });

  test('falls back to the business name', () => {
    expect(
      getRecipientName(recipient({ name: '  ', businessName: 'BLO*** SAS' })),
    ).toBe('BLO*** SAS');
  });

  test('falls back to the participant name', () => {
    expect(
      getRecipientName(
        recipient(null, { name: 'Banco X' } as unknown as Participant),
      ),
    ).toBe('Banco X');
  });

  test('falls back to the default recipient name', () => {
    expect(getRecipientName(recipient(null))).toBe(
      i18n.t('brebKeys.defaultRecipientName'),
    );
  });
});
