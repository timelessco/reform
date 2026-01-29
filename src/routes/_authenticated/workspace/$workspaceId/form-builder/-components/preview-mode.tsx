import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { Button } from "@/components/ui/button";
import { useForm } from "@/hooks/use-live-hooks";
import { logger } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { Value } from "platejs";

export function PreviewMode({
	formId,
	workspaceId,
}: {
	formId: string;
	workspaceId: string;
}) {
	const { data: savedDocs, isLoading } = useForm(formId);
	const doc = savedDocs?.[0];
	const content = (doc?.content as Value) || [];
	logger(savedDocs, "data");

	if (!isLoading && savedDocs !== undefined && savedDocs.length === 0) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-lg font-medium mb-2">Form Not Found</h2>
					<p className="text-sm text-muted-foreground mb-4">
						This form does not exist or has been deleted.
					</p>
					<Link to="/workspace/$workspaceId" params={{ workspaceId }}>
						<Button>Back to Workspace</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (isLoading || !doc) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				Loading...
			</div>
		);
	}

	return (
		<div className="min-h-full w-full py-12 px-4">
			<FormPreviewFromPlate
				content={content}
				title={doc.title}
				icon={doc.icon ?? undefined}
				cover={doc.cover ?? undefined}
			/>
		</div>
	);
}
