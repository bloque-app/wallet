import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  activateBrebKey,
  deleteBrebKey,
  getBrebStatusLabel,
  listBrebAccounts,
  suspendBrebKey,
} from '../-lib/breb';

export const Route = createFileRoute('/_authed/send/breb-keys/manage-keys/')({
  component: RouteComponent,
});

function RouteComponent() {
  const accountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const suspendMutation = useMutation({
    mutationFn: suspendBrebKey,
    onSuccess: async () => {
      toast.success('Llave BRE-B suspendida.');
      await accountsQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo suspender la llave.',
      );
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateBrebKey,
    onSuccess: async () => {
      toast.success('Llave BRE-B activada.');
      await accountsQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo activar la llave.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrebKey,
    onSuccess: async () => {
      toast.success('Llave BRE-B eliminada.');
      await accountsQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la llave.',
      );
    },
  });

  const accounts = accountsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/send/breb-keys"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Tus llaves
          </h1>
          <p className="text-xs text-muted-foreground">
            Gestiona tus llaves registradas
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          No tienes llaves BRE-B registradas.
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {accounts.map((account) => (
            <div
              key={account.urn}
              className="rounded-2xl border border-border/85 bg-card/80 p-4"
            >
              <p className="text-sm font-medium text-foreground">
                {account.displayName ||
                  (account.metadata?.name as string) ||
                  'Llave BRE-B'}
              </p>
              <p className="text-xs text-muted-foreground">
                {account.keyType ?? 'Llave'} • {account.key ?? 'Sin valor'}
              </p>
              <p className="text-xs text-muted-foreground">
                Estado: {getBrebStatusLabel(account.status)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {account.status === 'active' ? (
                  <Button
                    variant="outline"
                    onClick={() => suspendMutation.mutate(account.urn)}
                    disabled={suspendMutation.isPending}
                    className="h-9 rounded-xl"
                  >
                    Suspender
                  </Button>
                ) : null}

                {account.status === 'frozen' ? (
                  <Button
                    variant="outline"
                    onClick={() => activateMutation.mutate(account.urn)}
                    disabled={activateMutation.isPending}
                    className="h-9 rounded-xl"
                  >
                    Activar
                  </Button>
                ) : null}

                {account.status !== 'deleted' ? (
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate(account.urn)}
                    disabled={deleteMutation.isPending}
                    className="h-9 rounded-xl"
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
