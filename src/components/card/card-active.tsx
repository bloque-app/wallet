'use client';

import { Separator } from '@base-ui/react';
import { ExternalLink, EyeOff, Snowflake } from 'lucide-react';
import { Switch } from '~/components/ui/switch';
import { formatUSD } from '~/lib/mock-data';
import type { CardDetailsResponse } from '~/routes/_authed/card/-hooks/use-card';

interface CardActiveProps {
  card: CardDetailsResponse;
  onFreeze: (cardId: string) => void;
  onQuickView: (cardUrn: string) => void;
  onViewDetails: (cardId: string) => void;
  isLoadingQuickView?: boolean;
  isLoadingFreeze?: boolean;
}

export function CardActive({
  card,
  onFreeze,
  onQuickView,
  onViewDetails,
  isLoadingQuickView = false,
  isLoadingFreeze = false,
}: CardActiveProps) {
  const label =
    (card.metadata?.card_name as string) ||
    (card.metadata?.name as string) ||
    'Tarjeta';
  const isFrozen = card.status === 'frozen';

  return (
    <div className="flex flex-col gap-6">
      <div className="relative mx-auto h-[14rem] w-full max-w-xs overflow-hidden rounded-[1.6rem] border border-border/65 shadow-[0_26px_38px_-28px_color-mix(in_oklch,var(--foreground)_95%,transparent)] dark:shadow-[0_26px_38px_-28px_rgb(0_0_0_/_0.8)]">
        <img
          src="/images/card.webp"
          alt="Diseño de la tarjeta"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/15" />

        <div className="relative z-10 flex h-full flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span aria-hidden="true" className="w-8" />
            <div className="flex items-center gap-2">
              <span className="rounded bg-background/15 px-1.5 py-0.5 text-[9px] font-medium text-white">
                {label}
              </span>
              <span className="text-xs text-white">VIRTUAL</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-mono text-lg tracking-widest text-white">
              •••• •••• •••• {card.lastFour}
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[9px] text-white uppercase">Exp</p>
                <p className="font-mono text-xs text-white">••/••</p>
              </div>
              <div>
                <p className="text-[9px] text-white uppercase">CVV</p>
                <p className="font-mono text-xs text-white">•••</p>
              </div>
            </div>
          </div>
        </div>

        {isFrozen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/80">
            <div className="flex flex-col items-center gap-2">
              <Snowflake
                className="h-8 w-8 text-foreground"
                strokeWidth={1.5}
              />
              <p className="text-sm font-semibold text-foreground">
                Tarjeta congelada
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onQuickView(card.urn)}
          disabled={isLoadingQuickView}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/80 bg-card/90 px-2 py-3.5 shadow-[0_14px_24px_-25px_color-mix(in_oklch,var(--foreground)_60%,transparent)] dark:shadow-[0_14px_24px_-25px_rgb(0_0_0_/_0.72)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <EyeOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-[10px] font-medium text-foreground">
            {isLoadingQuickView ? 'Cargando...' : 'Ver datos de la tarjeta'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onViewDetails(card.urn)}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/80 bg-card/90 px-2 py-3.5 shadow-[0_14px_24px_-25px_color-mix(in_oklch,var(--foreground)_60%,transparent)] dark:shadow-[0_14px_24px_-25px_rgb(0_0_0_/_0.72)]"
        >
          <ExternalLink
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <span className="text-[10px] font-medium text-foreground">
            Gestionar
          </span>
        </button>
        <button
          type="button"
          onClick={() => onFreeze(card.urn)}
          disabled={isLoadingFreeze}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/80 bg-card/90 px-2 py-3.5 shadow-[0_14px_24px_-25px_color-mix(in_oklch,var(--foreground)_60%,transparent)] dark:shadow-[0_14px_24px_-25px_rgb(0_0_0_/_0.72)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Snowflake
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <span className="text-[10px] font-medium text-foreground">
            {isLoadingFreeze
              ? 'Procesando...'
              : isFrozen
                ? 'Descongelar'
                : 'Congelar'}
          </span>
        </button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Limites
        </p>
        <div className="rounded-2xl border border-border/85 bg-card/85 p-[1.125rem]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Diario</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatUSD(100)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mensual</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatUSD(500)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Configuracion
        </p>
        <div className="rounded-2xl border border-border/85 bg-card/85 p-[1.125rem]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                Pagos internacionales
              </span>
              <span className="text-xs text-muted-foreground">
                Permitir compras fuera de Colombia
              </span>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
