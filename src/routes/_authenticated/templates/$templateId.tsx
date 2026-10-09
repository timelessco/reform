import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { NotFound } from "@/components/ui/not-found";
import { buildTemplateContent, findTemplateMeta } from "@/lib/form-templates";
import type { FormTemplateId } from "@/lib/form-templates";
import { buildPublicFormSettings } from "@/types/form-settings";

const noop = async () => {};

const PREVIEW_SETTINGS = buildPublicFormSettings(undefined);

const TemplatePreviewPage = () => {
  const { templateId } = Route.useParams();
  const template = findTemplateMeta(templateId);

  const content = useMemo(
    () => (template ? buildTemplateContent(template.id as FormTemplateId) : []),
    [template],
  );

  if (!template) return <NotFound />;

  // Figma 27189:13092 — full-bleed preview (no right rail). Header owns breadcrumb + Use Template.
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <div className="pb-16">
          <FormPreviewFromPlate
            content={content}
            title={template.label}
            onSubmit={noop}
            settings={PREVIEW_SETTINGS}
            layout="public"
            boundToParent
          />
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/templates/$templateId")({
  loader: ({ params }) => {
    if (!findTemplateMeta(params.templateId)) throw notFound();
  },
  component: TemplatePreviewPage,
  notFoundComponent: NotFound,
});
