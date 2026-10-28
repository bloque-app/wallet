import { describe, expect, test } from 'bun:test';
import {
  type BrebKeyProfile,
  isRegistrableBrebKey,
  normalizeBrebKey,
  suggestBrebKeys,
  verifiedCoverage,
} from './breb-key-suggestions';

const passportNoPhone: BrebKeyProfile = {
  firstName: 'LAURA VANESA',
  lastName: 'SOLANO LENIS',
  personalIdNumber: 'AY178020',
  phone: '',
  email: 'vanesasolano.l@gmail.com',
};

const ccWithPhone: BrebKeyProfile = {
  firstName: 'JOSE EDILSEN',
  lastName: 'GRISALES GARCIA',
  personalIdNumber: '1012345678',
  phone: '+573165597520',
  email: 'jgrisales@gmail.com',
};

function values(profile: BrebKeyProfile) {
  return suggestBrebKeys(profile).map((suggestion) => suggestion.value);
}

describe('suggestBrebKeys', () => {
  test('without a phone, falls back to initial + last name', () => {
    expect(suggestBrebKeys(passportNoPhone)).toEqual([
      { kind: 'name', value: '@bqlaurasolano178020' },
      { kind: 'bloque', value: '@bqlaurabloque178020' },
      { kind: 'document', value: '@bqay178020' },
      { kind: 'initial', value: '@bqlsolano178020' },
    ]);
  });

  test('with a phone, suggests bq + local phone', () => {
    expect(values(ccWithPhone)).toEqual([
      '@bqjosegrisales345678',
      '@bqjosebloque345678',
      '@bq1012345678',
      '@bq3165597520',
    ]);
  });

  test('every suggestion starts with bq and fits 20 characters', () => {
    const longNames: BrebKeyProfile = {
      firstName: 'MAXIMILIANO ALEJANDRO',
      lastName: 'VILLAVICENCIO RESTREPO',
      personalIdNumber: '80123456',
      phone: '3001112233',
      email: 'maxi@x.com',
    };
    for (const value of values(longNames)) {
      expect(value.startsWith('@bq')).toBe(true);
      expect(normalizeBrebKey(value).length).toBeLessThanOrEqual(20);
    }
  });

  test('strips accents so the key stays readable', () => {
    const accented: BrebKeyProfile = {
      ...ccWithPhone,
      firstName: 'JOSÉ',
      lastName: 'MUÑOZ',
    };
    expect(values(accented)[0]).toBe('@bqjosemunoz345678');
  });

  test('leaves out keys that would not pass the checks', () => {
    const shortName: BrebKeyProfile = {
      firstName: 'JO',
      lastName: 'WU',
      personalIdNumber: 'PA9988',
      phone: '',
      email: 'jw@x.com',
    };
    expect(values(shortName)).toEqual(['@bqpa9988']);
  });

  test('never suggests the email', () => {
    for (const value of values(passportNoPhone)) {
      expect(value).not.toContain('gmail');
    }
  });
});

describe('isRegistrableBrebKey', () => {
  test('rejects the email, longer than 20 characters once normalized', () => {
    expect(
      isRegistrableBrebKey('vanesasolano.l@gmail.com', passportNoPhone),
    ).toBe(false);
  });

  test('rejects keys mostly made of text not in the profile', () => {
    expect(isRegistrableBrebKey('@LauraBloque2026', passportNoPhone)).toBe(
      false,
    );
  });

  test('accepts keys mostly made of the profile data', () => {
    expect(isRegistrableBrebKey('@LauraSolano2026', passportNoPhone)).toBe(
      true,
    );
  });
});

describe('verifiedCoverage', () => {
  test('counts only runs of three or more characters', () => {
    expect(verifiedCoverage('lv', passportNoPhone)).toBe(0);
    expect(verifiedCoverage('laura', passportNoPhone)).toBe(1);
  });
});
