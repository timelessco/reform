import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

const RouteComponent = () => (
  <div>
    <Link to="/demo/$" search={{ workspaceId: "1", formId: "1" }}>
      Home
    </Link>
  </div>
);

export const Route = createFileRoute("/demo/$")({
  component: RouteComponent,
  validateSearch: z.object({
    workspaceId: z.string(),
    formId: z.string(),
  }),
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
