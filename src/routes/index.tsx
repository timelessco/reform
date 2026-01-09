import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useLiveQuery, eq } from '@tanstack/react-db';
import { z } from 'zod';
import type { Value } from 'platejs';
import { editorDocCollection } from '@/db-collections';
import { FormPreviewFromPlate } from '@/components/form-components/form-preview-from-plate';

const EditorApp = lazy(() => import('./-components/editor-app'));

const DOCUMENT_ID = 'main-document';

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    demo: z.boolean().optional(),
  }),
  ssr: false,
  component: App
})

function App() {
  const { demo } = Route.useSearch();

  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      {demo ? <PreviewMode /> : <EditorApp />}
    </Suspense>
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

