import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/patio")({
  component: () => <StubPage title="Carros no Pátio" crumb="Pátio" />,
});
