import type { IdentityMeProfile } from '@bloque/sdk-identity';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import { COUNTRIES, countryName } from '~/domain/identity/countries';
import {
  useIdentityProfile,
  useUpdateIdentityProfile,
} from '~/hooks/identity/use-identity-profile';
import { cn } from '~/lib/utils';

// Mirrors payment-rails `update-identity.command.ts`'s validators, so a
// client-side reject never sends a request the backend would 400 on anyway.
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const POSTAL_CODE_REGEX = /^[a-zA-Z0-9\s-]+$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{3}$/;

/** Fields the wallet's edit-profile screen owns. Excludes `first_name` /
 * `last_name` / `email`, which stay onboarding-only. */
interface ProfileFormState {
  phone: string;
  birthdate: string;
  address_line1: string;
  address_line2: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country_of_residence_code: string;
  country_of_birth_code: string;
  personal_id_type: string;
  personal_id_number: string;
}

const EMPTY_FORM: ProfileFormState = {
  phone: '',
  birthdate: '',
  address_line1: '',
  address_line2: '',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  country_of_residence_code: '',
  country_of_birth_code: '',
  personal_id_type: '',
  personal_id_number: '',
};

function toFormState(profile: IdentityMeProfile): ProfileFormState {
  return {
    phone: profile.phone ?? '',
    birthdate: profile.birthdate ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    neighborhood: profile.neighborhood ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    postal_code: profile.postal_code ?? '',
    country_of_residence_code: profile.country_of_residence_code ?? '',
    country_of_birth_code: profile.country_of_birth_code ?? '',
    personal_id_type: profile.personal_id_type ?? '',
    personal_id_number: profile.personal_id_number ?? '',
  };
}

/** Fields a caller can deep-link into via `?focus=`, matching the
 * `missing_field` values mediums' external-us-bank provider reports
 * (`E_PROFILE_PHONE_MISSING` -> `phone`, `E_PROFILE_BIRTHDATE_MISSING` ->
 * `birthdate`). Extend as more mediums' error fields land here. */
const FOCUSABLE_FIELDS = ['phone', 'birthdate'] as const;
type FocusableField = (typeof FOCUSABLE_FIELDS)[number];

export const Route = createFileRoute('/_authed/profile/edit/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { focus?: FocusableField } => {
    const focus = search.focus;
    return typeof focus === 'string' &&
      (FOCUSABLE_FIELDS as readonly string[]).includes(focus)
      ? { focus: focus as FocusableField }
      : {};
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const profileQuery = useIdentityProfile();
  const updateMutation = useUpdateIdentityProfile();

  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileFormState, string>>
  >({});
  const [loaded, setLoaded] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const birthdateRef = useRef<HTMLInputElement>(null);

  // Precarga: only seed local form state from the fetched profile once —
  // afterwards it's the user's edits, not the query cache, that should own
  // these fields (a background refetch mustn't stomp an in-progress edit).
  useEffect(() => {
    if (profileQuery.data && !loaded) {
      setForm(toFormState(profileQuery.data));
      setLoaded(true);
    }
  }, [profileQuery.data, loaded]);

  useEffect(() => {
    if (search.focus === 'phone') phoneRef.current?.focus();
    if (search.focus === 'birthdate') birthdateRef.current?.focus();
  }, [search.focus]);

  function setField<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ProfileFormState, string>> = {};

    const phone = form.phone.trim();
    if (!phone) next.phone = t('profile.edit.errors.phoneRequired');
    else if (!PHONE_REGEX.test(phone))
      next.phone = t('profile.edit.errors.phoneInvalid');

    if (!form.birthdate)
      next.birthdate = t('profile.edit.errors.birthdateRequired');
    else if (!DATE_REGEX.test(form.birthdate))
      next.birthdate = t('profile.edit.errors.birthdateInvalid');

    if (!form.address_line1.trim())
      next.address_line1 = t('profile.edit.errors.requiredField');
    if (!form.city.trim()) next.city = t('profile.edit.errors.requiredField');
    if (!form.state.trim()) next.state = t('profile.edit.errors.requiredField');

    if (!form.postal_code.trim())
      next.postal_code = t('profile.edit.errors.requiredField');
    else if (!POSTAL_CODE_REGEX.test(form.postal_code))
      next.postal_code = t('profile.edit.errors.postalCodeInvalid');

    if (!COUNTRY_CODE_REGEX.test(form.country_of_residence_code))
      next.country_of_residence_code = t('profile.edit.errors.requiredField');

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const profile: Partial<IdentityMeProfile> = {
      phone: form.phone.trim(),
      birthdate: form.birthdate,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postal_code.trim(),
      country_of_residence_code: form.country_of_residence_code,
      country_of_birth_code: form.country_of_birth_code || undefined,
      personal_id_type: form.personal_id_type.trim() || undefined,
      personal_id_number: form.personal_id_number.trim() || undefined,
    };

    try {
      await updateMutation.mutateAsync(profile);
      toast.success(t('profile.edit.saveSuccessToast'));
      navigate({ to: '/profile' });
    } catch {
      toast.error(t('profile.edit.saveErrorToast'));
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {t('profile.edit.loadErrorToast')}
        </p>
        <Button variant="outline" onClick={() => profileQuery.refetch()}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: '/profile' })}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
          {t('profile.edit.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('profile.edit.description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <p className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {t('profile.edit.sections.contact')}
          </p>

          <FormField
            id="phone"
            label={t('profile.edit.fields.phone')}
            error={errors.phone}
          >
            <Input
              ref={phoneRef}
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder={t('profile.edit.fields.phonePlaceholder')}
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              aria-invalid={!!errors.phone}
              className={cn(
                'h-12 rounded-2xl',
                search.focus === 'phone' &&
                  'ring-3 ring-primary/40 border-primary',
              )}
            />
          </FormField>

          <FormField
            id="birthdate"
            label={t('profile.edit.fields.birthdate')}
            error={errors.birthdate}
          >
            <Input
              ref={birthdateRef}
              id="birthdate"
              type="date"
              value={form.birthdate}
              onChange={(e) => setField('birthdate', e.target.value)}
              aria-invalid={!!errors.birthdate}
              className={cn(
                'h-12 rounded-2xl',
                search.focus === 'birthdate' &&
                  'ring-3 ring-primary/40 border-primary',
              )}
            />
          </FormField>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <p className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {t('profile.edit.sections.personal')}
          </p>

          <FormField
            id="personal_id_type"
            label={t('profile.edit.fields.personalIdType')}
          >
            <Input
              id="personal_id_type"
              value={form.personal_id_type}
              onChange={(e) => setField('personal_id_type', e.target.value)}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="personal_id_number"
            label={t('profile.edit.fields.personalIdNumber')}
          >
            <Input
              id="personal_id_number"
              value={form.personal_id_number}
              onChange={(e) => setField('personal_id_number', e.target.value)}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="country_of_birth_code"
            label={t('profile.edit.fields.countryOfBirth')}
          >
            <CountrySelect
              value={form.country_of_birth_code}
              onChange={(v) => setField('country_of_birth_code', v)}
              placeholder={t('profile.edit.fields.selectCountry')}
              language={i18n.language}
            />
          </FormField>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <p className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {t('profile.edit.sections.address')}
          </p>

          <FormField
            id="country_of_residence_code"
            label={t('profile.edit.fields.countryOfResidence')}
            error={errors.country_of_residence_code}
          >
            <CountrySelect
              value={form.country_of_residence_code}
              onChange={(v) => setField('country_of_residence_code', v)}
              placeholder={t('profile.edit.fields.selectCountry')}
              language={i18n.language}
              invalid={!!errors.country_of_residence_code}
            />
          </FormField>

          <FormField
            id="address_line1"
            label={t('profile.edit.fields.addressLine1')}
            error={errors.address_line1}
          >
            <Input
              id="address_line1"
              value={form.address_line1}
              onChange={(e) => setField('address_line1', e.target.value)}
              aria-invalid={!!errors.address_line1}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="address_line2"
            label={t('profile.edit.fields.addressLine2')}
          >
            <Input
              id="address_line2"
              value={form.address_line2}
              onChange={(e) => setField('address_line2', e.target.value)}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="neighborhood"
            label={t('profile.edit.fields.neighborhood')}
          >
            <Input
              id="neighborhood"
              value={form.neighborhood}
              onChange={(e) => setField('neighborhood', e.target.value)}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="city"
            label={t('profile.edit.fields.city')}
            error={errors.city}
          >
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              aria-invalid={!!errors.city}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="state"
            label={t('profile.edit.fields.state')}
            error={errors.state}
          >
            <Input
              id="state"
              value={form.state}
              onChange={(e) => setField('state', e.target.value)}
              aria-invalid={!!errors.state}
              className="h-12 rounded-2xl"
            />
          </FormField>

          <FormField
            id="postal_code"
            label={t('profile.edit.fields.postalCode')}
            error={errors.postal_code}
          >
            <Input
              id="postal_code"
              value={form.postal_code}
              onChange={(e) => setField('postal_code', e.target.value)}
              aria-invalid={!!errors.postal_code}
              className="h-12 rounded-2xl"
            />
          </FormField>
        </section>

        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="h-12 w-full rounded-2xl text-sm font-medium"
        >
          {updateMutation.isPending
            ? t('profile.edit.saving')
            : t('profile.edit.saveButton')}
        </Button>
      </form>
    </div>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CountrySelect({
  value,
  onChange,
  placeholder,
  language,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  language: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value || null} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger className="h-12 rounded-2xl" aria-invalid={invalid}>
        {value ? (
          <span>{countryName(value, language)}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {language === 'en' ? country.nameEn : country.nameEs}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
