import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

/**
 * Central navigation menu with dropdown categories.
 */
export function HeaderNav() {
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
        {isAdmin && (
          <NavigationMenuItem>
            <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
              Cadastros
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="w-96">
                <Item asChild className="hover:bg-muted">
                  <Link search={{ q: undefined }} to="/users">
                    <ItemContent>
                      <ItemTitle>Usuários</ItemTitle>
                      <ItemDescription>
                        Gerenciar os usuários do sistema.
                      </ItemDescription>
                    </ItemContent>
                  </Link>
                </Item>
                <Item asChild className="hover:bg-muted">
                  <Link to="/rooms">
                    <ItemContent>
                      <ItemTitle>Salas e Blocos</ItemTitle>
                      <ItemDescription>
                        Gerenciar salas e blocos cadastrados.
                      </ItemDescription>
                    </ItemContent>
                  </Link>
                </Item>
                <Item asChild className="hover:bg-muted">
                  <Link to="/profiles">
                    <ItemContent>
                      <ItemTitle>Perfis de Acesso</ItemTitle>
                      <ItemDescription>
                        Gerenciar perfis que agrupam permissões.
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
              to="/"
            >
              Docs
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
