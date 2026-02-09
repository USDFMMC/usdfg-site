import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Lock, CheckCircle2, FileCode, Shield } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const trustPoints = [
  {
    icon: Lock,
    title: "Challenge Assets Locked On-Chain",
    description: "Challenge amounts remain locked on-chain until outcomes are verified. Non-custodial—the platform never holds your assets.",
  },
  {
    icon: CheckCircle2,
    title: "Results Confirmed by Players",
    description: "Both players confirm match results. If there's a dispute, the verification flow ensures fair resolution before any outcome-based release.",
  },
  {
    icon: FileCode,
    title: "Smart Contracts Enforce Outcomes",
    description: "Verified rewards release automatically through smart contracts. No manual intervention. No house control. Just code-enforced fairness.",
  },
  {
    icon: Shield,
    title: "Platform Does Not Custody Assets",
    description: "USDFG is a non-custodial platform. Your wallet, your challenge assets, your verified results. The platform facilitates but never controls.",
  },
];

const TrustVerification: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards animation
      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        gsap.fromTo(
          card,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="trust-verification"
      className="relative py-24 lg:py-32 w-full"
    >
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span className="inline-block kimi-font-body text-sm text-purple-500 uppercase tracking-[0.3em] mb-4">
            Trust & Security
          </span>
          <h2 className="kimi-font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            Trust & <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">Verification</span>
          </h2>
          <p className="kimi-font-body text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            How USDFG ensures fair, transparent, and secure competition through on-chain enforcement and player verification.
          </p>
        </div>

        {/* Trust Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {trustPoints.map((point, index) => (
            <div
              key={index}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="group relative"
            >
              <div className="relative h-full kimi-glass border border-purple-500/20 rounded-2xl p-6 overflow-hidden transition-all duration-500 hover:border-purple-500/50 kimi-bottom-neon" style={{
                '--neon-color': 'rgba(168, 85, 247, 0.3)',
                '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
              } as React.CSSProperties}>
                {/* Icon */}
                <div className="w-12 h-12 flex items-center justify-center bg-purple-500/20 rounded-xl mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <point.icon className="w-6 h-6 text-purple-400" />
                </div>

                {/* Content */}
                <h3 className="kimi-font-display font-bold text-lg text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-orange-400 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                  {point.title}
                </h3>
                <p className="kimi-font-body text-white/60 text-sm leading-relaxed">
                  {point.description}
                </p>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustVerification;
