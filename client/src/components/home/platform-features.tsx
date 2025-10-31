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
      description: "Buy, earn, or claim USDFG directly into your wallet. Use tokens to access skill-based challenges — not for speculation or staking."
    },
    {
      title: "Create Skill Challenges",
      icon: "🎮",
      description: "Choose your game. Set the rules. Launch skill-based challenges directly from your wallet — no middlemen, no chance elements."
    },
    {
      title: "Earn Verified Results",
      icon: "🏆",
      description: "USDFG is unlocked through proof of performance — not by chance, not by hype."
    },
    {
      title: "Track Wallet Stats",
      icon: "📊",
      description: "See your performance in real time — verified wins, challenge history, and skill progression, all tied to your wallet, not an account."
    }
  ];

  return (
    <section id="platform" className="py-12 px-2 text-white text-center relative overflow-hidden">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-white animate-fade-in" style={{ textShadow: 'var(--primary-glow)' }}>
        USDFG – The Bitcoin of Gaming
      </h2>
      <p className="text-center text-sm text-muted-foreground mb-6 animate-fade-in" style={{ textShadow: 'var(--neon-glow)' }}>
        A decentralized arena where skill is the only currency.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="feature-card group bg-[#111]/90 border border-amber-400/30 rounded-lg shadow-[0_0_15px_rgba(255,215,130,0.15)] backdrop-blur-md p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,215,130,0.25)] hover:border-amber-400/50 relative overflow-hidden animate-fade-in-up"
            tabIndex={0}
            style={{ boxShadow: '0 0 12px rgba(255,215,130,0.12), 0 0 3px rgba(255,215,130,0.06)' }}
          >
            <span className="block text-2xl mb-2 drop-shadow-glow animate-bounce-slow">{feature.icon}</span>
            <h3 className="text-base font-semibold tracking-wide text-amber-300 mb-1 drop-shadow-glow">{feature.title}</h3>
            <p className="text-amber-100 text-sm leading-relaxed font-medium">{feature.description}</p>
          </div>
        ))}
      </div>
      {/* Custom Animations & Neon Glow */}
      <style>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 3px rgba(255,215,130,0.5));
        }
        .neon-glow {
          box-shadow: 0 0 16px #00ffff44, 0 0 32px #00ffff22;
          animation: neonPulse 4s ease-in-out infinite alternate;
        }
        @keyframes neonPulse {
          0% { box-shadow: 0 0 16px #00ffff44, 0 0 32px #00ffff22; }
          100% { box-shadow: 0 0 24px #00ffff66, 0 0 48px #00ffff33; }
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
        .feature-card {
          outline: 2px solid #00ffff;
          outline-offset: 0px;
        }
      `}</style>
    </section>
  );
};

export default PlatformFeatures;
