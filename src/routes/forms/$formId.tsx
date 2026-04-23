import { APP_NAME } from "@/lib/config/app-config";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { PublicFormPage } from "@/routes/forms/-components/public-form-page";
import type { PublicFormEmbedConfig } from "@/routes/forms/-components/public-form-page";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { getPublicFormViewRSC } from "@/lib/server-fn/public-form-view-rsc";
import { generateDualThemeCss, getGoogleFontLinkUrl } from "@/lib/theme/generate-theme-css";

type PublicTheme = "light" | "dark" | "system";

const themeStorageKey = (formId: string) => `bf-form-theme:${formId}`;

const resolveSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const PublicFormRoute = () => {
  const loaderData = Route.useLoaderData();
  const { formId } = Route.useParams();
  const search = Route.useSearch();

  const rawCustomization = loaderData?.form?.customization ?? null;
  const defaultMode = (rawCustomization?.defaultMode as PublicTheme | undefined) ?? "system";

  // Viewer's chosen theme — initialized from localStorage override or defaultMode
  const [viewerTheme, setViewerTheme] = useState<PublicTheme>(() => {
    if (typeof window === "undefined") return defaultMode;
    const saved = window.localStorage.getItem(themeStorageKey(formId)) as PublicTheme | null;
    return saved ?? defaultMode;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (viewerTheme === "system") return resolveSystemTheme();
    return viewerTheme;
  });

  // Apply theme class to documentElement (scoped to this route's lifetime)
  useEffect(() => {
    const root = document.documentElement;
    const apply = (resolved: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    apply(viewerTheme === "system" ? resolveSystemTheme() : viewerTheme);

    if (viewerTheme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply(mq.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [viewerTheme]);

  // Background color for body
  useEffect(() => {
    document.body.style.backgroundColor = "var(--color-background)";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const handleThemeChange = useCallback(
    (next: PublicTheme) => {
      setViewerTheme(next);
      try {
        window.localStorage.setItem(themeStorageKey(formId), next);
      } catch {
        // ignore storage failures (private mode etc.)
      }
    },
    [formId],
  );

  // Support both transparentBackground and transparent params
  const isTransparent = search.transparentBackground || search.transparent || false;

  const embedConfig: PublicFormEmbedConfig = {
    title: search.hideTitle ? "hidden" : "visible",
    background: isTransparent ? "transparent" : "solid",
    alignment: search.alignLeft ? "left" : "center",
    dynamicHeight: search.dynamicHeight,
    dynamicWidth: search.dynamicWidth,
  };

  // Dual-mode CSS — both light and dark tokens are emitted; the root `.dark`
  // class picks one purely in CSS, avoiding any hydration flash.
  const themeCss = useMemo(() => generateDualThemeCss(rawCustomization), [rawCustomization]);
  const googleFontUrl = useMemo(() => getGoogleFontLinkUrl(rawCustomization), [rawCustomization]);

  // Show toggle only when creator picked "system" and we're not in popup/transparent embed
  const showThemeToggle = defaultMode === "system" && !search.popup && !isTransparent;

  return (
    <>
      {googleFontUrl && <link rel="stylesheet" href={googleFontUrl} />}
      {themeCss && <style>{themeCss}</style>}
      <PublicFormPage
        form={loaderData?.form ?? null}
        error={loaderData?.error ?? null}
        gated={loaderData?.gated ?? null}
        formId={formId}
        isPopup={search.popup}
        embedConfig={embedConfig}
        rsc={
          loaderData?.form
            ? {
                steps: loaderData.steps,
                thankYou: loaderData.thankYou,
                stepCount: loaderData.stepCount,
              }
            : undefined
        }
        themeToggle={
          showThemeToggle
            ? { current: resolvedTheme, onChange: (m) => handleThemeChange(m) }
            : undefined
        }
      />
    </>
  );
};

export const Route = createFileRoute("/forms/$formId")({
  // SSR loader - fetches form data on the server for SEO
  loader: async ({ params }) => getPublicFormViewRSC({ data: { id: params.formId } }),
  // SEO meta tags
  head: ({ loaderData, params }) => {
    const defaultMode = loaderData?.form?.customization?.defaultMode || "system";
    const formId = params.formId;
    const preloadUrls = loaderData?.preloadModuleUrls ?? [];
    return {
      meta: [
        {
          title: loaderData?.form?.title
            ? `${loaderData.form.title} | ${APP_NAME}`
            : `Form | ${APP_NAME}`,
        },
        {
          name: "description",
          content: loaderData?.form?.title
            ? `Fill out ${loaderData.form.title}`
            : "Fill out this form",
        },
      ],
      links: preloadUrls.map((href) => ({
        rel: "modulepreload",
        href,
        crossOrigin: "",
      })),
      scripts: [
        {
          // Skip loading inter-v on public forms — override --font-sans before
          // paint so body's font-sans utility resolves to --bf-font (or system
          // fallback). The @font-face inter-v declaration then matches nothing
          // and the browser never fetches the Inter-V woff2.
          children: `document.documentElement.style.setProperty("--font-sans",'var(--bf-font,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif)');`,
        },
        {
          // Apply theme before paint — viewer override > creator default > system
          children: `(function(){try{var d=document.documentElement;var override=null;try{override=window.localStorage.getItem("bf-form-theme:${formId}");}catch(e){}var def=${JSON.stringify(defaultMode)};var pick=override||def;var m=pick==="system"?(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"):pick;d.classList.remove("light","dark");d.classList.add(m);d.style.colorScheme=m;}catch(e){}})();`,
        },
        {
          // Pre-hydration: as soon as the SSR'd form HTML is parsed, tell the
          // parent popup (a) the measured height so it can size the iframe
          // without a jump, and (b) that the form is visually ready so the
          // popup spinner veil can be hidden — no need to wait for every CSS/JS
          // chunk to finish downloading. The React ResizeObserver + useEffect
          // in public-form-page take over after hydration.
          children: `(function(){try{if(window.parent===window)return;var p=new URLSearchParams(window.location.search);var isPopup=(p.get("popup")==="1"||p.get("popup")==="true");var isDynamic=(p.get("dynamicHeight")==="1"||p.get("dynamicHeight")==="true");if(!isPopup&&!isDynamic)return;var post=function(){var el=document.getElementById("bf-form-container");if(!el)return;var h=el.scrollHeight;if(h>0)window.parent.postMessage(JSON.stringify({event:"Reform.Resize",height:h}),"*");if(isPopup)window.parent.postMessage(JSON.stringify({event:"Reform.FormLoaded"}),"*");};if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",post,{once:true});}else{post();}}catch(e){}})();`,
        },
      ],
    };
  },
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  pendingMs: 500,
  pendingMinMs: 300,
  component: PublicFormRoute,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  validateSearch: zodValidator(
    z.object({
      // Transparent background for iframe embeds
      transparentBackground: z.boolean().optional().default(false),
      transparent: z.coerce.boolean().optional(), // Alias for transparentBackground
      // Popup mode (embedded via popup.js)
      popup: z.coerce.boolean().optional().default(false),
      // Hide form title in popup
      hideTitle: z.coerce.boolean().optional().default(false),
      // Align form content to the left
      alignLeft: z.coerce.boolean().optional().default(false),
      // Origin page for tracking
      originPage: z.string().optional(),
      // Dynamic height for standard iframe embeds
      dynamicHeight: z.coerce.boolean().optional().default(false),
      // Dynamic width — form fields fill full width with padding
      dynamicWidth: z.coerce.boolean().optional().default(false),
    }),
  ),
});
