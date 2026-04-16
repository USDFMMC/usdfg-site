import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../sections/Navigation';
import Hero from '../sections/Hero';
import Features from '../sections/Features';
import LiveMatches from '../sections/LiveMatches';
import Leaderboard from '../sections/Leaderboard';
import SupportedGames from '../sections/SupportedGames';
import CTA from '../sections/CTA';
import Footer from '../sections/Footer';
import ParticleBackground from '../components/ParticleBackground';

gsap.registerPlugin(ScrollTrigger);

function Landing() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef} className="relative min-h-screen bg-void overflow-x-hidden">
      <ParticleBackground />

      <Navigation />

      <main className="relative z-10">
        <Hero />
        <Features />
        <LiveMatches />
        <Leaderboard />
        <SupportedGames />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

export default Landing;
