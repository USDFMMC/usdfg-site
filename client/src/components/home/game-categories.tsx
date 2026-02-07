import React, { useEffect, useRef } from "react";
import { motion } from 'framer-motion';
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Game {
  image: string;
  title: string;
  challenges: string;
  alt: string;
}

const GameCategories: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLDivElement>(null);

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

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(headingRef.current, { opacity: 0, y: 30 });
      gsap.set(introRef.current, { opacity: 0, y: 20 });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(headingRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .to(
          introRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 xl:px-20 text-white relative overflow-hidden"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.h2
          ref={headingRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-wide mb-3 text-center"
          style={{
            textShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
          }}
        >
          <span
            className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
            style={{
              textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
              filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
            }}
          >
            Supported Games
          </span>
        </motion.h2>
        
        {/* Animated Divider */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "180px" }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mb-6 lg:mb-8 h-0.5 rounded-full bg-gradient-to-r from-amber-400/80 via-orange-500/80 to-amber-400/80 animate-pulse"
          style={{
            boxShadow: "0 0 20px rgba(251,191,36,0.4)",
          }}
        />

        {/* Intro Paragraph */}
        <motion.div
          ref={introRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative max-w-2xl mx-auto mb-8 lg:mb-12 px-4 lg:px-6 py-4 lg:py-5 rounded-lg text-center bg-black/40 backdrop-blur-sm border border-purple-500/20 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all duration-300"
        >
          {/* Gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
          <p className="relative z-10 text-sm md:text-base lg:text-lg text-white/80 leading-relaxed font-medium">
            USDFG supports competitive play across major genres and platforms. If it can be played with skill, it can be challenged.<br />
            <span
              className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent font-semibold"
              style={{
                textShadow: "0 0 20px rgba(74, 222, 128, 0.3)",
                filter: "drop-shadow(0 0 6px rgba(74, 222, 128, 0.2))",
              }}
            >
              Custom rules. Public results. Enforced outcomes.
            </span>
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch h-full"
        >
          {games.map((game, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative h-full flex flex-col"
            >
              <div className="relative rounded-lg p-4 lg:p-6 h-full flex flex-col bg-black/40 backdrop-blur-sm border border-purple-500/20 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60 transition-all duration-500 hover:scale-[1.02]">
                {/* Gradient glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                
                <div className="relative z-10">
                  <div className="relative mb-3">
                    <img
                      src={game.image.replace('.png', '.webp')}
                      alt={game.alt}
                      className="w-full h-24 lg:h-32 object-cover rounded-lg shadow-[0_0_20px_rgba(147,51,234,0.2)]"
                      loading="lazy" decoding="async"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3
                      className="text-base lg:text-lg font-semibold mb-2 flex items-center gap-2 transition-colors duration-300"
                      style={{
                        textShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <span className="animate-bounce">{game.title.split(' ')[0]}</span>
                      <span className="group-hover:bg-gradient-to-r group-hover:from-amber-300 group-hover:via-yellow-400 group-hover:to-amber-400 group-hover:bg-clip-text group-hover:text-transparent">
                        {game.title.split(' ').slice(1).join(' ')}
                      </span>
                    </h3>
                    <p className="text-white/70 text-sm lg:text-base whitespace-pre-line leading-relaxed">
                      {game.challenges}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default GameCategories;
