import { Button } from "@/components/ui/button";
import { ChevronDownIcon, MoreHorizontalIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useState } from "react";

/** Collapsible sidebar section with label, chevron, and optional action (Figma system-flat). */
export function SidebarSection({
	label,
	children,
	action,
	initialOpen = true,
	className,
}: {
	label: string;
	children: React.ReactNode;
	action?: React.ReactNode;
	initialOpen?: boolean;
	className?: string;
}) {
	const [isOpen, setIsOpen] = useState(initialOpen);

	return (
		<div className="flex flex-col">
			<div className={cn("group h-7 flex items-center justify-between gap-1 px-1 py-1.5 rounded-lg overflow-hidden transition-colors", className)}>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-1 h-auto p-0 cursor-pointer flex-1 min-w-0 justify-start bg-transparent border-none"
					aria-expanded={isOpen}
				>
					<span className="text-[13px] font-medium text-muted-foreground truncate leading-[1.15] tracking-[0.26px] font-case">
						{label}
					</span>
					<ChevronDownIcon
						className={cn(
							"h-2.5 w-2.5 shrink-0 text-muted-foreground transition-transform duration-200",
							!isOpen && "-rotate-90",
						)}
						strokeWidth={2}
					/>
				</button>

				<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
					{action ?? (
						<Button
							variant="ghost"
							className="size-[26px] p-[5px] rounded-lg overflow-hidden hover:bg-sidebar-active text-muted-foreground hover:text-foreground"
						>
							<MoreHorizontalIcon className="size-4" />
						</Button>
					)}
				</div>
			</div>

			{isOpen && <div className={cn("flex flex-col", className)}>{children}</div>}
		</div>
	);
}
