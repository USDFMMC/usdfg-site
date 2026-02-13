/**
 * Centralized Kimi motion presets.
 *
 * CRITICAL:
 * - These values are extracted verbatim from the original "Kimi exact" GSAP code in this repo
 *   (and cross-checked against `client/src/_kimi/assets/index-CiHexlOG.js`).
 * - Do not "tune", "improve", or substitute these values.
 */

export const kimiEasing = {
  power3Out: "power3.out",
  backOut17: "back.out(1.7)",
  none: "none",
} as const;

export const kimiDurations = {
  // Hero (intro timeline)
  heroBg: 1.8,
  heroHeadline: 1.0,
  heroBrand: 0.8,
  heroBadge: 0.6,
  heroSub: 0.6,
  heroButtons: 0.6,

  // Section + content reveals
  section: 0.8,
  cards: 0.6,
  podium: 1.0,
  list: 0.5,
  aboutCard: 0.8,
  aboutText: 0.6,
} as const;

export const kimiScroll = {
  // ScrollTrigger start presets
  start70: "top 70%",
  start80: "top 80%",
  start85: "top 85%",

  // Hero parallax ScrollTrigger bounds
  heroParallaxStart: "top top",
  heroParallaxEnd: "bottom top",

  // ScrollTrigger toggle actions used in original Kimi sections
  toggleActionsReverse: "play none none reverse",
  toggleActionsOnce: "play none none none",
} as const;

export const kimiStagger = {
  cards: 0.15,
  liveList: 0.1,
  leaderboardList: 0.08,
  cta: 0.12,
} as const;

export const kimiFrom = {
  heroItemsY: 24,
  sectionTitleY: 50,
  cardGridY: 60,
  platformCardY: 80,
  podiumY: 100,
  leaderboardListX: -50,
  liveListX: 100,
  aboutTitleY: 12,
  aboutBodyY: 8,

  heroBgScale: 1.2,
  cardGridScale: 0.9,
  aboutCardScale: 0.99,

  platformCardRotateX: 15,
} as const;

/**
 * Data-driven Reveal presets (verbatim motion values).
 * `Reveal` consumes these so components don't hardcode any motion numbers.
 */
export const kimiRevealPresets = {
  section: {
    from: { opacity: 0, y: kimiFrom.sectionTitleY },
    to: { opacity: 1, y: 0, duration: kimiDurations.section, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start80, toggleActions: kimiScroll.toggleActionsReverse, trigger: "targets" as const },
  },

  cta: {
    from: { opacity: 0, y: kimiFrom.sectionTitleY },
    to: { opacity: 1, y: 0, duration: kimiDurations.section, stagger: kimiStagger.cta, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start70, toggleActions: kimiScroll.toggleActionsReverse, trigger: "self" as const },
  },

  gameCarouselCards: {
    from: { opacity: 0, y: kimiFrom.cardGridY, scale: kimiFrom.cardGridScale },
    to: { opacity: 1, y: 0, scale: 1, duration: kimiDurations.cards, stagger: kimiStagger.cards, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start80, toggleActions: kimiScroll.toggleActionsReverse, trigger: "self" as const },
  },

  liveList: {
    from: { opacity: 0, x: kimiFrom.liveListX },
    to: { opacity: 1, x: 0, duration: kimiDurations.cards, stagger: kimiStagger.liveList, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start80, toggleActions: kimiScroll.toggleActionsReverse, trigger: "self" as const },
  },

  leaderboardPodium: {
    from: { opacity: 0, y: kimiFrom.podiumY },
    to: { opacity: 1, y: 0, duration: kimiDurations.podium, stagger: kimiStagger.cards, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start80, toggleActions: kimiScroll.toggleActionsReverse, trigger: "self" as const },
  },

  leaderboardList: {
    from: { opacity: 0, x: kimiFrom.leaderboardListX },
    to: { opacity: 1, x: 0, duration: kimiDurations.list, stagger: kimiStagger.leaderboardList, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start85, toggleActions: kimiScroll.toggleActionsReverse, trigger: "self" as const },
  },

  platformCards: {
    perTarget: true,
    perTargetDelayEach: 0.2,
    from: { opacity: 0, y: kimiFrom.platformCardY, rotateX: kimiFrom.platformCardRotateX },
    to: { opacity: 1, y: 0, rotateX: 0, duration: kimiDurations.section, ease: kimiEasing.power3Out },
    scrollTrigger: { start: kimiScroll.start85, toggleActions: kimiScroll.toggleActionsReverse, trigger: "targets" as const },
  },

  aboutTimeline: {
    mode: "timeline" as const,
    timelineDelay: 0,
    scrollTrigger: { start: kimiScroll.start80, toggleActions: kimiScroll.toggleActionsOnce },
    init: {
      "[data-kimi-about-title]": { opacity: 0, y: kimiFrom.aboutTitleY },
      "[data-kimi-about-description]": { opacity: 0, y: kimiFrom.aboutBodyY },
      "[data-kimi-about-tagline]": { opacity: 0, y: kimiFrom.aboutBodyY },
      "[data-kimi-about-card]": { opacity: 0, scale: kimiFrom.aboutCardScale },
    },
    steps: [
      {
        selector: "[data-kimi-about-card]",
        vars: { opacity: 1, scale: 1, duration: kimiDurations.aboutCard, ease: kimiEasing.power3Out },
      },
      {
        selector: "[data-kimi-about-title]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.aboutText, ease: kimiEasing.power3Out },
        position: "-=0.5",
      },
      {
        selector: "[data-kimi-about-description]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.aboutText, ease: kimiEasing.power3Out },
        position: "-=0.4",
      },
      {
        selector: "[data-kimi-about-tagline]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.aboutText, ease: kimiEasing.power3Out },
        position: "-=0.4",
      },
    ],
  },

  heroTimeline: {
    mode: "timeline" as const,
    timelineDelay: 0.3,
    init: {
      "[data-kimi-hero-bg]": { scale: kimiFrom.heroBgScale, opacity: 0 },
      "[data-kimi-hero-item]": { opacity: 0, y: kimiFrom.heroItemsY },
    },
    steps: [
      {
        selector: "[data-kimi-hero-bg]",
        vars: { scale: 1, opacity: 1, duration: kimiDurations.heroBg, ease: kimiEasing.power3Out },
      },
      {
        selector: "[data-kimi-hero-headline]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.heroHeadline, ease: kimiEasing.power3Out },
        position: "-=1.2",
      },
      {
        selector: "[data-kimi-hero-brand]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.heroBrand, ease: kimiEasing.power3Out },
        position: "-=0.6",
      },
      {
        selector: "[data-kimi-hero-badge]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.heroBadge, ease: kimiEasing.backOut17 },
        position: "-=0.4",
      },
      {
        selector: "[data-kimi-hero-sub]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.heroSub, ease: kimiEasing.power3Out },
        position: "-=0.3",
      },
      {
        selector: "[data-kimi-hero-buttons]",
        vars: { opacity: 1, y: 0, duration: kimiDurations.heroButtons, ease: kimiEasing.power3Out },
        position: "-=0.3",
      },
    ],
    parallax: [
      {
        selector: "[data-kimi-hero-content]",
        vars: { y: -100, ease: kimiEasing.none },
        scrollTrigger: {
          start: kimiScroll.heroParallaxStart,
          end: kimiScroll.heroParallaxEnd,
          scrub: 1,
        },
      },
      {
        selector: "[data-kimi-hero-bg]",
        vars: { y: 50, ease: kimiEasing.none },
        scrollTrigger: {
          start: kimiScroll.heroParallaxStart,
          end: kimiScroll.heroParallaxEnd,
          scrub: 1,
        },
      },
    ],
  },
} as const;

export type KimiRevealPresetName = keyof typeof kimiRevealPresets;

