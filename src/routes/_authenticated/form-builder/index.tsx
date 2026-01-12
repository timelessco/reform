import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/form-builder/")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard" });
	},
	component: () => null,
});
