interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const percentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Form progress"
    >
      <div
        // Always a colored bar. Uses the form accent (--bf-primary, set inside .bf-themed), or
        // brand blue when unthemed. Not bg-primary, which goes monochrome (black/white) unthemed.
        style={{ "--progress": `${percentage}%` } as React.CSSProperties}
        // oxlint-disable-next-line shadcn/no-arbitrary-values -- width-only transition; transition-all would also animate background
        className="h-full w-[var(--progress)] bg-(--bf-primary,#2563eb) transition-[width] duration-300 ease-out"
      />
    </div>
  );
};
