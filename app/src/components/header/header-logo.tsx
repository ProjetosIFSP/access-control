/** biome-ignore-all lint/suspicious/noArrayIndexKey: false positive */

import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const FINGERPRINT_PATHS = [
  "M24.7187 78.9062C23.6647 78.9156 22.627 78.6461 21.7109 78.125C21.0389 77.7473 20.449 77.2394 19.9758 76.631C19.5025 76.0226 19.1553 75.3259 18.9545 74.5817C18.7537 73.8375 18.7034 73.0607 18.8064 72.2968C18.9095 71.5329 19.1638 70.7972 19.5546 70.1328C27.0859 57.5625 49.9999 28.2227 99.9999 28.2227C121.668 28.2227 140.672 33.9141 156.457 45.1328C169.449 54.3398 176.73 64.7617 180.199 69.7812C180.639 70.414 180.948 71.1283 181.108 71.8822C181.267 72.6361 181.275 73.4143 181.129 74.171C180.983 74.9278 180.688 75.6477 180.26 76.2886C179.832 76.9294 179.28 77.4781 178.637 77.9023C177.322 78.7714 175.72 79.0944 174.172 78.8027C172.623 78.511 171.248 77.6277 170.34 76.3398C164.062 67.3125 144.922 39.8438 99.9999 39.8438C56.1523 39.8438 36.328 65.1211 29.871 75.9609C29.3522 76.8661 28.6011 77.6164 27.6953 78.1342C26.7895 78.652 25.7619 78.9185 24.7187 78.9062Z",
  "M125.191 193.75C124.693 193.756 124.195 193.7 123.711 193.582C87.4414 184.598 73.8984 148.34 73.3476 146.832L73.2617 146.5C72.9648 145.453 65.6874 120.59 76.8593 106.027C81.9804 99.3867 89.7695 95.9805 100.055 95.9805C109.617 95.9805 116.516 98.9531 121.258 105.105C125.164 110.129 126.727 116.324 128.238 122.293C131.414 134.723 133.707 141.25 146.906 141.922C152.703 142.215 156.512 138.824 158.672 135.937C164.512 128.066 165.527 115.234 161.125 103.906C155.469 89.2852 135.394 61.7187 99.9999 61.7187C84.8906 61.7187 71.0078 66.5742 59.8749 75.6992C50.6601 83.2578 43.3593 93.9297 39.8437 104.898C33.3242 125.32 41.875 157.422 41.957 157.715C42.1566 158.462 42.2047 159.241 42.0983 160.007C41.9919 160.773 41.7332 161.51 41.3374 162.175C40.9417 162.839 40.4169 163.418 39.7941 163.876C39.1712 164.334 38.4629 164.663 37.7109 164.844C36.1916 165.248 34.5745 165.041 33.2062 164.267C31.8378 163.493 30.8271 162.213 30.3906 160.703C30 159.238 20.8671 125 28.3984 101.398C36.6015 75.8242 61.9179 50.043 100.012 50.043C117.617 50.043 134.25 56.0273 148.133 67.3281C158.883 76.1172 167.664 87.9219 172.258 99.7226C178.098 114.789 176.531 131.699 168.277 142.746C162.777 150.113 154.945 153.965 146.269 153.547C123.668 152.414 119.605 136.637 116.644 125.129C113.598 113.324 111.648 107.633 100.012 107.633C93.621 107.633 89.1328 109.391 86.3398 113.031C82.5312 118.012 82.2343 125.797 82.6562 131.445C82.933 135.381 83.6004 139.279 84.6484 143.082C85.5781 145.426 97.6836 175.113 126.676 182.297C127.425 182.474 128.132 182.799 128.754 183.252C129.377 183.705 129.904 184.277 130.304 184.935C130.703 185.594 130.968 186.325 131.083 187.086C131.198 187.848 131.161 188.624 130.973 189.371C130.619 190.632 129.862 191.742 128.818 192.533C127.775 193.323 126.501 193.751 125.191 193.75Z",
  "M78.6368 191.07C77.8239 191.072 77.0189 190.91 76.27 190.594C75.521 190.278 74.8434 189.814 74.2774 189.23C59.7618 173.996 51.5509 156.961 48.461 135.66V135.547C46.7267 121.445 49.2657 101.48 61.7071 87.7539C70.8907 77.625 83.8009 72.4766 100.012 72.4766C119.184 72.4766 134.25 81.3906 143.645 98.2148C150.461 110.438 151.813 122.617 151.848 123.117C151.919 123.888 151.838 124.666 151.608 125.405C151.379 126.144 151.006 126.831 150.511 127.426C150.015 128.022 149.408 128.513 148.722 128.873C148.037 129.233 147.287 129.454 146.516 129.523C144.96 129.692 143.4 129.243 142.173 128.271C140.946 127.3 140.15 125.885 139.957 124.332C138.928 117.024 136.563 109.968 132.981 103.516C125.699 90.668 114.621 84.1367 99.9689 84.1367C87.3126 84.1367 77.4103 87.9453 70.5978 95.4648C60.7774 106.305 58.879 123.004 60.2267 134.051C62.9337 152.887 70.172 167.871 82.9532 181.262C83.4867 181.817 83.9031 182.473 84.1777 183.192C84.4524 183.911 84.5797 184.678 84.552 185.448C84.5243 186.217 84.3422 186.973 84.0165 187.67C83.6909 188.368 83.2283 188.993 82.6564 189.508C81.5549 190.506 80.1234 191.063 78.6368 191.07Z",
  "M145.508 174.289C132.812 174.289 122.02 170.773 113.383 163.785C96.0313 149.805 94.0859 127.035 94 126.074C93.8778 124.497 94.3871 122.936 95.416 121.734C96.4449 120.532 97.909 119.788 99.4863 119.666C101.064 119.544 102.625 120.053 103.827 121.082C105.028 122.111 105.772 123.575 105.895 125.152C105.937 125.488 107.672 144.113 121.047 154.84C128.961 161.16 139.539 163.668 152.574 162.203C154.132 162.014 155.702 162.45 156.939 163.414C158.177 164.379 158.983 165.795 159.18 167.352C159.265 168.121 159.196 168.899 158.978 169.641C158.759 170.384 158.395 171.075 157.906 171.675C157.417 172.275 156.814 172.771 156.131 173.136C155.449 173.5 154.7 173.725 153.93 173.797C151.134 174.123 148.322 174.287 145.508 174.289ZM155.539 19.0586C150.586 15.8359 133.023 6.25 100 6.25C65.3359 6.25 47.7305 16.8398 43.8359 19.5312C43.5787 19.6892 43.338 19.8724 43.1172 20.0781C43.0939 20.1007 43.0635 20.1145 43.0313 20.1172C42.4093 20.6602 41.9103 21.3295 41.5675 22.0805C41.2246 22.8316 41.0458 23.6471 41.043 24.4727C41.0537 25.2466 41.2169 26.0107 41.5235 26.7214C41.83 27.4321 42.2738 28.0753 42.8294 28.6142C43.3849 29.153 44.0414 29.577 44.7611 29.8617C45.4808 30.1464 46.2496 30.2864 47.0234 30.2734C48.2638 30.2726 49.4742 29.8923 50.4922 29.1836C50.6602 29.0586 65.8125 17.9258 100.012 17.9258C134.211 17.9258 149.445 29.0195 149.609 29.1016C150.649 29.8728 151.912 30.2842 153.207 30.2734C153.982 30.2853 154.751 30.1441 155.471 29.858C156.19 29.5718 156.847 29.1463 157.402 28.6059C157.956 28.0654 158.399 27.4207 158.704 26.7088C159.009 25.9968 159.171 25.2316 159.18 24.457C159.18 23.2968 158.834 22.163 158.185 21.2011C157.536 20.2392 156.615 19.4931 155.539 19.0586Z",
];

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
      <div className="flex group items-center text-sm md:text-xl font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
        C{/** biome-ignore lint/a11y/noSvgWithoutTitle: evitar tooltip */}
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
        NTROLE DE ACESSO
      </div>
    </Link>
  );
}
