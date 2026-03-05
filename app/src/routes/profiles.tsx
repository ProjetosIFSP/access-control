import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profiles")({
	beforeLoad: () => {
		// Profiles were merged into the users page under a tab
		throw redirect({
			to: "/users",
			search: { q: undefined, tab: "profiles" as const },
		});
	},
	component: () => null,
});
