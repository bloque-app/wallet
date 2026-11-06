'use client';

import { Link, useLocation } from '@tanstack/react-router';
import { ArrowLeftRight, CreditCard, Home, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WhatsAppIcon } from '~/components/whatsapp-icon';
import { cn } from '~/lib/utils';

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/movements', label: t('nav.movements'), icon: ArrowLeftRight },
    {
      href: '/whatsapp',
      label: t('nav.whatsapp'),
      icon: WhatsAppIcon,
      highlight: true,
    },
    { href: '/card', label: t('nav.card'), icon: CreditCard },
    { href: '/profile', label: t('nav.profile'), icon: UserCircle },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
      aria-label={t('nav.ariaLabel')}
    >
      <div className="mx-auto flex h-[4.4rem] max-w-lg items-center justify-around rounded-[1.7rem] border border-border/80 bg-background/90 px-2 shadow-[0_20px_45px_-30px_color-mix(in_oklch,var(--foreground)_35%,transparent)] backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex min-w-[58px] flex-col items-center gap-0.5 px-1 text-center"
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    '-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_24px_-10px_rgb(37_211_102_/_0.8)] ring-4 ring-background transition-transform',
                    isActive ? 'scale-105' : 'hover:scale-105',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-tight',
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              to={item.href}
              replace={item.href === '/'}
              className={cn(
                'flex min-w-[58px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-center transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
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
