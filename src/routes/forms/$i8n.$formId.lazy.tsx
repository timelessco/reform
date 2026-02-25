import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicFormPage } from "@/components/public/public-form-page";

export const Route = createLazyFileRoute("/forms/$i8n/$formId")({
  component: PublicFormRoute,
});

function PublicFormRoute() {
  const loaderData = Route.useLoaderData();
  const { formId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
  }, []);

  const isTransparent = search.transparentBackground || search.transparent || false;

  return (
    <PublicFormPage
      form={loaderData?.form ?? null}
      error={loaderData?.error ?? null}
      gated={loaderData?.gated ?? null}
      formId={formId}
      transparentBackground={isTransparent}
      isPopup={search.popup}
      hideTitle={search.hideTitle}
      alignLeft={search.alignLeft}
      dynamicHeight={search.dynamicHeight}
    />
  );
}
