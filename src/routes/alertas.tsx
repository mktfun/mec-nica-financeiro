import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { AlertResolveDialog } from '@/components/dashboard/AlertResolveDialog';
import { useState } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertRow } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/alertas')({
  component: AlertasPage,
});

type FilterType = 'all' | 'critical' | 'warning' | 'resolved';

function AlertasPage() {
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  const { data: allAlerts = [], isLoading } = useAlerts();

  const handleResolved = (id: string) => {
    // The hook will auto-refetch, but we clear the selection
    setSelectedAlert(null);
  };

  const filteredAlerts = allAlerts.filter(alert => {
    if (filter === 'resolved') return alert.resolved;
    if (alert.resolved) return false; // Hide resolved from other tabs
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'warning') return alert.severity === 'warning';
    return true; // all active
  });

  const counts = {
    critical: allAlerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    warning: allAlerts.filter(a => a.severity === 'warning' && !a.resolved).length,
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Central de Alertas</h1>
          <p className="text-[var(--text-secondary)] text-sm">Divergências pendentes que requerem sua atenção.</p>
        </div>

        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none">
          <Button 
            variant={filter === 'all' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={filter === 'all' ? 'bg-[var(--bg-surface-elevated)]' : 'text-[var(--text-secondary)]'}
            onClick={() => setFilter('all')}
          >
            Todos Ativos
          </Button>
          <Button 
            variant={filter === 'critical' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={filter === 'critical' ? 'bg-[var(--bg-surface-elevated)] text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-danger)] opacity-70'}
            onClick={() => setFilter('critical')}
          >
            Críticos ({counts.critical})
          </Button>
          <Button 
            variant={filter === 'warning' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={filter === 'warning' ? 'bg-[var(--bg-surface-elevated)] text-[var(--color-accent-warning)]' : 'text-[var(--color-accent-warning)] opacity-70'}
            onClick={() => setFilter('warning')}
          >
            Avisos ({counts.warning})
          </Button>
          <Button 
            variant={filter === 'resolved' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={filter === 'resolved' ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-70'}
            onClick={() => setFilter('resolved')}
          >
            Resolvidos
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="sm" text="" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center p-12 bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
            <CheckCircle2 size={32} className="mx-auto text-[var(--color-accent-success)] mb-3 opacity-50" />
            <p className="text-[var(--text-secondary)]">Nenhum alerta {filter === 'resolved' ? 'resolvido' : 'ativo'} nesta categoria.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  variant="glass" 
                  className={`p-5 border-l-4 ${
                    alert.resolved ? 'border-l-[var(--border-strong)] opacity-60' :
                    alert.severity === 'critical' ? 'border-l-[var(--color-accent-danger)]' : 
                    alert.severity === 'warning' ? 'border-l-[var(--color-accent-warning)]' : 
                    'border-l-[var(--color-accent-teal)]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 ${
                        alert.resolved ? 'text-[var(--text-tertiary)]' :
                        alert.severity === 'critical' ? 'text-[var(--color-accent-danger)]' : 
                        alert.severity === 'warning' ? 'text-[var(--color-accent-warning)]' : 
                        'text-[var(--color-accent-teal)]'
                      }`}>
                        {alert.resolved || alert.severity === 'info' ? <CheckCircle2 /> : <AlertTriangle />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="neutral">{alert.store_name}</Badge>
                          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                            <Clock size={12} /> {alert.time || new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                          {alert.resolved && (
                            <Badge variant="success" className="text-[10px]">Resolvido</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg text-[var(--text-primary)]">{alert.title}</h3>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">{alert.description}</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center mt-4 sm:mt-0 gap-4">
                      {alert.amount !== null && alert.amount !== undefined && (
                        <div className={`font-display font-bold text-xl ${
                          alert.resolved ? 'text-[var(--text-secondary)]' :
                          alert.severity === 'critical' ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-warning)]'
                        }`}>
                          <AnimatedNumber value={Number(alert.amount)} format="currency" />
                        </div>
                      )}
                      {!alert.resolved && alert.severity !== 'info' && (
                        <Button size="sm" variant={alert.severity === 'critical' ? 'primary' : 'outline'} className="rounded-full" onClick={() => setSelectedAlert(alert)}>
                          Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        
        <AlertResolveDialog 
          alert={selectedAlert} 
          onClose={() => setSelectedAlert(null)} 
          onResolved={handleResolved} 
        />
      </div>
    </AppShell>
  );
}
