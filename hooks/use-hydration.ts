"use client";

import { useSyncExternalStore } from "react";

type StoreSubscriber = (onStoreChange: () => void) => () => void;

const noop = () => {};
const clientSubscribe: StoreSubscriber = (onStoreChange) => {
  onStoreChange();
  return noop;
};
const serverSubscribe: StoreSubscriber = () => noop;

export function useHydration() {
  const subscribe = typeof window === "undefined" ? serverSubscribe : clientSubscribe;
  return useSyncExternalStore(subscribe, () => true, () => false);
}
