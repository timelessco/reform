import { KEYS } from "platejs";
import { createPlatePlugin } from "platejs/react";
import * as React from "react";

const LazyEquationElement = React.lazy(() =>
  import("@/components/ui/equation-node").then((mod) => ({
    default: mod.EquationElement,
  })),
);
const LazyInlineEquationElement = React.lazy(() =>
  import("@/components/ui/equation-node").then((mod) => ({
    default: mod.InlineEquationElement,
  })),
);

// eslint-disable-next-line typescript-eslint/no-explicit-any
const EquationElementLazy = (props: any) => (
  <React.Suspense fallback={<div className="my-1 p-3 bg-muted rounded-sm animate-pulse" />}>
    <LazyEquationElement {...props} />
  </React.Suspense>
);
// eslint-disable-next-line typescript-eslint/no-explicit-any
const InlineEquationElementLazy = (props: any) => (
  <React.Suspense
    fallback={<span className="inline-block mx-1 w-16 h-5 bg-muted rounded-sm animate-pulse" />}
  >
    <LazyInlineEquationElement {...props} />
  </React.Suspense>
);

const LightEquationPlugin = createPlatePlugin({
  key: KEYS.equation,
  node: { isElement: true, isVoid: true },
}).withComponent(EquationElementLazy);

const LightInlineEquationPlugin = createPlatePlugin({
  key: KEYS.inlineEquation,
  node: { isElement: true, isInline: true, isVoid: true },
}).withComponent(InlineEquationElementLazy);

export const MathKit = [LightInlineEquationPlugin, LightEquationPlugin];
