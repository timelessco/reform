import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { getPublishedFormById } from "@/lib/fn/public";

export const Route = createFileRoute("/forms/$formId")({
  // SSR loader - fetches form data on the server for SEO
  loader: async ({ params }) => {
    // ISOmorpci
    return getPublishedFormById({ data: { id: params.formId } });
  },
  // SEO meta tags
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.form?.title
          ? `${loaderData.form.title} | Better Forms`
          : "Form | Better Forms",
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
        // Inline script to force light theme before paint — prevents dark mode flash
        children: `document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");`,
      },
    ],
  }),
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  validateSearch: z.object({
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
  }),
});
