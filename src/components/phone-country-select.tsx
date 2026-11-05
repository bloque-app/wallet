import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select';
import { PHONE_COUNTRIES } from '~/lib/phone';

interface PhoneCountrySelectProps {
  value: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function PhoneCountrySelect({
  value,
  onChange,
  disabled,
  ariaLabel = 'País',
}: PhoneCountrySelectProps) {
  const selected = PHONE_COUNTRIES.find((country) => country.code === value);

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-12 w-[7.25rem] shrink-0 rounded-2xl"
        aria-label={ariaLabel}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span aria-hidden>{selected.flag}</span>
            <span>+{selected.dialCode}</span>
          </span>
        ) : null}
      </SelectTrigger>
      <SelectContent align="start">
        {PHONE_COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span aria-hidden>{country.flag}</span>
              <span>{country.name}</span>
              <span className="text-muted-foreground">+{country.dialCode}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
