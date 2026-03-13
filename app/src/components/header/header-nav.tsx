import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Item, ItemContent, ItemDescription, ItemTitle } from "../ui/item";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "../ui/navigation-menu";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

function DocsSearchButton() {
	const { enabled, hotKey, setOpenSearch } = useSearchContext();

	if (!enabled) return null;

	return (
		<button
			type="button"
			onClick={() => setOpenSearch(true)}
			className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			<Search className="size-3.5" />
			<span className="hidden lg:inline">Buscar docs</span>
			<span className="inline lg:hidden">Buscar</span>
			<span className="ml-1 hidden items-center gap-1 text-[10px] uppercase tracking-wide md:inline-flex">
				{hotKey.map((key) => (
					<kbd
						key={key.display}
						className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-medium"
					>
						{key.display}
					</kbd>
				))}
			</span>
		</button>
	);
}

/**
 * Central navigation menu with dropdown categories.
 */
interface HeaderNavProps {
	showDocsSearch?: boolean;
}

export function HeaderNav({ showDocsSearch = false }: HeaderNavProps) {
	const { data } = useQuery({
		queryKey: ["users-me"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/users/me`, {
				credentials: "include",
			});
			if (!res.ok) return { isAdmin: false };
			return res.json() as Promise<{ isAdmin: boolean }>;
		},
		staleTime: 1000 * 60 * 5,
		retry: false,
	});

	const isAdmin = !!data?.isAdmin;

	return (
		<NavigationMenu
			className={cn(
				"hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm py-2 px-4 transition-all rounded-full",
				"dark:bg-zinc-800/70",
			)}
		>
			<NavigationMenuList>
				{showDocsSearch && (
					<NavigationMenuItem className="mr-1 hidden md:block">
						<DocsSearchButton />
					</NavigationMenuItem>
				)}
				{isAdmin && (
					<NavigationMenuItem>
						<NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
							Cadastros
						</NavigationMenuTrigger>
						<NavigationMenuContent>
							<ul className="w-96">
								<Item asChild className="hover:bg-muted">
									<Link
										search={{
											q: undefined,
											profileIds: undefined,
											tab: undefined,
										}}
										to="/users"
									>
										<ItemContent>
											<ItemTitle>Usuários e Perfis</ItemTitle>
											<ItemDescription>
												Gerenciar usuários e perfis de acesso.
											</ItemDescription>
										</ItemContent>
									</Link>
								</Item>
								<Item asChild className="hover:bg-muted">
									<Link
										search={{
											tab: undefined,
											q: undefined,
											typeIds: undefined,
											blockIds: undefined,
										}}
										to="/rooms"
									>
										<ItemContent>
											<ItemTitle>Salas e Blocos</ItemTitle>
											<ItemDescription>
												Gerenciar salas, blocos e tipos cadastrados.
											</ItemDescription>
										</ItemContent>
									</Link>
								</Item>
							</ul>
						</NavigationMenuContent>
					</NavigationMenuItem>
				)}
				<NavigationMenuItem>
					<NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
						<Link
							search={{ q: undefined, type: undefined, state: undefined }}
							to="/docs"
						>
							Docs
						</Link>
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}
