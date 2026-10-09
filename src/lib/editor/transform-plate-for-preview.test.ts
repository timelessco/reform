import type { Value } from "platejs";
import { describe, expect, it } from "vitest";
import { getFieldsFromSegments, transformPlateForPreview } from "./transform-plate-for-preview";

describe("transformPlateForPreview - isFieldArray", () => {
  it("surfaces isFieldArray from the input node onto the field", () => {
    const value: Value = [
      { type: "formLabel", id: "lbl1", children: [{ text: "Emails" }] },
      { type: "formEmail", isFieldArray: true, children: [{ text: "" }] },
    ];

    const { steps } = transformPlateForPreview(value);
    const fields = getFieldsFromSegments(steps[0]);

    expect(fields).toHaveLength(1);
    expect(fields[0].fieldType).toBe("Email");
    expect(fields[0]).toMatchObject({ isFieldArray: true });
  });

  it("leaves isFieldArray undefined when the node lacks the flag", () => {
    const value: Value = [
      { type: "formLabel", id: "lbl2", children: [{ text: "Email" }] },
      { type: "formEmail", children: [{ text: "" }] },
    ];

    const { steps } = transformPlateForPreview(value);
    const fields = getFieldsFromSegments(steps[0]);
    expect(fields[0]).not.toHaveProperty("isFieldArray");
  });
});
