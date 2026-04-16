import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FileText, Shield, Target, Coins, Lock, Map, FileCheck, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const navItems = [
  { id: 'why-matters', label: 'Why This Whitepaper Matters' },
  { id: 'trust-badges', label: 'Trust & Compliance Badges' },
  { id: 'vision', label: 'Vision & Mission' },
  { id: 'token-utility', label: 'Token Utility & Legal Framing' },
  { id: 'tokenomics', label: 'Tokenomics & Distribution' },
  { id: 'security', label: 'Security & Self-Custody' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'policies', label: 'Related Policies' },
  { id: 'contact', label: 'Contact & Founder' },
];

const Whitepaper = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header + logo
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        }
      );

      // Disclaimer box
      gsap.fromTo(
        disclaimerRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: disclaimerRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        }
      );

      // Title block
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        }
      );

      // Trust badges - staggered
      const badgeEls = badgesRef.current?.querySelectorAll('span');
      if (badgeEls?.length) {
        gsap.fromTo(
          badgeEls,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: badgesRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
          }
        );
      }

      // On This Page nav
      gsap.fromTo(
        navRef.current,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: navRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        }
      );

      // Content sections - each animates on scroll
      const contentSections = sectionRef.current?.querySelectorAll('section[id]');
      contentSections?.forEach((sec) => {
        gsap.fromTo(
          sec,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: sec, start: 'top 82%', toggleActions: 'play none none reverse' },
          }
        );
      });

      // Tokenomics cards - staggered
      const tokenCards = sectionRef.current?.querySelectorAll('#tokenomics .glass');
      if (tokenCards?.length) {
        gsap.fromTo(
          tokenCards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: tokenCards[0], start: 'top 85%', toggleActions: 'play none none reverse' },
          }
        );
      }

      // Back to top button
      const backBtn = sectionRef.current?.querySelector('.pt-8.border-t');
      if (backBtn) {
        gsap.fromTo(
          backBtn,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power3.out',
            scrollTrigger: { trigger: backBtn, start: 'top 90%', toggleActions: 'play none none reverse' },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="whitepaper"
      className="relative py-24 lg:py-32 w-full bg-void-dark"
    >
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div ref={headerRef} className="flex items-center gap-2 mb-8">
            <img src="/usdfglogo.png" alt="USDFG" className="h-10 w-auto object-contain" />
            <span className="font-display font-bold text-xl text-white">USDFG</span>
          </div>

          <div ref={disclaimerRef} className="glass border border-purple/20 rounded-2xl p-6 lg:p-8 mb-8">
            <p className="font-body text-sm text-white/60 leading-relaxed">
              <strong className="text-white">Disclaimer:</strong> USDFG is a decentralized utility
              token for gameplay and access on USDFGAMING. Not a security, equity, or investment.
              No promises of profit, yield, or value guarantees. Use is performance-based,
              skill-driven, and non-custodial. Participation is optional and self-directed. See{' '}
              <Link to="/terms" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Privacy Policy</Link>
              {' '}for full details.
            </p>
          </div>

          {/* Title */}
          <div ref={titleRef}>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-4">
            USDFG Whitepaper
          </h1>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-gradient mb-8">
            The Token of Gaming
          </h2>
          </div>

          {/* Trust Badges */}
          <div
            ref={badgesRef}
            id="trust-badges"
            className="flex flex-wrap gap-3 mb-12"
          >
            {['100% Non-Custodial', 'Skill-Based Rewards', 'No Gambling', 'No Passive Yield', 'Fixed Supply'].map(
              (badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border border-purple/30 text-sm text-white/80"
                >
                  <Shield className="w-4 h-4 text-orange" />
                  {badge}
                </span>
              )
            )}
          </div>

          {/* On This Page */}
          <div ref={navRef} className="glass border border-purple/20 rounded-xl p-6 mb-12">
            <p className="font-body text-sm text-purple uppercase tracking-wider mb-4">
              On This Page
            </p>
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-body text-sm text-white/70 hover:text-purple transition-colors px-2 py-1"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Why This Whitepaper Matters */}
          <section id="why-matters" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple" />
              Why This Whitepaper Matters
            </h3>
            <p className="font-body text-white/70 leading-relaxed mb-4">
              USDFGAMING is built for competitors who value skill, fairness, and full control.
              Rewards are earned through performance, not purchases or passive yield. The platform
              is decentralized, transparent, and non-custodial by design. Every outcome is
              recorded. Every reward is earned.
            </p>
            <p className="font-body text-white/70 leading-relaxed mb-4 font-semibold">
              Gaming has always rewarded skill. Crypto rarely has. USDFG bridges that gap.
            </p>
            <p className="font-body text-sm text-white/50">
              Last Updated: May 2025 | Version: v2.0
            </p>
          </section>

          {/* Vision & Mission */}
          <section id="vision" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple" />
              Vision & Mission
            </h3>
            <p className="font-body text-white/70 leading-relaxed mb-4">
              <strong className="text-white">USDFG exists to make one thing clear. Skill defines success.</strong>
            </p>
            <p className="font-body text-white/70 leading-relaxed mb-4">
              Our mission: build the most trusted competitive platform.
            </p>
            <p className="font-body text-white/70 leading-relaxed mb-2">
              Every match earned.
            </p>
            <p className="font-body text-white/70 leading-relaxed mb-2">
              Every reward real.
            </p>
            <p className="font-body text-white/70 leading-relaxed mb-4">
              Every user in control. No middlemen. No house. Just you and your skill.
            </p>
          </section>

          {/* Token Utility */}
          <section id="token-utility" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Coins className="w-6 h-6 text-purple" />
              Token Utility & Legal Framing
            </h3>
            <p className="font-body text-white/70 leading-relaxed mb-4">
              USDFG is a utility token for skill-based access, challenge entry, and verifiable
              rewards. Not a security, investment, or speculative asset. No staking, no passive
              yield, non-custodial. Users control their wallets. Always. See Terms of Service for
              full legal details.
            </p>
          </section>

          {/* Tokenomics */}
          <section id="tokenomics" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Coins className="w-6 h-6 text-purple" />
              Tokenomics & Distribution
            </h3>
            <p className="font-body text-white/80 font-semibold mb-6">
              Total Supply: 21,000,000 USDFG (Fixed, non-inflationary)
            </p>
            <div className="space-y-4">
              <div className="glass border border-purple/20 rounded-xl p-4">
                <p className="font-display font-bold text-lg text-white mb-2">65% Public Trading</p>
                <p className="font-body text-white/70 text-sm">
                  Non-custodial, open market supply. No presale, no early access, no staking. Equal
                  acquisition opportunity via public decentralized exchanges.
                </p>
              </div>
              <div className="glass border border-purple/20 rounded-xl p-4">
                <p className="font-display font-bold text-lg text-white mb-2">15% Core Reserve</p>
                <p className="font-body text-white/70 text-sm">
                  Reserved for long-term ecosystem growth, platform expansion, strategic initiatives,
                  and founder alignment. This allocation reflects long-term commitment to the
                  platform and may be utilized responsibly to support continued development,
                  sustainability, and operational needs. Allocation remains transparent and
                  on-chain.
                </p>
              </div>
              <div className="glass border border-purple/20 rounded-xl p-4">
                <p className="font-display font-bold text-lg text-white mb-2">10% Development & Operations</p>
                <p className="font-body text-white/70 text-sm">
                  Platform development, infrastructure, scaling, and operations. Includes allocation
                  for external contributors and technical partners.
                </p>
              </div>
              <div className="glass border border-purple/20 rounded-xl p-4">
                <p className="font-display font-bold text-lg text-white mb-2">10% Rewards & Challenges</p>
                <p className="font-body text-white/70 text-sm">
                  Skill-based tournaments, no-entry-fee promotions, new player incentives, and
                  limited challenge events.
                </p>
              </div>
            </div>
            <p className="font-body text-sm text-white/50 mt-4">
              Full legal and compliance details:{' '}
              <Link to="/privacy" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Terms of Service</Link>.
            </p>
          </section>

          {/* Security */}
          <section id="security" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-purple" />
              Security & Self-Custody
            </h3>
            <p className="font-body text-white/70 leading-relaxed">
              USDFG is 100% non-custodial. We do not hold funds, keys, or personal data. All
              transactions are on-chain and user-controlled. If you lose wallet access, recovery is
              not possible. Self-custody is your responsibility. Period.
            </p>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Map className="w-6 h-6 text-purple" />
              What's Ahead for USDFG
            </h3>
            <div className="space-y-4">
              <p className="font-body text-white/70 flex items-start gap-2">
                <span className="text-purple font-semibold shrink-0">Phase 1:</span>
                Verified Head-to-Head Challenges
              </p>
              <p className="font-body text-white/70 flex items-start gap-2">
                <span className="text-purple font-semibold shrink-0">Phase 2:</span>
                Competitive Leaderboards & Limited-Supply Rewards
              </p>
              <p className="font-body text-white/70 flex items-start gap-2">
                <span className="text-purple font-semibold shrink-0">Phase 3:</span>
                Expanded Skill Arenas & Category Growth
              </p>
            </div>
            <p className="font-body text-white/70 leading-relaxed mt-4">
              No hype cycles. No inflation mechanics. Just expansion through performance.
            </p>
          </section>

          {/* Related Policies */}
          <section id="policies" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-purple" />
              Related Policies
            </h3>
            <p className="font-body text-white/70 leading-relaxed">
              Full legal and privacy details:{' '}
              <Link to="/privacy" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-purple hover:text-orange transition-colors underline underline-offset-2">Terms of Service</Link>.
              {' '}USDFG is built for transparency, security, and fairness.
            </p>
          </section>

          {/* Contact */}
          <section id="contact" className="mb-12">
            <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-purple" />
              Contact & Founder
            </h3>
            <p className="font-body text-white/70 leading-relaxed mb-6">
              Questions, compliance, or media:{' '}
              <a href="mailto:founder@usdfg.pro" className="text-purple hover:text-orange transition-colors">
                founder@usdfg.pro
              </a>
              ,{' '}
              <a href="mailto:support@usdfg.pro" className="text-purple hover:text-orange transition-colors">
                support@usdfg.pro
              </a>
              , or DM @USDFGAMING on X.
            </p>
            <div className="glass border border-purple/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <img src="/usdfglogo.png" alt="USDFG" className="h-12 w-auto object-contain" />
                <div>
                  <p className="font-display font-bold text-lg text-white">Hussein Ali</p>
                  <p className="font-body text-sm text-white/60">
                    Founder & Lead Developer, USDFGAMING
                  </p>
                </div>
              </div>
              <p className="font-body text-sm text-white/50">
                Signed digitally for legal compliance and user trust.
              </p>
            </div>
            <p className="font-body text-white/70 font-semibold mt-8 mb-8">
              USDFG was built to endure scrutiny.
            </p>
            <div className="glass border border-purple/10 rounded-xl p-4 mt-6">
              <p className="font-body text-xs text-white/50">
                <strong className="text-white">Legal Note:</strong> Not financial advice. Does not
                offer or solicit investment. USDFG is a fixed-supply utility token for skill-based
                access and entertainment. Participation optional at your own discretion.
              </p>
            </div>
          </section>

          {/* Back to top */}
          <div className="pt-8 border-t border-purple/20">
            <Button
              variant="outline"
              className="font-body border-purple/50 text-white hover:bg-purple/20"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Whitepaper;
