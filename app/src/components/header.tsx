import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { IFSPIcon } from "./icons/ifsp";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

export function Header() {
	return (
		<header className="flex items-center justify-between px-8 pt-4">
			<Link
				to="/"
				className="flex items-center gap-2 bg-white/70 backdrop-blur-sm hover:bg-white py-2 px-4 rounded-full focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
			>
				<IFSPIcon />
				<span className="text-lg font-bold text-zinc-900">
					Controle de Acesso
				</span>
			</Link>
			<NavigationMenu className="absolute left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm hover:bg-white py-2 px-4 rounded-full">
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
							Cadastros
						</NavigationMenuTrigger>
						<NavigationMenuContent>
							<ul className="w-96">
								<Item className="hover:bg-muted">
									<ItemContent>
										<ItemTitle>Introduction</ItemTitle>
										<ItemDescription>
											Re-usable components built with Tailwind CSS.
										</ItemDescription>
									</ItemContent>
								</Item>
							</ul>
						</NavigationMenuContent>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuLink
							asChild
							className={navigationMenuTriggerStyle()}
						>
							<Link to="/">Docs</Link>
						</NavigationMenuLink>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
			<div className="bg-white/70 flex items-center gap-1 backdrop-blur-sm hover:bg-white py-2 px-4 rounded-full">
				<Avatar>
					<AvatarImage src="https://github.com/abnerjs1.png" alt="@abnerjs" />
					<AvatarFallback className="bg-zinc-300 text-zinc-700 font-bold">
						AS
					</AvatarFallback>
				</Avatar>
				<ChevronDown className="size-4" />
			</div>
		</header>
	);
}
