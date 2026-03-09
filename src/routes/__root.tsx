import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Toaster } from "@/components/ui/sonner";
import type { Session } from "../lib/auth";
import appCss from "../styles.css?url";

const LazyDevtools = lazy(() =>
  import("../components/devtools").then((m) => ({ default: m.Devtools })),
);

interface MyRouterContext {
  queryClient: QueryClient;
  session: Session | null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <HotkeysProvider defaultOptions={{ hotkey: { preventDefault: true } }}>
        <ThemeProvider defaultTheme="light">
          {children}
          <Toaster richColors />
          {process.env.NODE_ENV === "development" && (
            <Suspense>
              <LazyDevtools />
            </Suspense>
          )}
        </ThemeProvider>
        </HotkeysProvider>
        <Scripts />
      </body>
    </html>
  );
}
