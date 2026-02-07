import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const AboutSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(titleRef.current, { opacity: 0, y: 30 });
      gsap.set(descriptionRef.current, { opacity: 0, y: 20 });
      gsap.set(taglineRef.current, { opacity: 0, y: 20 });
      gsap.set(cardRef.current, { opacity: 0, scale: 0.95 });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(cardRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
      })
        .to(
          titleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .to(
          descriptionRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .to(
          taglineRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.4'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about-usdfg"
      className="relative flex justify-center items-center min-h-[60vh] px-4 sm:px-6 lg:px-12 xl:px-20 py-12 lg:py-16 overflow-hidden"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div
          ref={cardRef}
          className="relative w-full bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg px-6 lg:px-8 py-8 lg:py-10 flex flex-col items-center transition-all duration-500 hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
        >
          {/* Gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />

          <div className="relative z-10 w-full flex flex-col items-center text-center space-y-4">
            <h2
              ref={titleRef}
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-4"
            >
              What is{' '}
              <span
                className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
                }}
              >
                USDFG?
              </span>
            </h2>
            <div className="max-w-2xl mx-auto text-center">
              <p
                ref={descriptionRef}
                className="text-base md:text-lg lg:text-xl text-center mb-4 font-semibold text-white leading-relaxed"
                style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.2)" }}
              >
                USDFG is the access token for a skill based competition platform where players challenge each other directly, lock funds, play, verify results, and receive rewards through clear outcomes.
              </p>
              <p
                ref={taglineRef}
                className="text-sm md:text-base lg:text-lg text-center bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent font-semibold"
                style={{
                  textShadow: "0 0 20px rgba(74, 222, 128, 0.3)",
                  filter: "drop-shadow(0 0 6px rgba(74, 222, 128, 0.2))",
                }}
              >
                Built for performance and execution, not luck.
              </p>
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

export default AboutSection;
