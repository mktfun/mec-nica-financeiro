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
    <section className="rounded-2xl glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-[oklch(1_0_0_/_5%)]">
        <h2 className="text-[15px] font-bold text-foreground">Dinheiro em Caixa · Hoje</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Informe o valor físico contado por loja
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {QUICK.map((q) => (
          <div key={q.id} className="flex items-center gap-3">
            <label className="flex-1 text-[13px] font-medium text-foreground">{q.name}</label>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                R$
              </span>
              <input
                inputMode="decimal"
                value={draft[q.id] ?? ""}
                onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg glass-elevated py-2 pl-9 pr-3 text-right text-[13px] font-semibold tabular text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_12px_oklch(0.62_0.19_259_/_15%)] transition-shadow"
              />
            </div>
          </div>
        ))}
        <button className="text-[11px] font-medium text-primary hover:text-foreground transition-colors">
          + Ver todas as lojas
        </button>
      </div>
      <div className="px-5 py-4 border-t border-[oklch(1_0_0_/_5%)]">
        <button
          onClick={onSave}
          className="w-full rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition-all duration-200 hover:shadow-[0_0_20px_oklch(0.62_0.19_259_/_30%)] active:scale-[0.98]"
        >
          Salvar valores
        </button>
      </div>
    </section>
  );
}
