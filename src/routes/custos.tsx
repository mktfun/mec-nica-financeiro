import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CustosPanel } from '@/components/agente/CustosPanel';

export const Route = createFileRoute('/custos')({
  component: CustosPage,
});

function CustosPage() {
  return (
    <AppShell>
      <CustosPanel />
    </AppShell>
  );
}
