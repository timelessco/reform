import { useTranslation } from "@/contexts/translation-context";

export function BrandingFooter() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-4 mt-8 text-sm text-muted-foreground">
      {t("poweredBy")}{" "}
      <a
        href="https://betterforms.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground transition-colors"
      >
        BetterForms
      </a>
    </div>
  );
}
