import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId/summary",
)({
	component: SummaryPage,
});

function SummaryPage() {
	const { workspaceId, formId } = Route.useParams();

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
			<div className="mb-6 flex flex-col items-center">
				<div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mb-6">
					<Inbox
						className="w-8 h-8 text-muted-foreground/40"
						strokeWidth={1.5}
					/>
				</div>

				<h2 className="text-xl font-semibold text-foreground mb-2">
					No completed submissions yet
				</h2>

				<p className="text-muted-foreground/60 max-w-sm mb-8">
					Your form is published and ready to be shared with the world!
				</p>

				<Link
					to="/workspace/$workspaceId/form-builder/$formId/share"
					params={{ workspaceId, formId }}
				>
					<Button>Share</Button>
				</Link>
			</div>
		</div>
	);
}
