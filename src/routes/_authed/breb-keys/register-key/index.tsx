import { BloqueAPIError } from '@bloque/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  CreditCard,
  KeyRound,
  Mail,
  Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { createBloqueSdk } from '~/lib/bloque';
import {
  BrebKeyError,
  type BrebKeyType,
  createBrebKey,
  listBrebAccounts,
} from '../-lib/breb';

export const Route = createFileRoute('/_authed/breb-keys/register-key/')({
  component: RouteComponent,
});

const DRAWER_PROVIDER_CODES = new Set(['P901', 'U807']);

function getProviderCode(error: unknown): string | undefined {
  if (error instanceof BrebKeyError) return error.providerCode;
  if (error instanceof BloqueAPIError) {
    const details = (error.response as Record<string, unknown> | undefined)
      ?.extra_details as Record<string, unknown> | undefined;
    if (details?.provider_code) return details.provider_code as string;
  }
  return undefined;
}

function getBrebKeyCreationError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.startsWith('E_')
  ) {
    return error.message;
  }
  return 'No se pudo registrar la llave BRE-B. Intenta de nuevo.';
}

function stripCountryCode(phone: string): string {
  if (phone.startsWith('+57')) return phone.slice(3);
  if (phone.startsWith('57') && phone.length > 10) return phone.slice(2);
  return phone;
}

function RouteComponent() {
  const [p901Drawer, setP901Drawer] = useState<{ open: boolean; key: string }>({
    open: false,
    key: '',
  });

  const profileQuery = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => createBloqueSdk().me(),
    staleTime: 5 * 60_000,
  });

  const accountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const profile = profileQuery.data?.profile;
  const localPhone = profile?.phone ? stripCountryCode(profile.phone) : null;
  const displayName =
    [profileQuery.data?.profile.first_name].filter(Boolean).join(' ') ||
    'Usuario Bloque';

  type KeyOption = {
    keyType: BrebKeyType;
    value: string;
    label: string;
    description: string;
    icon: React.ElementType;
  };

  const keyOptions: KeyOption[] = [];
  if (localPhone) {
    keyOptions.push({
      keyType: 'ALPHA',
      value: `@bl${localPhone}`,
      label: 'Llave Bloque',
      description: 'Tu llave personal de Bloque',
      icon: KeyRound,
    });
    keyOptions.push({
      keyType: 'PHONE',
      value: localPhone,
      label: 'Celular',
      description: 'Tu número de celular',
      icon: Smartphone,
    });
  }
  if (profile?.email) {
    keyOptions.push({
      keyType: 'EMAIL',
      value: profile.email,
      label: 'Correo electrónico',
      description: 'Tu correo electrónico',
      icon: Mail,
    });
  }
  if (profile?.personal_id_number && profile?.personal_id_type === 'CC') {
    keyOptions.push({
      keyType: 'ID',
      value: profile.personal_id_number,
      label: 'Documento',
      description: 'Tu documento de identidad',
      icon: CreditCard,
    });
  }

  const registeredKeys = new Set(
    (accountsQuery.data ?? []).map((a) => a.key).filter(Boolean),
  );

  const createMutation = useMutation({
    mutationFn: async ({
      keyType,
      value,
    }: {
      keyType: BrebKeyType;
      value: string;
    }) =>
      await createBrebKey({
        keyType,
        key: value,
        displayName,
        metadata: { source: 'wallet', purpose: 'breb-send' },
      }),
    onSuccess: async () => {
      toast.success('Llave BRE-B registrada correctamente.');
      await accountsQuery.refetch();
    },
    onError: (error, variables) => {
      const code = getProviderCode(error);
      if (code && DRAWER_PROVIDER_CODES.has(code)) {
        setP901Drawer({ open: true, key: variables.value });
        return;
      }
      toast.error(getBrebKeyCreationError(error));
    },
  });

  const isLoading = profileQuery.isLoading || accountsQuery.isLoading;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/breb-keys"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            Registrar llave
          </h1>
          <p className="text-xs text-muted-foreground">
            Elige las llaves para enviar y recibir dinero al instante
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`ske-${i}`}
                className="h-20 animate-pulse rounded-2xl border border-border/75 bg-card/80"
              />
            ))
          : keyOptions.map((option) => {
              const Icon = option.icon;
              const registered = registeredKeys.has(option.value);
              const isPending =
                createMutation.isPending &&
                createMutation.variables?.value === option.value;

              return (
                <div
                  key={option.value}
                  className="flex items-center gap-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {option.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {option.label}
                    </p>
                  </div>

                  {registered ? (
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
                      Registrada
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0 rounded-xl px-4 text-xs font-medium"
                      disabled={createMutation.isPending}
                      onClick={() =>
                        createMutation.mutate({
                          keyType: option.keyType,
                          value: option.value,
                        })
                      }
                    >
                      {isPending ? 'Registrando...' : 'Registrar'}
                    </Button>
                  )}
                </div>
              );
            })}
      </div>

      <Drawer
        open={p901Drawer.open}
        onOpenChange={(open) => setP901Drawer((s) => ({ ...s, open }))}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              Esta llave ya está registrada en otra entidad
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm leading-relaxed">
              La llave{' '}
              <span className="font-medium text-foreground">
                {p901Drawer.key}
              </span>{' '}
              ya está activa en otro banco. Para registrarla en Bloque, primero
              debes eliminarla o desactivarla desde la app de esa entidad.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              className="h-12 w-full rounded-2xl text-sm font-medium"
              onClick={() => setP901Drawer((s) => ({ ...s, open: false }))}
            >
              Entendido
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
