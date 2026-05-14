import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/layout/StubPage";

export const Route = createFileRoute("/conciliacao")({
  component: () => <StubPage title="Conciliação Diária" crumb="Conciliação" />,
});
