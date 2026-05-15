import { Modal } from "../ui/Modal";
import { mockConciliationReport } from "../../mock/data";

interface ConciliationReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConciliationReportDialog({ isOpen, onClose }: ConciliationReportDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Relatório de Conciliação - ${mockConciliationReport.date}`}
      position="center"
    >
      <div className="space-y-6">
        <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-center">
          <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Aprovado pelo Motor</p>
          <p className="font-display text-4xl text-[#00a87e]">
            R$ {mockConciliationReport.totalApprovedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-2xl font-display">{mockConciliationReport.totalProcessedOs}</p>
            <p className="text-sm text-[var(--text-tertiary)]">Transações Processadas</p>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-2xl font-display text-red-500">{mockConciliationReport.divergenceCount}</p>
            <p className="text-sm text-[var(--text-tertiary)]">Divergências Encontradas</p>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-2xl font-display">{mockConciliationReport.processedStores}</p>
            <p className="text-sm text-[var(--text-tertiary)]">Lojas Processadas</p>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <p className="text-2xl font-display">{mockConciliationReport.pendingStores}</p>
            <p className="text-sm text-[var(--text-tertiary)]">Lojas Pendentes</p>
          </div>
        </div>

        {mockConciliationReport.topDivergences.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 text-[var(--text-secondary)]">Principais Divergências</h4>
            <ul className="space-y-2">
              {mockConciliationReport.topDivergences.map((div, i) => (
                <li key={i} className="text-sm p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[var(--radius-sm)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {div}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
