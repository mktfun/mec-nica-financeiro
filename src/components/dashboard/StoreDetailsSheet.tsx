import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { StoreRow, ReconciliationRow } from "@/lib/supabase";

interface StoreDetailsSheetProps {
  store: StoreRow | null;
  reconciliation: ReconciliationRow | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StoreDetailsSheet({ store, reconciliation, onClose, onEdit, onDelete }: StoreDetailsSheetProps) {
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
          <img src={store.avatar_url || ''} alt={store.name} className="w-16 h-16 rounded-full border border-[var(--border-subtle)]" />
          <div>
            <h3 className="text-xl font-display font-semibold">{store.name}</h3>
            <p className="text-[var(--text-tertiary)] text-sm">{store.address}</p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apurado Sistema</p>
            <p className="font-display text-xl">R$ {(reconciliation?.os_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Liquidado Conta</p>
            <p className="font-display text-xl">R$ {(reconciliation?.financial_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          {(reconciliation?.divergence || 0) !== 0 && (
            <div className="col-span-2 p-4 bg-red-500/10 rounded-[var(--radius-md)] border border-red-500/20">
              <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Divergência Encontrada</p>
              <p className="font-display text-xl text-red-500">R$ {Math.abs(reconciliation!.divergence).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              {reconciliation?.top_error && (
                <p className="text-sm text-red-500/80 mt-1">{reconciliation.top_error}</p>
              )}
            </div>
          )}
        </div>

        {/* Contato & Equipe */}
        <div>
          <h4 className="font-semibold mb-4 text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Equipe e Contato</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-tertiary)]">Gerente</span>
              <span className="font-medium">{store.manager || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-tertiary)]">Telefone</span>
              <span className="font-medium">{store.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] block mb-2">Mecânicos da Unidade</span>
              <div className="flex flex-wrap gap-2">
                {store.mechanics?.map((mech) => (
                  <span key={mech} className="text-xs px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full">
                    {mech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onEdit}>
            Editar Loja
          </Button>
          <Button variant="ghost" className="text-red-400 hover:bg-red-400/10 hover:text-red-300" onClick={onDelete}>
            Excluir Loja
          </Button>
        </div>
      </div>
    </Modal>
  );
}
