import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Calendar, Server, Bot, Cpu, Zap, Clock, CheckCircle2, ArrowRight, Settings2, X, Save } from 'lucide-react';

export const Route = createFileRoute('/proposta')({
  component: PropostaPage,
});

interface CostConfig {
  sistemaLabel: string;
  sistemaMensal: number;
  botLabel: string;
  botMensal: number;
  iaLabel: string;
  iaMensal: number;
  iaTestesOneTime: number;
  whatsappLabel: string;
  whatsappMensal: number;
  prazo: number;
}

const defaultConfig: CostConfig = {
  sistemaLabel: 'Plataforma Web (Hospedagem + CDN)',
  sistemaMensal: 150,
  botLabel: 'Motor de Conciliação (Servidor + Banco)',
  botMensal: 150,
  iaLabel: 'API de Inteligência Artificial',
  iaMensal: 80,
  iaTestesOneTime: 120,
  whatsappLabel: 'WhatsApp API (Notificações)',
  whatsappMensal: 50,
  prazo: 30,
};

function PropostaPage() {
  const [config, setConfig] = useState<CostConfig>(() => {
    const saved = localStorage.getItem('proposta-config');
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<CostConfig>(config);

  const handleSave = () => {
    setConfig(draft);
    localStorage.setItem('proposta-config', JSON.stringify(draft));
    setEditMode(false);
  };

  const custoImplantacao = config.sistemaMensal + config.botMensal + config.iaTestesOneTime + config.whatsappMensal;
  const custoMensal = config.sistemaMensal + config.botMensal + config.iaMensal + config.whatsappMensal;

  const timeline = [
    { week: 'Semana 1', title: 'Setup & Extração', desc: 'Configuração da infraestrutura, desenvolvimento do bot de extração para 1 loja piloto', status: 'done' },
    { week: 'Semana 2', title: 'Motor de Regras', desc: 'Implementação das regras de detecção de divergências e integração com banco de dados', status: 'done' },
    { week: 'Semana 3', title: 'Escala 10 Lojas', desc: 'Expansão do bot para todas as unidades, testes de carga e notificações WhatsApp', status: 'current' },
    { week: 'Semana 4', title: 'Testes & Go-Live', desc: 'Testes com a Ana (gestora), ajustes finais, deploy em produção e treinamento', status: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-body p-4 md:p-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 max-w-4xl mx-auto pb-20">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <Badge variant="success" className="mb-4 text-xs">Proposta Comercial</Badge>
          <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight mb-3">
            Sistema Autônomo de<br />Conciliação Financeira
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            De 1h30 para 5 minutos. Auditoria automática para 10 unidades, todos os dias, sem intervenção humana.
          </p>
        </motion.div>

        {/* Impacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tempo Economizado', value: '85 min/dia', sub: 'de 90min para 5min' },
            { label: 'Divergências Detectadas', value: '100%', sub: 'vs ~30% manual' },
            { label: 'Economia Mensal', value: 'R$ 4.200', sub: 'em perdas evitadas' },
            { label: 'ROI', value: '< 3 meses', sub: 'retorno do investimento' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card className="text-center h-full flex flex-col justify-center">
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{item.label}</p>
                <p className="font-display font-bold text-2xl text-[var(--color-primary)]">{item.value}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.sub}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Timeline */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={20} className="text-[var(--color-primary)]" />
            <h2 className="font-display font-bold text-2xl">Prazo de Entrega</h2>
            <Badge variant="neutral" className="ml-auto">{config.prazo} dias</Badge>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[var(--border-subtle)]" />

            <div className="space-y-6">
              {timeline.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="relative flex gap-4 pl-2"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    item.status === 'done' ? 'bg-[var(--color-accent-teal)] text-white' :
                    item.status === 'current' ? 'bg-[var(--color-primary)] text-white animate-pulse' :
                    'bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
                  }`}>
                    {item.status === 'done' ? <CheckCircle2 size={16} /> :
                     item.status === 'current' ? <Zap size={16} /> :
                     <Clock size={16} />}
                  </div>
                  <Card variant="glass" className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={item.status === 'done' ? 'success' : item.status === 'current' ? 'warning' : 'neutral'} className="text-[10px]">
                        {item.week}
                      </Badge>
                      {item.status === 'current' && <span className="text-xs text-[var(--color-primary)] font-medium">← Em andamento</span>}
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{item.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Custo de Implantação */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <div className="flex items-center gap-3 mb-6">
            <Server size={20} className="text-[var(--color-primary)]" />
            <h2 className="font-display font-bold text-2xl">Investimento — Implantação</h2>
          </div>

          <Card variant="glass" className="p-6">
            <p className="text-sm text-[var(--text-secondary)] mb-6">Custos únicos para colocar o sistema em funcionamento durante o primeiro mês de desenvolvimento e testes.</p>

            <div className="space-y-4">
              <CostRow icon={<Server size={18} />} label={config.sistemaLabel} value={config.sistemaMensal} note="1º mês" />
              <CostRow icon={<Bot size={18} />} label={config.botLabel} value={config.botMensal} note="1º mês" />
              <CostRow icon={<Cpu size={18} />} label={`${config.iaLabel} (créditos de teste)`} value={config.iaTestesOneTime} note="Único" />
              <CostRow icon={<Zap size={18} />} label={config.whatsappLabel} value={config.whatsappMensal} note="1º mês" />

              <div className="border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
                <span className="font-display font-bold text-lg">Total Implantação</span>
                <span className="font-display font-bold text-2xl text-[var(--color-primary)]">
                  R$ <AnimatedNumber value={custoImplantacao} format="number" />
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Custo Mensal */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="flex items-center gap-3 mb-6">
            <Zap size={20} className="text-[var(--color-accent-teal)]" />
            <h2 className="font-display font-bold text-2xl">Custo Mensal — Em Produção</h2>
          </div>

          <Card variant="glass" className="p-6">
            <p className="text-sm text-[var(--text-secondary)] mb-6">Após a implantação, o sistema opera com custo fixo mensal previsível.</p>

            <div className="space-y-4">
              <CostRow icon={<Server size={18} />} label={config.sistemaLabel} value={config.sistemaMensal} note="/mês" />
              <CostRow icon={<Bot size={18} />} label={config.botLabel} value={config.botMensal} note="/mês" />
              <CostRow icon={<Cpu size={18} />} label={config.iaLabel} value={config.iaMensal} note="/mês" />
              <CostRow icon={<Zap size={18} />} label={config.whatsappLabel} value={config.whatsappMensal} note="/mês" />

              <div className="border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
                <span className="font-display font-bold text-lg">Total Mensal</span>
                <span className="font-display font-bold text-2xl text-[var(--color-accent-teal)]">
                  R$ <AnimatedNumber value={custoMensal} format="number" />
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-[var(--radius-md)] bg-[var(--color-accent-teal)]/5 border border-[var(--color-accent-teal)]/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-[var(--color-accent-teal)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-accent-teal)]">Economia vs. Custo</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    O sistema economiza ~R$ 4.200/mês em divergências não detectadas + tempo da equipe.
                    Com custo de R$ {custoMensal}/mês, o <span className="font-semibold text-[var(--text-primary)]">retorno líquido é de R$ {(4200 - custoMensal).toLocaleString('pt-BR')}/mês</span>.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* O que está incluído */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <h2 className="font-display font-bold text-2xl mb-6">O que está incluído</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Painel Web Completo', desc: 'Dashboard, conciliação, alertas, pátio, recebíveis, histórico — acesso de qualquer dispositivo' },
              { title: 'Bot Autônomo 24/7', desc: 'Extração automática do Oficina Inteligente às 07:00, 10 lojas em paralelo' },
              { title: 'Detecção Inteligente', desc: 'Motor de regras + IA para identificar divergências que passariam despercebidas' },
              { title: 'Alertas via WhatsApp', desc: 'Notificação imediata para a gestora e sócios quando houver problemas' },
              { title: 'Logs de Auditoria', desc: 'Cada execução do bot é gravada com screenshot — transparência total' },
              { title: 'Gestão de Unidades', desc: 'Cadastrar novas lojas, editar gerentes, mecânicos e credenciais pelo painel' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 + i * 0.05 }}
              >
                <Card variant="glass" className="p-4 h-full">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[var(--color-accent-teal)] mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{item.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Discrete Edit Button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={() => { setDraft(config); setEditMode(true); }}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-xs flex items-center gap-1.5 opacity-40 hover:opacity-100"
          >
            <Settings2 size={12} /> Ajustar valores
          </button>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setEditMode(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-lg">Ajustar Valores da Proposta</h3>
                  <button onClick={() => setEditMode(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <EditField label="Prazo (dias)" value={draft.prazo} onChange={v => setDraft({ ...draft, prazo: v })} />
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Custos Mensais</p>
                    <div className="space-y-3">
                      <EditField label={draft.sistemaLabel} value={draft.sistemaMensal} onChange={v => setDraft({ ...draft, sistemaMensal: v })} />
                      <EditField label={draft.botLabel} value={draft.botMensal} onChange={v => setDraft({ ...draft, botMensal: v })} />
                      <EditField label={draft.iaLabel} value={draft.iaMensal} onChange={v => setDraft({ ...draft, iaMensal: v })} />
                      <EditField label={draft.whatsappLabel} value={draft.whatsappMensal} onChange={v => setDraft({ ...draft, whatsappMensal: v })} />
                    </div>
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Custo Único</p>
                    <EditField label="Créditos de IA para testes" value={draft.iaTestesOneTime} onChange={v => setDraft({ ...draft, iaTestesOneTime: v })} />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 py-3 border border-[var(--border-subtle)] rounded-[var(--radius-full)] text-sm font-medium hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-full)] text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Salvar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CostRow({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="text-[var(--text-tertiary)]">{icon}</div>
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display font-semibold">R$ {value.toLocaleString('pt-BR')}</span>
        <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">{note}</span>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-[var(--text-secondary)] flex-1 min-w-0 truncate">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-24 text-right bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-sm font-display font-semibold focus:outline-none focus:border-[var(--color-primary)]"
      />
    </div>
  );
}
