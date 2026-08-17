import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { TaxasDashboardView } from '@/components/taxas/TaxasDashboardView';

interface TaxasSearchParams {
  storeId?: string;
  startDate?: string;
  endDate?: string;
}

export const Route = createFileRoute('/taxas')({
  validateSearch: (search: Record<string, unknown>): TaxasSearchParams => {
    return {
      storeId: (search.storeId as string) || undefined,
      startDate: (search.startDate as string) || undefined,
      endDate: (search.endDate as string) || undefined,
    };
  },
  component: TaxasPage,
});

function TaxasPage() {
  const search = Route.useSearch();

  return (
    <AppShell>
      <TaxasDashboardView initialStoreId={search.storeId} />
    </AppShell>
  );
}
