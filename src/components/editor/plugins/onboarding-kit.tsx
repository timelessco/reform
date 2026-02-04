import { createPlatePlugin } from "platejs/react";
import { OnboardingContentElement } from "@/components/ui/onboarding-content-node";

export const OnboardingPlugin = createPlatePlugin({
  key: "onboardingContent",
  node: {
    isElement: true,
    isVoid: true,
    isSelectable: false,
    component: OnboardingContentElement,
  },
});

export const OnboardingKit = [OnboardingPlugin];
