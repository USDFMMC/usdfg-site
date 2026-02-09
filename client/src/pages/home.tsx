import React, { useState, useRef, useEffect } from "react";
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
import ParticleBackground from "@/components/ParticleBackground";
import { Helmet } from "react-helmet";
import gsap from "gsap";

const Home: React.FC = () => {
  const [contentRevealed, setContentRevealed] = useState(false);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const ogImage = "https://usdfg.pro/assets/usdfg-og-banner.webp"; // matches your file
  const canonical = "https://usdfg.pro/";
  
  const handleExploreClick = () => {
    if (contentRevealed) return;
    
    setContentRevealed(true);
    
    // GSAP reveal animation - matching Kimi style
    setTimeout(() => {
      if (contentWrapperRef.current) {
        const sections = Array.from(contentWrapperRef.current.children);
        
        // Set initial states
        gsap.set(contentWrapperRef.current, { 
          opacity: 0,
        });
        
        gsap.set(sections, { 
          opacity: 0, 
          y: 80,
          scale: 0.9
        });
        
        // Animate wrapper reveal with smooth entrance
        const tl = gsap.timeline();
        
        tl.to(contentWrapperRef.current, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
        })
        .to(sections, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: {
            amount: 0.8,
            from: "start"
          },
        }, '-=0.4');
        
        // Smooth scroll to revealed content
        setTimeout(() => {
          const firstSection = document.querySelector('[aria-label="About Section"]');
          if (firstSection) {
            firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 600);
      }
    }, 50);
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
        {/* Particle Background - Kimi Galaxy Effect */}
        <ParticleBackground />
        
        {/* Global Unified Background - Kimi Hero Style */}
        <div className="fixed inset-0 z-0 bg-[#0a0215]">
          {/* Kimi Linear Grid Pattern (Purple Lines) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(126, 67, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(126, 67, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px"
            }}
          />
          
          {/* Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0215] via-[#0a0215]/95 to-[#0a0215]" />
          <div className="absolute inset-0 bg-purple-600/5" />
        </div>
        
        <section aria-label="Hero Section" className="relative z-10">
          <HeroSection onExploreClick={handleExploreClick} />
        </section>
        
        {/* Content sections - revealed with GSAP animation when "EXPLORE PLATFORM" is clicked */}
        <div 
          ref={contentWrapperRef}
          className={contentRevealed ? '' : 'pointer-events-none'}
          style={{ 
            display: contentRevealed ? 'block' : 'none'
          }}
        >
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
      </main>
      <Footer isRevealed={contentRevealed} />
    </>
  );
};

export default Home;
