import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAuth } from '~/contexts/auth/auth-context';
import {
  BREB_KEY_TYPES,
  type BrebKeyType,
  createBrebKey,
  listBrebAccounts,
} from '../-lib/breb';

export const Route = createFileRoute('/_authed/send/breb-keys/register-key/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const [keyType, setKeyType] = useState<BrebKeyType>('PHONE');
  const [keyValue, setKeyValue] = useState('');

  const accountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      await createBrebKey({
        keyType,
        key: keyValue.trim(),
        displayName: user.name.trim() || 'Usuario Bloque',
        metadata: {
          source: 'wallet',
          purpose: 'breb-send',
        },
      }),
    onSuccess: async () => {
      toast.success('Llave BRE-B creada correctamente.');
      setKeyValue('');
      await accountsQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la llave BRE-B.',
      );
    },
  });

  const selectedType = BREB_KEY_TYPES.find(
    (option) => option.value === keyType,
  );

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
            Registrar llave
          </h1>
          <p className="text-xs text-muted-foreground">
            Asocia una llave a tu cuenta
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Tipo de llave</Label>
            <div className="grid grid-cols-2 gap-2">
              {BREB_KEY_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKeyType(option.value)}
                  className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                    keyType === option.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background/70 text-foreground hover:bg-muted/70'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-register-key">Valor de la llave</Label>
            <Input
              id="breb-register-key"
              inputMode={
                keyType === 'PHONE' || keyType === 'ID' ? 'numeric' : 'text'
              }
              placeholder={selectedType?.placeholder}
              value={keyValue}
              onChange={(event) => setKeyValue(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !keyValue.trim()}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            {createMutation.isPending ? 'Creando llave...' : 'Registrar llave'}
          </Button>
        </div>
      </section>
    </div>
  );
}
