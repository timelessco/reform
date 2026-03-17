import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="skeleton"
    className={cn("bg-muted rounded-md animate-pulse", className)}
    {...props}
  />
);
