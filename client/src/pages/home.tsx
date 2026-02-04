import React, { useState } from "react";
import Navbar from "@/components/layout/navbar";
import LiveActivityTicker from "@/components/LiveActivityTicker";
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
  const [contentRevealed, setContentRevealed] = useState(false);
  const ogImage = "https://usdfg.pro/assets/usdfg-og-banner.webp"; // matches your file
  const canonical = "https://usdfg.pro/";
  
  const handleExploreClick = () => {
    setContentRevealed(true);
    // Smooth scroll to revealed content after a short delay (let animation start)
    setTimeout(() => {
      const firstSection = document.querySelector('[aria-label="About Section"]');
      if (firstSection) {
        firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300); // 300ms delay - animation is 1000ms total
  };

  return (
    <>
      <Helmet>
        <title>USDFGAMING – Skill-Based Crypto Gaming Platform | Game. Earn. Conquer.</title>
        <meta
          name="description"
          content="USDFGAMING is the elite, skill-based crypto gaming platform. Compete in verified challenges, earn USDFG, and prove your skill. No gambling. No chance. 100% on-chain rewards."
        />
        <meta
          name="keywords"
          content="USDFG, USDFG, skill-based crypto gaming, earn from skill not luck, leaderboard, non-custodial, fair play, Game. Earn. Conquer., USDFGAMING, gaming token"
        />
        <link rel="canonical" href={canonical} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="USDFGAMING" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content="USDFGAMING – Skill-Based Crypto Gaming Platform" />
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
        <meta name="twitter:title" content="USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Compete in verified challenges, earn USDFG, and prove your skill. No gambling, 100% on-chain." />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "name": "USDFGAMING",
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
      <LiveActivityTicker />
      <main id="main-content" role="main" aria-label="Homepage Main Content" className="min-h-screen flex-1 relative overflow-hidden bg-[#07080C]">
        {/* Elite Background - Simplified */}
        <div className="fixed inset-0 -z-10 bg-[#07080C]">
          {/* Single subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-3xl" />
        </div>
        
        <section aria-label="Hero Section" className="relative z-10">
          <HeroSection onExploreClick={handleExploreClick} />
        </section>
        
        {/* Fade in content sections when "EXPLORE PLATFORM" is clicked */}
        <div 
          className={`transition-all duration-1000 ease-in-out ${
            contentRevealed 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8 max-h-0 overflow-hidden pointer-events-none'
          }`}
        >
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
        </div>
      </main>
      <Footer isRevealed={contentRevealed} />
    </>
  );
};

export default Home;
