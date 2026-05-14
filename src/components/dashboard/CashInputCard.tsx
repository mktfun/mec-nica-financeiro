import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCashInputs } from "@/lib/mock/hooks";

const QUICK = [
  { id: "dom-pedro", name: "Dom Pedro" },
  { id: "jabaquara", name: "Jabaquara" },
  { id: "jorge-bereta", name: "Jorge Bereta" },
];

export function CashInputCard() {
  const { cash, save } = useCashInputs();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(
      Object.fromEntries(QUICK.map((q) => [q.id, cash[q.id] != null ? String(cash[q.id]) : ""])),
    );
  }, [cash]);

  const onSave = () => {
    const next = { ...cash };
    for (const q of QUICK) {
      const v = parseFloat(draft[q.id]?.replace(",", "."));
      if (!isNaN(v)) next[q.id] = v;
    }
    save(next);
    toast.success("Valores salvos", { description: "Dinheiro em caixa atualizado." });
  };

  return (
    <section className="rounded-xl border bg-card">
      <div className="px-5 py-4 border-b">
        <h2 className="text-[16px] font-semibold text-foreground">Dinheiro em Caixa · Hoje</h2>
        <p className="text-[12px] text-muted-foreground">
          Informe o valor físico contado por loja
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {QUICK.map((q) => (
          <div key={q.id} className="flex items-center gap-3">
            <label className="flex-1 text-[13px] text-foreground">{q.name}</label>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                R$
              </span>
              <input
                inputMode="decimal"
                value={draft[q.id] ?? ""}
                onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-md border bg-[var(--surface-1)] py-2 pl-9 pr-3 text-right text-[13px] tabular text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        ))}
        <button className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors">
          + Ver todas as lojas
        </button>
      </div>
      <div className="px-5 py-4 border-t">
        <button
          onClick={onSave}
          className="w-full rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
        >
          Salvar valores
        </button>
      </div>
    </section>
  );
}
