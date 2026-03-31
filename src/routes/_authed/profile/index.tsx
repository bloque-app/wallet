import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Landmark,
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
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { useTheme } from '~/components/ui/theme-provider';
import { useAuth } from '~/contexts/auth/auth-context';
import { formatKSM, formatPolygonAddress } from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { polygonAccounts, addPolygonAccount } = useWallet();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { navigate } = useRouter();
  const profileName = user.name;
  const profileEmail = user.email;
  const selectedTheme = theme === 'light' ? 'light' : 'dark';

  const handleAddPolygonAccount = () => {
    const label = window.prompt('Nombre de la nueva cuenta Polygon', '');
    if (!label?.trim()) return;
    addPolygonAccount(label.trim());
  };

  const kycLabel =
    user?.kycStatus === 'approved'
      ? 'Verificado'
      : user?.kycStatus === 'in_review'
        ? 'En revisión'
        : user?.kycStatus === 'rejected'
          ? 'Rechazado'
          : 'Sin verificar';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Perfil
      </h1>

      <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_16px_30px_-34px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <UserCircle
            className="h-6 w-6 text-muted-foreground"
            strokeWidth={1.5}
          />
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
          {polygonAccounts.map((account, index) => (
            <div key={account.id}>
              <ProfileRow
                icon={Landmark}
                label={account.label}
                value={`${formatPolygonAddress(account.address)} • ${formatKSM(
                  account.balance,
                )}`}
                chevron
              />
              {index < polygonAccounts.length - 1 && <Separator />}
            </div>
          ))}
          {polygonAccounts.length > 0 && <Separator />}
          <ProfileRow
            icon={Plus}
            label="Agregar cuenta"
            chevron
            onClick={handleAddPolygonAccount}
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
