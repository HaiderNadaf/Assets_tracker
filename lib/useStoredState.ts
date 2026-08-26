"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

/** getSnapshot must be stable, so raw values are cached per key. */
function read(key: string): string | null {
  if (!cache.has(key)) {
    try {
      cache.set(key, localStorage.getItem(key));
    } catch {
      cache.set(key, null);
    }
  }
  return cache.get(key) ?? null;
}

function write(key: string, value: string): void {
  if (cache.get(key) === value) return;
  cache.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / storage disabled — the in-memory cache still works */
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key) cache.delete(e.key);
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * A localStorage-backed value read through useSyncExternalStore, so the server
 * render always sees the fallback and React swaps in the stored value after
 * hydration — no mismatch, and no setState inside an effect.
 *
 * `decode` and `encode` must be module-level (stable) functions.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  decode: (raw: string) => T | null,
  encode: (value: T) => string
): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );

  const value = raw === null ? fallback : (decode(raw) ?? fallback);

  const set = useCallback(
    (next: T) => {
      write(key, encode(next));
    },
    [key, encode]
  );

  return [value, set];
}
