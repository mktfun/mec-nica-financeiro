import type { Store } from "@/lib/mock/types";
import { StoreCard } from "./StoreCard";

export function StoreStatusGrid({ stores }: { stores: Store[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
            10 Lojas
            <span className="h-2 w-2 rounded-full bg-[color:var(--success)] shadow-[0_0_10px_var(--success)] animate-pulse" />
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Status de conciliação por unidade — clique para ver detalhes
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stores.map((s, i) => (
          <StoreCard key={s.id} store={s} index={i} />
        ))}
      </div>
    </section>
  );
}
