import { HeaderLogo } from "./header-logo";
import { HeaderNav } from "./header-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function Header() {
	return (
		<header className="relative z-50 flex items-center justify-between mx-2 sm:mx-6 md:mx-14 lg:mx-30 transition-all pt-4 max-sm:max-w-[calc(100%-16px)]">
			<div className="flex items-center gap-2">
				<MobileNav />
				<HeaderLogo />
			</div>
			<HeaderNav />
			<UserMenu />
		</header>
	);
}
