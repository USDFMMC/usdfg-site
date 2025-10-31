import React from "react";
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Swords, Flag, Crosshair } from "lucide-react";

interface Game {
  image: string;
  title: string;
  challenges: string;
  alt: string;
}

const GameCategories: React.FC = () => {
  const games: Game[] = [
    {
      image: "/assets/usdfg-sports-game-competition.png",
      title: "🏀 Sports Game Challenge",
      challenges: "Compete across major sports genres. Outplay the competition. Only the best walk away.",
      alt: "USDFG sports game competition - dominate head-to-head matches"
    },
    {
      image: "/assets/usdfg-fighting-game-tournament.png",
      title: "🥋 Fighting Game Challenge",
      challenges: "Every move counts. No gimmicks, no RNG — just pure skill.",
      alt: "USDFG fighting game tournament - master combos and counters"
    },
    {
      image: "/assets/usdfg-racing-game-challenge.png",
      title: "🏎️ Racing Game Challenge",
      challenges: "Time is your enemy. Every millisecond earned, not given.",
      alt: "USDFG racing game challenge - test your precision and speed"
    },
    {
      image: "/assets/usdfg-shooting-game-battle.png",
      title: "🔫 Shooter Game Challenge",
      challenges: "Clutch moments. Custom chaos. Only your aim decides the outcome.",
      alt: "USDFG shooting game battle - prove your aim and reflexes"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="py-12 px-2 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xl md:text-2xl font-extrabold tracking-wide mb-2 text-center drop-shadow-glow"
        >
          Supported Games
        </motion.h2>
        
        {/* Animated Divider */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mb-6 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 animate-pulse shadow-[0_0_32px_#22d3ee99]"
        />

        {/* Elite/Premium Intro Paragraph */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative max-w-2xl mx-auto mb-6 px-3 py-2 rounded-lg bg-gradient-to-br from-white/10 to-amber-900/20 border border-amber-400/30 shadow-[0_0_20px_rgba(255,215,130,0.15)] backdrop-blur-md text-center"
        >
          <p className="text-lg md:text-xl font-extrabold text-white mb-2 drop-shadow-glow">
            The Arena Is Open. Any Game. No Excuses.
          </p>
          <p className="text-sm md:text-base text-amber-100 leading-relaxed font-medium">
            Dominate in the games you know. Rise through the ones they don't expect.<br />
            USDFG supports verified competitive play across all major genres — sports, fighting, racing, and more.<br />
            If it can be played with skill, it can be challenged.<br />
            <span className="text-amber-300 font-semibold">Custom rules. Public results. Smart contract enforcement.</span><br />
            <span className="text-white font-bold">No odds. No bets. Just performance.</span>
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch h-full"
        >
          {games.map((game, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative h-full flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
              <div className="relative bg-[#0d0d0d]/80 backdrop-blur-sm border border-amber-400/30 rounded-lg p-3 shadow-[0_0_12px_rgba(255,215,130,0.15)] hover:shadow-[0_0_20px_rgba(255,215,130,0.25)] transition-all duration-500 hover:scale-[1.02] hover:border-amber-400/50 h-full flex flex-col">
                <div className="relative">
                  <img
                    src={game.image.replace('.png', '.webp')}
                    alt={game.alt}
                    className="w-full h-32 object-cover rounded-lg mb-2 shadow-[0_0_12px_rgba(255,215,130,0.1)]"
                    loading="lazy" decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-1 flex items-center gap-2 group-hover:text-amber-400 transition-colors duration-300">
                    <span className="animate-bounce">{game.title.split(' ')[0]}</span>
                    <span>{game.title.split(' ').slice(1).join(' ')}</span>
                  </h3>
                  <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                    {game.challenges}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default GameCategories;
