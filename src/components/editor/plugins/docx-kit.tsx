import { DocxPlugin } from "@platejs/docx";
import { JuicePlugin } from "@platejs/juice";

export const DocxKit = [DocxPlugin, JuicePlugin];

export const loadDocxKit = async () => {
  const [{ DocxPlugin: LoadedDocxPlugin }, { JuicePlugin: LoadedJuicePlugin }] = await Promise.all([
    import("@platejs/docx"),
    import("@platejs/juice"),
  ]);
  return [LoadedDocxPlugin, LoadedJuicePlugin];
};
