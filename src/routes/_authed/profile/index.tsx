import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Bell,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  Landmark,
  Lock,
  LogOut,
  Mail,
  Moon,
  Pencil,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { useTheme } from '~/components/ui/theme-provider';
import { useAuth } from '~/contexts/auth/auth-context';
import { type SupportedLanguage, setLanguage } from '~/i18n/config';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function RouteComponent() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { navigate } = useRouter();
  const profileName = user.name;
  const profileEmail = user.email;
  const [aliasCopied, setAliasCopied] = useState(false);

  const copyMyAlias = async () => {
    try {
      await navigator.clipboard.writeText(profileEmail);
      setAliasCopied(true);
      toast.success(t('profile.myAlias.copiedToast'));
      setTimeout(() => setAliasCopied(false), 2000);
    } catch {
      toast.error(t('profile.myAlias.copyErrorToast'));
    }
  };
  const selectedTheme = theme === 'light' ? 'light' : 'dark';
  const currentLanguage = (
    i18n.language === 'en' ? 'en' : 'es'
  ) satisfies SupportedLanguage;

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
          <span className="text-sm font-semibold text-primary">
            {getInitials(profileName)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">{profileEmail}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            {t('profile.myAlias.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.myAlias.description')}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {profileEmail}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copyMyAlias}
          className="h-9 w-9 shrink-0 rounded-xl bg-transparent"
        >
          {aliasCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('profile.sections.account')}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          <ProfileRow
            icon={Pencil}
            label={t('profile.rows.editProfile')}
            chevron
            onClick={() => {
              navigate({ to: '/profile/edit' });
            }}
          />
          <Separator />
          <ProfileRow
            icon={Landmark}
            label={t('profile.rows.allAccounts')}
            value={t('profile.rows.view')}
            chevron
            onClick={() => {
              navigate({ to: '/accounts', search: { from: 'profile' } });
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
