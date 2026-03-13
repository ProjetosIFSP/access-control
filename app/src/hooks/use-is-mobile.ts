import { useLayoutEffect, useRef, useState } from "react";

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useLayoutEffect(() => {
		const updateSize = (): void => {
			setIsMobile(window.innerWidth < 768);
		};

		const debouncedResize = (): void => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(updateSize, 250);
		};

		updateSize();
		window.addEventListener("resize", debouncedResize);

		return (): void => {
			window.removeEventListener("resize", debouncedResize);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return isMobile;
}
