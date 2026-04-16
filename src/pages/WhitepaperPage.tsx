import { useRef, useEffect } from 'react';
import Navigation from '../sections/Navigation';
import Whitepaper from '../sections/Whitepaper';
import Footer from '../sections/Footer';
import ParticleBackground from '../components/ParticleBackground';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function WhitepaperPage() {
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
        <Whitepaper />
      </main>

      <Footer />
    </div>
  );
}

export default WhitepaperPage;
