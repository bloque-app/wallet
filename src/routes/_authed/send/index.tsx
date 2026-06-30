import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, KeyRound, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/send/')({
  component: RouteComponent,
});

type SendOption = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
} & ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

const options: SendOption[] = [
  {
    title: 'Llaves BRE-B',
    description: 'Envia a cualquier banco colombiano al instante.',
    to: '/send/breb-keys',
    icon: KeyRound,
  },
  {
    title: 'Bancos colombianos',
    description: 'Transfiere a cuentas bancarias en Colombia.',
    to: '/send/colombian-banks',
    icon: Building2,
  },
  {
    title: 'Amigos en bloque',
    description: 'Envia a contactos dentro de Bloque.',
    to: '/send/bloque-friends',
    icon: Users,
  },
  {
    title: 'Bancos/billeteras en EE.UU.',
    description: 'Envia USD a bancos y wallets en Estados Unidos.',
    icon: Building2,
    onClick: () => toast.info('Envío a EE.UU. disponible próximamente.'),
  },
  {
    title: 'Direcciones blockchain',
    description: 'Envia fondos a wallets externas.',
    icon: Wallet,
    onClick: () => toast.info('Envío a blockchain disponible próximamente.'),
  },
];

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
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          Enviar
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isDisabled = !option.to;
          const content = (
            <div
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all',
                isDisabled ? 'opacity-60' : 'hover:bg-muted/70',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                <Icon className="h-4 w-4 text-primary" />
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

          if (option.to) {
            return (
              <Link key={option.title} to={option.to}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={option.title}
              type="button"
              onClick={option.onClick}
              className="text-left"
            >
              {content}
            </button>
          );
        })}
      </section>
    </div>
  );
}
