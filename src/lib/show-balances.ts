import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let showBalances = true;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return showBalances;
}

export function setShowBalances(value: boolean) {
  showBalances = value;
  for (const listener of listeners) listener();
}

export function useShowBalances() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
