import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BankBotCredential,
  SUPPORTED_BANKS,
  useBankBotCredentials,
  useDeleteBankBotCredential,
  useTestBankBotConnection,
} from '@/hooks/useBankBotCredentials';
import { BankBotCredentialModal } from './BankBotCredentialModal';
import { maskCpf, formatCpf } from '@/lib/credentialCrypto';
import {
  Landmark,
  Plus,
  Play,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export function BankBotCredentialsPanel() {
  const { data: credentials = [], isLoading } = useBankBotCredentials();
  const deleteMutation = useDeleteBankBotCredential();
  const testMutation = useTestBankBotConnection();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credentialToEdit, setCredentialToEdit] = useState<BankBotCredential | null>(null);
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [testingId, setTestingId] = useState<string | null>(null);

  const toggleCpfVisibility = (id: string) => {
    setRevealedCpfs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreate = () => {
    setCredentialToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cred: BankBotCredential) => {
    setCredentialToEdit(cred);
    setIsModalOpen(true);
  };

  const handleDelete = async (cred: BankBotCredential) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja desconectar a conta bancária da agência ${cred.agency} - conta ${cred.account_number} (${cred.store_name})? Os robôs não conseguirão mais extrair extratos desta conta automaticamente.`
    );
    if (confirmDelete) {
      await deleteMutation.mutateAsync(cred.id);
    }
  };

  const handleTestConnection = async (cred: BankBotCredential) => {
    setTestingId(cred.id);
    try {
      await testMutation.mutateAsync(cred);
    } finally {
      setTestingId(null);
    }
  };

  // Filtragem dos cards
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      // Filtro por status
      if (statusFilter !== 'all' && cred.last_status !== statusFilter) {
        return false;
      }

      // Filtro textual
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const storeMatch = (cred.store_name || '').toLowerCase().includes(q);
      const bankMatch = cred.bank_name.toLowerCase().includes(q);
      const agencyMatch = cred.agency.includes(q);
      const accountMatch = cred.account_number.includes(q);
      const cpfMatch = cred.operator_cpf.includes(q);

      return storeMatch || bankMatch || agencyMatch || accountMatch || cpfMatch;
    });
  }, [credentials, statusFilter, searchTerm]);

  // Contadores para as pílulas de filtro
  const statusCounts = useMemo(() => {
    return {
      all: credentials.length,
      success: credentials.filter((c) => c.last_status === 'success').length,
      failed: credentials.filter((c) => c.last_status === 'failed').length,
    };
  }, [credentials]);

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-6">
        {/* Topo: Título e Botão Primário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-zinc-100 flex items-center gap-2">
                Credenciais Bancárias dos Bots de Automação
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 py-0.5">
                  Playwright OFX
                </Badge>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cadastre e gerencie os acessos bancários de cada filial para que os robôs façam o download diário dos extratos às 07:00.
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 shrink-0"
          >
            <Plus size={15} />
            <span>Conectar Nova Conta Bancária</span>
          </Button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl mb-5">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por filial, banco, agência, conta ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Pílulas de Status */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todas ({statusCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'success'
                  ? 'bg-emerald-950/50 text-emerald-300 font-semibold border border-emerald-600/40'
                  : 'text-zinc-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Conectadas ({statusCounts.success})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'failed'
                  ? 'bg-rose-950/50 text-rose-300 font-semibold border border-rose-600/40'
                  : 'text-zinc-400 hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Erros ({statusCounts.failed})</span>
            </button>
          </div>
        </div>

        {/* Conteúdo: Loading, Empty State ou Grid de Cards */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <LoadingSpinner size="md" text="Carregando contas bancárias cadastradas..." />
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="py-12 px-4 border border-dashed border-zinc-800 rounded-2xl text-center bg-zinc-950/40">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Landmark size={24} />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200">
              {searchTerm || statusFilter !== 'all'
                ? 'Nenhuma conta bancária encontrada para os filtros atuais.'
                : 'Nenhuma conta bancária cadastrada para os robôs.'}
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente limpar a pesquisa ou alterar o filtro de status selecionado.'
                : 'Conecte as contas bancárias (Itaú, Bradesco, etc.) de cada filial para que o bot Playwright execute a extração 100% autônoma.'}
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                size="sm"
                className="text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Plus size={14} className="mr-1" /> Conectar Primeira Conta
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCredentials.map((cred) => {
              const bankConfig = SUPPORTED_BANKS[cred.bank_code] || SUPPORTED_BANKS.itau;
              const isRevealed = !!revealedCpfs[cred.id];
              const isTesting = testingId === cred.id || cred.last_status === 'testing';

              return (
                <div
                  key={cred.id}
                  className={`bg-zinc-950/80 border rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-zinc-700 shadow-md ${
                    cred.last_status === 'failed'
                      ? 'border-rose-500/30'
                      : cred.last_status === 'success'
                      ? 'border-emerald-500/30'
                      : 'border-zinc-800/90'
                  }`}
                >
                  {/* Topo do Card: Banco e Status */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl ${bankConfig.accentBg} ${bankConfig.accentBorder} border flex items-center justify-center font-bold text-xs ${bankConfig.accentText}`}
                        >
                          {bankConfig.shortName.slice(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-zinc-100 leading-tight">
                            {cred.bank_name}
                          </p>
                          <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            {cred.store_name}
                          </span>
                        </div>
                      </div>

                      {/* Badge de Status */}
                      <div>
                        {cred.last_status === 'success' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Conectado (Consulta)
                          </span>
                        )}
                        {cred.last_status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <XCircle size={11} /> Erro de Login
                          </span>
                        )}
                        {(cred.last_status === 'untested' || !cred.last_status) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-full">
                            <Clock size={11} /> Não Testado
                          </span>
                        )}
                        {cred.last_status === 'testing' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            <RefreshCw size={11} className="animate-spin" /> Testando...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dados Bancários: Agência e Conta */}
                    <div className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                          Agência / Conta
                        </span>
                        <span className="font-mono font-bold text-zinc-200">
                          Ag. {cred.agency} | C/C {cred.account_number}
                        </span>
                      </div>

                      {/* Operador / CPF */}
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800/60">
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                          Operador / CPF
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-zinc-300">
                            {isRevealed ? formatCpf(cred.operator_cpf) : maskCpf(cred.operator_cpf)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCpfVisibility(cred.id)}
                            className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5"
                            title={isRevealed ? 'Mascarar CPF' : 'Visualizar CPF completo'}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Tipo de Permissão */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                        <span>Permissão:</span>
                        <span className="font-medium text-emerald-400 flex items-center gap-1">
                          <ShieldCheck size={11} /> {cred.access_type === 'full' ? 'Acesso Completo' : 'Apenas Consulta (Sem iToken)'}
                        </span>
                      </div>
                    </div>

                    {/* Alerta de Erro de Login */}
                    {cred.last_status === 'failed' && cred.last_error && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2 text-[11px] text-rose-300">
                        <AlertTriangle size={15} className="shrink-0 text-rose-400 mt-0.5" />
                        <p className="text-[10px] text-rose-300 leading-tight">
                          {cred.last_error}
                        </p>
                      </div>
                    )}

                    {/* Timestamp de sincronização */}
                    <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-0.5">
                      <span>Último sincronismo:</span>
                      <span>
                        {cred.last_sync_at
                          ? new Date(cred.last_sync_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Nunca executado'}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé de Ações do Card */}
                  <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    {/* Botão Testar Conexão / Rodar Bot */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(cred)}
                      disabled={isTesting}
                      className="text-xs h-8 flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/50 font-medium"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw size={13} className="mr-1.5 animate-spin" />
                          <span>Testando...</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="mr-1.5 fill-current" />
                          <span>Testar Conexão</span>
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cred)}
                        className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
                        title="Editar credenciais"
                      >
                        <Pencil size={13} />
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        onClick={() => handleDelete(cred)}
                        className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-colors flex items-center justify-center"
                        title="Desconectar conta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal de Conexão / Edição */}
      <BankBotCredentialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        credentialToEdit={credentialToEdit}
      />
    </div>
  );
}
