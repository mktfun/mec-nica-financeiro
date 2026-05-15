import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { MockAlert } from "../../mock/data";

interface AlertResolveDialogProps {
  alert: MockAlert | null;
  onClose: () => void;
  onResolved: (id: string) => void;
}

export function AlertResolveDialog({ alert, onClose, onResolved }: AlertResolveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!alert) return null;

  const handleResolve = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onResolved(alert.id);
        setSuccess(false);
        onClose();
      }, 1000);
    }, 1500);
  };

  return (
    <Modal
      isOpen={!!alert}
      onClose={onClose}
      title="Resolver Divergência"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading || success}>
            Cancelar
          </Button>
          <Button onClick={handleResolve} disabled={loading || success}>
            {loading ? "Processando..." : success ? "✓ Resolvido" : "Confirmar Resolução"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-500 rounded-full">
              {alert.storeName}
            </span>
            <span className="text-sm text-[var(--text-tertiary)]">{alert.time}</span>
          </div>
          <h3 className="font-medium text-[var(--text-primary)] text-lg">{alert.title}</h3>
          <p className="text-[var(--text-secondary)] mt-1">{alert.description}</p>
          {alert.amount && (
            <div className="mt-4 text-xl font-display font-bold text-red-500">
              - R$ {alert.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Selecione a ação corretiva</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-white" defaultChecked />
              <span className="text-sm">Vincular a OS Existente sem pagamento</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-white" />
              <span className="text-sm">Justificar Quebra de Caixa (Aprovação Múltipla)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-white" />
              <span className="text-sm">Ajustar Manualmente o Lançamento</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
