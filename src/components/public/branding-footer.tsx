import { useTranslation } from "@/contexts/translation-context";
import { APP_NAME, APP_WEBSITE_URL } from "@/lib/app-config";

export function BrandingFooter() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-4 mt-8 text-sm text-muted-foreground">
      {t("poweredBy")}{" "}
      <a
        href={APP_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground transition-colors"
      >
        {APP_NAME}
      </a>
    </div>
  );
}
