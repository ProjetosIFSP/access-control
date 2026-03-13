import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Root } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

// Handler roda apenas no servidor — compilador substitui por RPC stub no cliente
const fetchPageTree = createServerFn({ method: "GET" }).handler(async () => {
	const { source } = await import("../../../lib/source");
	return JSON.stringify(source.pageTree);
});

export const Route = createFileRoute("/docs")({
	loader: async (): Promise<Root> =>
		JSON.parse((await fetchPageTree()) as string),
	component: DocsLayoutComponent,
});

function DocsLayoutComponent() {
	const pageTree = Route.useLoaderData() as Root;

	return (
		<RootProvider>
			<DocsLayout
				tree={pageTree}
				nav={{
					title: "Controle de Acesso IoT",
					// url raiz da documentação
					url: "/docs",
				}}
				links={[
					{
						type: "main",
						text: "← Portal",
						url: "/",
					},
				]}
				sidebar={{
					// Permite colapsar a sidebar no desktop
					collapsible: true,
				}}
			>
				<Outlet />
			</DocsLayout>
		</RootProvider>
	);
}
