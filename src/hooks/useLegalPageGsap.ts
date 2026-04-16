import { type RefObject, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const heroTrigger = { start: 'top 85%', toggleActions: 'play none none reverse' as const };
const sectionTrigger = { start: 'top 82%', toggleActions: 'play none none reverse' as const };

export function useLegalPageGsap(mainRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();

      const fadeUp = (selector: string, from: gsap.TweenVars, to: gsap.TweenVars) => {
        const el = root.querySelector<HTMLElement>(selector);
        if (!el) return;
        gsap.fromTo(el, from, {
          ...to,
          scrollTrigger: { trigger: el, ...heroTrigger },
        });
      };

      fadeUp(
        '[data-animate="legal-back"]',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
      fadeUp(
        '[data-animate="legal-tagline"]',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
      fadeUp(
        '[data-animate="legal-title"]',
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
      fadeUp(
        '[data-animate="legal-intro"]',
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
      );
      fadeUp(
        '[data-animate="legal-meta"]',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );

      const badges = root.querySelector<HTMLElement>('[data-animate="legal-badges"]');
      if (badges) {
        const spans = badges.querySelectorAll('span');
        if (spans.length) {
          gsap.fromTo(
            spans,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.08,
              ease: 'power3.out',
              scrollTrigger: { trigger: badges, ...heroTrigger },
            }
          );
        }
      }

      const preamble = root.querySelector<HTMLElement>('[data-animate="legal-preamble"]');
      if (preamble) {
        gsap.fromTo(
          preamble,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: { trigger: preamble, ...heroTrigger },
          }
        );
      }

      const opening = root.querySelector<HTMLElement>('[data-animate="legal-opening"]');
      if (opening) {
        gsap.fromTo(
          opening,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: { trigger: opening, ...heroTrigger },
          }
        );
      }

      const content = root.querySelector<HTMLElement>('[data-animate="legal-content"]');
      const sections = content?.querySelectorAll<HTMLElement>('section[id]');
      sections?.forEach((sec) => {
        gsap.fromTo(
          sec,
          { opacity: 0, y: 56 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: sec, ...sectionTrigger },
          }
        );
      });

      const closing = root.querySelector<HTMLElement>('[data-animate="legal-closing"]');
      if (closing) {
        gsap.fromTo(
          closing,
          { opacity: 0, y: 48 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: { trigger: closing, ...sectionTrigger },
          }
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);
}
