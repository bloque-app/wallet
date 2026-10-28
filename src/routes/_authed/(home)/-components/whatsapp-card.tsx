import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WhatsAppIcon } from '~/components/whatsapp-icon';

export function WhatsAppCard() {
  const { t } = useTranslation();
  return (
    <Link
      to="/whatsapp"
      className="flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/15 to-card px-4 py-3 transition-colors hover:bg-[#25D366]/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white">
        <WhatsAppIcon className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-foreground">
          {t('home.whatsappCard.title')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('home.whatsappCard.description')}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
