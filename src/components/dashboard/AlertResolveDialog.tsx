import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { AlertRow } from "@/lib/supabase";
import { useResolveAlert } from "@/hooks/useAlerts";

interface AlertResolveDialogProps {
  alert: AlertRow | null;
  onClose: () => void;
  onResolved: () => void;
}

export function AlertResolveDialog({ alert, onClose, onResolved }: AlertResolveDialogProps) {
  const { mutate: resolveAlert, isPending } = useResolveAlert();

  if (!alert) return null;

  const handleResolve = () => {
    resolveAlert(alert.id, {
      onSuccess: () => {
        onResolved();
        onClose();
      }
    });
  };

  return (
    <Modal
      isOpen={!!alert}
      onClose={onClose}
      title="Resolver Divergência"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleResolve} disabled={isPending}>
            {isPending ? "Processando..." : "Confirmar Resolução"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="p-4 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium px-2 py-1 bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] rounded-full">
              {alert.store_name}
            </span>
            <span className="text-sm text-[var(--text-tertiary)]">{alert.time || new Date(alert.created_at).toLocaleTimeString()}</span>
          </div>
          <h3 className="font-medium text-[var(--text-primary)] text-lg">{alert.title}</h3>
          <p className="text-[var(--text-secondary)] mt-1">{alert.description}</p>
          {alert.amount !== null && alert.amount !== undefined && (
            <div className={`mt-4 text-xl font-display font-bold ${alert.severity === 'critical' ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-warning)]'}`}>
              - R$ {Number(alert.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Selecione a ação corretiva</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-[var(--color-primary)]" defaultChecked />
              <span className="text-sm">Vincular a OS Existente sem pagamento</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm">Justificar Quebra de Caixa (Aprovação Múltipla)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors">
              <input type="radio" name="action" className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm">Ajustar Manualmente o Lançamento</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
