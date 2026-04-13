import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { PublicFormPage } from "@/routes/forms/-components/public-form-page";
import type { PublicFormEmbedConfig } from "@/routes/forms/-components/public-form-page";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { CustomDomainNotFound } from "@/components/ui/custom-domain-not-found";
import {
  isAppHost,
  resolveCustomDomain,
  loadFormForCustomDomain,
} from "@/lib/server-fn/custom-domain-loader";
import { generateThemeCss, getGoogleFontLinkUrl } from "@/lib/theme/generate-theme-css";

type PublicTheme = "light" | "dark" | "system";

const themeStorageKey = (formId: string) => `bf-form-theme:${formId}`;

const resolveSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Server function that resolves a custom domain + form UUID.
 * Only activates on custom domain requests.
 */
const getFormByCustomDomainId = createServerFn({ method: "GET" })
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const host = headers.host ?? headers[":authority"] ?? "";

    if (isAppHost(host)) {
      throw notFound();
    }

    const domain = await resolveCustomDomain(host);
    return loadFormForCustomDomain(domain, data.formId, "id");
  });

const CustomDomainFormIdRoute = () => {
  const loaderData = Route.useLoaderData();
  const { formId } = Route.useParams();

  const rawCustomization = loaderData?.form?.customization ?? null;
  const defaultMode = ((rawCustomization?.defaultMode as PublicTheme | undefined) ??
    "system") as PublicTheme;

  const [viewerTheme, setViewerTheme] = useState<PublicTheme>(() => {
    if (typeof window === "undefined") return defaultMode;
    const saved = window.localStorage.getItem(themeStorageKey(formId)) as PublicTheme | null;
    return saved ?? defaultMode;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (viewerTheme === "system") return resolveSystemTheme();
    return viewerTheme;
  });

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
        // ignore storage failures
      }
    },
    [formId],
  );

  const search = Route.useSearch();
  const isTransparent = search.transparentBackground || search.transparent || false;

  const embedConfig: PublicFormEmbedConfig = {
    title: search.hideTitle ? "hidden" : "visible",
    background: isTransparent ? "transparent" : "solid",
    alignment: search.alignLeft ? "left" : "center",
    dynamicHeight: search.dynamicHeight,
    dynamicWidth: search.dynamicWidth,
  };

  const customization = useMemo(
    () => (rawCustomization ? { ...rawCustomization, mode: resolvedTheme } : rawCustomization),
    [rawCustomization, resolvedTheme],
  );
  const themeCss = useMemo(() => generateThemeCss(customization), [customization]);
  const googleFontUrl = useMemo(() => getGoogleFontLinkUrl(customization), [customization]);

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
        themeToggle={
          showThemeToggle
            ? { current: resolvedTheme, onChange: (m) => handleThemeChange(m) }
            : undefined
        }
      />
    </>
  );
};

export const Route = createFileRoute("/f/$formId")({
  loader: async ({ params }) => getFormByCustomDomainId({ data: { formId: params.formId } }),
  head: ({ loaderData, params }) => {
    const siteTitle = loaderData?.domainMeta?.siteTitle ?? "Forms";
    const formTitle = loaderData?.form?.title;
    const defaultMode =
      (loaderData?.form?.customization as Record<string, string> | undefined)?.defaultMode ||
      "system";
    const formId = params.formId;
    return {
      meta: [
        {
          title: formTitle ? `${formTitle} | ${siteTitle}` : siteTitle,
        },
        {
          name: "description",
          content: formTitle ? `Fill out ${formTitle}` : "Fill out this form",
        },
        ...(loaderData?.domainMeta?.ogImageUrl
          ? [{ property: "og:image", content: loaderData.domainMeta.ogImageUrl }]
          : []),
      ],
      links: loaderData?.domainMeta?.faviconUrl
        ? [{ rel: "icon", href: loaderData.domainMeta.faviconUrl }]
        : [],
      scripts: [
        {
          children: `(function(){try{var d=document.documentElement;var override=null;try{override=window.localStorage.getItem("bf-form-theme:${formId}");}catch(e){}var def=${JSON.stringify(defaultMode)};var pick=override||def;var m=pick==="system"?(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"):pick;d.classList.remove("light","dark");d.classList.add(m);d.style.colorScheme=m;}catch(e){}})();`,
        },
      ],
    };
  },
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  pendingMs: 500,
  pendingMinMs: 300,
  component: CustomDomainFormIdRoute,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: CustomDomainNotFound,
  validateSearch: zodValidator(
    z.object({
      transparentBackground: z.boolean().optional().default(false),
      transparent: z.coerce.boolean().optional(),
      popup: z.coerce.boolean().optional().default(false),
      hideTitle: z.coerce.boolean().optional().default(false),
      alignLeft: z.coerce.boolean().optional().default(false),
      originPage: z.string().optional(),
      dynamicHeight: z.coerce.boolean().optional().default(false),
      dynamicWidth: z.coerce.boolean().optional().default(false),
    }),
  ),
});
