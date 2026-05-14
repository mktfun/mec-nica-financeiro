import type { Store } from "@/lib/mock/types";
import { StoreCard } from "./StoreCard";

export function StoreStatusGrid({ stores }: { stores: Store[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">10 Lojas</h2>
          <p className="text-[12px] text-muted-foreground">
            Status de conciliação por unidade — clique para ver detalhes
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stores.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
      </div>
    </section>
  );
}
