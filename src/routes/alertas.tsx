import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { mockAlerts } from '@/mock/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { AlertResolveDialog } from '@/components/dashboard/AlertResolveDialog';
import { useState } from 'react';
import { MockAlert } from '@/mock/data';

export const Route = createFileRoute('/alertas')({
  component: AlertasPage,
});

function AlertasPage() {
  const [selectedAlert, setSelectedAlert] = useState<MockAlert | null>(null);
  const [alerts, setAlerts] = useState(mockAlerts);

  const handleResolved = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Central de Alertas</h1>
          <p className="text-[var(--text-secondary)] text-sm">Divergências pendentes que requerem sua atenção.</p>
        </div>

        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none">
          <Button variant="secondary" size="sm" className="bg-[var(--bg-surface-elevated)]">
            Todos
          </Button>
          <Button variant="ghost" size="sm" className="text-[var(--color-accent-danger)]">
            Críticos (1)
          </Button>
          <Button variant="ghost" size="sm" className="text-[var(--color-accent-warning)]">
            Avisos (1)
          </Button>
          <Button variant="ghost" size="sm" className="text-[var(--text-secondary)]">
            Resolvidos
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                variant="glass" 
                className={`p-5 border-l-4 ${
                  alert.severity === 'critical' ? 'border-l-[var(--color-accent-danger)]' : 
                  alert.severity === 'warning' ? 'border-l-[var(--color-accent-warning)]' : 
                  'border-l-[var(--color-accent-teal)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 ${
                      alert.severity === 'critical' ? 'text-[var(--color-accent-danger)]' : 
                      alert.severity === 'warning' ? 'text-[var(--color-accent-warning)]' : 
                      'text-[var(--color-accent-teal)]'
                    }`}>
                      {alert.severity === 'info' ? <CheckCircle2 /> : <AlertTriangle />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="neutral">{alert.storeName}</Badge>
                        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                          <Clock size={12} /> {alert.time}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-[var(--text-primary)]">{alert.title}</h3>
                      <p className="text-[var(--text-secondary)] text-sm mt-1">{alert.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center mt-4 sm:mt-0 gap-4">
                    {alert.amount && (
                      <div className={`font-display font-bold text-xl ${
                        alert.severity === 'critical' ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-warning)]'
                      }`}>
                        <AnimatedNumber value={alert.amount} format="currency" />
                      </div>
                    )}
                    {alert.severity !== 'info' && (
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
        
        <AlertResolveDialog 
          alert={selectedAlert} 
          onClose={() => setSelectedAlert(null)} 
          onResolved={handleResolved} 
        />
      </div>
    </AppShell>
  );
}
