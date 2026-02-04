import { createFileRoute, redirect } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

export const Route = createFileRoute("/_authenticated/settings/")({
  beforeLoad: () => {
    throw redirect({
      to: "/settings/my-account",
    });
  },
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
