import { createFileRoute } from "@tanstack/react-router";
import { getPublishedFormById } from "@/lib/fn/public";
import { PublicFormPage } from "@/components/public/public-form-page";
import z from "zod";

export const Route = createFileRoute("/forms/$formId")({
	// SSR loader - fetches form data on the server for SEO
	loader: async ({ params }) => {
		return getPublishedFormById({ data: { id: params.formId } });
	},
	// SEO meta tags
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.form?.title
					? `${loaderData.form.title} | Better Forms`
					: "Form | Better Forms",
			},
			{
				name: "description",
				content: loaderData?.form?.title
					? `Fill out ${loaderData.form.title}`
					: "Fill out this form",
			},
		],
	}),
	component: PublicFormRoute,
	validateSearch: z.object({
		// Transparent background for iframe embeds
		transparentBackground: z.boolean().optional().default(false),
		transparent: z.coerce.boolean().optional(), // Alias for transparentBackground
		// Popup mode (embedded via popup.js)
		popup: z.coerce.boolean().optional().default(false),
		// Hide form title in popup
		hideTitle: z.coerce.boolean().optional().default(false),
		// Align form content to the left
		alignLeft: z.coerce.boolean().optional().default(false),
		// Origin page for tracking
		originPage: z.string().optional(),
	}),
});

function PublicFormRoute() {
	const loaderData = Route.useLoaderData();
	const { formId } = Route.useParams();
	const search = Route.useSearch();

	// Support both transparentBackground and transparent params
	const isTransparent = search.transparentBackground || search.transparent || false;

	return (
		<PublicFormPage
			form={loaderData?.form ?? null}
			error={loaderData?.error ?? null}
			formId={formId}
			transparentBackground={isTransparent}
			isPopup={search.popup}
			hideTitle={search.hideTitle}
			alignLeft={search.alignLeft}
		/>
	);
}
