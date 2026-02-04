import React from "react";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const PlatformFeatures: React.FC = () => {
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

  return (
    <section id="platform" className="py-8 px-3 text-white text-center relative overflow-hidden">
      <h2 className="neocore-h2 text-center mb-3 text-white animate-fade-in" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>
        USDFG – The Bitcoin of Gaming
      </h2>
      <p className="neocore-body text-center mb-6 animate-fade-in">
        A decentralized arena for competitive gaming.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="neocore-panel group p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,215,130,0.15)] hover:border-amber-400/30 relative overflow-hidden animate-fade-in-up"
            tabIndex={0}
          >
            <span className="block text-2xl mb-2 drop-shadow-glow animate-bounce-slow">{feature.icon}</span>
            <h3 className="text-base font-semibold tracking-wide text-amber-300 mb-2 drop-shadow-glow">{feature.title}</h3>
            <p className="neocore-body text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
      {/* Custom Animations */}
      <style>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.4));
        }
        .animate-bounce-slow {
          animation: bounceSlow 4s ease-in-out infinite;
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-fade-in-up {
          opacity: 0;
          transform: translateY(32px);
          animation: fadeInUp 1s cubic-bezier(.4,0,.2,1) both;
        }
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </section>
  );
};

export default PlatformFeatures;
