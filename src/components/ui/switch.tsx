import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-5 data-[size=default]:w-[32px] data-[size=default]:p-[3px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-[size=sm]:p-px dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-[var(--color-gray-300)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-2.5 rtl:group-data-[size=default]/switch:data-checked:-translate-x-2.5 group-data-[size=sm]/switch:data-checked:translate-x-2 rtl:group-data-[size=sm]/switch:data-checked:-translate-x-2 group-data-[size=default]/switch:data-unchecked:translate-x-0 rtl:group-data-[size=default]/switch:data-unchecked:-translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 rtl:group-data-[size=sm]/switch:data-unchecked:-translate-x-0 data-checked:bg-primary-foreground data-unchecked:bg-background shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.12)]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
