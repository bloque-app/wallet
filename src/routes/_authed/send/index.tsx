import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, KeyRound, Users, Wallet } from 'lucide-react';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/send/')({
  component: RouteComponent,
});

const options = [
  {
    title: 'Llaves BRE-B',
    description: 'Envia a cualquier banco colombiano al instante.',
    to: '/send/breb-keys',
    icon: KeyRound,
    enabled: true,
  },
  {
    title: 'Bancos colombianos',
    description: 'Transfiere a cuentas bancarias en Colombia.',
    to: '/send/colombian-banks',
    icon: Building2,
    enabled: true,
  },
  {
    title: 'Bancos/billeteras en EE.UU.',
    description: 'Envia USD a bancos y wallets en Estados Unidos.',
    to: '/send/us-banks-wallets',
    icon: Building2,
    enabled: true,
  },
  {
    title: 'Amigos en bloque',
    description: 'Envia a contactos dentro de Bloque.',
    to: '/send/bloque-friends',
    icon: Users,
    enabled: true,
  },
  {
    title: 'Direcciones blockchain',
    description: 'Envia fondos a wallets externas.',
    to: '/send/blockchain-addresses',
    icon: Wallet,
    enabled: true,
  },
] as const;

function RouteComponent() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          replace
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Enviar
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const content = (
            <div
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all',
                option.enabled
                  ? 'hover:bg-muted/70'
                  : 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground">
                  {option.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          );

          if (!option.enabled) return <div key={option.title}>{content}</div>;

          return (
            <Link key={option.title} to={option.to}>
              {content}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
