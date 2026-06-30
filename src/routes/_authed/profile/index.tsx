import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Landmark,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  Shield,
  Smartphone,
  UserCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { useTheme } from '~/components/ui/theme-provider';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloque } from '~/lib/bloque';
import { formatKSM, formatPolygonAddress } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function getKsmBalance(
  balance:
    | Record<
        string,
        { current: string; pending: string; in: string; out: string }
      >
    | undefined,
): number {
  if (!balance) return 0;
  for (const [key, value] of Object.entries(balance)) {
    const [assetKey, precisionStr] = key.split('/');
    if (assetKey === 'KSM') {
      const precision = Number.parseInt(precisionStr, 10);
      return (
        Number.parseInt(value.current, 10) /
        10 ** (Number.isNaN(precision) ? 0 : precision)
      );
    }
  }
  return 0;
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { navigate } = useRouter();
  const profileName = user.name;
  const profileEmail = user.email;
  const selectedTheme = theme === 'light' ? 'light' : 'dark';

  const { data: polygonData, isLoading: isLoadingPolygon } = useQuery({
    queryKey: ['polygon-accounts'],
    queryFn: () => bloque.accounts.polygon.list(),
  });
  const createPolygonMutation = useMutation({
    mutationFn: (name: string) =>
      bloque.accounts.polygon.create(name ? { name } : {}),
  });

  const polygonAccounts = polygonData?.accounts ?? [];

  const [showCreatePolygon, setShowCreatePolygon] = useState(false);
  const [polygonName, setPolygonName] = useState('');
  const polygonNameRef = useRef<HTMLInputElement>(null);

  const kycLabel =
    user?.kycStatus === 'approved'
      ? 'Verificado'
      : user?.kycStatus === 'in_review'
        ? 'En revisión'
        : user?.kycStatus === 'rejected'
          ? 'Rechazado'
          : 'Sin verificar';

  const handleCreatePolygon = async () => {
    try {
      await createPolygonMutation.mutateAsync(polygonName.trim());
      await queryClient.invalidateQueries({ queryKey: ['polygon-accounts'] });
      setShowCreatePolygon(false);
      setPolygonName('');
      toast.success('Cuenta Polygon creada');
    } catch {
      toast.error('Error al crear la cuenta Polygon');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        Perfil
      </h1>

      <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_16px_30px_-34px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
          <UserCircle className="h-6 w-6 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">{profileEmail}</p>
        </div>
      </div>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Cuenta
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={Landmark}
            label="Todas las cuentas"
            value="Ver"
            chevron
            onClick={() => {
              navigate({ to: '/accounts' });
            }}
          />
          <Separator />
          <ProfileRow
            icon={Shield}
            label="Verificación KYC"
            value={kycLabel}
            chevron
            onClick={() => {
              navigate({ to: '/kyc' });
            }}
          />
          <Separator />
          <ProfileRow
            icon={Smartphone}
            label="Dispositivos y sesiones"
            value="1 activo"
            chevron
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Cuentas Polygon
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          {isLoadingPolygon ? (
            <div className="flex items-center justify-center px-4 py-4">
              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            polygonAccounts.map((account, index) => (
              <div key={account.id}>
                <ProfileRow
                  icon={Landmark}
                  label={
                    account.metadata?.name ||
                    formatPolygonAddress(account.address)
                  }
                  value={`${formatPolygonAddress(account.address)} · ${formatKSM(
                    getKsmBalance(
                      account.balance as Parameters<typeof getKsmBalance>[0],
                    ),
                  )}`}
                  chevron
                />
                {index < polygonAccounts.length - 1 && <Separator />}
              </div>
            ))
          )}
          {polygonAccounts.length > 0 && !isLoadingPolygon && <Separator />}
          <ProfileRow
            icon={Plus}
            label="Agregar cuenta"
            chevron
            onClick={() => {
              setPolygonName('');
              setShowCreatePolygon(true);
              setTimeout(() => polygonNameRef.current?.focus(), 150);
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Configuración
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow icon={Globe} label="Idioma" value="Español (CO)" />
          <Separator />
          <ProfileToggleRow
            icon={Bell}
            label="Notificaciones push"
            sublabel="Recibe alertas de movimientos"
            defaultChecked
          />
          <Separator />
          <ProfileThemeRow
            isDarkTheme={selectedTheme === 'dark'}
            onToggleTheme={(checked) => {
              setTheme(checked ? 'dark' : 'light');
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Legal
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow icon={FileText} label="Términos y condiciones" chevron />
          <Separator />
          <ProfileRow icon={Lock} label="Política de privacidad" chevron />
          <Separator />
          <ProfileRow icon={FileText} label="Tarifas y comisiones" chevron />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Soporte
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow icon={MessageSquare} label="Chat de soporte" chevron />
          <Separator />
          <ProfileRow icon={HelpCircle} label="Centro de ayuda" chevron />
          <Separator />
          <ProfileRow
            icon={Mail}
            label="Contacto"
            value="soporte@bloque.team"
          />
        </div>
      </section>

      <Button
        variant="outline"
        onClick={async () => {
          await logout();
          navigate({ to: '/login' });
        }}
        className="h-12 w-full gap-2 rounded-2xl text-sm font-medium bg-transparent"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>

      <p className="pb-4 text-center text-[10px] text-muted-foreground">
        Wallet Bloque v0.0.1
      </p>

      {/* Create polygon account drawer */}
      <Drawer
        open={showCreatePolygon}
        onOpenChange={(open) => {
          if (!createPolygonMutation.isPending) setShowCreatePolygon(open);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Nueva cuenta
              </span>
            </div>
            <DrawerTitle className="text-lg font-bold tracking-[-0.02em]">
              Cuenta Polygon
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="profile-polygon-name"
                className="text-sm font-medium text-foreground"
              >
                Nombre (opcional)
              </Label>
              <Input
                id="profile-polygon-name"
                ref={polygonNameRef}
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePolygon();
                }}
                placeholder="Principal"
                maxLength={40}
                disabled={createPolygonMutation.isPending}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Se creará una nueva wallet en la red Polygon.
              </p>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleCreatePolygon}
              disabled={createPolygonMutation.isPending}
              className="h-12 w-full gap-2 rounded-xl text-sm font-medium"
            >
              {createPolygonMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCreatePolygon(false)}
              disabled={createPolygonMutation.isPending}
              className="h-10 w-full text-sm text-muted-foreground"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  chevron = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value?: string;
  chevron?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted"
    >
      <Icon
        className="h-4.5 w-4.5 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      {chevron && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </Comp>
  );
}

function ProfileToggleRow({
  icon: Icon,
  label,
  sublabel,
  defaultChecked = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sublabel?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon
        className="h-4.5 w-4.5 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function ProfileThemeRow({
  isDarkTheme,
  onToggleTheme,
}: {
  isDarkTheme: boolean;
  onToggleTheme: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Moon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">Tema</span>
        <span className="text-xs text-muted-foreground">
          Activa para usar dark, desactiva para light
        </span>
      </div>
      <Switch checked={isDarkTheme} onCheckedChange={onToggleTheme} />
    </div>
  );
}
