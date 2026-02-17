import { Ban } from "lucide-react";

interface FormClosedProps {
  message?: string | null;
}

export function FormClosed({ message }: FormClosedProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-3">
            <Ban className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Form closed</h1>
          <p className="text-muted-foreground">
            {message || "This form is no longer accepting responses."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AlreadySubmitted() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-3">
            <Ban className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Already submitted</h1>
          <p className="text-muted-foreground">
            You have already submitted this form. Each person can only submit once.
          </p>
        </div>
      </div>
    </div>
  );
}
