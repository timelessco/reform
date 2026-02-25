import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { guestMiddleware } from "@/middleware/auth";

export const Route = createFileRoute("/create")({
  server: {
    middleware: [guestMiddleware],
  },
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
