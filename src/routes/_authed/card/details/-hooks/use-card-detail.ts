import { useEffect, useMemo, useState } from 'react';
import type { CardProduct } from '~/domain/accounts/types';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { useCardMovements } from '~/hooks/accounts/use-card-movements';
import i18n from '~/i18n/config';
import type { Asset } from '~/lib/formatters';
import { useShowBalances } from '~/lib/show-balances';
import { useBalance } from './use-accounts';

type MovementFilter = 'todas' | 'entrantes' | 'salientes';

const DISPLAY_ASSET_MAP: Record<string, Asset> = {
  COPM: 'COP',
  DUSD: 'USD',
  KSM: 'KSM',
};

export const MOVEMENT_FILTERS: {
  labelKey: string;
  value: MovementFilter;
}[] = [
  { labelKey: 'card.details.filters.all', value: 'todas' },
  { labelKey: 'card.details.filters.incoming', value: 'entrantes' },
  { labelKey: 'card.details.filters.outgoing', value: 'salientes' },
];

export function useCardDetail(urn: string) {
  const { data, isLoading: isLoadingCard } = useAccounts();
  const cards =
    data?.flatMap((account) =>
      account.products.filter(
        (product): product is CardProduct => product.kind === 'card',
      ),
    ) ?? [];
  const showBalances = useShowBalances();

  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('todas');

  const balanceQuery = useBalance(urn);

  const direction =
    movementFilter === 'entrantes'
      ? 'in'
      : movementFilter === 'salientes'
        ? 'out'
        : undefined;

  const {
    data: txPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTransactions,
  } = useCardMovements(urn, selectedAssetKey, direction);

  const selectedCard =
    cards.find((card) => card.urn === urn) ?? cards[0] ?? null;

  const cardLabel = selectedCard?.label || i18n.t('card.detail.defaultLabel');

  const { assetList, balanceByKey } = useMemo(() => {
    const raw = balanceQuery.data as
      | Record<string, { current: string; pending: string }>
      | undefined;

    if (!raw)
      return {
        assetList: [] as Array<{
          sdkKey: string;
          code: string;
          precision: number;
        }>,
        balanceByKey: {} as Record<string, number>,
      };

    const list: Array<{ sdkKey: string; code: string; precision: number }> = [];
    const balance: Record<string, number> = {};

    for (const [key, value] of Object.entries(raw)) {
      const [assetKey, precisionStr] = key.split('/');
      // KSM isn't a balance this app surfaces to users — skip it entirely
      // rather than list it as a selectable asset chip.
      if (assetKey === 'KSM') continue;
      const precision = Number.parseInt(precisionStr, 10);
      const code = DISPLAY_ASSET_MAP[assetKey] ?? assetKey;
      balance[key] =
        Number.parseInt(value.current, 10) /
        10 ** (Number.isNaN(precision) ? 0 : precision);
      list.push({
        sdkKey: key,
        code,
        precision: Number.isNaN(precision) ? 0 : precision,
      });
    }

    // USD first among whatever remains, stable otherwise.
    list.sort((a, b) => {
      const aIsUsd = a.code === 'USD';
      const bIsUsd = b.code === 'USD';
      if (aIsUsd === bIsUsd) return 0;
      return aIsUsd ? -1 : 1;
    });

    return { assetList: list, balanceByKey: balance };
  }, [balanceQuery.data]);

  const currentAssetKey = selectedAssetKey || assetList[0]?.sdkKey || '';
  const currentAssetMeta = assetList.find((a) => a.sdkKey === currentAssetKey);
  const assetBalance = balanceByKey[currentAssetKey] ?? 0;
  const displayAsset = (currentAssetMeta?.code as Asset | undefined) ?? 'USD';

  useEffect(() => {
    if (!selectedAssetKey && assetList[0]?.sdkKey) {
      setSelectedAssetKey(assetList[0].sdkKey);
    }
  }, [selectedAssetKey, assetList]);

  const movements = useMemo(
    () => (txPages?.pages ?? []).flatMap((page) => page.movements),
    [txPages?.pages],
  );

  const filteredMovements = useMemo(() => {
    if (!currentAssetKey) return [];
    return movements;
  }, [movements, currentAssetKey]);

  return {
    // Card
    isLoadingCard,
    selectedCard,
    cardLabel,

    // Balance
    isLoadingBalance: balanceQuery.isLoading,
    assetList,
    currentAssetKey,
    assetBalance,
    displayAsset,
    showBalances,
    setSelectedAssetKey,

    // Movements
    isLoadingTransactions,
    filteredMovements,
    movementFilter,
    setMovementFilter,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
