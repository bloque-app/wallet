'use client';

import { Link } from '@tanstack/react-router';
import { KeyRound, Landmark, Send } from 'lucide-react';
import { cn } from '~/lib/utils';

const actions = [
  {
    label: 'Recargar',
    href: '/topup',
    icon: Landmark,
  },
  {
    label: 'Enviar',
    href: '/send',
    icon: Send,
  },
  {
    label: 'BRE-B',
    href: '/breb-keys',
    icon: KeyRound,
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
          return (
            <Link key={action.label} to={action.href}>
              <div
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border border-border/85 px-2 py-3.5 transition-all duration-200',
                  'bg-card shadow-[0_14px_28px_-30px_color-mix(in_oklch,var(--foreground)_55%,transparent)] dark:shadow-[0_14px_28px_-30px_rgb(0_0_0_/_0.7)] hover:bg-muted/70 cursor-pointer',
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.07]">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-foreground leading-tight text-center">
                  {action.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
