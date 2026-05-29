import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useStores } from "@/hooks/useStores";
import { useSaveDailyCash } from "@/hooks/useConciliacao";
import { getDefaultDate } from "@/lib/utils";
import * as xlsx from "xlsx";

interface ImportReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportReportDialog({ isOpen, onClose }: ImportReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [parsedData, setParsedData] = useState<{ totalOs: number; totalPaid: number } | null>(null);
  
  const { data: stores = [] } = useStores();
  const saveDailyCash = useSaveDailyCash();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json<any>(ws);

        let totalOs = 0;
        let totalPaid = 0;
        const payments: Record<string, number> = {};
        
        const targetDateStr = getDefaultDate(); // "YYYY-MM-DD"
        
        // Helper to convert Excel serial date to YYYY-MM-DD
        const excelDateToJSDateStr = (serial: number) => {
          // Excel leap year bug: 1900 is treated as a leap year
          // 25569 days between 1899-12-30 and 1970-01-01
          const utc_days  = Math.floor(serial - 25569);
          const utc_value = utc_days * 86400;                                        
          const date_info = new Date(utc_value * 1000);
          
          // Use UTC methods to avoid timezone shifts
          const year = date_info.getUTCFullYear();
          const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date_info.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Start reading after headers, typically at row 3 or 4
        data.forEach(row => {
          if (row["__EMPTY_5"] === "Finalizada") { 
            // '__EMPTY_6' is "Finalizada em" and '__EMPTY_7' is "Data do Faturamento"
            // Let's use Finalizada em (__EMPTY_6) or Faturamento (__EMPTY_7)
            // Usually, closure/billing date is the one that matters for conciliation.
            const serialDate = parseFloat(row["__EMPTY_6"]) || parseFloat(row["__EMPTY_7"]);
            
            if (serialDate) {
              const rowDateStr = excelDateToJSDateStr(serialDate);
              
              if (rowDateStr === targetDateStr) {
                const osValue = parseFloat(row["__EMPTY_10"]) || 0;
                const paidValue = parseFloat(row["__EMPTY_11"]) || 0;
                totalOs += osValue;
                totalPaid += paidValue;

                // Extract payment methods from __EMPTY_14
                const paymentStr = row["__EMPTY_14"];
                if (typeof paymentStr === 'string') {
                  const parts = paymentStr.split(';');
                  parts.forEach(part => {
                    const [method, valStr] = part.split(':');
                    if (method && valStr) {
                      const methodTrim = method.trim();
                      const val = parseFloat(valStr.trim()) || 0;
                      payments[methodTrim] = (payments[methodTrim] || 0) + val;
                    }
                  });
                }
              }
            }
          }
        });

        setParsedData({ totalOs, totalPaid, payments });
      } catch (err) {
        console.error("Erro ao ler planilha", err);
        alert("Erro ao ler planilha. O formato está correto?");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData || !storeId) return;
    
    setLoading(true);
    try {
      await saveDailyCash.mutateAsync({
        storeId,
        value: parsedData.totalPaid, // Salvando o total pago liquidado
        date: getDefaultDate()
      });
      onClose();
    } catch (err) {
      console.error("Erro ao salvar", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { setParsedData(null); onClose(); }} title="Importar Relatório">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <p className="text-sm text-[var(--text-tertiary)] mb-4">
          Faça o upload da planilha (OS x Financeiro) da unidade para o dia atual.
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Loja
          </label>
          <select 
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
            className="w-full bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
          >
            <option value="" className="bg-[#1A1A1A] text-white">Selecione a loja</option>
            {stores.map(store => (
              <option key={store.id} value={store.id} className="bg-[#1A1A1A] text-white">{store.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Documento (.xls, .xlsx)
          </label>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileUpload}
            required
            className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-bright)]"
          />
        </div>

        {parsedData && (
          <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 mt-4 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-2">Resumo Encontrado</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-secondary)]">Total Faturado (OS):</span>
                <span className="font-medium text-white">R$ {parsedData.totalOs.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2 mt-2">
                <span className="text-[var(--text-secondary)]">Total Pago na OS (Liquidado):</span>
                <span className="font-bold text-[var(--color-success)] text-lg">R$ {parsedData.totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            {Object.keys(parsedData.payments).length > 0 && (
              <div className="bg-white/5 rounded-md p-3 border border-white/10">
                <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Formas de Pagamento Extraídas</p>
                <div className="space-y-1">
                  {Object.entries(parsedData.payments).map(([method, amount]) => (
                    <div key={method} className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">{method}</span>
                      <span className="font-medium text-white">R$ {amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !parsedData}>
            {loading ? "Salvando..." : "Confirmar e Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
