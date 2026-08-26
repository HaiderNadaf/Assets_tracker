"use client";

import { useSyncExternalStore } from "react";

// The subscription never fires — the value flips once, when React hydrates.
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False during server rendering and during the first client render, true after.
 *
 * `useSyncExternalStore` is the SSR-safe way to ask "have we hydrated yet?":
 * React uses `getServerSnapshot` for both the server HTML *and* the hydrating
 * render, so the two always agree, then re-renders with the client value. Reading
 * a flag in an effect instead would render the wrong branch first and trip a
 * hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, onClient, onServer);
}
