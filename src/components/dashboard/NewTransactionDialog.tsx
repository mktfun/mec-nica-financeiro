import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface NewTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTransactionDialog({ isOpen, onClose }: NewTransactionDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement transaction creation
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Transação">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Título
          </label>
          <Input placeholder="Ex: Pagamento Fornecedor X" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Valor (R$)
          </label>
          <Input type="number" step="0.01" placeholder="0,00" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Tipo
          </label>
          <select className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors">
            <option value="out">Saída (Despesa)</option>
            <option value="in">Entrada (Receita)</option>
          </select>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Salvando..." : "Lançar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
