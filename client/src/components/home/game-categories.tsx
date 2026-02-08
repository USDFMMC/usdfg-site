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
  icon: string;
  metric: string;
}

const GameCategories: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLDivElement>(null);

  const games: Game[] = [
    {
      image: "/assets/usdfg-sports-game-competition.png",
      title: "Sports Game Challenge",
      challenges: "Compete across major sports genres. Outplay the competition. Only the best walk away.",
      alt: "USDFG sports game competition - dominate head-to-head matches",
      icon: "🏀",
      metric: "50K+"
    },
    {
      image: "/assets/usdfg-fighting-game-tournament.png",
      title: "Fighting Game Challenge",
      challenges: "Every move counts. No gimmicks, no RNG — just pure skill.",
      alt: "USDFG fighting game tournament - master combos and counters",
      icon: "🥋",
      metric: "10K+"
    },
    {
      image: "/assets/usdfg-racing-game-challenge.png",
      title: "Racing Game Challenge",
      challenges: "Time is your enemy. Every millisecond earned, not given.",
      alt: "USDFG racing game challenge - test your precision and speed",
      icon: "🏎️",
      metric: "1M+"
    },
    {
      image: "/assets/usdfg-shooting-game-battle.png",
      title: "Shooter Game Challenge",
      challenges: "Clutch moments. Custom chaos. Only your aim decides the outcome.",
      alt: "USDFG shooting game battle - prove your aim and reflexes",
      icon: "🔫",
      metric: "100+"
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
    hidden: { opacity: 0, y: 6 },
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
      gsap.set(headingRef.current, { opacity: 0, y: 12 });
      gsap.set(introRef.current, { opacity: 0, y: 8 });

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
      className="relative py-20 px-4 sm:px-6 lg:px-12 xl:px-20 text-white overflow-hidden"
    >

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading - using Kimi exact design */}
        <motion.h2
          ref={headingRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <h2 className="kimi-font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
            <span className="block">SUPPORTED</span>
            <span className="block text-gradient-kimi mt-1">GAMES</span>
          </h2>
        </motion.h2>

        {/* Intro Paragraph - using Kimi exact design */}
        <motion.div
          ref={introRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <p className="kimi-font-body text-white/80 text-base md:text-lg">
            USDFG supports competitive play across major genres and platforms. If it can be played with skill, it can be challenged.
          </p>
        </motion.div>

        {/* Kimi-style horizontal card layout - exact sizing */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {games.map((game, index) => {
            // Different neon colors per card - bottom-emissive only
            const neonColors = [
              { color: 'rgba(34, 197, 94, 0.4)', hoverColor: 'rgba(34, 197, 94, 0.6)' }, // Green
              { color: 'rgba(168, 85, 247, 0.4)', hoverColor: 'rgba(168, 85, 247, 0.6)' }, // Purple
              { color: 'rgba(244, 114, 182, 0.4)', hoverColor: 'rgba(244, 114, 182, 0.6)' }, // Pink
              { color: 'rgba(245, 158, 11, 0.4)', hoverColor: 'rgba(245, 158, 11, 0.6)' }, // Gold/Amber
            ];
            const neon = neonColors[index % neonColors.length];
            
            return (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative h-full"
            >
              <div 
                className="relative h-full flex flex-col rounded-xl overflow-hidden kimi-glass transition-all duration-300 kimi-bottom-neon"
                style={{ 
                  minHeight: '400px',
                  '--neon-color': neon.color,
                  '--neon-hover-color': neon.hoverColor,
                } as React.CSSProperties}
              >
                
                <div className="relative z-10 flex flex-col h-full">
                  {/* Image - Kimi style: full card image with overlay elements */}
                  <div className="relative w-full h-64 lg:h-72 overflow-hidden flex-shrink-0">
                    {/* Icon - top left corner (Kimi style) */}
                    <div className="absolute top-3 left-3 z-20 w-10 h-10 rounded-full border-2 border-white/30 bg-black/40 backdrop-blur-sm flex items-center justify-center text-2xl">
                      {game.icon}
                    </div>
                    
                    {/* Metric - top right corner (Kimi style) */}
                    <div className="absolute top-3 right-3 z-20 kimi-font-body text-white font-bold text-sm lg:text-base px-2 py-1 bg-black/40 backdrop-blur-sm rounded">
                      {game.metric}
                    </div>
                    
                    <img
                      src={game.image.replace('.png', '.webp')}
                      alt={game.alt}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                  
                  {/* Content - using Kimi exact design */}
                  <div className="flex flex-col flex-1 p-4 lg:p-6 min-h-[120px]">
                    <h3 className="kimi-font-display text-lg lg:text-xl font-bold text-white mb-2 group-hover:text-gradient-kimi transition-colors">
                      {game.title}
                    </h3>
                    <p className="kimi-font-body text-white/70 text-sm lg:text-base leading-relaxed">
                      {game.challenges}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            );
          })}
        </motion.div>
      </div>
      
      {/* Neon lights at bottom - matching Kimi style exactly */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-[5]" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-purple-600/30 via-purple-500/15 to-transparent z-[4]" style={{ 
        boxShadow: "0 -15px 50px rgba(147, 51, 234, 0.4), 0 -5px 20px rgba(168, 85, 247, 0.3)",
      }} />
    </section>
  );
};

export default GameCategories;
