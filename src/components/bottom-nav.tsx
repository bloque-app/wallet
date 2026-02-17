'use client';

import { Link, useLocation } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  CreditCard,
  Home,
  Landmark,
  UserCircle,
} from 'lucide-react';
import { cn } from '~/lib/utils';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/movements', label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/card', label: 'Tarjeta', icon: CreditCard },
  { href: '/topup', label: 'Recargar', icon: Landmark },
  { href: '/profile', label: 'Perfil', icon: UserCircle },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex h-[4.4rem] max-w-lg items-center justify-around rounded-[1.7rem] border border-border/80 bg-background/90 px-2 shadow-[0_20px_45px_-30px_color-mix(in_oklch,var(--foreground)_35%,transparent)] backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              replace={item.href === '/'}
              className={cn(
                'flex min-w-[58px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-center transition-all',
                isActive
                  ? 'bg-muted/90 text-foreground shadow-[0_10px_20px_-16px_color-mix(in_oklch,var(--foreground)_45%,transparent)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.75} />
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive && 'font-semibold',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
