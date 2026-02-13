import React from "react";
import Reveal from "@/components/Reveal";

const AboutSection: React.FC = () => {
  return (
    <Reveal
      as="section"
      id="about-usdfg"
      className="relative flex justify-center items-center min-h-[60vh] px-4 sm:px-6 lg:px-12 xl:px-20 py-12 lg:py-16 overflow-hidden"
      selector="[data-about-reveal]"
      stagger={false}
    >

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div
          data-about-reveal
          className="relative w-full bg-black/40 backdrop-blur-sm rounded-lg px-6 lg:px-8 py-8 lg:py-10 flex flex-col items-center transition-all duration-500 kimi-bottom-neon" style={{ 
            '--neon-color': 'rgba(168, 85, 247, 0.3)',
            '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
          } as React.CSSProperties}
        >
          {/* Gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />

          <div className="relative z-10 w-full flex flex-col items-center text-center space-y-4">
            <h2
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
                className="text-base md:text-lg lg:text-xl text-center mb-4 font-semibold text-white leading-relaxed"
                style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.2)" }}
              >
                USDFG is a skill-based competition platform where players challenge each other directly, lock challenge assets on-chain, compete, and earn verified rewards through performance. Wallet-driven, non-custodial, and built for skill.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
};

export default AboutSection;
