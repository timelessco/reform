import { useState, useCallback } from "react";
import type { Value } from "platejs";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { ThankYouPage } from "./thank-you-page";
import { createPublicSubmission } from "@/lib/fn/public";
import { toast } from "sonner";
import { FileQuestion, Lock } from "lucide-react";

interface PublicForm {
	id: string;
	title: string;
	content: any;
	icon: string | null;
	cover: string | null;
	status: string;
}

interface PublicFormPageProps {
	form: PublicForm | null;
	error: "not_found" | null;
	formId: string;
}

function FormNotFound() {
	return (
		<div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
			<div className="max-w-md mx-auto space-y-6">
				<div className="flex justify-center">
					<div className="rounded-full bg-muted p-3">
						<FileQuestion className="h-12 w-12 text-muted-foreground" />
					</div>
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">
						Form not found
					</h1>
					<p className="text-muted-foreground">
						This form doesn't exist or is no longer available.
					</p>
				</div>
			</div>
		</div>
	);
}

function FormNotPublished() {
	return (
		<div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
			<div className="max-w-md mx-auto space-y-6">
				<div className="flex justify-center">
					<div className="rounded-full bg-muted p-3">
						<Lock className="h-12 w-12 text-muted-foreground" />
					</div>
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">
						Form not available
					</h1>
					<p className="text-muted-foreground">
						This form is not currently accepting responses.
					</p>
				</div>
			</div>
		</div>
	);
}

export function PublicFormPage({ form, error, formId }: PublicFormPageProps) {
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = useCallback(
		async (values: Record<string, any>) => {
			try {
				await createPublicSubmission({
					data: {
						formId,
						data: values,
						isCompleted: true,
					},
				});
				setIsSubmitted(true);
			} catch (err) {
				console.error("Submission error:", err);
				toast.error("Failed to submit form. Please try again.");
				throw err; // Re-throw so the form knows it failed
			}
		},
		[formId],
	);

	const handleSubmitAnother = useCallback(() => {
		setIsSubmitted(false);
	}, []);

	// Handle error states
	if (error === "not_found" || !form) {
		return <FormNotFound />;
	}

	// Handle non-published status (shouldn't happen with SSR, but defensive)
	if (form.status !== "published") {
		return <FormNotPublished />;
	}

	// Show thank you page after successful submission
	if (isSubmitted) {
		return (
			<ThankYouPage
				formTitle={form.title}
				onSubmitAnother={handleSubmitAnother}
			/>
		);
	}

	// Render the form
	return (
		<div className="min-h-screen py-8 px-4">
			<FormPreviewFromPlate
				content={form.content as Value}
				title={form.title}
				icon={form.icon ?? undefined}
				cover={form.cover ?? undefined}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
