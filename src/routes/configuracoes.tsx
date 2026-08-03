import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ConfiguracoesPanel } from '@/components/agente/ConfiguracoesPanel';

export const Route = createFileRoute('/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <AppShell>
      <ConfiguracoesPanel />
    </AppShell>
  );
}
