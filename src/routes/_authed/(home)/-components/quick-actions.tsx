'use client';

import { Link } from '@tanstack/react-router';
import { Landmark, RefreshCw, Send } from 'lucide-react';
import { cn } from '~/lib/utils';

const actions = [
  {
    label: 'Recargar',
    sublabel: 'PSE',
    href: '/topup',
    icon: Landmark,
    enabled: true,
  },
  { label: 'Enviar', sublabel: '', href: '/send', icon: Send, enabled: true },
  {
    label: 'Convertir',
    sublabel: '',
    href: '/convert',
    icon: RefreshCw,
    enabled: true,
  },
];

export function QuickActions() {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Acciones rápidas
      </p>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border border-border/85 px-2 py-3.5 transition-all duration-200',
                action.enabled
                  ? 'bg-card shadow-[0_14px_28px_-30px_color-mix(in_oklch,var(--foreground)_55%,transparent)] dark:shadow-[0_14px_28px_-30px_rgb(0_0_0_/_0.7)] hover:bg-muted/70 cursor-pointer'
                  : 'bg-muted/50 opacity-40 cursor-not-allowed',
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary">
                <Icon
                  className="h-4 w-4 text-primary-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">
                {action.label}
              </span>
              {action.sublabel && !action.enabled && (
                <span className="text-[9px] text-muted-foreground">
                  Próximamente
                </span>
              )}
            </div>
          );

          if (action.enabled) {
            return (
              <Link key={action.label} to={action.href}>
                {content}
              </Link>
            );
          }
          return <div key={action.label}>{content}</div>;
        })}
      </div>
    </section>
  );
}
