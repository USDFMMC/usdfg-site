import React from "react";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const PlatformFeatures: React.FC = () => {
  const features: Feature[] = [
    {
      title: "Fuel Your Wallet with USDFG",
      icon: "🪙",
      description: "Buy, earn, or claim USDFG directly into your wallet. Use tokens to access challenges — not for speculation or staking."
    },
    {
      title: "Create Skill Challenges",
      icon: "🎮",
      description: "Choose your game. Set the rules. Launch challenges directly from your wallet — no middlemen."
    },
    {
      title: "Earn Verified Results",
      icon: "🏆",
      description: "USDFG is unlocked through verified results — not by chance, not by hype."
    },
    {
      title: "Track Wallet Stats",
      icon: "📊",
      description: "See your performance in real time — verified wins, challenge history, and progression, all tied to your wallet, not an account."
    }
  ];

  return (
    <section id="platform" className="py-8 px-3 text-white text-center relative overflow-hidden bg-[#07080C]">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white animate-fade-in" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
        USDFG – The Bitcoin of Gaming
      </h2>
      <p className="text-center text-sm md:text-base text-neutral-400 mb-6 animate-fade-in">
        A decentralized arena for competitive gaming.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="feature-card group bg-[#07080C]/98 border border-amber-400/20 rounded-lg shadow-[0_0_10px_rgba(255,215,130,0.08)] backdrop-blur-md p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,215,130,0.15)] hover:border-amber-400/30 relative overflow-hidden animate-fade-in-up"
            tabIndex={0}
          >
            <span className="block text-2xl mb-2 drop-shadow-glow animate-bounce-slow">{feature.icon}</span>
            <h3 className="text-base font-semibold tracking-wide text-amber-300 mb-2 drop-shadow-glow">{feature.title}</h3>
            <p className="text-amber-100 text-sm leading-relaxed font-medium">{feature.description}</p>
          </div>
        ))}
      </div>
      {/* Custom Animations */}
      <style>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 3px rgba(255,215,130,0.5));
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
