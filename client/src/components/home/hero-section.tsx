import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { GridScan } from "./GridScan";

gsap.registerPlugin(ScrollTrigger);


interface HeroSectionProps {
  onExploreClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(titleRef.current, { opacity: 0, y: 60 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 40 });
      gsap.set(ctaRef.current, { opacity: 0, y: 30 });
      gsap.set(imageRef.current, { scale: 1.2, opacity: 0 });

      // Entrance timeline
      const tl = gsap.timeline({ delay: 0.3 });

      tl.to(imageRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1.8,
        ease: 'power3.out',
      })
        .to(
          titleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=1.2'
        )
        .to(
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.6'
        )
        .to(
          ctaRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'back.out(1.7)',
          },
          '-=0.4'
        );

      // Scroll parallax
      gsap.to(contentRef.current, {
        y: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      gsap.to(imageRef.current, {
        y: 50,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero relative min-h-screen w-full flex items-center justify-center overflow-hidden"
    >
      {/* Speed Lines (Flying Things) - Kimi Style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[3]">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
            style={{
              width: Math.random() * 300 + 100,
              top: `${Math.random() * 100}%`,
              left: -400,
            }}
            animate={{
              x: [0, 2000],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Background Image - Hero Specific */}
      <div
        ref={imageRef}
        className="absolute inset-0 z-[1]"
        style={{ willChange: 'transform' }}
      >
        <img
          src="/hero-bg.jpg"
          alt="Esports Arena"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/10" />
      </div>

      {/* GridScan Background - Temporarily disabled for preview */}
      {/* <div className="absolute inset-0 w-full h-full z-[1]">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#FBBF24"
          gridScale={0.1}
          scanColor="#FCD34D"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
          enableWebcam={false}
        />
      </div> */}
      
      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 pt-20"
        style={{ willChange: 'transform' }}
      >
        <div className="w-full">
          <div className="flex flex-col items-start text-left max-w-4xl">
            <div
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-white"
              style={{ textShadow: "0 0 20px rgba(255, 255, 255, 0.3)" }}
            >
              USDFG
            </div>

            <h1
              ref={titleRef}
              className="neocore-h1 mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight"
            >
              <span className="block">
                <span className="text-white">GAME. </span>
                <span 
                  className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent"
                  style={{ 
                    textShadow: "0 0 20px rgba(74, 222, 128, 0.4)",
                    filter: "drop-shadow(0 0 8px rgba(74, 222, 128, 0.3))"
                  }}
                >
                  EARN.
                </span>
              </span>
              <span 
                className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{ 
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))"
                }}
              >
                CONQUER.
              </span>
            </h1>

            <p
              ref={subtitleRef}
              className="neocore-body mb-4 max-w-2xl text-lg sm:text-xl text-white/70 leading-relaxed"
            >
              USDFG wasn't built for everyone.<br />
              It was built for the ones who don't blink.
            </p>

            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row justify-start gap-4"
            >
              <button
                onClick={onExploreClick}
                className="relative font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-white border-0 overflow-hidden group rounded-lg transition-all"
              >
                <span className="relative z-10 flex items-center gap-2">
                  EXPLORE PLATFORM
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>

              <Link to="/whitepaper">
                <button
                  className="font-semibold text-base px-8 py-6 border-2 border-purple-500/50 text-white hover:bg-purple-500/20 hover:border-purple-500 rounded-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  WHITEPAPER
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-[5]" />
    </section>
  );
};

export default HeroSection;
