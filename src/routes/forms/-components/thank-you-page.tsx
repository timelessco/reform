import { CheckCircle2Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

interface ThankYouPageProps {
  formTitle?: string;
  onSubmitAnother?: () => void;
}

const ThankYouPage = ({ formTitle, onSubmitAnother }: ThankYouPageProps) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
    <div className="max-w-md mx-auto space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle2Icon className="h-12 w-12 text-green-600" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="text-muted-foreground">Your response has been submitted successfully.</p>
      </div>

      {/* Form title context */}
      {formTitle && <p className="text-sm text-muted-foreground">Form: {formTitle}</p>}

      {/* Submit another button */}
      {onSubmitAnother && (
        <Button variant="outline" onClick={onSubmitAnother} className="mt-4">
          Submit another response
        </Button>
      )}
    </div>
  </div>
);
