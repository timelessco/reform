import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/form-builder/')({
    validateSearch: z.object({
        demo: z.boolean().optional(),
    }),
    component: RouteComponent,
    ssr: false,
})

import { useLiveQuery, eq } from '@tanstack/react-db';
import type { Value } from 'platejs';
import { editorDocCollection } from '@/db-collections';
import { FormPreviewFromPlate } from '@/components/form-components/form-preview-from-plate';
import { CustomizeSidebar } from '@/components/ui/customize-sidebar';

const EditorApp = lazy(() => import('./-components/editor-app'));

const DOCUMENT_ID = 'main-document';


import { AppHeader } from '@/components/ui/app-header';

function RouteComponent() {
    const { demo } = Route.useSearch();

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <AppHeader />
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto relative bg-background">
                    <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading...</div>}>
                        {demo ? <PreviewMode /> : <EditorApp />}
                    </Suspense>
                </main>
                <CustomizeSidebar />
            </div>
        </div>
    );
}

/**
 * Preview mode component that renders the form from database content.
 */
function PreviewMode() {
    const { data: savedDocs } = useLiveQuery((q) =>
        q.from({ doc: editorDocCollection })
            .where(({ doc }) => eq(doc.id, DOCUMENT_ID))
    );

    const doc = savedDocs?.[0];
    const content = (doc?.content as Value) || [];

    if (!doc) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-medium mb-2">No Form Data</h2>
                    <p className="text-sm text-muted-foreground">
                        Create a form in the editor first, then preview it here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full py-12 px-4">
            <FormPreviewFromPlate
                content={content}
                title={doc.title}
                icon={doc.icon}
                cover={doc.cover}
            />
        </div>
    );
}
