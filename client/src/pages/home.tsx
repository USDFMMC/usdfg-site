import React from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import AboutSection from "@/components/home/development-banner";
import PlatformFeatures from "@/components/home/platform-features";
import ChallengeSystem from "@/components/home/challenge-system";
import Tokenomics from "@/components/home/tokenomics";
import LeaderboardPreview from "@/components/home/leaderboard-preview";
import GameCategories from "@/components/home/game-categories";
import CTASection from "@/components/home/cta-section";
import { Helmet } from "react-helmet";

const Home: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>USDFGAMING – Skill-Based Crypto Gaming Platform | Game. Earn. Conquer.</title>
        <meta name="description" content="USDFGAMING is the elite, skill-based crypto gaming platform. Compete in verified challenges, earn $USDFG, and prove your skill. No gambling. No chance. 100% on-chain rewards." />
        <meta name="keywords" content="USDFG, $USDFG, skill-based crypto gaming, earn from skill not luck, leaderboard, non-custodial, fair play, Game. Earn. Conquer., USDFGAMING, gaming token" />
        <link rel="canonical" href="https://usdfg.pro/" />

        {/* Open Graph (Facebook, LinkedIn, etc) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usdfg.pro/" />
        <meta property="og:title" content="USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta property="og:description" content="Compete in verified challenges, earn $USDFG, and prove your skill. No gambling, 100% on-chain." />
        <meta property="og:image" content="https://usdfg.pro/assets/usdfg-og-banner.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:title" content="USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Compete in verified challenges, earn $USDFG, and prove your skill. No gambling, 100% on-chain." />
        <meta name="twitter:image" content="https://usdfg.pro/assets/usdfg-og-banner.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "name": "USDFGAMING",
                "url": "https://usdfg.pro",
                "logo": "https://usdfg.pro/usdfg-og-banner.png",
                "sameAs": [
                  "https://twitter.com/USDFGAMING",
                  "https://t.me/+TPjhAyJiAF9mZTI0",
                  "https://instagram.com/usdfgaming",
                  "https://www.tiktok.com/@usdfgames"
                ]
              },
              {
                "@type": "WebSite",
                "url": "https://usdfg.pro",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://usdfg.pro/search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }
            ]
          }
        `}</script>
      </Helmet>
      <Navbar />
      <main id="main-content" role="main" aria-label="Homepage Main Content" className="min-h-screen bg-background flex-1">
        <section aria-label="Hero Section">
          <HeroSection />
        </section>
        <section aria-label="About Section">
          <AboutSection />
        </section>
        <section aria-label="Platform Features Section">
          <PlatformFeatures />
        </section>
        <section aria-label="Challenge System Section">
          <ChallengeSystem />
        </section>
        <section aria-label="Leaderboard Preview Section">
          <LeaderboardPreview />
        </section>
        <section aria-label="Tokenomics Section">
          <Tokenomics />
        </section>
        <section aria-label="Game Categories Section">
          <GameCategories />
        </section>
        <section aria-label="CTA Section">
          <CTASection />
        </section>
      </main>
      <Footer isRevealed={true} />
    </>
  );
};

export default Home;
