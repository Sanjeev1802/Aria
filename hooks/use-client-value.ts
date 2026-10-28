import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Reads a browser-only value; the server and the hydrating render see `fallback`. */
export function useClientValue<T extends string | number | boolean>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => fallback);
}
