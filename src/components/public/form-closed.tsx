import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useTranslation } from "@/contexts/translation-context";
import { BanIcon } from "@/components/ui/icons";

interface FormClosedProps {
  message?: string | null;
}

export function FormClosed({ message }: FormClosedProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BanIcon />
          </EmptyMedia>
          <EmptyTitle>{t("formClosed")}</EmptyTitle>
          <EmptyDescription>{message || t("formClosedDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function AlreadySubmitted() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BanIcon />
          </EmptyMedia>
          <EmptyTitle>{t("alreadySubmitted")}</EmptyTitle>
          <EmptyDescription>{t("alreadySubmittedDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
