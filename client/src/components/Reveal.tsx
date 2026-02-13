import React, {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";
import { kimiRevealPresets, type KimiRevealPresetName } from "@/lib/kimi-motion";

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

  /**
   * Motion preset name (verbatim Kimi values).
   * Defaults to the standard Kimi section reveal.
   */
  preset?: KimiRevealPresetName;

  /** Animate only the root (default) or matched descendants. */
  selector?: string;

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
    preset = "section",
    selector,
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

    const presetConfig = kimiRevealPresets[preset];

    if (reducedMotion) {
      // Ensure content is visible with no transforms.
      const targets = selector ? (Array.from(el.querySelectorAll(selector)) as HTMLElement[]) : [el];
      gsap.set(targets, { opacity: 1, clearProps: "transform" });
      return;
    }

    const ctx = gsap.context(() => {
      const cleanup: Array<() => void> = [];

      // Timeline-based presets (Hero/About)
      if ("mode" in presetConfig && presetConfig.mode === "timeline") {
        // Initial states
        for (const [sel, vars] of Object.entries(presetConfig.init)) {
          const nodes = Array.from(el.querySelectorAll(sel));
          if (nodes.length) gsap.set(nodes, vars as gsap.TweenVars);
        }

        const tl = gsap.timeline({
          delay: presetConfig.timelineDelay,
          scrollTrigger: presetConfig.scrollTrigger
            ? {
                trigger: el,
                start: presetConfig.scrollTrigger.start,
                toggleActions: presetConfig.scrollTrigger.toggleActions,
                invalidateOnRefresh: true,
              }
            : undefined,
        });

        for (const step of presetConfig.steps) {
          const node = el.querySelector(step.selector);
          if (!node) continue;
          tl.to(node, step.vars as gsap.TweenVars, step.position);
        }

        cleanup.push(() => {
          tl.scrollTrigger?.kill();
          tl.kill();
        });

        // Optional parallax hooks (Hero)
        if ("parallax" in presetConfig && Array.isArray(presetConfig.parallax)) {
          for (const p of presetConfig.parallax) {
            const node = el.querySelector(p.selector);
            if (!node) continue;
            const tween = gsap.to(node, {
              ...(p.vars as gsap.TweenVars),
              scrollTrigger: {
                trigger: el,
                start: p.scrollTrigger.start,
                end: p.scrollTrigger.end,
                scrub: p.scrollTrigger.scrub,
                invalidateOnRefresh: true,
              },
            });
            cleanup.push(() => {
              tween.scrollTrigger?.kill();
              tween.kill();
            });
          }
        }

        return () => cleanup.forEach((fn) => fn());
      }

      // Selector/target-based presets
      const targets: HTMLElement[] = selector
        ? (Array.from(el.querySelectorAll(selector)) as HTMLElement[])
        : [el];

      if (targets.length === 0) return;

      const start = presetConfig.scrollTrigger.start;
      const toggleActions = presetConfig.scrollTrigger.toggleActions;
      const triggerMode = ("trigger" in presetConfig.scrollTrigger ? presetConfig.scrollTrigger.trigger : undefined) as
        | "self"
        | "targets"
        | undefined;

      if ("perTarget" in presetConfig && presetConfig.perTarget) {
        targets.forEach((target, index) => {
          const tween = gsap.fromTo(
            target,
            presetConfig.from as gsap.TweenVars,
            {
              ...(presetConfig.to as gsap.TweenVars),
              delay: index * presetConfig.perTargetDelayEach,
              scrollTrigger: {
                trigger: target,
                start,
                toggleActions,
                invalidateOnRefresh: true,
              },
            }
          );
          cleanup.push(() => {
            tween.scrollTrigger?.kill();
            tween.kill();
          });
        });
        return () => cleanup.forEach((fn) => fn());
      }

      // Default: animate all targets together (with optional stagger defined in preset)
      const triggerEl = triggerMode === "self" ? el : (selector ? targets[0] : el);
      const tween = gsap.fromTo(targets, presetConfig.from as gsap.TweenVars, {
        ...(presetConfig.to as gsap.TweenVars),
        scrollTrigger: {
          trigger: triggerEl,
          start,
          toggleActions,
          invalidateOnRefresh: true,
        },
      });

      cleanup.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });

      return () => cleanup.forEach((fn) => fn());
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, preset, selector, refreshKey]);

  const Comp = as as any;

  return (
    <Comp {...rest} ref={mergeRefs(localRef, forwardedRef)} className={className}>
      {children}
    </Comp>
  );
});

export default Reveal;

