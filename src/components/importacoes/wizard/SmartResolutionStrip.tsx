import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Zap, X, ArrowRight, User, Car, Hash, Check } from 'lucide-react';

export interface DisambiguationCandidate {
  id: string;
  osNumber: string;
  clientName?: string;
  plate?: string;
  totalValue: number;
  paidValue: number;
  openBalance?: number;
  openedAt?: string;
}

export interface ValueCollisionItem {
  id: string;
  amount: number;
  storeId: string;
  storeName: string;
  counterpartName?: string;
  date?: string;
  candidates: DisambiguationCandidate[];
}

interface SmartResolutionStripProps {
  collision: ValueCollisionItem | null;
  totalPending?: number;
  currentIndex?: number;
  onResolve: (collisionId: string, chosenCandidate: DisambiguationCandidate) => void;
  onDismiss: (collisionId: string) => void;
  className?: string;
}

export function SmartResolutionStrip({
  collision,
  totalPending = 1,
  currentIndex = 1,
  onResolve,
  onDismiss,
  className = ''
}: SmartResolutionStripProps) {
  useEffect(() => {
    if (!collision) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && collision.candidates[0]) {
        e.preventDefault();
        onResolve(collision.id, collision.candidates[0]);
      } else if (e.key === '2' && collision.candidates[1]) {
        e.preventDefault();
        onResolve(collision.id, collision.candidates[1]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss(collision.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collision, onResolve, onDismiss]);

  if (!collision || !collision.candidates || collision.candidates.length < 2) {
    return null;
  }

  const [cand1, cand2] = collision.candidates;

  return (
    <div
      className={`rounded-2xl border border-amber-500/40 bg-zinc-950 p-4 shadow-2xl transition-all duration-200 ${className}`}
    >
      {/* Cabeçalho do Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Zap size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Resolução Inteligente de Ambiguidade
              </span>
              <Badge variant="warning" className="text-[10px] font-mono font-bold">
                Item {currentIndex} de {totalPending}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Valor recebido de <strong className="text-zinc-100">{collision.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> em <strong className="text-zinc-200">{collision.storeName}</strong> coincide com 2 OSs em aberto.
              {collision.counterpartName && (
                <span className="text-zinc-500 ml-1">Origem: &quot;{collision.counterpartName}&quot;</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDismiss(collision.id)}
          title="Pular resolução (Esc)"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X size={16} />
        </button>
      </div>

      {/* Cards de Opções 1 e 2 */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Opção 1 */}
        <div
          onClick={() => onResolve(collision.id, cand1)}
          className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-950/10 cursor-pointer"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 group-hover:border-emerald-500">
                  Tecla 1
                </kbd>
                <span className="flex items-center gap-1 text-xs font-bold text-zinc-200">
                  <Hash size={13} className="text-zinc-500" /> OS #{cand1.osNumber}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {(cand1.openBalance ?? (cand1.totalValue - cand1.paidValue)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1 truncate">
                <User size={12} className="text-zinc-500 shrink-0" />
                <span className="truncate">{cand1.clientName || 'Cliente Balcão'}</span>
              </div>
              <div className="flex items-center gap-1 justify-end truncate">
                <Car size={12} className="text-zinc-500 shrink-0" />
                <span className="truncate">{cand1.plate || 'Sem placa'}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Clique ou aperte 1</span>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(collision.id, cand1);
              }}
              className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Check size={12} className="mr-1" /> Vincular à #{cand1.osNumber}
            </Button>
          </div>
        </div>

        {/* Opção 2 */}
        <div
          onClick={() => onResolve(collision.id, cand2)}
          className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-950/10 cursor-pointer"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 group-hover:border-emerald-500">
                  Tecla 2
                </kbd>
                <span className="flex items-center gap-1 text-xs font-bold text-zinc-200">
                  <Hash size={13} className="text-zinc-500" /> OS #{cand2.osNumber}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {(cand2.openBalance ?? (cand2.totalValue - cand2.paidValue)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1 truncate">
                <User size={12} className="text-zinc-500 shrink-0" />
                <span className="truncate">{cand2.clientName || 'Cliente Balcão'}</span>
              </div>
              <div className="flex items-center gap-1 justify-end truncate">
                <Car size={12} className="text-zinc-500 shrink-0" />
                <span className="truncate">{cand2.plate || 'Sem placa'}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Clique ou aperte 2</span>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(collision.id, cand2);
              }}
              className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Check size={12} className="mr-1" /> Vincular à #{cand2.osNumber}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Atalhos: [1] Primeira OS • [2] Segunda OS • [Esc] Deixar Pendente</span>
        <button
          onClick={() => onDismiss(collision.id)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          Pular este item <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
