import { Modal } from "../ui/Modal";
import { MockStore } from "../../mock/data";

interface StoreDetailsSheetProps {
  store: MockStore | null;
  onClose: () => void;
}

export function StoreDetailsSheet({ store, onClose }: StoreDetailsSheetProps) {
  if (!store) return null;

  return (
    <Modal
      isOpen={!!store}
      onClose={onClose}
      title={store.name}
      position="right"
    >
      <div className="space-y-8">
        {/* Header Info */}
        <div className="flex items-center gap-4">
          <img src={store.avatarUrl} alt={store.name} className="w-16 h-16 rounded-full border border-[var(--border-subtle)]" />
          <div>
            <h3 className="text-xl font-display font-semibold">{store.name}</h3>
            <p className="text-[var(--text-tertiary)] text-sm">{store.address}</p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apurado Sistema</p>
            <p className="font-display text-xl">R$ {store.osTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Liquidado Conta</p>
            <p className="font-display text-xl">R$ {store.financialTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          {store.divergence !== 0 && (
            <div className="col-span-2 p-4 bg-red-500/10 rounded-[var(--radius-md)] border border-red-500/20">
              <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Divergência Encontrada</p>
              <p className="font-display text-xl text-red-500">R$ {store.divergence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-red-500/80 mt-1">{store.topError}</p>
            </div>
          )}
        </div>

        {/* Contato & Equipe */}
        <div>
          <h4 className="font-semibold mb-4 text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Equipe e Contato</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-tertiary)]">Gerente</span>
              <span className="font-medium">{store.manager}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-tertiary)]">Telefone</span>
              <span className="font-medium">{store.phone}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] block mb-2">Mecânicos da Unidade</span>
              <div className="flex flex-wrap gap-2">
                {store.mechanics.map((mech) => (
                  <span key={mech} className="text-xs px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full">
                    {mech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
