export function goBackOrFallback(fallback: () => void) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return;
  }

  fallback();
}

/**
 * The `Drawer` wrapper (`~/components/ui/drawer.tsx`) pushes a history entry
 * on open so a mobile back-gesture closes it, then rewinds that entry on
 * close — but only if the URL hasn't changed since it opened. Call this
 * right before closing a drawer and navigating away in the same handler, or
 * that rewind fires on the still-in-flight navigation's pre-commit URL and
 * silently reverts it.
 */
export function skipDrawerHistoryOnce() {
  (window as { __skipDrawerHistoryOnce?: boolean }).__skipDrawerHistoryOnce =
    true;
}
