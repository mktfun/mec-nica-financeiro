import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

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

export function AgentStageItem({ stage }: AgentStageItemProps) {
  const isRunning = stage.status === 'running';
  const isSuccess = stage.status === 'success';
  const isPending = stage.status === 'pending';
  const isError = stage.status === 'error';

  return (
    <div className={`border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] overflow-hidden transition-all duration-300 ${isRunning ? 'ring-1 ring-[var(--color-primary)] shadow-md' : ''}`}>
      <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)]">
        <div className="flex items-center gap-3">
          {isPending && <Circle size={18} className="text-[var(--text-tertiary)]" />}
          {isRunning && <Loader2 size={18} className="text-[var(--color-primary)] animate-spin" />}
          {isSuccess && <CheckCircle2 size={18} className="text-[var(--color-success)]" />}
          {isError && <AlertCircle size={18} className="text-[var(--color-accent-warning)]" />}
          
          <h4 className={`font-medium transition-colors ${isSuccess ? 'text-[var(--text-primary)]' : isPending ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
            {stage.title}
          </h4>
        </div>
        
        {isRunning && (
          <div className="transform transition-transform duration-300 rotate-180">
            <ChevronDown size={16} className="text-[var(--color-primary)]" />
          </div>
        )}
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] ${isRunning ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-t-transparent'}`}>
        <div className="p-4 pl-10 flex flex-col gap-3">
          {stage.subSteps.map((sub) => (
            <div key={sub.id} className="flex items-start gap-3 transition-opacity duration-300">
              <div className="mt-0.5">
                {sub.status === 'pending' && <Circle size={14} className="text-[var(--text-tertiary)] opacity-50" />}
                {sub.status === 'running' && <Loader2 size={14} className="text-[var(--color-primary)] animate-spin" />}
                {sub.status === 'success' && <CheckCircle2 size={14} className="text-[var(--color-success)]" />}
                {sub.status === 'error' && <AlertCircle size={14} className="text-[var(--color-accent-warning)]" />}
              </div>
              <span className={`text-sm font-mono transition-colors ${sub.status === 'success' ? 'text-[var(--text-secondary)]' : sub.status === 'running' ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--text-tertiary)]'}`}>
                {sub.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
