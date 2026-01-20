import { createFileRoute } from "@tanstack/react-router";
import { getPublishedFormById } from "@/lib/fn/public";
import { PublicFormPage } from "@/components/public/public-form-page";

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
});

function PublicFormRoute() {
	const loaderData = Route.useLoaderData();
	const { formId } = Route.useParams();

	return (
		<PublicFormPage
			form={loaderData?.form ?? null}
			error={loaderData?.error ?? null}
			formId={formId}
		/>
	);
}
