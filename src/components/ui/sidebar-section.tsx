import { Button } from "@/components/ui/button";
import { ChevronDownIcon, MoreHorizontalIcon } from "@/components/ui/sidebar-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";

/** Collapsible sidebar section with label, chevron, and optional action (Figma system-flat). */
export function SidebarSection({
	label,
	children,
	action,
	initialOpen = true,
}: {
	label: string;
	children: React.ReactNode;
	action?: React.ReactNode;
	initialOpen?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(initialOpen);

	return (
		<div className="flex flex-col">
			<div className="group flex items-center justify-between px-1 py-[7px] transition-colors">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-1 h-auto p-0 cursor-pointer flex-1 min-w-0 justify-start bg-transparent border-none"
					aria-expanded={isOpen}
				>
					<span className="text-[13px] font-medium text-muted-foreground tracking-[0.26px] truncate">
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

				<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
					{action ?? (
						<Button
							variant="ghost"
							size="icon-sm"
							className="h-[26px] w-[26px] hover:bg-sidebar-active text-muted-foreground hover:text-foreground"
						>
							<MoreHorizontalIcon className="h-4 w-4" strokeWidth={1.5} />
						</Button>
					)}
				</div>
			</div>

			{isOpen && <div className="flex flex-col">{children}</div>}
		</div>
	);
}
