import { useEffect, useState } from "react";
import { ensureSeed, KEYS } from "./seed";
import { readLS, writeLS } from "@/lib/storage";
import type { Store, FinAlert } from "./types";

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  useEffect(() => {
    ensureSeed();
    setStores(readLS<Store[]>(KEYS.stores, []));
  }, []);
  return stores;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<FinAlert[]>([]);
  useEffect(() => {
    ensureSeed();
    setAlerts(readLS<FinAlert[]>(KEYS.alerts, []));
  }, []);
  return alerts;
}

export function useCashInputs() {
  const [cash, setCash] = useState<Record<string, number>>({});
  useEffect(() => {
    ensureSeed();
    setCash(readLS<Record<string, number>>(KEYS.cash, {}));
  }, []);
  const save = (next: Record<string, number>) => {
    setCash(next);
    writeLS(KEYS.cash, next);
  };
  return { cash, save };
}
