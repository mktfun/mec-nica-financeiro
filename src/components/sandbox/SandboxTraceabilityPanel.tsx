import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { 
  SandboxReconciliationSession, 
  exportSandboxSessionAsJson 
} from '@/lib/sandbox/sandboxStorage';
import { 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Banknote, 
  Receipt, 
  CreditCard, 
  Terminal, 
  FileText,
  Search,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface Props {
  session: SandboxReconciliationSession | null;
  onClearSession: () => void;
}

export function SandboxTraceabilityPanel({ session, onClearSession }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'matches' | 'orfaos' | 'cartoes' | 'cofre' | 'recebiveis' | 'logs'>('matches');
  const [searchTerm, setSearchTerm] = useState('');

  if (!session) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <AlertTriangle className="mx-auto text-amber-400 mb-3" size={32} />
        <h3 className="text-base font-bold text-foreground">Nenhuma Sessão Simulada Ativa</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Processe arquivos na aba de Importação e finalize a simulação para visualizar a auditoria forense detalhada aqui.
        </p>
      </Card>
    );
  }

  const { matchingResult, cashVaultEntries, receivables, traceLogs, filesProcessed, targetDate } = session;
  const resolvedMatches = matchingResult?.resolvedMatches || [];
  const unmatched = matchingResult?.unmatchedTransactions || [];
  const settledBatches = matchingResult?.settledBatches || [];

  const totalMatchesValue = resolvedMatches.reduce((acc, m) => acc + (m.amount || 0), 0);
  const totalOrfaosValue = unmatched.reduce((acc, u) => acc + (u.amount || 0), 0);
  const totalCofreValue = cashVaultEntries.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalRecebiveisValue = receivables.reduce((acc, r) => acc + (r.amount || 0), 0);

  // Filtragem de busca
  const filteredMatches = resolvedMatches.filter(m => 
    !searchTerm || 
    m.osNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.storeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrfaos = unmatched.filter(u => 
    !searchTerm || 
    u.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar de Ações da Sessão */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              Auditoria Forense & Telemetria do Motor (Data: {targetDate})
            </h2>
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
              100% Local Storage
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Sessão ID: <code className="text-foreground/80">{session.sessionId}</code> • Criada em: {new Date(session.createdAt).toLocaleTimeString('pt-BR')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportSandboxSessionAsJson(session)}
            className="h-8 text-xs border-border text-foreground hover:bg-muted rounded-xl flex items-center gap-1.5"
          >
            <Download size={13} className="text-cyan-400" />
            Exportar JSON Completo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSession}
            className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-950/30 rounded-xl flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            Limpar Simulação
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Matches Resolvidos</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400">
            {resolvedMatches.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total: R$ {totalMatchesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Órfãos (Pendentes)</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-400">
            {unmatched.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total: R$ {totalOrfaosValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Cofre / Daniel</span>
            <Banknote size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-cyan-400">
            {cashVaultEntries.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total: R$ {totalCofreValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Títulos a Receber</span>
            <Receipt size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-400">
            {receivables.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total: R$ {totalRecebiveisValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Navegação de Sub-Abas Forenses */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border">
          <button
            onClick={() => setActiveSubTab('matches')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'matches'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Matches ({resolvedMatches.length})
          </button>

          <button
            onClick={() => setActiveSubTab('orfaos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'orfaos'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Órfãos ({unmatched.length})
          </button>

          <button
            onClick={() => setActiveSubTab('cartoes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'cartoes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Lotes Cartão ({settledBatches.length})
          </button>

          <button
            onClick={() => setActiveSubTab('cofre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'cofre'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cofre / Dinheiro ({cashVaultEntries.length})
          </button>

          <button
            onClick={() => setActiveSubTab('recebiveis')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'recebiveis'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recebíveis ({receivables.length})
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Logs ({traceLogs.length})
          </button>
        </div>

        {/* Input de Busca Rápida */}
        {(activeSubTab === 'matches' || activeSubTab === 'orfaos') && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Filtrar por OS, método ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}

      {/* 1. MATCHES RESOLVIDOS */}
      {activeSubTab === 'matches' && (
        <Card className="p-0 overflow-hidden bg-card border-border">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Transações Conciliadas com OS ({filteredMatches.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Hard Match (Valor e Janela Temporal) + Similaridade Decisiva
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum match encontrado para o filtro.
              </div>
            ) : (
              filteredMatches.map((m, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">OS #{m.osNumber}</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        {m.paymentMethod}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{m.type}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: {m.storeId} {m.ofxId ? `• OFX Ref: ${m.ofxId}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">
                      R$ {Number(m.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {m.feeDeducted ? (
                      <p className="text-[10px] text-muted-foreground">
                        Taxa: R$ {Number(m.feeDeducted).toFixed(2)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 2. ÓRFÃOS / PENDENTES */}
      {activeSubTab === 'orfaos' && (
        <Card className="p-0 overflow-hidden bg-card border-border">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Transações Sem Vínculo ({filteredOrfaos.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Lançamentos bancários ou vendas pendentes de OS correspondente
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {filteredOrfaos.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Zero transações órfãs! Conciliação 100% perfeita.
              </div>
            ) : (
              filteredOrfaos.map((u, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{u.description}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                        {u.paymentMethod}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{u.date}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: {u.storeName} ({u.source})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">
                      R$ {Number(u.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-rose-400">
                      Sem OS compatível na janela
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 3. LOTES DE CARTÃO REDE */}
      {activeSubTab === 'cartoes' && (
        <Card className="p-0 overflow-hidden bg-card border-border">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Lotes Compensados e Deduções de Taxas
            </span>
            <span className="text-[11px] text-muted-foreground">
              Batimento das vendas com o crédito líquido no extrato bancário
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {settledBatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum lote compensado registrado para a data.
              </div>
            ) : (
              settledBatches.map((b, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{b.modality}</span>
                      {b.batchNumber ? (
                        <Badge variant="outline" className="text-[10px]">Lote {b.batchNumber}</Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">Data Crédito: {b.creditDate}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: {b.storeId} • {b.txCount} venda(s) agregada(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-400">
                      OFX: R$ {Number(b.ofxAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Líquido: R$ {Number(b.totalNet).toFixed(2)} (Taxa: R$ {Number(b.feeDeducted).toFixed(2)})
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 4. COFRE / DINHEIRO DANIEL */}
      {activeSubTab === 'cofre' && (
        <Card className="p-0 overflow-hidden bg-card border-border">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Lançamentos de Dinheiro Extraídos de OS ({cashVaultEntries.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Registros simulados em trânsito no cofre
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {cashVaultEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum recebimento em dinheiro identificado nas OSs.
              </div>
            ) : (
              cashVaultEntries.map((c, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">OS #{c.os_number_ref}</span>
                      <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: {c.store_name} • Data: {c.entry_date}
                    </p>
                  </div>
                  <div className="text-right font-bold text-cyan-400 text-xs">
                    R$ {Number(c.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 5. RECEBÍVEIS GERADOS */}
      {activeSubTab === 'recebiveis' && (
        <Card className="p-0 overflow-hidden bg-card border-border">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Títulos a Receber Extraídos de OS ({receivables.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Boletos e transferências a faturar
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {receivables.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum título a receber extraído das OSs.
              </div>
            ) : (
              receivables.map((r, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{r.client_name}</span>
                      <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 bg-violet-500/10">
                        {r.payment_method}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">OS #{r.os_number}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: {r.store_name || r.store_id} • Vencimento: {r.due_date}
                    </p>
                  </div>
                  <div className="text-right font-bold text-violet-400 text-xs">
                    R$ {Number(r.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 6. LOGS DE EXECUÇÃO */}
      {activeSubTab === 'logs' && (
        <Card className="p-4 bg-zinc-950 border-border font-mono text-xs max-h-96 overflow-y-auto space-y-2">
          {traceLogs.length === 0 ? (
            <div className="text-muted-foreground text-center py-6">
              Nenhum log registrado na sessão.
            </div>
          ) : (
            traceLogs.map((log, idx) => {
              const colorClass = 
                log.level === 'error' ? 'text-rose-400' :
                log.level === 'warn' ? 'text-amber-400' :
                log.level === 'success' ? 'text-emerald-400' : 'text-zinc-400';

              return (
                <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
                  <span className={`font-semibold ${colorClass}`}>[{log.level.toUpperCase()}]</span>
                  <span className="text-zinc-200">{log.message}</span>
                </div>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}
