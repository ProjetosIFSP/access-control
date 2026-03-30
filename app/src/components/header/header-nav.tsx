import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUserQueryOptions } from "@/services/users";
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

interface HeaderNavProps {
	docsMode?: boolean;
}

function DocsSearchButton() {
	const { enabled, hotKey, setOpenSearch } = useSearchContext();

	if (!enabled) return null;

	const hotKeyLabel = hotKey[0]?.display;

	return (
		<button
			type="button"
			onClick={() => setOpenSearch(true)}
			className={cn(
				"inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 backdrop-blur-sm transition-colors hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800",
			)}
		>
			<Search className="size-4" />
			<span>Pesquisar</span>
			{hotKeyLabel && (
				<span className="hidden rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700/70 dark:text-zinc-300 lg:inline">
					{hotKeyLabel}
				</span>
			)}
		</button>
	);
}

/**
 * Central navigation menu with dropdown categories.
 */
export function HeaderNav({ docsMode = false }: HeaderNavProps) {
	const { data: user } = useQuery(currentUserQueryOptions);

	const isAdmin = !!user?.isAdmin;

	return (
		<NavigationMenu
			className={cn(
				"hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm py-2 px-4 transition-all rounded-full items-center gap-2",
				"dark:bg-zinc-800/70",
			)}
		>
			{docsMode && <DocsSearchButton />}
			<NavigationMenuList>
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
				{isAdmin && (
					<NavigationMenuItem>
						<NavigationMenuLink
							asChild
							className={navigationMenuTriggerStyle()}
						>
							<Link to="/logs">Logs</Link>
						</NavigationMenuLink>
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
