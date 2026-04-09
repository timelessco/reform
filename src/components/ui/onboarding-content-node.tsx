import { APP_NAME } from "@/lib/config/app-config";
import { Calculator, MessageSquare, MousePointer2, Split, Zap } from "lucide-react";
import {
  CreditCardIcon,
  EyeOffLucideIcon,
  FileTextIcon,
  HelpCircleIcon,
  LayoutIcon,
  LinkIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface OnboardingContentElementData {
  type: "onboardingContent";
  children: [{ text: "" }];
}

export const createOnboardingContentNode = (): OnboardingContentElementData => ({
  type: "onboardingContent",
  children: [{ text: "" }],
});

const OnboardingItem = ({
  icon: Icon,
  label,
  href = "#",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
}) => (
  <a
    href={href}
    className="flex items-center gap-3 text-muted-foreground/70 hover:text-foreground transition-colors group text-sm py-0.5"
  >
    <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
    <span>{label}</span>
  </a>
);

export const OnboardingContentElement = (props: PlateElementProps) => {
  const { children } = props;
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  return (
    <PlateElement {...props}>
      <div contentEditable={false} className="select-none">
        <div className="max-w-[700px] mx-auto pt-8 pb-16 px-4 sm:px-16">
          {/* Landing Hero Section */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border text-sm text-muted-foreground mb-4">
              <SparklesIcon className="h-4 w-4" />
              <span>The next generation of forms</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Beautiful forms, building itself.
            </h2>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-muted-foreground/60 text-lg">
                <FileTextIcon className="h-5 w-5" />
                <span>
                  Press <span className="text-foreground/80">Enter</span> to start from scratch
                </span>
              </div>

              <Button
                variant="outline"
                className="w-fit h-10 px-4 gap-2 text-muted-foreground border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50 rounded-lg shadow-sm"
                onClick={() => setTemplateModalOpen(true)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <LayoutIcon className="h-4 w-4" />
                Use a template
              </Button>
            </div>

            <div className="py-6 space-y-1">
              <p className="text-lg text-muted-foreground/80">
                {APP_NAME} is a form builder that{" "}
                <span className="text-fuchsia-500 font-semibold px-1">works like a doc</span>.
              </p>
              <p className="text-lg text-muted-foreground/80">
                Just type{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                  /
                </code>
                to insert form blocks and{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-fuchsia-500">
                  @
                </code>
                to mention question answers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-16 pt-8">
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-foreground tracking-wider uppercase">
                  Get started
                </h3>
                <div className="flex flex-col gap-3">
                  <OnboardingItem icon={MousePointer2} label="Create your first form" />
                  <OnboardingItem icon={LayoutIcon} label="Get started with templates" />
                  <OnboardingItem icon={LinkIcon} label="Embed your form" />
                  <OnboardingItem icon={HelpCircleIcon} label="Help center" />
                  <OnboardingItem icon={Zap} label={`Learn about ${APP_NAME} Pro`} />
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-sm font-bold text-foreground tracking-wider uppercase">
                  How-to guides
                </h3>
                <div className="flex flex-col gap-3">
                  <OnboardingItem icon={Split} label="Conditional logic" />
                  <OnboardingItem icon={Calculator} label="Calculator" />
                  <OnboardingItem icon={EyeOffLucideIcon} label="Hidden fields" />
                  <OnboardingItem icon={MessageSquare} label="Mentions" />
                  <OnboardingItem icon={CreditCardIcon} label="Collect payments" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <LayoutIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Coming soon</p>
            <p className="text-sm mt-2">We're working on some great templates for you.</p>
          </div>
        </DialogContent>
      </Dialog>

      {children}
    </PlateElement>
  );
};
