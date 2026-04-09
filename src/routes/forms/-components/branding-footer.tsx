import { SparklesIcon } from "@/components/ui/icons";
import { APP_NAME, APP_WEBSITE_URL } from "@/lib/config/app-config";

export const BrandingFooter = () => (
  <div className="fixed bottom-0 left-0 right-0 z-50 py-3 flex justify-center bg-muted/60 backdrop-blur border-t border-border">
    <a
      href={APP_WEBSITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>Made with</span>
      <SparklesIcon className="h-3 w-3 fill-muted-foreground text-muted-foreground" />
      <span className="text-foreground">{APP_NAME}</span>
    </a>
  </div>
);
