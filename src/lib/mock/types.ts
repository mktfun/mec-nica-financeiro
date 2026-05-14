export type StoreStatus = "ok" | "divergencia" | "pendente";

export interface Store {
  id: string;
  name: string;
  status: StoreStatus;
  dailyEntry: number;
  note: string;
}

export type AlertSeverity = "critical" | "warning";

export interface FinAlert {
  id: string;
  severity: AlertSeverity;
  storeId: string;
  storeName: string;
  os: string;
  description: string;
  detail: string;
  timestamp: string;
}

export interface DayHistory {
  date: string;
  result: number;
  status: "approved" | "divergence";
}
