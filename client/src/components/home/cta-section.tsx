import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CTASection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(imageRef.current, { opacity: 0, scale: 0.95 });
      gsap.set(taglineRef.current, { opacity: 0, y: 20 });
      gsap.set(headingRef.current, { opacity: 0, y: 20 });
      gsap.set(buttonRef.current, { opacity: 0, y: 20 });
      gsap.set(quoteRef.current, { opacity: 0, y: 20 });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(imageRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
      })
        .to(
          taglineRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .to(
          headingRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .to(
          buttonRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'back.out(1.7)',
          },
          '-=0.4'
        )
        .to(
          quoteRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.3'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-12 lg:py-16 relative overflow-hidden"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Enter the Challenge Image - Pro-level polish */}
          <section className="flex flex-col items-center py-8 lg:py-12">
            <div
              ref={imageRef}
              className="flex justify-center mb-4 relative w-full"
              style={{ alignItems: 'center', minHeight: '280px' }}
            >
              <div className="relative rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.2)]" style={{ minHeight: '260px' }}>
                <img
                  src="/assets/usdfg-enter-the-challenge-arcade.webp"
                  alt="USDFG Mascot Entering the Challenge Arena"
                  className="w-full max-w-2xl rounded-xl"
                  style={{ display: 'block', margin: '0 auto' }}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <p
              ref={taglineRef}
              className="text-center text-sm md:text-base lg:text-lg text-white/70 mt-2 italic leading-relaxed"
              style={{
                textShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
              }}
            >
              Step in. Only the skilled walk out.
            </p>
          </section>
          <p
            ref={headingRef}
            className="text-center text-base md:text-lg lg:text-xl text-white font-semibold mt-8 lg:mt-12"
            style={{
              textShadow: "0 0 15px rgba(255, 255, 255, 0.3)",
            }}
          >
            Ready to enter the arena?
          </p>
          <div ref={buttonRef} className="flex justify-center mt-6">
            <Link to="/app" className="inline-block">
              <button className="relative font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-white border-0 overflow-hidden group rounded-lg transition-all">
                <span className="relative z-10 flex items-center gap-2">
                  Enter the Arena
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </Link>
          </div>
          <div ref={quoteRef} className="flex justify-center mt-8 lg:mt-12">
            <div className="relative max-w-2xl w-full bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg px-6 lg:px-8 py-6 lg:py-8 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all duration-300">
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
              <blockquote className="relative z-10 text-center text-white/80 italic font-medium text-base lg:text-lg leading-relaxed">
                "I built USDFG to reward the ones who never begged for a seat. No mercy. No reruns. If you're waiting for permission, you already lost."
                <br />
                <span className="block mt-3 text-sm text-white/60">— Hussein A.</span>
              </blockquote>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default CTASection;
