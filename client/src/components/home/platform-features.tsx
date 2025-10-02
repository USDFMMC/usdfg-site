import React from "react";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const PlatformFeatures: React.FC = () => {
  const features: Feature[] = [
    {
      title: "Fuel Your Wallet with $USDFG",
      icon: "🪙",
      description: "Buy, earn, or claim $USDFG directly into your wallet. Use tokens to access skill-based challenges — not for speculation or staking."
    },
    {
      title: "Create Skill Challenges",
      icon: "🎮",
      description: "Choose your game. Set the rules. Launch skill-based challenges directly from your wallet — no middlemen, no chance elements."
    },
    {
      title: "Earn Verified Results",
      icon: "🏆",
      description: "$USDFG is unlocked through proof of performance — not by chance, not by hype."
    },
    {
      title: "Track Wallet Stats",
      icon: "📊",
      description: "See your performance in real time — verified wins, challenge history, and skill progression, all tied to your wallet, not an account."
    }
  ];

  return (
    <section id="platform" className="py-20 px-4 text-white text-center relative overflow-hidden">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fade-in" style={{ textShadow: 'var(--primary-glow)' }}>
        $USDFG – The Bitcoin of Gaming
      </h2>
      <p className="text-center text-lg text-muted-foreground mb-12 animate-fade-in" style={{ textShadow: 'var(--neon-glow)' }}>
        A decentralized arena where skill is the only currency.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="feature-card group bg-[#111]/90 border border-[#22d3ee] rounded-lg shadow-lg backdrop-blur-md p-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_48px_#22d3ee99] hover:border-cyan-300/90 relative overflow-hidden animate-fade-in-up"
            tabIndex={0}
            style={{ boxShadow: '0 0 32px #22d3ee33, 0 0 8px #a78bfa33' }}
          >
            <span className="block text-4xl mb-4 drop-shadow-glow animate-bounce-slow">{feature.icon}</span>
            <h3 className="text-xl font-extrabold tracking-wide text-cyan-300 mb-2 drop-shadow-glow">{feature.title}</h3>
            <p className="text-cyan-100 text-base leading-relaxed font-medium">{feature.description}</p>
          </div>
        ))}
      </div>
      {/* Custom Animations & Neon Glow */}
      <style>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px #00ffff);
        }
        .neon-glow {
          box-shadow: 0 0 24px #00ffff44, 0 0 48px #00ffff22;
          animation: neonPulse 2.5s infinite alternate;
        }
        @keyframes neonPulse {
          0% { box-shadow: 0 0 24px #00ffff44, 0 0 48px #00ffff22; border-color: #22d3ee44; }
          100% { box-shadow: 0 0 48px #00ffff99, 0 0 96px #00ffff33; border-color: #00ffffcc; }
        }
        .animate-bounce-slow {
          animation: bounceSlow 2.2s infinite;
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
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
