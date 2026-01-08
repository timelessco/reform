import { createFileRoute } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Plate, usePlateEditor } from 'platejs/react';

export const Route = createFileRoute('/')({ component: App })

function App() {
    const editor = usePlateEditor({
    plugins: EditorKit,
   });


  return (
    <div className="h-screen w-full">
    <Plate editor={editor}>
      <EditorContainer variant="default">
        <Editor />
      </EditorContainer>
    </Plate>
    <Toaster />
  </div>
  )
}
