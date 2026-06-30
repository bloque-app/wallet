import { BloqueAPIError } from '@bloque/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  CreditCard,
  KeyRound,
  Mail,
  MoreVertical,
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
  activateBrebKey,
  BrebKeyError,
  type BrebKeyType,
  createBrebKey,
  deleteBrebKey,
  getBrebStatusLabel,
  listBrebAccounts,
  suspendBrebKey,
} from '../-lib/breb';

export const Route = createFileRoute('/_authed/breb-keys/manage-keys/')({
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

type KeyOption = {
  keyType: BrebKeyType;
  value: string;
  label: string;
  icon: React.ElementType;
};

function RouteComponent() {
  const [conflictDrawer, setConflictDrawer] = useState<{
    open: boolean;
    key: string;
  }>({ open: false, key: '' });
  const [actionsDrawer, setActionsDrawer] = useState<{
    open: boolean;
    urn: string;
    status: string;
    key: string;
  }>({ open: false, urn: '', status: '', key: '' });

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
    [profile?.first_name].filter(Boolean).join(' ') || 'Usuario Bloque';

  const keyOptions: KeyOption[] = [];
  if (localPhone) {
    keyOptions.push({
      keyType: 'ALPHA',
      value: `@bl${localPhone}`,
      label: 'Llave Bloque',
      icon: KeyRound,
    });
    keyOptions.push({
      keyType: 'PHONE',
      value: localPhone,
      label: 'Celular',
      icon: Smartphone,
    });
  }
  if (profile?.email) {
    keyOptions.push({
      keyType: 'EMAIL',
      value: profile.email,
      label: 'Correo electrónico',
      icon: Mail,
    });
  }
  if (profile?.personal_id_number && profile?.personal_id_type === 'CC') {
    keyOptions.push({
      keyType: 'ID',
      value: profile.personal_id_number,
      label: 'Documento',
      icon: CreditCard,
    });
  }

  const registeredKeys = new Set(
    (accountsQuery.data ?? []).map((a) => a.key).filter(Boolean),
  );
  const activeAccounts = (accountsQuery.data ?? []).filter(
    (a) => a.status === 'active' || a.status === 'frozen',
  );
  const unregisteredOptions = keyOptions.filter(
    (o) => !registeredKeys.has(o.value),
  );

  const createMutation = useMutation({
    mutationFn: async ({
      keyType,
      value,
    }: {
      keyType: BrebKeyType;
      value: string;
    }) =>
      createBrebKey({
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
        setConflictDrawer({ open: true, key: variables.value });
        return;
      }
      toast.error(getBrebKeyCreationError(error));
    },
  });

  const suspendMutation = useMutation({
    mutationFn: suspendBrebKey,
    onSuccess: async () => {
      toast.success('Llave suspendida.');
      await accountsQuery.refetch();
      setActionsDrawer((s) => ({ ...s, open: false }));
    },
    onError: () => toast.error('No se pudo suspender la llave.'),
  });

  const activateMutation = useMutation({
    mutationFn: activateBrebKey,
    onSuccess: async () => {
      toast.success('Llave activada.');
      await accountsQuery.refetch();
      setActionsDrawer((s) => ({ ...s, open: false }));
    },
    onError: () => toast.error('No se pudo activar la llave.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrebKey,
    onSuccess: async () => {
      toast.success('Llave eliminada.');
      await accountsQuery.refetch();
      setActionsDrawer((s) => ({ ...s, open: false }));
    },
    onError: () => toast.error('No se pudo eliminar la llave.'),
  });

  const isLoading = profileQuery.isLoading || accountsQuery.isLoading;
  const actionsPending =
    suspendMutation.isPending ||
    activateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
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
            Tus llaves
          </h1>
          <p className="text-xs text-muted-foreground">
            Registra o edita tus llaves para recibir dinero al instante
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {['a', 'b', 'c', 'd'].map((k) => (
            <div
              key={k}
              className="h-16 animate-pulse rounded-2xl border border-border/75 bg-card/80"
            />
          ))}
        </div>
      ) : (
        <>
          {activeAccounts.length > 0 && (
            <section className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                Llaves listas para usar
              </p>
              <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/75 bg-card/80 overflow-hidden">
                {activeAccounts.map((account) => (
                  <div
                    key={account.urn}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {account.key ?? 'Sin valor'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.displayName ||
                          getBrebStatusLabel(account.status)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-primary">
                      BRE-B
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      onClick={() =>
                        setActionsDrawer({
                          open: true,
                          urn: account.urn,
                          status: account.status,
                          key: account.key ?? '',
                        })
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {unregisteredOptions.length > 0 && (
            <section className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                Registra tus llaves en BRE-B
              </p>
              <div className="flex flex-col gap-3">
                {unregisteredOptions.map((option) => {
                  const Icon = option.icon;
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
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeAccounts.length === 0 && unregisteredOptions.length === 0 && (
            <p className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
              No hay llaves disponibles para registrar.
            </p>
          )}
        </>
      )}

      {/* Conflict drawer (P901 / U807) */}
      <Drawer
        open={conflictDrawer.open}
        onOpenChange={(open) => setConflictDrawer((s) => ({ ...s, open }))}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
              Esta llave ya está registrada en otra entidad
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm leading-relaxed">
              La llave{' '}
              <span className="font-medium text-foreground">
                {conflictDrawer.key}
              </span>{' '}
              ya está activa en otro banco. Para registrarla en Bloque, primero
              debes eliminarla o desactivarla desde la app de esa entidad.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              className="h-12 w-full rounded-2xl text-sm font-medium"
              onClick={() => setConflictDrawer((s) => ({ ...s, open: false }))}
            >
              Entendido
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Actions drawer */}
      <Drawer
        open={actionsDrawer.open}
        onOpenChange={(open) => setActionsDrawer((s) => ({ ...s, open }))}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base font-semibold">
              {actionsDrawer.key}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {actionsDrawer.status === 'active'
                ? 'Llave activa'
                : actionsDrawer.status === 'frozen'
                  ? 'Llave suspendida'
                  : getBrebStatusLabel(actionsDrawer.status)}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            {actionsDrawer.status === 'active' && (
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl text-sm"
                disabled={actionsPending}
                onClick={() => suspendMutation.mutate(actionsDrawer.urn)}
              >
                {suspendMutation.isPending
                  ? 'Suspendiendo...'
                  : 'Suspender llave'}
              </Button>
            )}
            {actionsDrawer.status === 'frozen' && (
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl text-sm"
                disabled={actionsPending}
                onClick={() => activateMutation.mutate(actionsDrawer.urn)}
              >
                {activateMutation.isPending ? 'Activando...' : 'Activar llave'}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl text-sm text-destructive hover:text-destructive"
              disabled={actionsPending}
              onClick={() => deleteMutation.mutate(actionsDrawer.urn)}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar llave'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
