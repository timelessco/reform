type EditorDraftSnapshot = {
  content: unknown[];
  title: string;
  capturedAt: number;
};

const editorDraftSnapshots = new Map<string, EditorDraftSnapshot>();

export function setEditorDraftSnapshot(
  formId: string,
  snapshot: { content: unknown[]; title: string },
) {
  editorDraftSnapshots.set(formId, {
    content: snapshot.content,
    title: snapshot.title,
    capturedAt: Date.now(),
  });
}

export function getEditorDraftSnapshot(formId: string) {
  return editorDraftSnapshots.get(formId);
}

export function clearEditorDraftSnapshot(formId: string) {
  editorDraftSnapshots.delete(formId);
}
