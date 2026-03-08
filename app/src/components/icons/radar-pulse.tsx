import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RadarPulseProps {
  /** Center X coordinate within the parent SVG */
  cx: number;
  /** Center Y coordinate within the parent SVG */
  cy: number;
  /** Base radius — rings expand from 0 to r * maxScale */
  r: number;
  /** How many concentric rings to animate (default: 3) */
  rings?: number;
  /** Multiplier for the max expansion radius (default: 2.8) */
  maxScale?: number;
  /** Duration of a single ring expansion in seconds (default: 1.6) */
  duration?: number;
  /** Stagger delay between rings in seconds (default: 0.53) */
  stagger?: number;
  /** Stroke color of the rings (default: primary CSS variable) */
  strokeColor?: string;
  /** Stroke width of the rings (default: 2.5) */
  strokeWidth?: number;
  /** Whether the animation is active (default: true) */
  active?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Animated radar/sonar pulse rings rendered as SVG `<circle>` elements.
 *
 * Designed to be placed **inside** a parent `<svg>` element. Each ring
 * expands from `r=0` to `r * maxScale` while fading from full opacity
 * to transparent, creating a pulsing radar effect.
 *
 * The animation is driven entirely by GSAP proxy objects — no React
 * state is involved after mount — so it is immune to React re-renders
 * stomping on the animated DOM attributes.
 *
 * Usage:
 * ```tsx
 * <svg viewBox="0 0 200 200">
 *   <RadarPulse cx={100} cy={50} r={20} />
 * </svg>
 * ```
 */
export function RadarPulse({
  cx,
  cy,
  r,
  rings = 3,
  maxScale = 2.8,
  duration = 1.6,
  stagger = 0.53,
  strokeColor = "var(--primary)",
  strokeWidth = 2.5,
  active = true,
}: RadarPulseProps) {
  // One ref per ring — we support up to 5 rings; extras are just ignored.
  const ref0 = useRef<SVGCircleElement>(null);
  const ref1 = useRef<SVGCircleElement>(null);
  const ref2 = useRef<SVGCircleElement>(null);
  const ref3 = useRef<SVGCircleElement>(null);
  const ref4 = useRef<SVGCircleElement>(null);
  // Stable array — individual refs never change identity between renders.
  const allRefs = useMemo(() => [ref0, ref1, ref2, ref3, ref4], []);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Collect only the refs we actually need
    const els: SVGCircleElement[] = [];
    for (let i = 0; i < rings; i++) {
      const el = allRefs[i]?.current;
      if (el) els.push(el);
    }

    // Always kill previous timeline
    tlRef.current?.kill();
    tlRef.current = null;

    // Reset all ring elements to invisible
    for (const el of els) {
      el.setAttribute("r", "0");
      el.setAttribute("opacity", "0");
    }

    if (!active || els.length === 0) return;

    const maxR = r * maxScale;

    // Build a repeating timeline.
    // Each ring gets its own GSAP proxy object. GSAP tweens the plain-JS
    // numbers; onUpdate writes them to the DOM via setAttribute. This
    // approach is immune to React re-renders overwriting the values.
    const tl = gsap.timeline({ repeat: -1 });
    tlRef.current = tl;

    els.forEach((el, i) => {
      const proxy = { radius: 0, alpha: 0 };

      tl.fromTo(
        proxy,
        { radius: 0, alpha: 0.75 },
        {
          radius: maxR,
          alpha: 0,
          duration,
          ease: "power2.out",
          onUpdate() {
            el.setAttribute("r", String(proxy.radius));
            el.setAttribute("opacity", String(proxy.alpha));
          },
          onComplete() {
            el.setAttribute("r", "0");
            el.setAttribute("opacity", "0");
          },
        },
        i * stagger,
      );
    });

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      for (const el of els) {
        el.setAttribute("r", "0");
        el.setAttribute("opacity", "0");
      }
    };
  }, [r, rings, maxScale, duration, stagger, active, allRefs]);

  // Render the circles. We always render `rings` circles (up to 5).
  // Unused circles (rings > 5) are simply not rendered.
  const circleCount = Math.min(rings, 5);
  const circles: React.ReactNode[] = [];

  for (let i = 0; i < circleCount; i++) {
    circles.push(
      <circle
        key={i}
        ref={allRefs[i]}
        cx={cx}
        cy={cy}
        r={0}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={0}
      />,
    );
  }

  return <g style={{ pointerEvents: "none" }}>{circles}</g>;
}
