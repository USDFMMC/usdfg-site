import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Gamepad2, Users, ShieldCheck } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: Gamepad2,
    number: "01",
    title: "Create a Challenge",
    description: "Define your game, set the rules, and lock the challenge amount. No accounts needed—just your wallet and your challenge.",
  },
  {
    icon: Users,
    number: "02",
    title: "Compete and Submit Results",
    description: "Play the match and submit your results. Both players confirm outcomes through the non-custodial, wallet-based flow.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Results Verified, Rewards Released",
    description: "When both sides agree, verified rewards release automatically and are finalized on-chain. Smart contracts enforce outcomes.",
  },
];

const HowItWorks: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

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

      // Steps animation
      stepsRef.current.forEach((step, index) => {
        if (!step) return;

        gsap.fromTo(
          step,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
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
      id="how-it-works"
      className="relative py-24 lg:py-32 w-full"
    >
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span className="inline-block kimi-font-body text-sm text-purple-500 uppercase tracking-[0.3em] mb-4">
            The Process
          </span>
          <h2 className="kimi-font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            How Competition Works on <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">USDFG</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              ref={(el) => { stepsRef.current[index] = el; }}
              className="group relative"
            >
              <div className="relative h-full kimi-glass border border-purple-500/20 rounded-2xl p-6 overflow-hidden transition-all duration-500 hover:border-purple-500/50 kimi-bottom-neon" style={{
                '--neon-color': 'rgba(168, 85, 247, 0.3)',
                '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
              } as React.CSSProperties}>
                {/* Number */}
                <div className="kimi-font-display font-bold text-5xl text-purple-500/20 mb-4 group-hover:text-purple-500/30 transition-colors">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 flex items-center justify-center bg-purple-500/20 rounded-xl mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <step.icon className="w-6 h-6 text-purple-400" />
                </div>

                {/* Content */}
                <h3 className="kimi-font-display font-bold text-lg text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-orange-400 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                  {step.title}
                </h3>
                <p className="kimi-font-body text-white/60 text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="kimi-font-body text-sm text-white/40 max-w-xl mx-auto">
            USDFG facilitates the process but does not influence outcomes.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
