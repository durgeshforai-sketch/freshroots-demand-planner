"use client";
import { useEffect, useRef } from "react";

const fmt = (v: number, decimals: number) => v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Counts up from 0 on mount by writing to the DOM directly (no re-renders).
 * Server HTML already holds the final value, so no-JS and reduced-motion users see it at once.
 */
export function AnimatedNumber({ value, decimals = 0, suffix = "", duration = 900 }: { value: number; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      el.textContent = fmt(value * (1 - Math.pow(1 - k, 3)), decimals) + suffix;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals, suffix, duration]);

  return (
    <span ref={ref} className="tabular" aria-label={`${fmt(value, decimals)}${suffix}`}>
      {fmt(value, decimals)}
      {suffix}
    </span>
  );
}
