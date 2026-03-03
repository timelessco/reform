import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAQItem } from "@/components/footer";

interface AboutSidebarProps {
  onClose: () => void;
}

export function AboutSidebar({ onClose }: AboutSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-background animate-in slide-in-from-right duration-300 ease-in-out">
      <div className="flex h-10 items-center justify-between border-b border-border/40 px-3 shrink-0">
        <span className="text-[13px] font-medium">About</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-6">Got questions?</h2>
        <div className="flex flex-col">
          <FAQItem
            question="How do I embed my form in a Notion page?"
            answer="Simply copy the share link and paste it into any Notion block. Select 'Create Embed' from the menu to instantly render your form inside Notion."
          />
          <FAQItem
            question="Is Agentation a complete alternative to Google Forms?"
            answer="Yes, and more. We offer advanced Notion-like blocks, AI generation, and a much cleaner aesthetic for modern workflows."
          />
          <FAQItem
            question="Can I use AI to generate form blocks automatically?"
            answer="Absolutely. Just type '/ai' in the editor followed by your prompt, and our engine will draft fields and questions for you."
          />
          <FAQItem
            question="How can I better organize my forms into workspaces?"
            answer="Workspaces allow you to group forms by project or team. You can switch between them using the workspace selector in the head margin."
          />
          <FAQItem
            question="Does Agentation support multi-step forms like BetterForms or Typeform?"
            answer="Yes, you can add 'Page' blocks to create immersive multi-step experiences with conditional logic support coming soon."
          />
        </div>
      </div>
    </div>
  );
}
