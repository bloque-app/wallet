import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';

export function ComingSoonBadge() {
  const { t } = useTranslation();
  return (
    <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {t('common.comingSoon')}
    </span>
  );
}

export function ComingSoonScreen({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton onClick={onBack} />
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
      </div>
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-border/75 bg-card/85 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">
          {t('common.comingSoon')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('common.comingSoonDescription')}
        </p>
      </section>
    </div>
  );
}
