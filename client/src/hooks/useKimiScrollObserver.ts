import { useEffect, useRef } from "react";

/**
 * Global Kimi scroll-in/out observer.
 * - Any element with `data-kimi-scroll` will animate in on enter and out on leave.
 * - Uses the same `enter/exit` keyframes already defined in `index.css`.
 */
export function useKimiScrollObserver() {
  const observedRef = useRef<WeakSet<Element> | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    observedRef.current = new WeakSet();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.remove("kimi-scroll--out");
            el.classList.add("kimi-scroll--in");
            el.dataset.kimiSeen = "1";
          } else if (el.dataset.kimiSeen === "1") {
            el.classList.add("kimi-scroll--out");
            // Let exit start from visible state, then clear enter so re-entry can replay.
            requestAnimationFrame(() => {
              if (el.classList.contains("kimi-scroll--out")) {
                el.classList.remove("kimi-scroll--in");
              }
            });
          }
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    const observeAll = () => {
      const observed = observedRef.current!;
      const nodes = document.querySelectorAll<HTMLElement>("[data-kimi-scroll]");
      for (const el of nodes) {
        if (observed.has(el)) continue;
        observed.add(el);
        // Ensure base styling is present even if author forgot the class.
        el.classList.add("kimi-scroll");
        io.observe(el);
      }
    };

    observeAll();

    // Watch for dynamically inserted sections / route changes.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-kimi-scroll"],
    });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}

