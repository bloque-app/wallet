import { createFileRoute } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MovementDetailDrawer } from '~/components/movement-detail-drawer';
import { MovementRow } from '~/components/movement-row';
import { Input } from '~/components/ui/input';
import { useGlobalTransactionsInfinite } from '~/hooks/use-global-transactions-infinite';
import type { Asset, Movement } from '~/lib/mock-data';
import { cn } from '~/lib/utils';

type FilterType = 'all' | Asset | 'incoming' | 'outgoing';

const filters: { label: string; value: FilterType }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'COP', value: 'COP' },
  { label: 'USD', value: 'USD' },
  { label: 'KSM', value: 'KSM' },
  { label: 'Entrantes', value: 'incoming' },
  { label: 'Salientes', value: 'outgoing' },
];

export const Route = createFileRoute('/_authed/movements/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const direction =
    activeFilter === 'incoming'
      ? 'in'
      : activeFilter === 'outgoing'
        ? 'out'
        : undefined;
  const assetFilter =
    activeFilter === 'COP'
      ? 'COPM/2'
      : activeFilter === 'USD'
        ? 'DUSD/6'
        : activeFilter === 'KSM'
          ? 'KSM/12'
          : undefined;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGlobalTransactionsInfinite(10, direction, assetFilter);

  const allMovements = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.movements ?? []) ?? [],
    [data?.pages],
  );

  const filtered = useMemo(() => {
    let result = allMovements;

    if (
      activeFilter !== 'all' &&
      activeFilter !== 'incoming' &&
      activeFilter !== 'outgoing'
    ) {
      result = result.filter((m) => m.asset === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.reference.toLowerCase().includes(q) ||
          m.counterparty?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allMovements, activeFilter, search]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Movimientos
      </h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-2xl pl-9"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
              activeFilter === f.value
                ? 'border-foreground bg-foreground text-background shadow-[0_14px_20px_-18px_color-mix(in_oklch,var(--foreground)_75%,transparent)]'
                : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Movement list */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">
            Cargando movimientos...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">Sin resultados</p>
          <p className="text-xs text-muted-foreground">
            Intenta con otro filtro o referencia
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => (
            <MovementRow
              key={m.id}
              movement={m}
              onClick={() => setSelectedMovement(m)}
            />
          ))}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-2 w-full rounded-2xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              {isFetchingNextPage ? 'Cargando...' : 'Ver más'}
            </button>
          )}
        </div>
      )}

      <MovementDetailDrawer
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />
    </div>
  );
}
