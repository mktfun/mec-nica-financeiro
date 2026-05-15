import type { Store } from "@/lib/mock/types";
import { StoreCard } from "./StoreCard";

export function StoreStatusGrid({ stores }: { stores: Store[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
            10 Lojas
            <span className="h-2 w-2 rounded-full bg-[color:var(--success)] shadow-[0_0_8px_var(--success)]" />
          </h2>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
            Status de conciliação por unidade — clique para ver detalhes
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stores.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
      </div>
    </section>
  );
}
