import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AlertTriangle, SearchX } from "lucide-react";

import { Header } from "#/components/header";
import { Toaster } from "#/components/ui/sonner";
import { TooltipProvider } from "#/components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=s?s==="dark":d;if(dark)document.documentElement.classList.add("dark");}catch(e){}})();`;

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#379936" },
      { title: "Controle de Acesso — IFSP Presidente Epitácio" },
      {
        name: "description",
        content:
          "Sistema de controle de acesso e gerenciamento de ambientes baseado em IoT para o IFSP Campus Presidente Epitácio. Monitore portas, gerencie credenciais e visualize acessos em tempo real.",
      },
      {
        name: "keywords",
        content:
          "controle de acesso, IoT, IFSP, Presidente Epitácio, biometria, RFID, fechadura eletrônica, gerenciamento de salas",
      },
      { name: "author", content: "Abner José da Silva" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "Controle de Acesso — IFSP Presidente Epitácio",
      },
      {
        property: "og:description",
        content:
          "Sistema IoT de controle de acesso e gerenciamento de ambientes com biometria e RFID para o IFSP Campus Presidente Epitácio.",
      },
      { property: "og:image", content: "/app-icon.svg" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: RootError,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-zinc-200 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 min-h-dvh max-w-screen overflow-x-hidden [&::-webkit-scrollbar]:w-0!">
        <div
          id="app"
          className="flex flex-col min-h-dvh w-screen max-w-screen overflow-x-hidden"
        >
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <NuqsAdapter>
                <Header />
                {children}
                <Toaster richColors closeButton position="top-right" />
                <TanStackDevtools
                  config={{
                    position: "bottom-right",
                  }}
                  plugins={[
                    {
                      name: "Tanstack Router",
                      render: <TanStackRouterDevtoolsPanel />,
                    },
                    TanStackQueryDevtools,
                  ]}
                />
              </NuqsAdapter>
            </TooltipProvider>
          </QueryClientProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>
      <a
        href="/"
        className="mt-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Voltar ao início
      </a>
    </main>
  );
}

function RootError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "Ocorreu um erro inesperado.";

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Tentar novamente
      </button>
    </main>
  );
}
