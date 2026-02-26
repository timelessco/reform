// Pure data factory — no Plate.js dependencies

export interface FormHeaderElementData {
  type: "formHeader";
  id?: string;
  title: string;
  icon: string | null;
  cover: string | null;
  children: [{ text: "" }];
}

export function createFormHeaderNode(
  data: Partial<Omit<FormHeaderElementData, "type" | "children">> = {},
): FormHeaderElementData {
  return {
    type: "formHeader",
    title: data.title ?? "",
    icon: data.icon ?? null,
    cover: data.cover ?? null,
    children: [{ text: "" }],
  };
}
