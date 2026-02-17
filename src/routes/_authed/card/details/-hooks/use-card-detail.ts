import { useEffect, useMemo, useState } from 'react';
import type { Asset } from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';
import { useCards } from '../../-hooks/use-card';
import { useBalance, useTransactions } from './use-accounts';

type MovementFilter = 'todas' | 'entrantes' | 'salientes';

const DISPLAY_ASSET_MAP: Record<string, Asset> = {
  COPM: 'COP',
  DUSD: 'USD',
  KSM: 'KSM',
};

export const MOVEMENT_FILTERS: { label: string; value: MovementFilter }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Entrantes', value: 'entrantes' },
  { label: 'Salientes', value: 'salientes' },
];

export function useCardDetail(urn: string) {
  const { data, isLoading: isLoadingCard } = useCards();
  const cards = data?.accounts ?? [];
  const { showBalances } = useWallet();

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
  } = useTransactions(urn, selectedAssetKey, direction);

  const selectedCard =
    cards.find((card) => card.urn === urn) ?? cards[0] ?? null;

  const cardLabel =
    (selectedCard?.metadata?.card_name as string) ||
    (selectedCard?.metadata?.name as string) ||
    'Tarjeta';

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

    return { assetList: list, balanceByKey: balance };
  }, [balanceQuery.data]);

  const currentAssetKey = selectedAssetKey || assetList[0]?.sdkKey || '';
  const currentAssetMeta = assetList.find((a) => a.sdkKey === currentAssetKey);
  const currentPrecision = currentAssetMeta?.precision ?? 0;
  const assetBalance = balanceByKey[currentAssetKey] ?? 0;
  const displayAsset = (currentAssetMeta?.code as Asset | undefined) ?? 'USD';

  useEffect(() => {
    if (!selectedAssetKey && assetList[0]?.sdkKey) {
      setSelectedAssetKey(assetList[0].sdkKey);
    }
  }, [selectedAssetKey, assetList]);

  const transactions = useMemo(
    () =>
      (txPages?.pages ?? []).flatMap((page) => page.transactions ?? []) ?? [],
    [txPages?.pages],
  );

  const filteredMovements = useMemo(() => {
    if (!currentAssetKey) return [];
    return transactions;
  }, [transactions, currentAssetKey]);

  return {
    // Card
    isLoadingCard,
    selectedCard,
    cardLabel,

    // Balance
    isLoadingBalance: balanceQuery.isLoading,
    assetList,
    currentAssetKey,
    currentPrecision,
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
