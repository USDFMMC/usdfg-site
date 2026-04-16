import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const CTA = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Content animation
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    // Particle animation
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        let animationId: number;
        let particles: Array<{
          x: number;
          y: number;
          vx: number;
          vy: number;
          size: number;
          alpha: number;
        }> = [];

        const resize = () => {
          canvas.width = canvas.offsetWidth * window.devicePixelRatio;
          canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        };

        resize();
        window.addEventListener('resize', resize);

        // Create particles
        for (let i = 0; i < 100; i++) {
          particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.8 + 0.2,
          });
        }

        const animate = () => {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);

          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;

            // Reset if out of bounds
            if (
              p.x < 0 ||
              p.x > canvas.width ||
              p.y < 0 ||
              p.y > canvas.height
            ) {
              p.x = canvas.width / 2;
              p.y = canvas.height / 2;
              p.vx = (Math.random() - 0.5) * 4;
              p.vy = (Math.random() - 0.5) * 4;
            }

            ctx2d.beginPath();
            ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx2d.fillStyle = `rgba(126, 67, 255, ${p.alpha})`;
            ctx2d.fill();
          });

          animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
          window.removeEventListener('resize', resize);
          cancelAnimationFrame(animationId);
        };
      }
    }

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/cta-bg.jpg"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-void/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-void" />
      </div>

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div
          ref={contentRef}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 glass rounded-full border border-purple/30">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="font-body text-sm text-white/80">
              Your Journey Begins Now
            </span>
          </div>

          {/* Title */}
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white mb-6 leading-tight">
            READY TO ENTER THE
            <span className="block text-gradient">ARENA</span>
          </h2>

          {/* Subtitle */}
          <p className="font-body text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Compete through skill. Earn verified rewards. Join the skill-based
            competition platform built for performance.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="relative font-display font-semibold text-base px-10 py-7 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group w-full sm:w-auto"
            >
              <Link to="/app">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Enter the Arena
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-display font-semibold text-base px-10 py-7 border-purple/50 text-white hover:bg-purple/20 hover:border-purple w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-body text-sm">Free to Join</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-body text-sm">On-Chain Reward Settlement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-body text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-purple/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-orange/10 rounded-full blur-[100px]" />
    </section>
  );
};

export default CTA;
