import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, FileText } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(titleRef.current, { opacity: 0, y: 60 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 40 });
      gsap.set(ctaRef.current, { opacity: 0, y: 30 });
      gsap.set(statsRef.current, { opacity: 0, y: 30 });
      gsap.set(imageRef.current, { scale: 1.2, opacity: 0 });

      // Entrance timeline
      const tl = gsap.timeline({ delay: 0.3 });

      tl.to(imageRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1.8,
        ease: 'power3.out',
      })
        .to(
          titleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=1.2'
        )
        .to(
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.6'
        )
        .to(
          ctaRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'back.out(1.7)',
          },
          '-=0.4'
        )
        .to(
          statsRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.3'
        );

      // Scroll parallax
      gsap.to(contentRef.current, {
        y: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      gsap.to(imageRef.current, {
        y: 50,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { value: '25+', label: 'Supported Game Categories' },
    { value: '50+', label: 'Challenge Formats & Match Types' },
    { value: '100%', label: 'Verified On-Chain Outcomes' },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        ref={imageRef}
        className="absolute inset-0 z-0"
        style={{ willChange: 'transform' }}
      >
        <img
          src="/hero-bg.jpg"
          alt="Esports Arena"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/50" />
        <div className="absolute inset-0 bg-purple/10" />
      </div>

      {/* Animated Grid Overlay */}
      <div className="absolute inset-0 z-[1] opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(126, 67, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(126, 67, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 pt-20"
        style={{ willChange: 'transform' }}
      >
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass rounded-full border border-purple/30">
            <Trophy className="w-4 h-4 text-orange" />
            <span className="font-body text-sm text-white/80">
              Skill-Based Esports Arena
            </span>
          </div>

          {/* Title */}
          <h1
            ref={titleRef}
            className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight mb-6"
          >
            <span className="block">GAME.</span>
            <span className="block text-gradient-green">EARN.</span>
            <span className="block text-gradient-gold">CONQUER.</span>
          </h1>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="font-body text-lg sm:text-xl text-white/70 max-w-2xl mb-8 leading-relaxed"
          >
            Join a skill-based esports crypto ecosystem built for competitors.
            Challenge players, manage tournaments, and earn verified rewards
            through performance.
          </p>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-wrap gap-4 mb-12">
            <Button
              size="lg"
              className="relative font-display font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Explore Platform
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-display font-semibold text-base px-8 py-6 border-purple/50 text-white hover:bg-purple/20 hover:border-purple"
            >
              <Link to="/whitepaper">
                <FileText className="w-5 h-5 mr-2" />
                Whitepaper
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            className="flex flex-wrap gap-8 sm:gap-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-left">
                <div className="font-display font-bold text-2xl sm:text-3xl text-gradient">
                  {stat.value}
                </div>
                <div className="font-body text-sm text-white/50 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent z-[5]" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple/20 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-orange/10 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default Hero;
