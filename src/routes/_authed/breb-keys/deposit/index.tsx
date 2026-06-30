import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { goBackOrFallback } from '~/lib/navigation';
import { listBrebAccounts } from '../-lib/breb';

export const Route = createFileRoute('/_authed/breb-keys/deposit/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string | undefined) ?? '/breb-keys',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { from } = Route.useSearch();
  const { history } = useRouter();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const activeKeys = (accountsQuery.data ?? []).filter(
    (a) => a.status === 'active',
  );

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      toast.success('Llave copiada');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('No se pudo copiar la llave');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goBackOrFallback(() => history.push(from))}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            Depositar
          </h1>
          <p className="text-xs text-muted-foreground">
            Trae tu dinero desde otro banco
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm font-semibold tracking-[-0.015em] text-foreground">
          Recibe con tus llaves BRE-B
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Comparte una de tus llaves para que te transfieran desde cualquier
          banco colombiano al instante.
        </p>
      </div>

      {accountsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {['a', 'b', 'c'].map((k) => (
            <div
              key={k}
              className="h-20 animate-pulse rounded-2xl border border-border/75 bg-card/80"
            />
          ))}
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/75 bg-card/80 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.06]">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              No tienes llaves activas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registra una llave BRE-B para empezar a recibir dinero.
            </p>
          </div>
          <Link
            to="/breb-keys/manage-keys"
            className="inline-flex h-10 items-center rounded-xl border border-primary/30 bg-primary/[0.06] px-4 text-xs font-medium text-primary"
          >
            Registrar llave
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {activeKeys.map((account) => (
            <div
              key={account.urn}
              className="flex items-center gap-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {account.key}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.displayName ?? account.keyType ?? 'Llave BRE-B'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => account.key && copyKey(account.key)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 transition-all hover:bg-muted/70"
              >
                {copiedKey === account.key ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
