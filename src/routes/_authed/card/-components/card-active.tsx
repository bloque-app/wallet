'use client';

import { Eye, EyeOff, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { type CardData, formatUSD } from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';

interface CardActiveProps {
  card: CardData;
}

export function CardActive({ card }: CardActiveProps) {
  const { balances } = useWallet();
  const [showCvv, setShowCvv] = useState(false);
  const [showPan, setShowPan] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Virtual card visual */}
      <div className="relative mx-auto flex h-52 w-full max-w-xs flex-col justify-between rounded-xl border border-border bg-foreground p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wider text-background">
            Nyv
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-background/10 px-1.5 py-0.5 text-[9px] font-medium text-background/70">
              {card.label}
            </span>
            <span className="text-xs text-background/60">VIRTUAL</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-mono text-lg tracking-widest text-background">
            {showPan
              ? `4829 •••• •••• ${card.last4}`
              : `•••• •••• •••• ${card.last4}`}
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[9px] text-background/50 uppercase">Exp</p>
              <p className="font-mono text-xs text-background">12/28</p>
            </div>
            <div>
              <p className="text-[9px] text-background/50 uppercase">CVV</p>
              <p className="font-mono text-xs text-background">
                {showCvv ? '847' : '•••'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-background/60">Saldo USD</p>
          <p className="text-sm font-bold text-background tabular-nums">
            {formatUSD(balances.USD)}
          </p>
        </div>

        {card.frozen && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
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

      {/* Card actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setShowPan(!showPan)}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3"
        >
          {showPan ? (
            <EyeOff
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          )}
          <span className="text-[10px] font-medium text-foreground">
            {showPan ? 'Ocultar' : 'Ver'} PAN
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowCvv(!showCvv)}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3"
        >
          {showCvv ? (
            <EyeOff
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          )}
          <span className="text-[10px] font-medium text-foreground">
            {showCvv ? 'Ocultar' : 'Ver'} CVV
          </span>
        </button>
        <button
          type="button"
          onClick={() => undefined}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3"
          disabled
        >
          <Snowflake
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <span className="text-[10px] font-medium text-foreground">
            {card.frozen ? 'Descongelar' : 'Congelar'}
          </span>
        </button>
      </div>

      <Separator />

      {/* Limits */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Limites
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Diario</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatUSD(card.limits.daily)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mensual</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatUSD(card.limits.monthly)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Settings */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Configuracion
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
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
