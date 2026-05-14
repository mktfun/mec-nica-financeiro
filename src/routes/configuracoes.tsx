import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/configuracoes")({
  component: () => <StubPage title="Configurações" crumb="Configurações" />,
});
