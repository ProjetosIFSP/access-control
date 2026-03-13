import browserCollections from "@collections/browser";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { TOCItemType } from "fumadocs-core/toc";
import defaultMdxComponents from "fumadocs-ui/mdx";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import type { MDXComponents } from "mdx/types";
import { Suspense, use } from "react";

// ─── tipos ───────────────────────────────────────────────────────────────────

type DocsPageMeta = {
	title: string;
	description: string | null;
	full: boolean;
	mdxPath: string;
};

type MdxModule = {
	default: React.FC<{ components?: MDXComponents }>;
	toc: TOCItemType[];
};

// ─── server function ─────────────────────────────────────────────────────────

const fetchPageMeta = createServerFn({ method: "GET" }).handler(
	async (ctx): Promise<DocsPageMeta | null> => {
		const { source } = await import("../../../lib/source");
		const rawSlug = (ctx as unknown as { data?: string }).data;
		const slug: string[] = rawSlug ? (JSON.parse(rawSlug) as string[]) : [];
		const page = source.getPage(slug);
		if (!page) return null;
		return {
			title: page.data.title,
			description: page.data.description ?? null,
			full: page.data.full ?? false,
			mdxPath: page.path,
		};
	},
);

// ─── browser loader ───────────────────────────────────────────────────────────

// O glob do browser.ts gera chaves como "./guia/inicio-rapido.mdx"
// O page.path do fumadocs-core é "guia/inicio-rapido.mdx" (sem "./" inicial)
// O createClientLoader normaliza a chave removendo "./" automaticamente
const docsLoader = browserCollections.docs.createClientLoader({
	id: "docs",
	component: (doc) => {
		// Não usamos esta função de render — carregamos o módulo via `use()` diretamente
		const MDX = (doc as MdxModule).default;
		return <MDX />;
	},
});

// ─── rota ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/docs/$")({
	loader: async ({ params }): Promise<DocsPageMeta> => {
		const slug = params._splat ? params._splat.split("/").filter(Boolean) : [];
		const meta = (await fetchPageMeta({
			data: JSON.stringify(slug) as never,
		})) as DocsPageMeta | null;
		if (!meta) throw notFound();
		return meta;
	},
	notFoundComponent: () => (
		<DocsPage>
			<DocsBody>
				<DocsTitle>Página não encontrada</DocsTitle>
				<DocsDescription>
					A página de documentação que você está procurando não existe.
				</DocsDescription>
			</DocsBody>
		</DocsPage>
	),
	component: DocPageComponent,
});

function DocPageComponent() {
	const { title, description, full, mdxPath } = Route.useLoaderData();

	// Inicia o carregamento do módulo MDX via o loader (usa cache interno)
	const mdxPromise = docsLoader.preload(mdxPath) as Promise<MdxModule>;

	return (
		<Suspense fallback={null}>
			<DocContent
				mdxPromise={mdxPromise}
				title={title}
				description={description}
				full={full}
			/>
		</Suspense>
	);
}

function DocContent({
	mdxPromise,
	title,
	description,
	full,
}: {
	mdxPromise: Promise<MdxModule>;
	title: string;
	description: string | null;
	full: boolean;
}) {
	// use() suspende até o módulo estar carregado — toc vem do MDX compilado (ReactNode nativo)
	const mdxModule = use(mdxPromise);
	const MDX = mdxModule.default;
	const toc = mdxModule.toc ?? [];

	return (
		<DocsPage toc={toc} full={full}>
			<DocsTitle>{title}</DocsTitle>
			<DocsDescription>{description}</DocsDescription>
			<DocsBody>
				<MDX components={defaultMdxComponents} />
			</DocsBody>
		</DocsPage>
	);
}
