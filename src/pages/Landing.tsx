import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();
    }, mainRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return;
    const scrollToHash = () => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    };
    const t = window.requestAnimationFrame(scrollToHash);
    return () => window.cancelAnimationFrame(t);
  }, [location.pathname, location.hash]);

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
