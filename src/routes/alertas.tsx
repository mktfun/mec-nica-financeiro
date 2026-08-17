import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TaxasDashboardView } from '@/components/taxas/TaxasDashboardView';

export const Route = createFileRoute('/alertas')({
  component: AlertasRedirectPage,
});

function AlertasRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: '/taxas', replace: true });
  }, [navigate]);

  return (
    <AppShell>
      <TaxasDashboardView />
    </AppShell>
  );
}
