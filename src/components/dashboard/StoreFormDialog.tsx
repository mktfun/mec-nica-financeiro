import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { StoreRow } from "@/lib/supabase";
import { useCreateStore, useUpdateStore } from "@/hooks/useStores";
import { Plus, Trash2 } from "lucide-react";

interface StoreFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeToEdit?: StoreRow;
}

export function StoreFormDialog({ isOpen, onClose, storeToEdit }: StoreFormDialogProps) {
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mechanics, setMechanics] = useState<string[]>([]);
  const [newMechanic, setNewMechanic] = useState("");

  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();

  useEffect(() => {
    if (storeToEdit) {
      setName(storeToEdit.name);
      setManager(storeToEdit.manager || "");
      setPhone(storeToEdit.phone || "");
      setAddress(storeToEdit.address || "");
      setMechanics(storeToEdit.mechanics || []);
    } else {
      setName("");
      setManager("");
      setPhone("");
      setAddress("");
      setMechanics([]);
    }
  }, [storeToEdit, isOpen]);

  const handleAddMechanic = () => {
    if (newMechanic.trim()) {
      setMechanics([...mechanics, newMechanic.trim()]);
      setNewMechanic("");
    }
  };

  const handleRemoveMechanic = (index: number) => {
    setMechanics(mechanics.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (storeToEdit) {
        await updateMutation.mutateAsync({
          id: storeToEdit.id,
          updates: { name, manager, phone, address, mechanics }
        });
      } else {
        await createMutation.mutateAsync({
          name,
          manager,
          phone,
          address,
          mechanics,
          active: true,
          avatar_url: null,
        });
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar loja:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={storeToEdit ? "Editar Loja" : "Nova Loja"}>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Nome da Loja
          </label>
          <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Dom Pedro" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Gerente
            </label>
            <Input value={manager} onChange={e => setManager(e.target.value)} placeholder="Nome do gerente" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Telefone
            </label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Endereço
          </label>
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Endereço completo" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            Mecânicos da Unidade
          </label>
          <div className="flex gap-2 mb-2">
            <Input 
              value={newMechanic} 
              onChange={e => setNewMechanic(e.target.value)} 
              placeholder="Nome do mecânico" 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMechanic();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={handleAddMechanic} className="px-3">
              <Plus size={16} />
            </Button>
          </div>
          
          {mechanics.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 bg-[var(--bg-canvas)] p-3 rounded-[var(--radius-md)] border border-white/5">
              {mechanics.map((mech, index) => (
                <div key={index} className="flex items-center justify-between bg-[var(--bg-surface-elevated)] px-3 py-2 rounded-md">
                  <span className="text-sm text-white">{mech}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveMechanic(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 flex justify-end gap-3 mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
