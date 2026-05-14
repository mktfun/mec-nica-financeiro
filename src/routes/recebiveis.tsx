import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/recebiveis")({
  component: () => <StubPage title="Recebíveis" crumb="Recebíveis" />,
});
