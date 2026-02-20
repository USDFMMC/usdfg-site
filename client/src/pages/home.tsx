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
  const ogImage = "https://usdfg.pro/assets/usdfg-token.png?v=27";
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
    <div className="flex flex-col min-h-screen w-full">
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
        <meta property="og:title" content="USDFG" />
        <meta property="og:description" content={"Skill-Based Competitive Arena\nGAME. EARN. CONQUER."} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="1024" />
        <meta property="og:image:alt" content="USDFG" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:url" content={canonical} />
        <meta name="twitter:title" content="USDFG" />
        <meta name="twitter:description" content={"Skill-Based Competitive Arena\nGAME. EARN. CONQUER."} />
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
      <div className="sticky top-16 lg:top-20 z-40 shrink-0">
        <LiveActivityTicker />
      </div>
      <main id="main-content" role="main" aria-label="Homepage Main Content" className="flex-1 min-h-screen relative overflow-x-hidden">
        {/* Kimi Galaxy Theme Background */}
        <KimiBackground includeGalaxy={true} />
        
        <section aria-label="Hero Section" className="relative z-10 isolate">
          <HeroSection onExploreClick={handleExploreClick} />
        </section>
        
        {/* Content sections - mount only after "EXPLORE PLATFORM" so ScrollTrigger measures correctly */}
        {contentRevealed ? (
          <div className="pointer-events-auto relative z-10 isolate flex flex-col">
            <section id="features" aria-label="Platform Features Section" className="scroll-mt-24 lg:scroll-mt-28 shrink-0">
              <PlatformFeatures />
            </section>
            <section aria-label="Live Battles Section" className="shrink-0">
              <LiveBattles />
            </section>
            <section aria-label="Challenge System Section" className="shrink-0">
              <ChallengeSystem />
            </section>
            <section id="leaderboard" aria-label="Leaderboard Preview Section" className="scroll-mt-24 lg:scroll-mt-28 shrink-0">
              <LeaderboardPreview />
            </section>
            <section id="tokenomics" aria-label="Tokenomics Section" className="scroll-mt-24 lg:scroll-mt-28 shrink-0">
              <Tokenomics />
            </section>
            <section id="games" aria-label="Game Categories Section" className="scroll-mt-24 lg:scroll-mt-28 shrink-0">
              <GameCategories />
            </section>
            <section aria-label="CTA Section" className="shrink-0">
              <CTASection />
            </section>
          </div>
        ) : null}
      </main>
      <Footer isRevealed={contentRevealed} />
    </div>
  );
};

export default Home;
