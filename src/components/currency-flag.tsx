import { cn } from '~/lib/utils';

export type FlagCurrency = 'COP' | 'USD' | 'MXN' | 'BRL';

const FLAG_LABELS: Record<FlagCurrency, string> = {
  COP: 'Colombia',
  USD: 'Estados Unidos',
  MXN: 'México',
  BRL: 'Brasil',
};

function ColombiaFlag() {
  return (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  );
}

function UnitedStatesFlag() {
  const stripes = Array.from({ length: 7 }, (_, index) => index * 2);
  return (
    <>
      <rect width="30" height="20" fill="#FFFFFF" />
      {stripes.map((row) => (
        <rect
          key={row}
          y={(row * 20) / 13}
          width="30"
          height={20 / 13}
          fill="#B22234"
        />
      ))}
      <rect width="13" height={(7 * 20) / 13} fill="#3C3B6E" />
    </>
  );
}

function MexicoFlag() {
  return (
    <>
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#FFFFFF" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
      <circle cx="15" cy="10" r="2.6" fill="#8C5A2B" />
    </>
  );
}

function BrazilFlag() {
  return (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <path d="M15 2.5 27 10 15 17.5 3 10Z" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.2" fill="#002776" />
    </>
  );
}

const FLAGS: Record<FlagCurrency, () => React.JSX.Element> = {
  COP: ColombiaFlag,
  USD: UnitedStatesFlag,
  MXN: MexicoFlag,
  BRL: BrazilFlag,
};

export function isFlagCurrency(value: string): value is FlagCurrency {
  return value in FLAGS;
}

export function CurrencyFlag({
  currency,
  className,
}: {
  currency: FlagCurrency;
  className?: string;
}) {
  const Flag = FLAGS[currency];
  return (
    <svg
      viewBox="0 0 30 20"
      role="img"
      aria-label={FLAG_LABELS[currency]}
      className={cn(
        'h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-border/60',
        className,
      )}
    >
      <Flag />
    </svg>
  );
}
