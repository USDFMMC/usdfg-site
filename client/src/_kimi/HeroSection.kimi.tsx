/**
 * Kimi Hero Section – Visual & Animation Reference Only
 * Extracted from Kimi_Agent_Deployment_v1 (Areigna - Elite Esports Arena design).
 * Original Hero lives in bundled assets/index-CiHexlOG.js (src/sections/Hero.tsx).
 * Do not import into production – reference only.
 */

import React from "react";

export const HeroSectionKimi: React.FC = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background with grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)", backgroundSize: "50px 50px" }}
      />

      {/* Hero content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 pt-20" style={{ willChange: "transform" }}>
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass rounded-full border border-purple/30">
            <span className="w-4 h-4 text-orange" />
            <span className="font-body text-sm text-white/80">World&apos;s Premier Esports Arena</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight mb-6">
            <span className="block">COMPETE.</span>
            <span className="block">WIN.</span>
            <span className="block">DOMINATE.</span>
          </h1>

          {/* CTA and supporting copy – reference structure from Kimi bundle */}
          <p className="text-white/80 text-lg mb-8 max-w-2xl">
            Elite esports arena. Challenge opponents. Claim glory.
          </p>
        </div>
      </div>

      {/* Hero background image: hero-bg.jpg */}
      <img src="./hero-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover -z-10" aria-hidden />
    </section>
  );
};
