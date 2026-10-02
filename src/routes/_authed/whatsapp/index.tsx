import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowDownToLine,
  AtSign,
  Building2,
  KeyRound,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WhatsAppIcon } from '~/components/whatsapp-icon';
import { WHATSAPP_NUMBER } from '~/config/whatsapp';
import { useAuth } from '~/contexts/auth/auth-context';
import { buildWhatsAppUrl } from '~/lib/whatsapp';

export const Route = createFileRoute('/_authed/whatsapp/')({
  component: RouteComponent,
});

function WhatsAppCta({ href }: { href: string | null }) {
  const { t } = useTranslation();
  const className =
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-semibold text-[#052e16] transition-all active:scale-[0.985]';

  if (!href) {
    return (
      <button
        type="button"
        disabled
        className={`${className} cursor-not-allowed opacity-60`}
      >
        <WhatsAppIcon className="h-5 w-5" />
        {t('whatsapp.cta')} · {t('common.comingSoon')}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:brightness-95`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      {t('whatsapp.cta')}
    </a>
  );
}

function ChatBubble({
  from,
  children,
}: {
  from: 'user' | 'bloque';
  children: string;
}) {
  return (
    <div
      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
        from === 'user'
          ? 'self-end rounded-br-md bg-[#d9fdd3] text-[#111b21]'
          : 'self-start rounded-bl-md bg-white text-[#111b21]'
      }`}
    >
      {children}
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const alias = user?.email || user?.phone || '';

  const message = alias
    ? t('whatsapp.prefilledWithAlias', { alias })
    : t('whatsapp.prefilled');
  const href = WHATSAPP_NUMBER
    ? buildWhatsAppUrl(WHATSAPP_NUMBER, message)
    : null;

  const operations = [
    { icon: KeyRound, key: 'brebSend' },
    { icon: Building2, key: 'banks' },
    { icon: ArrowDownToLine, key: 'brebTopup' },
    { icon: Smartphone, key: 'pseTopup' },
  ] as const;

  const steps = ['open', 'ask', 'confirm'] as const;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
        {t('whatsapp.title')}
      </h1>

      <section className="flex flex-col gap-4 overflow-hidden rounded-3xl border border-[#25D366]/30 bg-gradient-to-br from-[#25D366]/15 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white">
            <WhatsAppIcon className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-base font-semibold text-foreground">
              {t('whatsapp.hero.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('whatsapp.hero.subtitle')}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col gap-2 rounded-2xl bg-[#efeae2] p-3 dark:bg-[#0b141a]"
          aria-label={t('whatsapp.chat.ariaLabel')}
          role="img"
        >
          <ChatBubble from="user">{t('whatsapp.chat.user1')}</ChatBubble>
          <ChatBubble from="bloque">{t('whatsapp.chat.bloque1')}</ChatBubble>
          <ChatBubble from="user">{t('whatsapp.chat.user2')}</ChatBubble>
          <ChatBubble from="bloque">{t('whatsapp.chat.bloque2')}</ChatBubble>
        </div>

        <WhatsAppCta href={href} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('whatsapp.operations.title')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {operations.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-2xl border border-border/85 bg-card p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.07]">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground">
                {t(`whatsapp.operations.${key}.title`)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`whatsapp.operations.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('whatsapp.steps.title')}
        </p>
        <ol className="flex flex-col divide-y divide-border/70 rounded-2xl border border-border/85 bg-card">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 px-4 py-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-sm text-foreground">
                  {t(`whatsapp.steps.${step}.title`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`whatsapp.steps.${step}.description`)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-border/85 bg-card p-4">
        <AtSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {t('whatsapp.alias.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('whatsapp.alias.description')}
          </p>
          {alias ? (
            <p className="text-sm font-semibold break-all text-foreground">
              {alias}
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-border/85 bg-card p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {t('whatsapp.security.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('whatsapp.security.description')}
          </p>
        </div>
      </section>

      <WhatsAppCta href={href} />
    </div>
  );
}
