import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, KeyRound, QrCode, Settings2 } from 'lucide-react';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/send/breb-keys/')({
  component: RouteComponent,
});

const options = [
  {
    title: 'Registrar llave',
    description: 'Asocia una llave a tu cuenta',
    to: '/send/breb-keys/register-key',
    icon: KeyRound,
  },
  {
    title: 'Tus llaves',
    description: 'Gestiona tus llaves registradas',
    to: '/send/breb-keys/manage-keys',
    icon: Settings2,
  },
  {
    title: 'Pagar o transferir',
    description: 'Ingresa la llave o escanea el QR',
    to: '/send/breb-keys/pay-transfer',
    icon: QrCode,
  },
] as const;

function RouteComponent() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/send"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
          </h1>
          <p className="text-xs text-muted-foreground">
            Envia a cualquier banco colombiano al instante
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Link key={option.to} to={option.to}>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70',
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
            </Link>
          );
        })}
      </section>
    </div>
  );
}
