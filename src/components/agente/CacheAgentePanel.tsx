import { Card } from '@/components/ui/Card';
import { Database, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { useOsCache } from '@/hooks/useOsCache';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function CacheAgentePanel() {
  const { data: cache = [], isLoading } = useOsCache(100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
            <HardDrive size={20} className="text-[var(--color-primary)]" />
          </div>
          Cache de OS (Oficina)
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">Inspeção do banco de dados local populado pelo Bot/Cron. OSs finalizadas não expiram.</p>
      </div>

      <Card variant="glass" className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
          ) : cache.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhuma OS em cache local.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cache.map(item => {
                const isFinalizado = item.status_cache === 'FINALIZADO';
                return (
                  <div key={item.id} className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-[var(--color-primary)]" />
                        <span className="font-bold text-[var(--text-primary)]">
                          OS #{item.os_number}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
                        {item.store_id}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isFinalizado ? 'bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1'}`}>
                        {!isFinalizado && <AlertTriangle size={10} />}
                        {item.status_cache || 'DESCONHECIDO'}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(item.updated_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--text-secondary)]">
                      {item.payload_completo?.data?.cliente?.nome ? (
                        <div><strong>Cliente:</strong> {item.payload_completo.data.cliente.nome}</div>
                      ) : null}
                      {item.payload_completo?.data?.placa ? (
                        <div><strong>Placa:</strong> {item.payload_completo.data.placa}</div>
                      ) : null}
                      {item.payload_completo?.data?.total ? (
                        <div><strong>Total:</strong> {item.payload_completo.data.total}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </Card>
    </div>
  );
}
