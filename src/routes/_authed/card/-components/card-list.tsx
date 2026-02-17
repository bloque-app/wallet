'use client';

import { Plus, Snowflake } from 'lucide-react';
import type { CardData } from '~/lib/mock-data';
import { cn } from '~/lib/utils';

interface CardListProps {
  cards: CardData[];
  activeCardId: string | null;
  onSelectCard: (id: string) => void;
  onAddCard: () => void;
}

function CardMini({
  card,
  isActive,
  onClick,
}: {
  card: CardData;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-28 w-44 shrink-0 snap-center flex-col justify-between rounded-xl border p-3 transition-all',
        isActive
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground',
      )}
      aria-label={`Tarjeta ${card.label}, terminada en ${card.last4}`}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[10px] font-semibold tracking-wider uppercase',
            isActive ? 'text-background/80' : 'text-muted-foreground',
          )}
        >
          {card.label}
        </span>
        {card.frozen && (
          <Snowflake
            className={cn(
              'h-3 w-3',
              isActive ? 'text-background/60' : 'text-muted-foreground',
            )}
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p
          className={cn(
            'font-mono text-xs tracking-widest',
            isActive ? 'text-background' : 'text-foreground',
          )}
        >
          {'•••• '}
          {card.last4}
        </p>
        <p
          className={cn(
            'text-[9px]',
            isActive ? 'text-background/50' : 'text-muted-foreground',
          )}
        >
          VIRTUAL
        </p>
      </div>
    </button>
  );
}

function AddCardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-28 w-44 shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border transition-colors hover:bg-muted"
      aria-label="Crear nueva tarjeta"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border">
        <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">
        Nueva tarjeta
      </span>
    </button>
  );
}

export function CardList({
  cards,
  activeCardId,
  onSelectCard,
  onAddCard,
}: CardListProps) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
      role="listbox"
      aria-label="Mis tarjetas"
    >
      {cards.map((card) => (
        <CardMini
          key={card.id}
          card={card}
          isActive={card.id === activeCardId}
          onClick={() => onSelectCard(card.id)}
        />
      ))}
      <AddCardButton onClick={onAddCard} />
    </div>
  );
}
