import { HeaderLogo } from "./header-logo";
import { HeaderNav } from "./header-nav";
import { UserMenu } from "./user-menu";

export function Header() {
	return (
		<header className="flex items-center justify-between px-8 pt-4">
			<HeaderLogo />
			<HeaderNav />
			<UserMenu />
		</header>
	);
}
