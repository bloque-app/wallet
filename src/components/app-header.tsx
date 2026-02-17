'use client';

import { Bell } from 'lucide-react';
import { Button } from '~/components/ui/button';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-2">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between rounded-2xl border border-border/70 bg-background/90 px-4 shadow-[0_14px_40px_-28px_color-mix(in_oklch,var(--foreground)_30%,transparent)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" />
          <span className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            Bloque
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          aria-label="Notificaciones"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.7} />
        </Button>
      </div>
    </header>
  );
}
