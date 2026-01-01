import React, { useState } from "react";
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
      <main id="main-content" role="main" aria-label="Homepage Main Content" className="min-h-screen flex-1 relative overflow-hidden">
        {/* Elite Esports Background */}
        <div className="fixed inset-0 -z-10">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0f14] to-[#07080C]" />
          
          {/* Animated radial gradients */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
          
          {/* Animated scan lines */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-300/20 to-transparent h-1 animate-scan" />
          </div>
          
          {/* Corner accent glows */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-orange-500/10 to-transparent blur-3xl" />
          
          {/* Subtle noise texture */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px'
            }}
          />
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
