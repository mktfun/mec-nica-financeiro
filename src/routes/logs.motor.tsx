import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { LogsMotorPanel } from '@/components/agente/LogsMotorPanel';

export const Route = createFileRoute('/logs/motor')({
  component: LogsMotorPage,
});

function LogsMotorPage() {
  return (
    <AppShell>
      <LogsMotorPanel />
    </AppShell>
  );
}
