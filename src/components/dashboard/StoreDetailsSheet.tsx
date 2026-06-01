import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StoreRow, ReconciliationRow } from "@/lib/supabase";
import { useStoreHistory } from "@/hooks/useConciliacao";

interface StoreDetailsSheetProps {
  store: StoreRow | null;
  reconciliation: ReconciliationRow | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StoreDetailsSheet({ store, reconciliation, onClose, onEdit, onDelete }: StoreDetailsSheetProps) {
  const { data: history = [], isLoading } = useStoreHistory(store?.id || null);

  if (!store) return null;

  return (
    <Modal
      isOpen={!!store}
      onClose={onClose}
      title={`Histórico - ${store.name}`}
      position="right"
    >
      <div className="space-y-8">
        {/* Header Info */}
        <div className="flex items-center gap-4">
          <img src={store.avatar_url || ''} alt={store.name} className="w-16 h-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]" />
          <div>
            <h3 className="text-xl font-display font-semibold">{store.name}</h3>
            <p className="text-[var(--text-tertiary)] text-sm">{store.address || store.id}</p>
          </div>
        </div>

        {/* Resumo Financeiro Mais Recente */}
        <div>
          <h4 className="font-semibold mb-3 text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Último Fechamento ({reconciliation?.date ? new Date(reconciliation.date).toLocaleDateString("pt-BR") : "N/A"})</h4>
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
        </div>

        {/* Histórico Recente */}
        <div>
          <h4 className="font-semibold mb-3 text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Histórico Recente de Conciliação</h4>
          {isLoading ? (
            <div className="text-[var(--text-tertiary)] text-sm">Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div className="text-[var(--text-tertiary)] text-sm">Nenhum histórico encontrado para esta loja.</div>
          ) : (
            <div className="space-y-3">
              {history.map((rec, i) => (
                <div key={i} className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <p className="font-medium">{new Date(rec.date).toLocaleDateString("pt-BR")}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Apurado: R$ {Number(rec.os_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">R$ {Number(rec.financial_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <Badge variant={rec.status === 'approved' ? 'success' : rec.status === 'divergence' ? 'danger' : 'warning'} className="text-[10px] mt-1">
                      {rec.status === 'approved' ? 'Conciliado' : rec.status === 'divergence' ? 'Divergência' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
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
