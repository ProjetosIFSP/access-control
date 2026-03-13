/** biome-ignore-all lint/suspicious/noArrayIndexKey: false positive */

import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { FINGERPRINT_PATHS } from "@/components/icons/fingerprint-icon";
import { cn } from "@/lib/utils";

/**
 * Manually implements DrawSVG-style animation by computing path lengths
 * and animating strokeDasharray/strokeDashoffset with GSAP core.
 */
function setDrawSVG(path: SVGPathElement, progress: number) {
	const length = path.getTotalLength();
	const dashLength = length * progress;
	path.style.strokeDasharray = `${dashLength}px, ${length + 0.1}px`;
	path.style.strokeDashoffset = "0";
}

interface HeaderLogoProps {
	className?: string;
}

/**
 * Brand logo with animated fingerprint SVG.
 * The fingerprint strokes draw-in on hover using GSAP timelines.
 */
export function HeaderLogo({ className }: HeaderLogoProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const tlRef = useRef<gsap.core.Timeline | null>(null);
	const progressRefs = useRef<{ value: number }[]>([]);

	useEffect(() => {
		if (!svgRef.current) return;
		const overlayPaths = svgRef.current.querySelectorAll<SVGPathElement>(
			".fingerprint-overlay",
		);

		progressRefs.current = Array.from(overlayPaths).map((path) => {
			const obj = { value: 0 };
			setDrawSVG(path, 0);
			return obj;
		});
	}, []);

	const handleMouseEnter = useCallback(() => {
		if (!svgRef.current) return;

		const overlayPaths = svgRef.current.querySelectorAll<SVGPathElement>(
			".fingerprint-overlay",
		);
		const basePaths =
			svgRef.current.querySelectorAll<SVGPathElement>(".fingerprint-base");

		tlRef.current?.kill();
		const tl = gsap.timeline();
		tlRef.current = tl;

		overlayPaths.forEach((path, i) => {
			const proxy = progressRefs.current[i];
			if (!proxy) return;

			tl.to(
				proxy,
				{
					value: 1,
					duration: 0.7,
					ease: "power2.inOut",
					onUpdate: () => setDrawSVG(path, proxy.value),
				},
				i * 0.12,
			);
		});

		tl.to(
			basePaths,
			{
				fill: "var(--primary)",
				duration: 0.3,
				stagger: 0.12,
				ease: "power1.in",
			},
			0.35,
		);
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (!svgRef.current) return;

		const overlayPaths = svgRef.current.querySelectorAll<SVGPathElement>(
			".fingerprint-overlay",
		);
		const basePaths =
			svgRef.current.querySelectorAll<SVGPathElement>(".fingerprint-base");

		tlRef.current?.kill();
		const tl = gsap.timeline();
		tlRef.current = tl;

		tl.to(basePaths, {
			fill: "currentColor",
			duration: 0.3,
			stagger: 0.08,
			ease: "power1.out",
		});

		overlayPaths.forEach((path, i) => {
			const proxy = progressRefs.current[i];
			if (!proxy) return;

			tl.to(
				proxy,
				{
					value: 0,
					duration: 0.5,
					ease: "power2.inOut",
					onUpdate: () => setDrawSVG(path, proxy.value),
				},
				i * 0.08,
			);
		});
	}, []);

	return (
		<Link
			to="/"
			search={{
				q: undefined,
				type: undefined,
				state: undefined,
			}}
			className={cn(
				"flex items-center cursor-pointer gap-2 backdrop-blur-sm h-10 md:h-12 px-3 md:px-4 rounded-full outline-none transition-[color,box-shadow] focus-visible:ring-[3px]",
				"bg-white/70 focus-visible:ring-ring/50",
				"dark:bg-zinc-800/70",
				"transition-all",
				className,
			)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="flex group items-center font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
				<span className="hidden text-sm md:inline md:text-xl">C</span>
				{/** biome-ignore lint/a11y/noSvgWithoutTitle: evitar tooltip */}
				<svg
					ref={svgRef}
					width="200"
					height="200"
					viewBox="0 0 200 200"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="size-5 md:size-6 rotate-90"
				>
					{FINGERPRINT_PATHS.map((d, i) => (
						<path
							key={`base-${i}`}
							className="fingerprint-base"
							d={d}
							fill="currentColor"
						/>
					))}
					{FINGERPRINT_PATHS.map((d, i) => (
						<path
							key={`overlay-${i}`}
							className="fingerprint-overlay"
							d={d}
							fill="none"
							stroke="var(--primary)"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					))}
				</svg>
				<span className="hidden text-sm md:inline md:text-xl">
					NTROLE DE ACESSO
				</span>
			</div>
		</Link>
	);
}
