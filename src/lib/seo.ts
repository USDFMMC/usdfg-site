/** Canonical site origin for absolute OG / canonical URLs (crawlers require absolute paths). */
export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined)?.replace(/\/$/, '') ||
  'https://usdfg.pro';

/** Dedicated Open Graph image — black-background USDFG logo (public/og-image.png). */
export const OG_IMAGE_PATH = '/og-image.png';
export const OG_IMAGE_VERSION = '3';
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}?v=${OG_IMAGE_VERSION}`;

export const OG_IMAGE_WIDTH = 1024;
export const OG_IMAGE_HEIGHT = 1024;

export const SITE_NAME = 'USDFG';

export const DEFAULT_TITLE = 'USDFG — Skill-Based Esports Arena';

export const DEFAULT_DESCRIPTION =
  'USDFG is a skill-based esports competition platform where players create challenges, compete on-chain, and earn verified rewards through performance. Wallet-based. Non-custodial.';

export const DEFAULT_TWITTER_DESCRIPTION =
  'Skill-based esports competition. On-chain verification. Fixed supply. Non-custodial.';

export type SeoConfig = {
  title?: string;
  description?: string;
  /** Full canonical URL including query string when needed. */
  url?: string;
  /** Open Graph type; use "website" for marketing pages. */
  type?: 'website' | 'article';
};

export function absoluteUrl(pathname: string, search = ''): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_ORIGIN}${path}${search}`;
}

export function buildChallengeShareUrl(challengeId: string): string {
  return absoluteUrl('/app', `?challenge=${encodeURIComponent(challengeId)}`);
}

export function challengeSeoFromTitle(challengeTitle: string, challengeId: string): SeoConfig {
  const title = `Join "${challengeTitle}" — USDFG Arena`;
  const description = `Compete in "${challengeTitle}" on USDFG Arena. Skill-based challenge. Wallet-based. Non-custodial.`;
  return {
    title,
    description,
    url: buildChallengeShareUrl(challengeId),
    type: 'website',
  };
}

export function seoForPath(pathname: string, search: string): SeoConfig {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/app/challenge/new') {
    return {
      title: 'Start Match — USDFG Arena',
      description: 'Create a new skill-based gaming challenge in the USDFG Arena.',
      url: absoluteUrl('/app/challenge/new'),
    };
  }

  if (path.startsWith('/app/profile/')) {
    const address = path.split('/').pop() || '';
    return {
      title: 'Player Profile — USDFG Arena',
      description: 'View player stats and challenge history in the USDFG Arena.',
      url: absoluteUrl(path, search),
    };
  }

  if (path === '/app' || path.startsWith('/app/')) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const challengeId = params.get('challenge');
    if (challengeId) {
      return {
        title: 'USDFG Arena Challenge',
        description:
          'Join a live skill-based challenge on USDFG Arena. Compete on-chain and earn verified rewards.',
        url: buildChallengeShareUrl(challengeId),
      };
    }
    return {
      title: 'USDFG Arena | USDFG.PRO',
      description:
        'Enter the USDFG Arena — compete in skill-based challenges, earn USDFG, and prove your gaming prowess.',
      url: absoluteUrl('/app'),
    };
  }

  if (path === '/whitepaper') {
    return {
      title: 'USDFG Whitepaper | USDFG.PRO',
      description: 'Read the USDFG whitepaper — skill-based competition, on-chain verification, and platform design.',
      url: absoluteUrl('/whitepaper'),
    };
  }

  if (path === '/privacy') {
    return {
      title: 'Privacy Policy | USDFG.PRO',
      description: 'USDFG privacy policy.',
      url: absoluteUrl('/privacy'),
    };
  }

  if (path === '/terms') {
    return {
      title: 'Terms of Service | USDFG.PRO',
      description: 'USDFG terms of service.',
      url: absoluteUrl('/terms'),
    };
  }

  if (path === '/cookie-policy') {
    return {
      title: 'Cookie Policy | USDFG.PRO',
      description: 'USDFG cookie policy.',
      url: absoluteUrl('/cookie-policy'),
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl(path === '/home' ? '/' : path),
  };
}

/** Share payload for Web Share API — URL only in `url`, never duplicated in `text` (prevents double iMessage cards). */
export function buildChallengeSharePayload(challenge: {
  id: string;
  title: string;
  entryFee?: number | string;
  prizePool?: number | string;
  gameLabel?: string;
  categoryLabel?: string;
}): { title: string; text: string; url: string } {
  const url = buildChallengeShareUrl(challenge.id);
  const entry = challenge.entryFee ?? '—';
  const prize = challenge.prizePool ?? '—';
  const game = challenge.gameLabel ?? '';
  const category = challenge.categoryLabel ?? '';
  const gameLine =
    game || category ? `\n🎯 ${[game, category].filter(Boolean).join(' • ')}` : '';

  return {
    title: `USDFG Arena: ${challenge.title}`,
    text: `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${entry} USDFG Entry • 🏆 ${prize} USDFG Reward${gameLine}`,
    url,
  };
}
