import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Toaster } from "@/components/ui/sonner";
import type { Session } from "@/lib/auth/auth";
import appCss from "../styles/styles.css?url";

const LazyDevtools = lazy(() =>
  import("./-components/devtools").then((m) => ({ default: m.Devtools })),
);

interface MyRouterContext {
  queryClient: QueryClient;
  session: Session | null;
}

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("vite-ui-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}})()`;

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      {/* Theme init script - static trusted content, not user input */}
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: Needed for theme initialization */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <HeadContent />
    </head>
    <body
      suppressHydrationWarning
      className="min-h-screen bg-background text-foreground antialiased font-sans"
    >
      <HotkeysProvider defaultOptions={{ hotkey: { preventDefault: true } }}>
        <ThemeProvider defaultTheme="system">
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
