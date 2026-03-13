import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Root } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";

// Handler roda apenas no servidor — compilador substitui por RPC stub no cliente
const fetchPageTree = createServerFn({ method: "GET" }).handler(async () => {
	const { source } = await import("../../../lib/source");
	return JSON.stringify(source.pageTree);
});

export const Route = createFileRoute("/docs")({
	loader: async () => JSON.parse((await fetchPageTree()) as string),
	component: DocsLayoutComponent,
	// Exibido enquanto o loader do pageTree ainda não resolveu
	pendingComponent: DocsPending,
	// Captura erros de hydration / re-otimização do Vite antes de chegarem ao __root__
	errorComponent: DocsError,
});

function DocsLayoutComponent() {
	const pageTree = Route.useLoaderData() as Root;

	return (
		<RootProvider
			i18n={{
				locale: "pt-BR",
				translations: {
					toc: "Nesta página",
				},
			}}
		>
			<DocsLayout
				tree={pageTree}
				nav={{
					component: <Header docsMode />,
					// url raiz da documentação
					url: "/docs",
				}}
				searchToggle={{
					enabled: false,
				}}
				themeSwitch={{
					enabled: false,
				}}
				sidebar={{
					// O controle de collapse fica no Header personalizado
					collapsible: false,
				}}
			>
				<Outlet />
			</DocsLayout>
		</RootProvider>
	);
}

function DocsPending() {
	return (
		<div className="flex min-h-dvh items-center justify-center">
			<Loader2 className="size-6 animate-spin text-muted-foreground" />
		</div>
	);
}

function DocsError({ error }: { error: unknown }) {
	const isDev = import.meta.env.DEV;
	const message =
		error instanceof Error ? error.message : "Erro ao carregar a documentação.";

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
			<p className="text-sm text-muted-foreground">
				{isDev ? message : "Erro ao carregar a documentação."}
			</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium transition hover:bg-muted"
			>
				Recarregar
			</button>
		</div>
	);
}
