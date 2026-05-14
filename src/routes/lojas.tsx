import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/lojas")({
  component: () => <StubPage title="Lojas" crumb="Lojas" />,
});
