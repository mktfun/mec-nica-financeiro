import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuditLogs, AuditLogEntry } from '@/hooks/useAuditLogs';
import {
  CalendarDays,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  Edit3,
  Bot,
  Link as LinkIcon,
  User,
  SlidersHorizontal,
  FileCode,
  Clock,
  Sparkles
} from 'lucide-react';

interface DailyAuditLogsViewProps {
  initialDate?: string;
}

export function DailyAuditLogsView({ initialDate }: DailyAuditLogsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useAuditLogs(selectedDate);

  const handleDayOffset = (offset: number) => {
    const current = new Date(selectedDate + 'T12:00:00Z');
    current.setDate(current.getDate() + offset);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const filteredLogs = logs.filter(
    (l) => selectedCategory === 'all' || l.action_type === selectedCategory
  );

  const getActionConfig = (type: string) => {
    switch (type) {
      case 'importacao':
        return {
          label: 'Importação',
          icon: UploadCloud,
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dotColor: 'bg-blue-400',
        };
      case 'fechamento':
        return {
          label: 'Fechamento',
          icon: CheckCircle2,
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotColor: 'bg-emerald-400',
        };
      case 'edicao_manual':
        return {
          label: 'Edição Manual',
          icon: Edit3,
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotColor: 'bg-amber-400',
        };
      case 'vinculo_os':
        return {
          label: 'Vínculo OS/PIX',
          icon: LinkIcon,
          badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dotColor: 'bg-cyan-400',
        };
      case 'agente_ia':
        return {
          label: 'Agente de IA',
          icon: Sparkles,
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dotColor: 'bg-purple-400',
        };
      case 'usuario':
        return {
          label: 'Gestão de Acesso',
          icon: User,
          badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          dotColor: 'bg-zinc-400',
        };
      default:
        return {
          label: 'Sistema',
          icon: SlidersHorizontal,
          badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dotColor: 'bg-zinc-500',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Data */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            Histórico e Logs de Auditoria Diária
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Linha do tempo passo a passo de todas as ações, importações e fechamentos do dia selecionado.
          </p>
        </div>

        {/* Seletor de Dia */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shrink-0">
          <button
            onClick={() => handleDayOffset(-1)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Dia anterior"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 font-mono font-bold text-xs text-emerald-400">
            <CalendarDays size={14} />
            {selectedDate.split('-').reverse().join('/')}
          </div>
          <button
            onClick={() => handleDayOffset(1)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Próximo dia"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Filtros por Categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todos os Passos' },
          { id: 'importacao', label: 'Importações' },
          { id: 'fechamento', label: 'Fechamentos' },
          { id: 'agente_ia', label: 'Ações de IA' },
          { id: 'vinculo_os', label: 'Vínculos OS/PIX' },
          { id: 'usuario', label: 'Acessos' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Linha do Tempo Vertical */}
      <div className="space-y-4 relative before:absolute before:left-6 before:top-3 before:bottom-3 before:w-px before:bg-zinc-800/80">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl ml-12">
            Carregando eventos do dia...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl ml-12">
            Nenhuma ação registrada para {selectedDate.split('-').reverse().join('/')}.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const config = getActionConfig(log.action_type);
            const Icon = config.icon;
            const isExpanded = expandedLogId === log.id;
            const timeFormatted = log.created_at
              ? new Date(log.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '--:--';

            return (
              <div key={log.id} className="relative flex items-start gap-4 ml-2.5">
                {/* Marcador na Linha do Tempo */}
                <div className="w-7 h-7 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 z-10 mt-2 shadow-sm">
                  <Icon size={14} className={config.dotColor.replace('bg-', 'text-')} />
                </div>

                {/* Card do Evento */}
                <Card className="flex-1 p-4 sm:p-5 bg-zinc-900/40 border-zinc-800/80 rounded-2xl space-y-2 hover:border-zinc-700/80 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${config.badgeColor}`}
                      >
                        {config.label}
                      </Badge>
                      <span className="font-bold text-sm text-zinc-100">{log.title}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Clock size={11} />
                        {timeFormatted}
                      </span>
                      {log.user_email && (
                        <span className="text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800/60">
                          {log.user_email}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {log.description}
                  </p>

                  {/* Detalhes Técnicos / Payload */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/50">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileCode size={12} />
                        <span>{isExpanded ? 'Ocultar detalhes técnicos' : 'Ver payload / detalhes'}</span>
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
