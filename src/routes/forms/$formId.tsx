import { APP_NAME } from "@/lib/app-config";
import { useResolvedTheme, useTheme } from "@/components/ThemeProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { PublicFormPage } from "@/components/public/public-form-page";
import type { PublicFormEmbedConfig } from "@/components/public/public-form-page";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { getPublishedFormById } from "@/lib/fn/public";
import { generateThemeCss, getGoogleFontLinkUrl } from "@/lib/generate-theme-css";

const PublicFormRoute = () => {
  const loaderData = Route.useLoaderData();
  const { formId } = Route.useParams();
  const search = Route.useSearch();

  // Follow system theme live — ThemeProvider handles prefers-color-scheme changes
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("system");
    document.body.style.backgroundColor = "var(--color-background)";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [setTheme]);

  // Resolved system theme for CSS variable generation
  const resolvedTheme = useResolvedTheme();

  // Support both transparentBackground and transparent params
  const isTransparent = search.transparentBackground || search.transparent || false;

  const embedConfig: PublicFormEmbedConfig = {
    title: search.hideTitle ? "hidden" : "visible",
    background: isTransparent ? "transparent" : "solid",
    alignment: search.alignLeft ? "left" : "center",
    dynamicHeight: search.dynamicHeight,
    dynamicWidth: search.dynamicWidth,
  };

  // Override customization mode with resolved system theme so tokens match
  const rawCustomization = loaderData?.form?.customization ?? null;
  const customization = useMemo(
    () => (rawCustomization ? { ...rawCustomization, mode: resolvedTheme } : rawCustomization),
    [rawCustomization, resolvedTheme],
  );
  const themeCss = useMemo(() => generateThemeCss(customization), [customization]);
  const googleFontUrl = useMemo(() => getGoogleFontLinkUrl(customization), [customization]);

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
      />
    </>
  );
};

export const Route = createFileRoute("/forms/$formId")({
  // SSR loader - fetches form data on the server for SEO
  loader: async ({ params }) => getPublishedFormById({ data: { id: params.formId } }),
  // SEO meta tags
  head: ({ loaderData }) => ({
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
    scripts: [
      {
        // Apply system theme before paint — prevents flash
        children: `(function(){var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";d.classList.remove("light","dark");d.classList.add(m);d.style.colorScheme=m;})();`,
      },
    ],
  }),
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
