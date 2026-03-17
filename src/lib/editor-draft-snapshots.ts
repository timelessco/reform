type EditorDraftSnapshot = {
  content: unknown[];
  title: string;
  capturedAt: number;
};

const editorDraftSnapshots = new Map<string, EditorDraftSnapshot>();

export const setEditorDraftSnapshot = (
  formId: string,
  snapshot: { content: unknown[]; title: string },
) => {
  editorDraftSnapshots.set(formId, {
    content: snapshot.content,
    title: snapshot.title,
    capturedAt: Date.now(),
  });
};

export const getEditorDraftSnapshot = (formId: string) => editorDraftSnapshots.get(formId);

export const clearEditorDraftSnapshot = (formId: string) => {
  editorDraftSnapshots.delete(formId);
};
