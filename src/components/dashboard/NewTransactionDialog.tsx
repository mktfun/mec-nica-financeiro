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
          <select 
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
          >
            <option value="" className="bg-[var(--bg-canvas)] text-[var(--text-primary)]">Selecione o tipo</option>
            <option value="in" className="bg-[var(--bg-canvas)] text-[var(--text-primary)]">Entrada</option>
            <option value="out" className="bg-[var(--bg-canvas)] text-[var(--text-primary)]">Saída</option>
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
