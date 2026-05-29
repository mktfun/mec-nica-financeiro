import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface ImportReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportReportDialog({ isOpen, onClose }: ImportReportDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement file upload to Supabase Storage and create reconciliation record
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Relatório">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <p className="text-sm text-[var(--text-tertiary)] mb-4">
          Faça o upload do documento de fechamento da unidade para importar os dados de conciliação.
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Loja
          </label>
          <select className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors">
            <option value="">Selecione a loja</option>
            {/* TODO: fetch stores */}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Documento (PDF, Imagem, Excel)
          </label>
          <input
            type="file"
            required
            className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-bright)]"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Importando..." : "Importar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
