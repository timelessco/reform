import { cn } from "@/lib/utils";

export const AspectRatio = ({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) => (
  <div
    data-slot="aspect-ratio"
    style={
      // SAFETY: React's closed CSSProperties type omits custom properties; the runtime accepts any "--" prefixed declaration
      {
        "--ratio": ratio,
      } as React.CSSProperties
    }
    className={cn("relative aspect-(--ratio)", className)}
    {...props}
  />
);
