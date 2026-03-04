import { ChevronDown } from "lucide-react";
import * as React from "react";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex flex-col border-b border-foreground/5 last:border-0">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-start justify-between py-3 h-auto w-full px-0 group hover:text-foreground hover:bg-transparent"
        aria-expanded={isOpen}
      >
        <span className="text-[13px] text-muted-foreground group-hover:text-foreground font-normal pr-4 leading-snug text-left whitespace-normal flex-1">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground/30 group-hover:text-foreground transition-transform duration-200 shrink-0 mt-1",
            isOpen && "rotate-180 text-foreground",
          )}
        />
      </Button>
      {isOpen && (
        <div className="pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[12px] text-muted-foreground/80 leading-relaxed pl-1 border-l border-foreground/5 ml-1">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Button
      variant="secondary"
      className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-full text-[14px] font-bold hover:bg-secondary/40 border border-foreground/5"
    >
      {icon}
      {label}
    </Button>
  );
}

export function RightSidebar() {
  return (
    <aside className="flex w-80 flex-col bg-background p-8 select-none shrink-0 overflow-y-auto max-h-[calc(100vh-2.5rem)]">
      <div className="mb-12">
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
            question={`Does Agentation support multi-step forms like ${APP_NAME} or Typeform?`}
            answer="Yes, you can add 'Page' blocks to create immersive multi-step experiences with conditional logic support coming soon."
          />
        </div>
      </div>

      <div className="bg-foreground text-background p-6 rounded-3xl mb-12">
        <h3 className="text-[15px] font-bold mb-6 text-center leading-tight">
          Subscribe to our product updates & news:
        </h3>
        <div className="space-y-3">
          <SocialButton label="Threads" icon={<span className="text-lg">@</span>} />
          <SocialButton label="x.com" icon={<span className="font-serif italic text-lg">X</span>} />
        </div>
      </div>

      <nav aria-label="Sidebar links" className="mt-auto grid grid-cols-2 gap-y-3 gap-x-4">
        <FooterLink label="Features" />
        <FooterLink label="Printable" />
        <FooterLink label="Workflow" />
        <FooterLink label="Pricing" />
        <FooterLink label="Privacy Policy" />
        <FooterLink label="Terms of Use" />
      </nav>
    </aside>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <Button
      variant="link"
      className="text-[14px] font-medium text-muted-foreground hover:text-foreground p-0 h-auto"
    >
      {label}
    </Button>
  );
}
