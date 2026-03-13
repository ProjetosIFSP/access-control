import {
	SidebarCollapseTrigger,
	SidebarTrigger,
} from "fumadocs-ui/components/sidebar/base";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search, Sidebar } from "lucide-react";
import { cn } from "#/lib/utils";
import { HeaderLogo } from "./header-logo";
import { HeaderNav } from "./header-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

interface HeaderProps {
	docsMode?: boolean;
}

function DocsMobileSearchButton() {
	const { enabled, setOpenSearch } = useSearchContext();

	if (!enabled) return null;

	return (
		<button
			type="button"
			onClick={() => setOpenSearch(true)}
			className="inline-flex md:hidden size-10 items-center justify-center rounded-full bg-white/70 text-zinc-900 backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/70 dark:text-zinc-50 dark:hover:bg-zinc-800"
		>
			<Search className="size-4" />
		</button>
	);
}

export function Header({ docsMode = false }: HeaderProps) {
	return (
		<header
			className={cn(
				"relative z-50 flex items-center justify-between mx-2 sm:mx-6 md:mx-14 lg:mx-30 transition-all pt-4 max-sm:max-w-[calc(100%-16px)]",
				docsMode &&
					"w-[calc(100%-32px)] mx-0! absolute left-1/2 -translate-x-1/2",
			)}
		>
			<div className="flex items-center gap-2">
				{!docsMode && <MobileNav />}
				{docsMode && (
					<>
						<SidebarTrigger className="inline-flex md:hidden size-10 items-center justify-center rounded-full bg-white/70 text-zinc-900 backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/70 dark:text-zinc-50 dark:hover:bg-zinc-800">
							<Sidebar className="size-4" />
						</SidebarTrigger>
						<DocsMobileSearchButton />
						<SidebarCollapseTrigger className="hidden md:inline-flex size-10 items-center justify-center rounded-full bg-white/70 text-zinc-900 backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/70 dark:text-zinc-50 dark:hover:bg-zinc-800">
							<Sidebar className="size-4" />
						</SidebarCollapseTrigger>
					</>
				)}
				<HeaderLogo />
			</div>
			<HeaderNav docsMode={docsMode} />
			<UserMenu />
		</header>
	);
}
