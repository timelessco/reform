import { DocxPlugin } from "@platejs/docx";
import { JuicePlugin } from "@platejs/juice";

export const DocxKit = [DocxPlugin, JuicePlugin];

export const loadDocxKit = async () => {
  const [{ DocxPlugin }, { JuicePlugin }] = await Promise.all([
    import("@platejs/docx"),
    import("@platejs/juice"),
  ]);
  return [DocxPlugin, JuicePlugin];
};
