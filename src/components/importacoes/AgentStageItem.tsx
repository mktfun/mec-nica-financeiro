import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown, Car, CreditCard, Landmark, Sparkles, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

export type SubStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
};

export type AgentStage = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  subSteps: SubStep[];
};

interface AgentStageItemProps {
  stage: AgentStage;
}

const STAGE_META: Record<string, { icon: any; role: string; accentColor: string; bgActive: string; borderActive: string }> = {
  os: {
    icon: Car,
    role: 'Agente Ingestor de Ordens de Serviço & Pátio',
    accentColor: '#3B82F6',
    bgActive: 'rgba(59, 130, 246, 0.08)',
    borderActive: 'rgba(59, 130, 246, 0.4)'
  },
  maquininha: {
    icon: CreditCard,
    role: 'Agente Auditor de Maquininhas & Taxas MDR (Rede)',
    accentColor: '#10B981',
    bgActive: 'rgba(16, 185, 129, 0.08)',
    borderActive: 'rgba(16, 185, 129, 0.4)'
  },
  ofx: {
    icon: Landmark,
    role: 'Agente Parser de Extratos Bancários (Itaú OFX)',
    accentColor: '#06B6D4',
    bgActive: 'rgba(6, 182, 212, 0.08)',
    borderActive: 'rgba(6, 182, 212, 0.4)'
  },
  salvar: {
    icon: Sparkles,
    role: 'Agente Mestre de Conciliação Atemporal & Fechamento',
    accentColor: '#A855F7',
    bgActive: 'rgba(168, 85, 247, 0.08)',
    borderActive: 'rgba(168, 85, 247, 0.4)'
  }
};

export function AgentStageItem({ stage }: AgentStageItemProps) {
  const isRunning = stage.status === 'running';
  const isSuccess = stage.status === 'success';
  const isPending = stage.status === 'pending';
  const isError = stage.status === 'error';

  const meta = STAGE_META[stage.id] || {
    icon: Bot,
    role: 'Agente de Processamento Autônomo',
    accentColor: 'var(--color-primary)',
    bgActive: 'rgba(255, 255, 255, 0.05)',
    borderActive: 'var(--border-subtle)'
  };

  const IconComponent = meta.icon;

  return (
    <div 
      className={`border rounded-xl transition-all duration-300 overflow-hidden ${
        isRunning 
          ? 'shadow-lg border-opacity-100 ring-1' 
          : isSuccess 
            ? 'bg-[var(--bg-surface-elevated)]/60 border-[var(--border-subtle)]' 
            : 'bg-[var(--bg-surface)]/40 border-[var(--border-subtle)]/50 opacity-60'
      }`}
      style={{
        backgroundColor: isRunning ? meta.bgActive : undefined,
        borderColor: isRunning ? meta.borderActive : undefined,
        boxShadow: isRunning ? `0 4px 20px ${meta.bgActive}` : undefined
      }}
    >
      {/* Header do Card do Agente */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)]/60 border-b border-[var(--border-subtle)]/40">
        <div className="flex items-center gap-3.5">
          {/* Avatar / Ícone do Agente */}
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center relative shrink-0 transition-transform"
            style={{ 
              backgroundColor: isRunning ? meta.bgActive : isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isRunning ? meta.borderActive : isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`
            }}
          >
            {isRunning && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: meta.accentColor }}></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: meta.accentColor }}></span>
              </span>
            )}
            <IconComponent 
              size={18} 
              style={{ color: isRunning ? meta.accentColor : isSuccess ? '#10B981' : 'var(--text-tertiary)' }} 
            />
          </div>

          {/* Título & Papel do Agente */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold text-sm transition-colors ${isSuccess ? 'text-[var(--text-primary)]' : isRunning ? 'text-white font-bold' : 'text-[var(--text-secondary)]'}`}>
                {stage.title}
              </h4>
              {isRunning && (
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-full animate-pulse text-white" style={{ backgroundColor: meta.borderActive }}>
                  Executando
                </span>
              )}
              {isSuccess && (
                <span className="text-[10px] uppercase tracking-wider font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Concluído
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 font-medium">
              {meta.role}
            </p>
          </div>
        </div>

        {/* Indicador Lateral */}
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 size={16} className="animate-spin text-white opacity-80" />}
          {isPending && <Circle size={16} className="text-[var(--text-tertiary)] opacity-40" />}
        </div>
      </div>

      {/* Sub-Etapas / Telemetria do Agente */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${stage.subSteps.length > 0 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-3.5 pl-14 flex flex-col gap-2 bg-black/20">
          {stage.subSteps.map((sub, idx) => (
            <motion.div 
              key={sub.id} 
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                {sub.status === 'pending' && <Circle size={12} className="text-[var(--text-tertiary)] opacity-40" />}
                {sub.status === 'running' && <Loader2 size={12} className="animate-spin text-sky-400 shrink-0" />}
                {sub.status === 'success' && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                {sub.status === 'error' && <AlertCircle size={12} className="text-rose-400 shrink-0" />}
                <span className={`font-mono text-xs ${sub.status === 'success' ? 'text-[var(--text-secondary)]' : sub.status === 'running' ? 'text-sky-300 font-semibold' : 'text-[var(--text-tertiary)]'}`}>
                  {sub.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] opacity-60">
                {sub.status === 'success' ? 'OK' : sub.status === 'running' ? 'Processando' : 'Pendente'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
