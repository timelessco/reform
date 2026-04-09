import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
  <Accordion>
    <AccordionItem className="border-b border-foreground/5 last:border-0">
      <AccordionTrigger className="text-[13px] text-muted-foreground group-hover:text-foreground font-normal py-3 px-0 hover:no-underline [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground/30 [&>svg]:hover:text-foreground">
        {question}
      </AccordionTrigger>
      <AccordionContent className="text-[12px] text-muted-foreground/80 pl-1 border-l border-foreground/5 ml-1">
        {answer}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
