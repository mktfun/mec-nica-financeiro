import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useIntercompanyEntities } from '@/hooks/useIntercompanyEntities';
import { useStores } from '@/hooks/useStores';
import { CATEGORY_LABELS } from '@/lib/parsers/contasPagarParser';
import { Users, Plus, Trash2, Tag, Building2, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface IntercompanyEntitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntercompanyEntitiesModal({ isOpen, onClose }: IntercompanyEntitiesModalProps) {
  const { entities, categoryRules, saveEntity, saveRule, isSavingEntity, isSavingRule } = useIntercompanyEntities();
  const { data: stores = [] } = useStores();

  const [activeTab, setActiveTab] = useState<'socios' | 'regras'>('socios');

  // Form states
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<'socio' | 'filial' | 'holding' | 'parceiro'>('socio');
  const [newEntityPix, setNewEntityPix] = useState('');
  const [newEntityStoreId, setNewEntityStoreId] = useState('');

  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('gestao_tech');

  const handleAddEntity = async () => {
    if (!newEntityName.trim()) {
      toast.error('Informe o nome da entidade ou sócio.');
      return;
    }

    const pixArray = newEntityPix
      ? newEntityPix.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : [newEntityName.trim().toUpperCase()];

    await saveEntity({
      name: newEntityName.trim().toUpperCase(),
      type: newEntityType,
      pix_keys: pixArray,
      store_id: newEntityStoreId || undefined,
      is_active: true,
    });

    setNewEntityName('');
    setNewEntityPix('');
    setNewEntityStoreId('');
  };

  const handleAddRule = async () => {
    if (!newRulePattern.trim()) {
      toast.error('Informe a palavra-chave ou padrão.');
      return;
    }

    await saveRule({
      pattern: newRulePattern.trim().toUpperCase(),
      category: newRuleCategory,
      priority: 5,
    });

    setNewRulePattern('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cadastro de Sócios, Entidades & Regras Contábeis" size="xl">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('socios')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'socios'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]'
            }`}
          >
            <Users size={14} />
            Sócios & Entidades ({entities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regras')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'regras'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]'
            }`}
          >
            <Tag size={14} />
            Regras de Classificação ({categoryRules.length})
          </button>
        </div>

        {/* TAB 1: Sócios & Entidades */}
        {activeTab === 'socios' && (
          <div className="space-y-5">
            {/* Add New Entity Card */}
            <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Plus size={13} className="text-[var(--color-primary)]" />
                Cadastrar Novo Sócio ou Entidade Vinculada
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">Nome Completo / Razão Social</label>
                  <input
                    type="text"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    placeholder="Ex: DANIEL RUIZ"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">Tipo</label>
                  <select
                    value={newEntityType}
                    onChange={(e: any) => setNewEntityType(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="socio">Sócio</option>
                    <option value="filial">Filial / Loja</option>
                    <option value="holding">Holding</option>
                    <option value="parceiro">Parceiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">Loja Vinculada (Opcional)</label>
                  <select
                    value={newEntityStoreId}
                    onChange={(e) => setNewEntityStoreId(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Todas / Nenhuma</option>
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">
                  Chaves PIX / Nomes de Identificação no Extrato (Separados por vírgula)
                </label>
                <input
                  type="text"
                  value={newEntityPix}
                  onChange={(e) => setNewEntityPix(e.target.value)}
                  placeholder="Ex: DANIEL C6, CARTAO DANIEL, 12345678900"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddEntity}
                  disabled={isSavingEntity}
                  className="text-xs py-2 px-4 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-lg flex items-center gap-1.5"
                >
                  {isSavingEntity ? <LoadingSpinner size="xs" /> : <Plus size={13} />}
                  Salvar Entidade
                </Button>
              </div>
            </div>

            {/* Entity List */}
            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="p-3 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                Entidades Cadastradas para Cruzamento de Aportes
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                {entities.map(ent => (
                  <div key={ent.id} className="p-3 bg-[var(--bg-surface)] flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">{ent.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {ent.type}
                        </Badge>
                        {ent.store_id && (
                          <span className="text-[10px] text-sky-400 font-medium">
                            • {stores.find(s => s.id === ent.store_id)?.name || ent.store_id}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ent.pix_keys?.map((k, i) => (
                          <span key={i} className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      Ativo
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Regras de Categorização */}
        {activeTab === 'regras' && (
          <div className="space-y-5">
            {/* Add New Rule Card */}
            <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Plus size={13} className="text-[var(--color-primary)]" />
                Criar Nova Regra de Classificação de Fornecedor / Despesa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">
                    Palavra-Chave / Nome do Fornecedor
                  </label>
                  <input
                    type="text"
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                    placeholder="Ex: SEGURADORA PORTO ou RETIFICA"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[var(--text-tertiary)] mb-1">
                    Categoria de Destino
                  </label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddRule}
                  disabled={isSavingRule}
                  className="text-xs py-2 px-4 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-lg flex items-center gap-1.5"
                >
                  {isSavingRule ? <LoadingSpinner size="xs" /> : <Plus size={13} />}
                  Salvar Regra
                </Button>
              </div>
            </div>

            {/* Rules List */}
            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="p-3 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] flex justify-between items-center">
                <span>Regras de Classificação Ativas</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Prioridade decrescente</span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                {categoryRules.map(r => (
                  <div key={r.id} className="p-3 bg-[var(--bg-surface)] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {r.pattern}
                      </span>
                      <span className="text-[var(--text-tertiary)]">➔</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {CATEGORY_LABELS[r.category] || r.category}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Prioridade {r.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
          <Button onClick={onClose} variant="outline" className="text-xs py-2 px-4">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
