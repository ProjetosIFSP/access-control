import { useEffect, useState } from "react";

type OS = "mac" | "windows" | "linux" | "ios" | "android" | "unknown";

export function useOS(): OS {
	const [os, setOS] = useState<OS>("unknown");

	useEffect(() => {
		const userAgent = navigator.userAgent.toLowerCase();
		const platform = navigator.platform?.toLowerCase() || "";

		if (/(iphone|ipad|ipod)/.test(userAgent)) {
			setOS("ios");
		} else if (/android/.test(userAgent)) {
			setOS("android");
		} else if (
			/(mac|macintosh|macintel)/.test(platform) ||
			/mac os/.test(userAgent)
		) {
			setOS("mac");
		} else if (/(win|windows)/.test(platform)) {
			setOS("windows");
		} else if (/linux/.test(platform)) {
			setOS("linux");
		} else {
			setOS("unknown");
		}
	}, []);

	return os;
}

export function useIsMac(): boolean {
	const os = useOS();
	return os === "mac";
}

export function useIsMobile(): boolean {
	const os = useOS();
	return os === "ios" || os === "android";
}
