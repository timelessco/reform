import { useEffect, useState, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { useLiveQuery, eq } from '@tanstack/react-db';
import { FormHeader } from '@/components/ui/form-header';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Plate, usePlateEditor } from 'platejs/react';
import { normalizeNodeId, type Value } from 'platejs';
import { editorDocCollection } from '@/db-collections';
import { useDebounce } from '@/hooks/use-debounce';

export const Route = createFileRoute('/')({ component: App })

const DOCUMENT_ID = 'main-document';

// Default content when no saved document exists
const defaultValue = normalizeNodeId([
  {
    children: [{ text: 'Basic Editor' }],
    type: 'h1',
  },
  {
    children: [{ text: 'Heading 2' }],
    type: 'h2',
  },
  {
    children: [{ text: 'Heading 3' }],
    type: 'h3',
  },
  {
    children: [{ text: 'This is a blockquote element' }],
    type: 'blockquote',
  },
  {
    children: [
      { text: 'Basic marks: ' },
      { bold: true, text: 'bold' },
      { text: ', ' },
      { italic: true, text: 'italic' },
      { text: ', ' },
      { text: 'underline', underline: true },
      { text: ', ' },
      { strikethrough: true, text: 'strikethrough' },
      { text: '.' },
    ],
    type: 'p',
  },
]);

function App() {
  // Query saved document (but don't use it reactively for editor value)
  const { data: savedDocs } = useLiveQuery((q) =>
    q.from({ doc: editorDocCollection })
      .where(({ doc }) => eq(doc.id, DOCUMENT_ID))
  );

  // Track if editor has been initialized (prevent re-init on savedDocs change)
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Create editor with delayed initialization
  const editor = usePlateEditor({
    plugins: EditorKit,
    shouldInitialize: false,
  });

  const [headerState, setHeaderState] = useState({
    title: '',
    icon: null as string | null,
    cover: null as string | null,
  });

  // Debounce the header state as well, or update immediately? 
  // For header fields, it's safer to debounce specifically or just bundle with the main save.
  // We'll update state immediately for UI, and the effect will pick it up (we need to depend on it).

  // Initialize header fields ONCE when savedDocs first loads
  useEffect(() => {
    if (initializedRef.current) return;
    if (savedDocs === undefined) return;

    initializedRef.current = true;

    const initialContent = savedDocs?.[0]?.content as Value | undefined;
    const docData = savedDocs?.[0];

    editor.tf.init({
      value: initialContent ?? defaultValue,
      autoSelect: 'end',
    });

    // Init header state
    if (docData) {
      setHeaderState({
        title: docData.title || '',
        icon: docData.icon || null,
        cover: docData.cover || null,
      });
    }

    setIsReady(true);
    console.log('Editor initialized');
  }, [savedDocs, editor]);

  // Track current value for debounced saving
  const [currentValue, setCurrentValue] = useState<Value | null>(null);
  const debouncedValue = useDebounce(currentValue, 500);
  const debouncedHeader = useDebounce(headerState, 500); // Also debounce header changes

  // Track if document has been created
  const docExistsRef = useRef(false);

  // Set docExistsRef when we first load
  useEffect(() => {
    if (savedDocs && savedDocs.length > 0) {
      docExistsRef.current = true;
    }
  }, [savedDocs]);

  // Save to TanStack DB when debounced content OR header changes
  useEffect(() => {
    // If we haven't loaded yet, don't save empty states over existing data
    if (!isReady) return;

    // Combine save logic
    if (docExistsRef.current) {
      editorDocCollection.update(DOCUMENT_ID, (draft) => {
        if (debouncedValue) draft.content = debouncedValue;

        // Always update header fields if we are ready
        draft.title = debouncedHeader.title;
        draft.icon = debouncedHeader.icon || undefined; // DB optional expects undefined over null if strictly typed, but let's see
        draft.cover = debouncedHeader.cover || undefined;

        draft.updatedAt = Date.now();
      });
    } else if (debouncedValue) {
      // Only insert if we have content? Or if we have header?
      // Usually insert happens on first edit.
      editorDocCollection.insert({
        id: DOCUMENT_ID,
        content: debouncedValue,
        title: debouncedHeader.title,
        icon: debouncedHeader.icon || undefined,
        cover: debouncedHeader.cover || undefined,
        updatedAt: Date.now(),
      });
      docExistsRef.current = true;
    }
  }, [debouncedValue, debouncedHeader, isReady]);

  if (!isReady) {
    return <div className="h-screen w-full flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="h-screen w-full overflow-y-auto">
      <FormHeader
        title={headerState.title}
        icon={headerState.icon || undefined} // Convert null to undefined for prop if needed
        cover={headerState.cover || undefined}
        onTitleChange={(t) => setHeaderState(prev => ({ ...prev, title: t }))}
        onIconChange={(i) => setHeaderState(prev => ({ ...prev, icon: i }))}
        onCoverChange={(c) => setHeaderState(prev => ({ ...prev, cover: c }))}
      />
      <Plate
        editor={editor}
        onChange={({ value }) => {
          setCurrentValue(value);
        }}
      >
        <EditorContainer variant="default" className="px-14 max-w-[900px] mx-auto border-none shadow-none">
          <Editor />
        </EditorContainer>
      </Plate>
      <Toaster />
    </div>
  )
}

