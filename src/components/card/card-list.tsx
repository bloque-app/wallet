'use client';

import { Plus, Snowflake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CardProduct } from '~/domain/accounts/types';
import { cn } from '~/lib/utils';

interface CardListProps {
  cards: CardProduct[];
  activeCardId: string | null;
  onSelectCard: (urn: string) => void;
  onAddCard: () => void;
  canAddCard?: boolean;
}

function CardMiniVisual({
  card,
  isActive,
  onClick,
}: {
  card: CardProduct;
  isActive: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const label = card.label;
  const isFrozen = card.status === 'frozen';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-[7.4rem] w-[11.5rem] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary ring-2 ring-primary/45 shadow-[0_20px_28px_-22px_color-mix(in_oklch,var(--foreground)_80%,transparent)] dark:shadow-[0_20px_28px_-22px_rgb(0_0_0_/_0.75)]'
          : 'border-border/90 shadow-[0_14px_25px_-26px_color-mix(in_oklch,var(--foreground)_55%,transparent)] dark:shadow-[0_14px_25px_-26px_rgb(0_0_0_/_0.65)] opacity-90 hover:opacity-100',
      )}
      aria-label={t('card.list.cardAria', { label, lastFour: card.lastFour })}
      aria-pressed={isActive}
    >
      <img
        src="/images/card.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className={cn(
          'absolute inset-0',
          isActive ? 'bg-black/8' : 'bg-black/30',
        )}
      />

      {isActive && (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold tracking-wide text-primary-foreground uppercase">
          {t('card.list.selected')}
        </span>
      )}

      <div className="relative z-10 flex items-center justify-end gap-1.5">
        {isFrozen && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-1.5 py-0.5 text-[9px] text-background/90">
            <Snowflake className="h-2.5 w-2.5" strokeWidth={1.5} />
            {t('card.list.frozenBadge')}
          </span>
        )}
        <span className="text-[10px] font-semibold tracking-wider text-white uppercase">
          {label}
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-0.5">
        <p className="font-mono text-xs tracking-widest text-white">
          {'•••• '}
          {card.lastFour}
        </p>
        <p className="text-[9px] text-white">VIRTUAL</p>
      </div>
    </button>
  );
}

export function CardList({
  cards,
  activeCardId,
  onSelectCard,
  onAddCard,
  canAddCard = true,
}: CardListProps) {
  const { t } = useTranslation();
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
      role="listbox"
      aria-label={t('card.list.myCardsAria')}
    >
      {cards.map((card) => (
        <CardMiniVisual
          key={card.urn}
          card={card}
          isActive={card.urn === activeCardId}
          onClick={() => onSelectCard(card.urn)}
        />
      ))}
      <button
        type="button"
        onClick={onAddCard}
        disabled={!canAddCard}
        className={cn(
          'flex h-[7.4rem] w-[11.5rem] shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/35 transition-colors',
          canAddCard ? 'hover:bg-muted' : 'cursor-not-allowed opacity-55',
        )}
        aria-label={t('card.list.createNewAria')}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border">
          <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {t('card.list.newCard')}
        </span>
      </button>
    </div>
  );
}
