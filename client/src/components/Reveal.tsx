import React, {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";
import { kimiDurations, kimiEasing, kimiStagger } from "@/lib/kimi-motion";

type RevealAs = keyof React.JSX.IntrinsicElements;

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T>).current = value;
      }
    }
  };
}

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  /** Which element to render. */
  as?: RevealAs;

  /** Animate only the root (default) or matched descendants. */
  selector?: string;

  /** If true, stagger multiple targets (when selector matches >1). */
  stagger?: boolean;

  /** Translate distance in px (max 20px recommended). */
  y?: number;

  /** ScrollTrigger start string. */
  start?: string;

  /** If true, play once and do not reverse on scroll-back. */
  once?: boolean;

  /**
   * Force re-initialization (useful when content is loaded async).
   * Example: `refreshKey={players.length}`.
   */
  refreshKey?: string | number;
}

const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
  {
    as = "div",
    className,
    children,
    selector,
    stagger = true,
    y = 20,
    start = "top 85%",
    once = true,
    refreshKey,
    ...rest
  },
  forwardedRef
) {
  const localRef = useRef<HTMLElement | null>(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;

    if (reducedMotion) {
      // Ensure content is visible with no transforms.
      const targets = selector ? (Array.from(el.querySelectorAll(selector)) as HTMLElement[]) : [el];
      gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    const ctx = gsap.context(() => {
      const targets: HTMLElement[] = selector
        ? Array.from(el.querySelectorAll(selector)) as HTMLElement[]
        : [el];

      if (targets.length === 0) return;

      const toggleActions = once ? "play none none none" : "play none none reverse";

      gsap.set(targets, { opacity: 0, y: Math.min(Math.max(y, 0), 20) });
      const tween = gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: kimiDurations.medium,
        ease: kimiEasing.default,
        stagger: stagger && targets.length > 1 ? kimiStagger : 0,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, selector, stagger, y, start, once, refreshKey]);

  const Comp = as as any;

  return (
    <Comp {...rest} ref={mergeRefs(localRef, forwardedRef)} className={className}>
      {children}
    </Comp>
  );
});

export default Reveal;

