import { createPlatePlugin } from "platejs/react";
import type { RenderNodeWrapper } from "platejs/react";

import { cn } from "@/lib/utils";

export type AIDiffMark = "insert" | "remove";

// Element-level marker read by diff wrapper. AI-gen hook stamps it post-stream for the red/green accept/discard preview.
export const AI_DIFF_KEY = "aiDiff" as const;

const renderDiffWrapper: RenderNodeWrapper = ({ element }) => {
  const mark = element.aiDiff;

  if (mark !== "insert" && mark !== "remove") return;

  return ({ children }) => (
    <div
      data-ai-diff={mark}
      className={cn(
        "rounded-sm",
        mark === "insert" && "bg-(--color-success-soft)/70 ring-1 ring-(--color-success)/80",
        mark === "remove" && "bg-destructive/10 opacity-80 ring-1 ring-destructive/20",
      )}
    >
      {children}
    </div>
  );
};

export const AIDiffPlugin = createPlatePlugin({
  key: "ai_diff",
  render: { aboveNodes: renderDiffWrapper },
});

export const AIDiffKit = [AIDiffPlugin];
