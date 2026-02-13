import React, { useState } from "react";
import Navbar from "@/components/layout/navbar";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import PlatformFeatures from "@/components/home/platform-features";
import LiveBattles from "@/components/home/live-battles";
import ChallengeSystem from "@/components/home/challenge-system";
import LeaderboardPreview from "@/components/home/leaderboard-preview";
import Tokenomics from "@/components/home/tokenomics";
import GameCategories from "@/components/home/game-categories";
import CTASection from "@/components/home/cta-section";
import KimiBackground from "@/components/KimiBackground";
import { Helmet } from "react-helmet";

const Home: React.FC = () => {
  const [contentRevealed, setContentRevealed] = useState(false);
  const ogImage = "https://usdfg.pro/assets/usdfg-og-banner.webp";
  const canonical = "https://usdfg.pro/";

  const handleExploreClick = () => {
    if (contentRevealed) return;
    setContentRevealed(true);
    setTimeout(() => {
      const firstSection = document.querySelector('[aria-label="Platform Features Section"]');
      if (firstSection) {
        firstSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <>
      <Helmet>
        <title>USDFG.PRO – Skill-Based Crypto Gaming Platform | Game. Earn. Conquer.</title>
        <meta
          name="description"
          content="USDFG.PRO is the elite, skill-based crypto gaming platform. Compete in verified challenges, earn USDFG, and prove your skill. No gambling. No chance. 100% on-chain rewards."
        />
        <meta
          name="keywords"
          content="USDFG, USDFG.PRO, skill-based crypto gaming, earn from skill not luck, leaderboard, non-custodial, fair play, Game. Earn. Conquer., USDFGAMING, gaming token"
        />
        <link rel="canonical" href={canonical} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="USDFG.PRO" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content="USDFG.PRO – Skill-Based Crypto Gaming Platform" />
        <meta property="og:description" content="Compete in verified challenges, earn USDFG, and prove your skill. No gambling, 100% on-chain." />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:type" content="image/webp" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="USDFG mascot entering neon arcade: ENTER THE CHALLENGE" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:url" content={canonical} />
        <meta name="twitter:title" content="USDFG.PRO – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Compete in verified challenges, earn USDFG, and prove your skill. No gambling, 100% on-chain." />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "name": "USDFG.PRO",
                "url": "${canonical}",
                "logo": "${ogImage}",
                "sameAs": [
                  "https://twitter.com/USDFGAMING",
                  "https://t.me/+TPjhAyJiAF9mZTI0",
                  "https://instagram.com/usdfgaming",
                  "https://www.tiktok.com/@usdfgames"
                ]
              },
              {
                "@type": "WebSite",
                "url": "${canonical}",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "${canonical}search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }
            ]
          }
        `}</script>
      </Helmet>

      <Navbar />
      <div className="sticky top-16 lg:top-20 z-40">
        <LiveActivityTicker />
      </div>
      <main id="main-content" role="main" aria-label="Homepage Main Content" className="min-h-screen flex-1 relative overflow-hidden">
        {/* Kimi Galaxy Theme Background */}
        <KimiBackground includeGalaxy={true} />
        
        <section aria-label="Hero Section" className="relative z-10">
          <HeroSection onExploreClick={handleExploreClick} />
        </section>
        
        {/* Content sections - mount only after "EXPLORE PLATFORM" so ScrollTrigger measures correctly */}
        {contentRevealed ? (
          <div className="pointer-events-auto">
            <section id="features" aria-label="Platform Features Section">
              <PlatformFeatures />
            </section>
            <section aria-label="Live Battles Section">
              <LiveBattles />
            </section>
            <section aria-label="Challenge System Section">
              <ChallengeSystem />
            </section>
            <section id="leaderboard" aria-label="Leaderboard Preview Section">
              <LeaderboardPreview />
            </section>
            <section id="tokenomics" aria-label="Tokenomics Section">
              <Tokenomics />
            </section>
            <section id="games" aria-label="Game Categories Section">
              <GameCategories />
            </section>
            <section aria-label="CTA Section">
              <CTASection />
            </section>
          </div>
        ) : null}
      </main>
      <Footer isRevealed={contentRevealed} />
    </>
  );
};

export default Home;
