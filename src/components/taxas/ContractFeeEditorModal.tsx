import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PosFeeContract, useFeeContracts } from '@/hooks/useFeeContracts';
import { ShieldCheck, Percent, Save, RefreshCw, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ContractFeeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractFeeEditorModal({ isOpen, onClose }: ContractFeeEditorModalProps) {
  const { contracts, isSaving, upsertContracts } = useFeeContracts();
  const [editableList, setEditableList] = useState<PosFeeContract[]>([]);

  useEffect(() => {
    if (contracts.length > 0) {
      setEditableList(JSON.parse(JSON.stringify(contracts)));
    }
  }, [contracts]);

  const handleChange = (index: number, field: keyof PosFeeContract, value: any) => {
    setEditableList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    await upsertContracts(editableList);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestão de Taxas do Contrato (MDR & Juros)" size="xl">
      <div className="space-y-6 text-zinc-200">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl flex items-start gap-3">
          <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={22} />
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Tabela de Taxas Contratadas (Referência Oficial)</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Estas alíquotas são usadas pelo motor de auditoria para comparar com o MDR real cobrado pela Rede/Adquirentes em cada filial. Cobranças acima destas alíquotas geram alerta de divergência e entram no cálculo de estorno.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[60vh] border border-zinc-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-900/90 sticky top-0 z-10 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Adquirente</th>
                <th className="p-3">Bandeira</th>
                <th className="p-3">Modalidade</th>
                <th className="p-3">Parcelas</th>
                <th className="p-3 text-right">MDR Contratado (%)</th>
                <th className="p-3 text-right">Taxa Antecipação (%)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
              {editableList.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-medium text-zinc-200">{item.acquirer}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.brand}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-300">{item.method}</td>
                  <td className="p-3 text-zinc-400 font-mono">{item.installments_range}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.contracted_mdr_percent}
                        onChange={(e) => handleChange(idx, 'contracted_mdr_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-xs text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-zinc-500">%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.anticipation_fee_percent}
                        onChange={(e) => handleChange(idx, 'anticipation_fee_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-xs text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-zinc-500">%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleChange(idx, 'active', !item.active)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        item.active 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {item.active ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            * Alterações salvas refletem imediatamente nos relatórios e nos cálculos de divergência de todas as filiais.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2">
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
