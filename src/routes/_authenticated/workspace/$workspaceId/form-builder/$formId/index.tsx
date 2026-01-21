import { ClientOnly } from "@/components/client-only";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { PreviewMode } from "../-components/preview-mode";
import { lazy } from "react";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";

const EditorApp = lazy(
    () => import("@/routes/_authenticated/workspace/$workspaceId/form-builder/-components/editor-app"),
);

export const Route = createFileRoute(
    "/_authenticated/workspace/$workspaceId/form-builder/$formId/",
)({
    component: DesignPage,
    loader: async ({ context, params }) => {
        const data = await context.queryClient.ensureQueryData({
            ...getFormbyIdQueryOption(params.formId),
            revalidateIfStale: true,
        })
        return { initialContent: data.form.content }
    }
});

function DesignPage() {
    const { workspaceId, formId } = Route.useParams();
    const loaderData = Route.useLoaderData();
    const initialContent = loaderData?.initialContent || [];
    const search: any = useSearch({ strict: false });
    const demo = search.demo;

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <main className="flex-1 overflow-auto relative bg-background">
                <ClientOnly
                    fallback={
                        <div className="h-full w-full flex items-center justify-center">
                            Loading...
                        </div>
                    }
                >
                    {demo ? (
                        <PreviewMode formId={formId} workspaceId={workspaceId} />
                    ) : (
                        <EditorApp formId={formId} workspaceId={workspaceId} defaultValue={initialContent} />
                    )}
                </ClientOnly>
            </main>
            <CustomizeSidebar />
        </div>
    );
}
