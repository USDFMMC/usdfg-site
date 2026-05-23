import { Helmet } from 'react-helmet';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  DEFAULT_TWITTER_DESCRIPTION,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  type SeoConfig,
} from '@/lib/seo';

type SeoHeadProps = SeoConfig;

/**
 * Single source for document + Open Graph + Twitter metadata.
 * Replaces tags by name/property (react-helmet) — do not duplicate the same keys in index.html
 * except matching defaults for non-JS crawlers.
 */
export default function SeoHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  url,
  type = 'website',
}: SeoHeadProps) {
  const canonical = url ?? undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={`${SITE_NAME} logo`} />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@usdfgaming" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={DEFAULT_TWITTER_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
    </Helmet>
  );
}
