import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const Route = createFileRoute('/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Configurações</h1>
          <p className="text-[var(--text-secondary)] text-sm">Gerencie o comportamento do motor de conciliação autônomo.</p>
        </div>

        <div className="space-y-6">
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Motor de Conciliação</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Sincronização Automática (07:00)</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Executar o bot de coleta todos os dias de manhã.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Notificações Críticas por WhatsApp</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Avisar os sócios quando houver divergências de Pix.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </div>
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
              <Button variant="primary" className="w-full sm:w-auto">Forçar Execução do Motor Agora</Button>
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Inteligência Artificial (LLM)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Modelo Atual</p>
                  <p className="text-sm text-[#00a87e] mt-1">Gemini 2.0 Flash (Crédito Google Ativo)</p>
                </div>
                <Button variant="outline" size="sm">Alterar Provedor</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
