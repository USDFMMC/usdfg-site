import React from "react";
import { Swords, Trophy, BarChart3 } from "lucide-react";
import Reveal from "@/components/Reveal";

const features = [
  {
    icon: Swords,
    title: "Create Challenges",
    description: "Get USDFG into your wallet, then choose your game, define the rules, and launch a challenge. No accounts, just player-owned flow. Lock challenge assets, compete, and verify results directly.",
    image: "/_kimi/feature-challenge.jpg",
    metric: "Player-Created",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Trophy,
    title: "Verified Results",
    description: "Results are confirmed by players. When both sides agree, rewards release automatically and are finalized on-chain. No randomness. No house. Just your skill and verified outcomes.",
    image: "/_kimi/feature-tournament.jpg",
    metric: "On-Chain",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: BarChart3,
    title: "Wallet-Based Records",
    description: "View verified wins, match history, and progression tied directly to your wallet identity. Your record is your reputation. Every win is recorded on-chain. Only your skill matters.",
    image: "/_kimi/feature-warroom.jpg",
    metric: "Skill-Based",
    color: "from-blue-500 to-blue-600",
  },
];

const PlatformFeatures: React.FC = () => {
  return (
    <Reveal
      as="section"
      preset="section"
      id="platform"
      className="relative py-24 lg:py-32 w-full"
      selector="[data-platform-reveal]"
    >
      <div className="absolute inset-0 bg-gradient-radial-kimi opacity-50" />
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header - Kimi Exact */}
        <div data-platform-reveal className="text-center mb-16 lg:mb-20">
          <span className="inline-block font-body text-sm text-purple-500 uppercase tracking-[0.3em] mb-4">
            THE PLATFORM
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            <span className="block text-white">THE BITCOIN</span>
            <span className="block">
              <span className="text-white">OF </span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                GAMING
              </span>
            </span>
          </h2>
          <p className="font-body text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Three pillars designed to elevate your competitive gaming experience to legendary heights.
          </p>
        </div>

        {/* Feature Cards - Kimi Exact Structure with Images */}
        <Reveal
          as="div"
          preset="platformCards"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
          selector=".platform-feature-card"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="platform-feature-card group relative"
            >
              <div className="relative h-full glass border border-purple-500/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.25)]">
                {/* Image - Kimi Exact */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  
                  {/* Shine Effect - Kimi Exact */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  {/* Icon Badge - Kimi Exact */}
                  <div className={`absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-gradient-to-br ${feature.color} rounded-xl shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Metric Badge - Kimi Exact */}
                  <div className="absolute top-4 right-4 px-4 py-2 kimi-glass rounded-full">
                    <span className="font-display font-bold text-sm text-gradient">
                      {feature.metric}
                    </span>
                  </div>
                </div>

                {/* Content - Kimi Exact */}
                <div className="p-6">
                  <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-gradient transition-all">
                    {feature.title}
                  </h3>
                  <p className="font-body text-white/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Gradient - Kimi Exact */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color}`} />

                {/* Hover Glow - Kimi Exact */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </Reveal>
  );
};

export default PlatformFeatures;
