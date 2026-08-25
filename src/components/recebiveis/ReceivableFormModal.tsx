import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import { ReceivableItem, useCreateReceivable, useUpdateReceivable } from '@/hooks/useRecebiveis';
import { toast } from 'sonner';

interface ReceivableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  initialStoreId?: string;
  editItem?: ReceivableItem | null;
}

export function ReceivableFormModal({
  isOpen,
  onClose,
  targetDate,
  initialStoreId,
  editItem
}: ReceivableFormModalProps) {
  const { data: stores = [] } = useStores();
  const createMutation = useCreateReceivable();
  const updateMutation = useUpdateReceivable();

  const [storeId, setStoreId] = useState(initialStoreId || 'st-06');
  const [description, setDescription] = useState('');
  const [osNumber, setOsNumber] = useState('');
  const [installment, setInstallment] = useState('');
  const [type, setType] = useState<ReceivableItem['type']>('Boleto');
  const [value, setValue] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState(targetDate);
  const [date, setDate] = useState(targetDate);
  const [status, setStatus] = useState<ReceivableItem['status']>('pendente');

  useEffect(() => {
    if (editItem) {
      setStoreId(editItem.store_id);
      setDescription(editItem.description);
      setOsNumber(editItem.os_number || '');
      setInstallment(editItem.installment || '');
      setType(editItem.type || 'Boleto');
      setValue(editItem.value);
      setDueDate(editItem.due_date);
      setDate(editItem.date);
      setStatus(editItem.status);
    } else {
      setStoreId(initialStoreId || (stores[0]?.id || 'st-06'));
      setDescription('');
      setOsNumber('');
      setInstallment('');
      setType('Boleto');
      setValue('');
      setDueDate(targetDate);
      setDate(targetDate);
      setStatus('pendente');
    }
  }, [editItem, initialStoreId, targetDate, isOpen, stores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Informe a descrição ou documento do recebível.');
      return;
    }

    if (!value || Number(value) <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }

    const selectedStore = stores.find(s => s.id === storeId);
    const storeName = selectedStore ? selectedStore.name : storeId;

    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          updates: {
            store_id: storeId,
            store_name: storeName,
            description: description.trim(),
            os_number: osNumber.trim() || null,
            installment: installment.trim() || null,
            type,
            value: Number(value),
            due_date: dueDate,
            date,
            status
          }
        });
        toast.success('Recebível atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          store_id: storeId,
          store_name: storeName,
          description: description.trim(),
          os_number: osNumber.trim() || null,
          installment: installment.trim() || null,
          type,
          value: Number(value),
          due_date: dueDate,
          date,
          status
        });
        toast.success('Recebível cadastrado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || err));
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Editar Recebível' : 'Novo Título a Receber'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Filial */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            Filial / Loja *
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-medium"
            required
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            Descrição / Documento *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: BOLETO ORION OS 22529 1/3 ou PGTO EM CONTA GESTAUTO"
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-medium"
            required
          />
        </div>

        {/* Valor e Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-[var(--color-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Tipo de Cobrança
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="Boleto">Boleto Bancário</option>
              <option value="Transferência">Transferência / PIX</option>
              <option value="Cheque">Cheque</option>
              <option value="Cartão">Cartão</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        {/* OS e Parcela */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Número da OS (Opcional)
            </label>
            <input
              type="text"
              value={osNumber}
              onChange={(e) => setOsNumber(e.target.value)}
              placeholder="Ex: 22529"
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Parcela (Opcional)
            </label>
            <input
              type="text"
              value={installment}
              onChange={(e) => setInstallment(e.target.value)}
              placeholder="Ex: 1/3"
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
            />
          </div>
        </div>

        {/* Vencimento e Data de Lançamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Data de Vencimento *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Data de Competência / Fechamento *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
              required
            />
          </div>
        </div>

        {/* Status */}
        {editItem && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Status do Título
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="pendente">Pendente (Ativo no A Receber)</option>
              <option value="recebido">Recebido / Liquidado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        )}

        {/* Ações do Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium shadow-sm">
            {isSaving ? 'Salvando...' : editItem ? 'Salvar Alterações' : 'Cadastrar Título'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
