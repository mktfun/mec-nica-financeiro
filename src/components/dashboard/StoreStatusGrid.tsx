import { useState } from "react";
import type { Store } from "@/lib/mock/types";
import { StoreCard } from "./StoreCard";
import { StoreDetailsDialog } from "./StoreDetailsDialog";

export function StoreStatusGrid({ stores }: { stores: Store[] }) {
  const [selected, setSelected] = useState<Store | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">10 Lojas</h2>
          <p className="text-[12px] text-muted-foreground">
            Status de conciliação por unidade — atualização em tempo real
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stores.map((s) => (
          <StoreCard key={s.id} store={s} onClick={() => setSelected(s)} />
        ))}
      </div>
      <StoreDetailsDialog store={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
