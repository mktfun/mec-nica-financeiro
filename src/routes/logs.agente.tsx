import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { LogsAgentePanel } from '@/components/agente/LogsAgentePanel';

export const Route = createFileRoute('/logs/agente')({
  component: LogsAgentePage,
});

function LogsAgentePage() {
  return (
    <AppShell>
      <LogsAgentePanel />
    </AppShell>
  );
}
