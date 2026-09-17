import { useState, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  Sliders, 
  FileJson, 
  ListOrdered,
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  MOCK_OFX_TRANSACTIONS, 
  MOCK_OS_LIST, 
  DEFAULT_TARGET_DATE 
} from '@/lib/matchers/mockDataConciliacao';
import { 
  matchTransactionsV2, 
  MatchTransactionsV2Result 
} from '@/lib/matchers/matchTransactionsV2';
import { OfxTransaction } from '@/lib/parsers/ofxParser';
import { ParsedOS } from '@/hooks/useImportProcessor';

export const Route = createFileRoute('/teste/import')({
  component: TesteImportPage,
});

export function TesteImportPage() {
  // Estado 100% in-memory
  const [ofxData, setOfxData] = useState<OfxTransaction[]>(MOCK_OFX_TRANSACTIONS);
  const [osData, setOsData] = useState<ParsedOS[]>(MOCK_OS_LIST);
  const [targetDate, setTargetDate] = useState<string>(DEFAULT_TARGET_DATE);
  const [dateTolerance, setDateTolerance] = useState<number>(1);
  const [valueTolerance, setValueTolerance] = useState<number>(0.05);
  
  const [activeTab, setActiveTab] = useState<'matches' | 'avoided' | 'orphans' | 'json' | 'editor'>('matches');
  const [copied, setCopied] = useState<boolean>(false);
  const [jsonDraftOfx, setJsonDraftOfx] = useState<string>(JSON.stringify(MOCK_OFX_TRANSACTIONS, null, 2));
  const [jsonDraftOs, setJsonDraftOs] = useState<string>(JSON.stringify(MOCK_OS_LIST, null, 2));

  // Execução pura e reativa do algoritmo de funil
  const result: MatchTransactionsV2Result = useMemo(() => {
    return matchTransactionsV2({
      ofxTransactions: ofxData,
      osList: osData,
      targetDate,
      dateToleranceDays: dateTolerance,
      valueToleranceCents: valueTolerance
    });
  }, [ofxData, osData, targetDate, dateTolerance, valueTolerance]);

  const handleResetMocks = () => {
    setOfxData(MOCK_OFX_TRANSACTIONS);
    setOsData(MOCK_OS_LIST);
    setTargetDate(DEFAULT_TARGET_DATE);
    setDateTolerance(1);
    setValueTolerance(0.05);
    setJsonDraftOfx(JSON.stringify(MOCK_OFX_TRANSACTIONS, null, 2));
    setJsonDraftOs(JSON.stringify(MOCK_OS_LIST, null, 2));
    toast.info('Mocks restaurados para os valores padrão da conciliação.');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.success('JSON copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyJsonEditor = () => {
    try {
      const parsedOfx = JSON.parse(jsonDraftOfx);
      const parsedOs = JSON.parse(jsonDraftOs);
      if (!Array.isArray(parsedOfx) || !Array.isArray(parsedOs)) {
        throw new Error('OFX e OS devem ser arrays válidos.');
      }
      setOfxData(parsedOfx);
      setOsData(parsedOs);
      toast.success('Mocks customizados aplicados com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao processar JSON: ${err.message || 'Formato inválido'}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Header Superior */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/importacoes"
              className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Voltar para Importações"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SANDBOX 100% LOCAL
                </span>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-muted text-muted-foreground border border-border/40">
                  SPEC 418
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                Sandbox de Conciliação — Funil de Match PIX / OS (V2)
              </h1>
            </div>
          </div>

          {/* Botões de Ação do Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetMocks}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border/60 bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar Mocks
            </button>
            <button
              onClick={() => toast.success(`Simulação executada: ${result.stats.confirmedMatchesCount} matches confirmados!`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Rodar Conciliação Sandbox
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Informativo de Isolamento */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Ambiente Seguro e Desacoplado do Supabase</p>
            <p className="mt-0.5">
              Esta rota opera com dados em memória. Nenhuma chamada de API, mutation ou persistência no PostgreSQL é realizada.
              Utilize os controles abaixo para testar cenários de colisão de nomes, tolerâncias numéricas e datas de corte.
            </p>
          </div>
        </div>

        {/* Barra de Controles e Parâmetros */}
        <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-primary" />
            Parâmetros do Funil de Matching
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Data Alvo
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tolerância de Data (Dias)
              </label>
              <select
                value={dateTolerance}
                onChange={(e) => setDateTolerance(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={0}>Mesmo Dia (0 dias)</option>
                <option value={1}>D-1 a D+1 (1 dia — Recomendado)</option>
                <option value={2}>D-2 a D+2 (2 dias)</option>
                <option value={3}>D-3 a D+3 (3 dias)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tolerância de Arredondamento (Centavos)
              </label>
              <select
                value={valueTolerance}
                onChange={(e) => setValueTolerance(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={0}>R$ 0,00 (Exato absoluto)</option>
                <option value={0.05}>R$ 0,05 (Padrão contábil estrito)</option>
                <option value={0.10}>R$ 0,10 (Tolerância suave)</option>
                <option value={0.50}>R$ 0,50 (Tolerância ampla)</option>
              </select>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3 border border-border/40 flex flex-col justify-center text-xs">
              <span className="text-muted-foreground">Volume de Mocks:</span>
              <span className="font-semibold text-foreground mt-0.5">
                {ofxData.length} Lançamentos OFX • {osData.length} Ordens de Serviço
              </span>
            </div>
          </div>
        </section>

        {/* Cards de Métricas e KPIs do Resultado */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Matches Confirmados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2 font-mono">
              {result.stats.confirmedMatchesCount}
            </div>
            <p className="text-xs text-emerald-400 mt-1">
              R$ {result.stats.totalMatchedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vinculados
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Falsos Positivos Evitados</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2 font-mono">
              {result.stats.avoidedFalsePositivesCount}
            </div>
            <p className="text-xs text-amber-400/90 mt-1">
              Colisões textuais barradas pelo funil
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Órfãos OFX (Extrato)</span>
              <XCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2 font-mono">
              {result.stats.orphanOfxCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              PIXs sem OS correspondente
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Órfãos do Pátio (OSs)</span>
              <ListOrdered className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2 font-mono">
              {result.stats.orphanOsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              OSs não quitadas por PIX
            </p>
          </div>
        </section>

        {/* Abas de Navegação de Detalhes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'matches'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Matches Confirmados ({result.matches_confirmados.length})
            </button>

            <button
              onClick={() => setActiveTab('avoided')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'avoided'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Falsos Positivos Evitados ({result.falsos_positivos_evitados.length})
            </button>

            <button
              onClick={() => setActiveTab('orphans')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'orphans'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Lançamentos Órfãos ({result.stats.orphanOfxCount + result.stats.orphanOsCount})
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'json'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Payload JSON Bruto
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'editor'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Editor de Mocks
            </button>
          </div>

          {/* TAB 1: Matches Confirmados */}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              {result.matches_confirmados.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-xl p-8 text-center text-muted-foreground text-xs">
                  Nenhum match foi confirmado com os parâmetros atuais.
                </div>
              ) : (
                result.matches_confirmados.map((m, idx) => (
                  <div
                    key={`match-${idx}`}
                    className="bg-card border border-border/50 hover:border-border rounded-xl p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.matchReason === 'exact_value_unique_period' ? 'VALOR ÚNICO (STEP 1)' : 'DESEMPATE POR NOME (STEP 2)'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          OS #{m.os.os_number} ({m.os.plate || 'S/ Placa'})
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {m.extractedClientName || m.os.client_name || 'Cliente'} 
                        <span className="text-muted-foreground font-normal mx-2">↔</span>
                        <span className="font-mono text-emerald-400">R$ {m.matchedAmount.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Extrato OFX: <span className="font-mono text-foreground/80">{m.ofx.title}</span>
                      </p>
                      {m.notes && (
                        <p className="text-[11px] text-muted-foreground/80 italic flex items-center gap-1 mt-0.5">
                          <Info className="w-3 h-3 text-primary" /> {m.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground block">Score Textual</span>
                      <span className="text-sm font-mono font-bold text-foreground">
                        {(m.similarityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Falsos Positivos Evitados */}
          {activeTab === 'avoided' && (
            <div className="space-y-3">
              {result.falsos_positivos_evitados.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-xl p-8 text-center text-muted-foreground text-xs">
                  Nenhuma colisão com recusa registrada.
                </div>
              ) : (
                result.falsos_positivos_evitados.map((rej, idx) => (
                  <div
                    key={`avoided-${idx}`}
                    className="bg-card border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {rej.reason === 'name_matched_but_value_mismatched' ? 'VALOR DIVERGENTE' : (
                            rej.reason === 'name_matched_but_date_out_of_window' ? 'DATA FORA DA JANELA' : 'DESEMPATE REJEITADO'
                          )}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          PIX: R$ {rej.ofx.amount.toFixed(2)} vs OS #{rej.rejectedOs.os_number} (R$ {Number(rej.rejectedOs.total_value || 0).toFixed(2)})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {rej.ofx.title}
                      </p>
                      <p className="text-xs text-amber-300/90 mt-1">
                        {rej.details}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground block">Similaridade</span>
                      <span className="text-sm font-mono font-bold text-amber-400">
                        {(rej.similarityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Órfãos (OFX e OS) */}
          {activeTab === 'orphans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Órfãos OFX */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Transações OFX sem OS ({result.orphans.unmatchedOfx.length})
                  </h3>
                </div>
                {result.orphans.unmatchedOfx.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum PIX órfão.</p>
                ) : (
                  result.orphans.unmatchedOfx.map((tx, idx) => (
                    <div key={`ofx-orph-${idx}`} className="bg-secondary/20 p-3 rounded-lg border border-border/30 text-xs">
                      <div className="flex justify-between font-mono font-semibold text-foreground">
                        <span>{tx.counterpart_name || 'Contraparte não informada'}</span>
                        <span className="text-primary">R$ {Math.abs(tx.amount).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tx.title}</p>
                      <span className="text-[10px] text-muted-foreground/60 font-mono block mt-1">
                        {tx.date || 'Sem data'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Órfãos OS */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Ordens de Serviço sem PIX ({result.orphans.unmatchedOs.length})
                  </h3>
                </div>
                {result.orphans.unmatchedOs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Todas as OSs foram conciliadas.</p>
                ) : (
                  result.orphans.unmatchedOs.map((os, idx) => (
                    <div key={`os-orph-${idx}`} className="bg-secondary/20 p-3 rounded-lg border border-border/30 text-xs">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>OS #{os.os_number} — {os.client_name || 'Sem Nome'}</span>
                        <span className="font-mono text-primary">R$ {Number(os.total_value || 0).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Placa: {os.plate || 'S/P'} • Pagamento: {os.payment_method || 'Nenhum'}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 font-mono block mt-1">
                        Abertura: {os.opened_at || 'Sem data'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: JSON Bruto */}
          {activeTab === 'json' && (
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary" />
                  Saída Bruta do Motor (MatchTransactionsV2Result)
                </span>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar JSON'}
                </button>
              </div>

              <pre className="bg-secondary/40 border border-border/50 rounded-lg p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[500px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 5: Editor de Mocks */}
          {activeTab === 'editor' && (
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Editor de Payload In-Memory
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modifique o JSON abaixo para testar cenários específicos diretamente no motor.
                  </p>
                </div>
                <button
                  onClick={handleApplyJsonEditor}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity"
                >
                  Aplicar Alterações nos Mocks
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 font-mono">
                    OFX Transactions (JSON Array)
                  </label>
                  <textarea
                    rows={16}
                    value={jsonDraftOfx}
                    onChange={(e) => setJsonDraftOfx(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 font-mono">
                    OS List (JSON Array)
                  </label>
                  <textarea
                    rows={16}
                    value={jsonDraftOs}
                    onChange={(e) => setJsonDraftOs(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
