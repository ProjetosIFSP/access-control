import { Link } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";

/**
 * Central navigation menu with dropdown categories.
 */
export function HeaderNav() {
  return (
    <NavigationMenu
      className={cn(
        "hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm hover:bg-white py-2 px-4 transition-all rounded-full",
        "dark:bg-zinc-800/70 dark:hover:bg-zinc-800",
      )}
    >
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
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link to="/">Docs</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
