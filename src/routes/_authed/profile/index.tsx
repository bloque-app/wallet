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
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { useTheme } from '~/components/ui/theme-provider';
import { useAuth } from '~/contexts/auth/auth-context';
import type { PolygonProduct } from '~/domain/accounts/types';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { type SupportedLanguage, setLanguage } from '~/i18n/config';
import { formatPolygonAddress } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { navigate } = useRouter();
  const profileName = user.name;
  const profileEmail = user.email;
  const selectedTheme = theme === 'light' ? 'light' : 'dark';
  const currentLanguage = (
    i18n.language === 'en' ? 'en' : 'es'
  ) satisfies SupportedLanguage;

  const accountsQuery = useAccounts();
  const isLoadingPolygon = accountsQuery.isLoading;
  const polygonAccounts =
    accountsQuery.data?.flatMap((account) =>
      account.products.filter(
        (product): product is PolygonProduct => product.kind === 'polygon',
      ),
    ) ?? [];

  const kycLabel =
    user?.kycStatus === 'approved'
      ? t('profile.kyc.approved')
      : user?.kycStatus === 'awaiting_verification'
        ? t('profile.kyc.awaitingVerification')
        : user?.kycStatus === 'rejected'
          ? t('profile.kyc.rejected')
          : t('profile.kyc.notVerified');

  const languageLabel =
    currentLanguage === 'es'
      ? t('profile.settings.languageSpanish')
      : t('profile.settings.languageEnglish');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('profile.title')}
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
          {t('profile.sections.account')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={Landmark}
            label={t('profile.rows.allAccounts')}
            value={t('profile.rows.view')}
            chevron
            onClick={() => {
              navigate({ to: '/accounts' });
            }}
          />
          <Separator />
          <ProfileRow
            icon={Shield}
            label={t('profile.rows.kycVerification')}
            value={kycLabel}
            chevron
            onClick={() => {
              navigate({ to: '/kyc' });
            }}
          />
          <Separator />
          <ProfileRow
            icon={Smartphone}
            label={t('profile.rows.devicesAndSessions')}
            value={t('profile.rows.oneActive')}
            chevron
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('profile.sections.polygonAccounts')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          {isLoadingPolygon ? (
            <div className="flex items-center justify-center px-4 py-4">
              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            polygonAccounts.map((account, index) => (
              <div key={account.urn}>
                <ProfileRow
                  icon={Landmark}
                  label={account.label}
                  value={formatPolygonAddress(account.address)}
                  chevron
                />
                {index < polygonAccounts.length - 1 && <Separator />}
              </div>
            ))
          )}
          {polygonAccounts.length > 0 && !isLoadingPolygon && <Separator />}
          <ProfileRow
            icon={Plus}
            label={t('profile.rows.addAccount')}
            chevron
            onClick={() => {
              navigate({ to: '/accounts' });
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('profile.sections.settings')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={Globe}
            label={t('profile.rows.language')}
            value={languageLabel}
            onClick={() => {
              setLanguage(currentLanguage === 'es' ? 'en' : 'es');
            }}
          />
          <Separator />
          <ProfileToggleRow
            icon={Bell}
            label={t('profile.rows.pushNotifications')}
            sublabel={t('profile.rows.pushNotificationsSublabel')}
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
          {t('profile.sections.legal')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={FileText}
            label={t('profile.rows.termsAndConditions')}
            chevron
          />
          <Separator />
          <ProfileRow
            icon={Lock}
            label={t('profile.rows.privacyPolicy')}
            chevron
          />
          <Separator />
          <ProfileRow
            icon={FileText}
            label={t('profile.rows.feesAndCommissions')}
            chevron
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('profile.sections.support')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={MessageSquare}
            label={t('profile.rows.supportChat')}
            chevron
          />
          <Separator />
          <ProfileRow
            icon={HelpCircle}
            label={t('profile.rows.helpCenter')}
            chevron
          />
          <Separator />
          <ProfileRow
            icon={Mail}
            label={t('profile.rows.contact')}
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
        {t('profile.logout')}
      </Button>

      <p className="pb-4 text-center text-[10px] text-muted-foreground">
        {t('profile.version', { version: '0.0.1' })}
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
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Moon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">
          {t('profile.rows.theme')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('profile.rows.themeSublabel')}
        </span>
      </div>
      <Switch checked={isDarkTheme} onCheckedChange={onToggleTheme} />
    </div>
  );
}
