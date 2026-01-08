import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const EditorApp = lazy(() => import('./-components/editor-app'));

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    demo: z.boolean().optional(),
  }),
  ssr: false,
  component: App
})

function App() {
  const { demo } = Route.useSearch();
  console.log(demo, 'demo')
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading editor...</div>}>
      {demo ? <div>
        <h1>demo</h1>
      </div> : <EditorApp />}
    </Suspense>
  );
}
