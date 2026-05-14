import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/alertas")({
  component: () => <StubPage title="Alertas" crumb="Alertas" />,
});
