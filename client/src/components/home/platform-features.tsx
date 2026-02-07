import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const PlatformFeatures: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const featuresRef = useRef<HTMLDivElement[]>([]);

  const features: Feature[] = [
    {
      title: "Get USDFG Into Your Wallet",
      icon: "🪙",
      description: "Buy, earn, or claim USDFG into your wallet. You use it to access challenges and participate in verified competition."
    },
    {
      title: "Create Skill Challenges",
      icon: "🎮",
      description: "Choose your game, define the rules, and launch a challenge from your wallet. No accounts required."
    },
    {
      title: "Verified Results",
      icon: "🏆",
      description: "Results are confirmed by players. When both sides agree, rewards release automatically."
    },
    {
      title: "Wallet Based Stats",
      icon: "📊",
      description: "View verified wins, match history, and progression tied to your wallet activity."
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(titleRef.current, { opacity: 0, y: 30 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 20 });
      featuresRef.current.forEach((ref) => {
        if (ref) gsap.set(ref, { opacity: 0, y: 40 });
      });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .to(
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .to(
          featuresRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.1,
          },
          '-=0.3'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 xl:px-20 text-white relative overflow-hidden"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <h2
          ref={titleRef}
          className="neocore-h2 text-center mb-3 text-white"
          style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.4)' }}
        >
          USDFG – The Bitcoin of Gaming
        </h2>
        <p
          ref={subtitleRef}
          className="neocore-body text-center mb-8 lg:mb-12 text-white/70 text-lg sm:text-xl leading-relaxed"
        >
          A decentralized arena for competitive gaming.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              ref={(el) => {
                if (el) featuresRef.current[idx] = el;
              }}
              className="relative group p-4 lg:p-6 bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
              tabIndex={0}
            >
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
              
              <div className="relative z-10">
                <span
                  className="block text-3xl lg:text-4xl mb-3"
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))",
                    animation: "bounceSlow 4s ease-in-out infinite",
                  }}
                >
                  {feature.icon}
                </span>
                <h3
                  className="text-base lg:text-lg font-semibold tracking-wide mb-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                  style={{
                    textShadow: "0 0 20px rgba(251, 191, 36, 0.3)",
                    filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.2))",
                  }}
                >
                  {feature.title}
                </h3>
                <p className="neocore-body text-sm lg:text-base leading-relaxed text-white/70">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Custom Animations */}
      <style>{`
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </section>
  );
};

export default PlatformFeatures;
