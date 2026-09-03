import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, TrendingUp, Sparkles, DollarSign, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface RevenueAdjustmentItem {
  id?: string;
  date: string;
  title: string;
  description?: string;
  type: string;
  amount: number;
  store_id?: string;
}

interface RevenueAdjustmentsCardProps {
  targetDate: string;
  stores: Array<{ id: string; name: string }>;
  isLocked: boolean;
  onTotalChange?: (total: number) => void;
}

export const RevenueAdjustmentsCard: React.FC<RevenueAdjustmentsCardProps> = ({
  targetDate,
  stores,
  isLocked,
  onTotalChange,
}) => {
  const [items, setItems] = useState<RevenueAdjustmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newStoreId, setNewStoreId] = useState('');
  const [newType, setNewType] = useState('outros');

  useEffect(() => {
    async function loadItems() {
      if (!targetDate) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('daily_revenue_adjustments')
          .select('id, date, title, description, type, amount, store_id')
          .eq('date', targetDate);
        if (!error && data) {
          setItems(data);
          const total = data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
          onTotalChange?.(total);
        }
      } catch (err) {
        console.warn('Erro ao carregar ajustes de receita:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, [targetDate]);

  const totalAmount = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleAddItem = async () => {
    const amt = parseFloat(newAmount.replace(',', '.'));
    if (!newTitle.trim() || isNaN(amt) || amt <= 0) {
      toast.error('Informe título e valor válidos para o ajuste de faturamento.');
      return;
    }

    try {
      const payload = {
        date: targetDate,
        title: newTitle.trim(),
        description: `Lançado no Fechamento Diário (${newType})`,
        type: newType,
        amount: Number(amt.toFixed(2)),
        store_id: newStoreId || null,
      };

      const { data, error } = await supabase
        .from('daily_revenue_adjustments')
        .insert([payload])
        .select('id, date, title, description, type, amount, store_id')
        .single();

      if (error) throw error;

      const updated = [...items, data || payload];
      setItems(updated);
      const newTotal = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      onTotalChange?.(newTotal);

      setNewTitle('');
      setNewAmount('');
      setNewStoreId('');
      setIsAdding(false);
      toast.success('Receita adicional somada ao faturamento!');
    } catch (err: any) {
      console.error('Erro ao adicionar receita extra:', err);
      toast.error(`Falha ao salvar receita: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id?: string, index?: number) => {
    if (isLocked) return;
    try {
      if (id) {
        const { error } = await supabase.from('daily_revenue_adjustments').delete().eq('id', id);
        if (error) throw error;
      }
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      const newTotal = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      onTotalChange?.(newTotal);
      toast.success('Ajuste removido.');
    } catch (err: any) {
      toast.error(`Falha ao excluir: ${err.message}`);
    }
  };

  return (
    <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Receitas Extras & Ajustes DRE (Soma ao Faturamento)
          </h4>
          {items.length > 0 && (
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              +{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </div>
        {!isLocked && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(!isAdding)}
            className="text-[11px] h-7 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-emerald-300"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Adicionar Receita
          </Button>
        )}
      </div>

      {isAdding && !isLocked && (
        <div className="p-3 bg-zinc-900/90 rounded-lg border border-emerald-500/30 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Título / Motivo</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Aluguel Rei do Módulo"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Filial / Origem</label>
            <select
              value={newStoreId}
              onChange={(e) => setNewStoreId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Holding / Geral</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end gap-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAddItem}
              className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs"
            >
              Salvar
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-400 italic">
          Nenhuma receita adicional cadastrada para esta data (aluguel de filial, custos corporativos ou estornos).
        </p>
      ) : (
        <div className="space-y-1.5 font-mono">
          {items.map((item, idx) => {
            const storeObj = stores.find((s) => s.id === item.store_id);
            return (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-zinc-200 truncate">{item.title}</span>
                  {storeObj && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-sans border border-zinc-700/50">
                      {storeObj.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400 tabular-nums">
                    +{Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, idx)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Excluir ajuste"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
