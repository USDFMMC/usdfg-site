import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import KimiBackground from "@/components/KimiBackground";
import { FaLock, FaTrophy, FaUsers, FaChartLine, FaRocket, FaMobileAlt, FaGamepad, FaCheckCircle, FaGavel, FaUserShield, FaShieldAlt, FaBalanceScale, FaGlobe } from "react-icons/fa";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Removed custom hooks - they were causing useRef dispatcher errors

const toc = [
  { id: "intro", label: "Why This Whitepaper Matters" },
  { id: "trust", label: "Trust & Compliance Badges" },
  { id: "vision", label: "Vision & Mission" },
  { id: "utility", label: "Token Utility & Legal Framing" },
  { id: "tokenomics", label: "Tokenomics & Distribution" },
  { id: "security", label: "Security & Self-Custody" },
  { id: "roadmap", label: "Roadmap" },
  { id: "links", label: "Related Policies" },
  { id: "contact", label: "Contact & Founder" },
];

const tokenomics = [
  { percent: 65, label: "Public Trading", desc: "Non-custodial, open market supply. No presale, no early access, no staking. All users have equal access." },
  { percent: 15, label: "Core Reserve", desc: "This allocation is held by the founder with full discretion. It may be used, held, or distributed at any time — including for personal, strategic, or project-related purposes. Tokens remain non-custodial and fully transparent." },
  { percent: 10, label: "Development & Operations", desc: "Covers active platform work including infrastructure, scaling, ongoing development, and operations. May also support external contributors or contractors." },
  { percent: 10, label: "Rewards & Challenges", desc: "Used for player tournaments, no-fee hosted matches, new user onboarding, and promotional challenge pools." },
];

  const roadmap = [
    {
      icon: <FaRocket className="text-amber-400 text-2xl" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} />, 
      title: "Phase 1 – Foundation (2025)",
    items: [
      "Platform launch: 100% skill-based, no gambling, no staking.",
      "Legal review and compliance in all supported regions.",
      "Public audit of smart contracts and non-custodial systems."
    ]
  },
  {
    icon: <FaGamepad className="text-amber-400 text-2xl" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} />, 
    title: "Phase 2 – Challenge Expansion (2025-2026)",
    items: [
      "Add new skill-based game categories.",
      "Expand challenge verification and anti-cheat systems.",
      "Community feedback and compliance updates."
    ]
  },
  {
    icon: <FaChartLine className="text-amber-400 text-2xl" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} />, 
    title: "Phase 3 – Globalization & Governance (2026+)",
    items: [
      "Global legal review and compliance expansion.",
      "Community governance pilots (no DAOs, no securities).",
      "Ongoing audits and legal transparency."
    ]
  }
];

const Whitepaper: React.FC = () => {
  useEffect(() => {
    // Smooth scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Scroll to anchor if hash is present in URL
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100); // slight delay to ensure DOM is ready
    }
  }, []);

  // Section refs (simple refs without custom hooks)
  const visionRef = useRef<HTMLDivElement>(null);
  const principlesRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const utilityRef = useRef<HTMLDivElement>(null);
  const tokenFlowRef = useRef<HTMLDivElement>(null);
  const disputeRef = useRef<HTMLDivElement>(null);
  const legalRef = useRef<HTMLDivElement>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const tokenomicsRef = useRef<HTMLDivElement>(null);
  const founderRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  // Tokenomics count-up states
  const [val1, setVal1] = useState(0);
  const [val2, setVal2] = useState(0);
  const [val3, setVal3] = useState(0);
  const [val4, setVal4] = useState(0);
  const animRefs = useRef([null, null, null, null]);
  const hasAnimated = useRef(false);

  // Count-up animation function
  const animateCount = (target: number, setter: (value: number) => void, duration = 1000) => {
    let startTime: number | undefined;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setter(Math.floor(progress * target));
      if (progress < 1) {
        animRefs.current[target] = requestAnimationFrame(animate);
      } else {
        setter(target);
      }
    };
    return animate;
  };

  // Scroll-in animation (only once)
  useEffect(() => {
    const node = tokenomicsRef.current;
    if (!node) return;
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          requestAnimationFrame(animateCount(65, setVal1));
          requestAnimationFrame(animateCount(15, setVal2));
          requestAnimationFrame(animateCount(10, setVal3));
          requestAnimationFrame(animateCount(10, setVal4));
        }
      });
    };
    const observer = new window.IntersectionObserver(handleIntersect, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [tokenomicsRef]);

  // Hover handlers
  const handleHover = (target: number, setter: (value: number) => void, idx: number) => {
    return () => {
      setter(0);
      if (animRefs.current[idx]) cancelAnimationFrame(animRefs.current[idx]);
      requestAnimationFrame(animateCount(target, setter));
    };
  };

  return (
    <>
      <Helmet>
        <title>Whitepaper | USDFG.PRO – Skill-Based Crypto Gaming Platform</title>
        <meta name="description" content="Read the USDFGAMING Whitepaper. Discover the vision, tokenomics, and mechanics behind the elite, skill-based crypto gaming platform." />
        <meta name="keywords" content="USDFG, USDFG, whitepaper, crypto gaming whitepaper, skill-based gaming, tokenomics, non-custodial, USDFGAMING" />
        <link rel="canonical" href="https://usdfg.pro/whitepaper" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usdfg.pro/whitepaper" />
        <meta property="og:title" content="Whitepaper | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta property="og:description" content="Read the USDFGAMING Whitepaper. Discover the vision, tokenomics, and mechanics behind the elite, skill-based crypto gaming platform." />
        <meta property="og:image" content="https://usdfg.pro/usdfg-og-banner.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:title" content="Whitepaper | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Read the USDFGAMING Whitepaper. Discover the vision, tokenomics, and mechanics behind the elite, skill-based crypto gaming platform." />
        <meta name="twitter:image" content="https://usdfg.pro/usdfg-og-banner.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "name": "USDFGAMING",
                "url": "https://usdfg.pro",
                "logo": "https://usdfg.pro/usdfg-og-banner.png",
                "sameAs": [
                  "https://twitter.com/USDFGAMING",
                  "https://t.me/+TPjhAyJiAF9mZTI0",
                  "https://instagram.com/usdfgaming",
                  "https://www.tiktok.com/@usdfgames"
                ]
              },
              {
                "@type": "WebPage",
                "url": "https://usdfg.pro/whitepaper",
                "name": "Whitepaper | USDFGAMING – Skill-Based Crypto Gaming Platform",
                "description": "Read the USDFGAMING Whitepaper. Discover the vision, tokenomics, and mechanics behind the elite, skill-based crypto gaming platform."
              }
            ]
          }
        `}</script>
      </Helmet>
      <Navbar />
      <div className="relative flex flex-col md:flex-row">
        {/* Sticky Table of Contents for desktop */}
        <nav className="hidden md:block md:w-64 sticky top-24 h-fit self-start px-4 py-6 mr-8 bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.2)] mt-12 animate-fade-in hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(147,51,234,0.3)] transition-all toc-nav">
          <h2 className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold text-lg mb-4 tracking-wide" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>On This Page</h2>
          <ul className="space-y-2 text-white/70 text-sm toc-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {toc.map((item) => (
              <li key={item.id}><a href={`#${item.id}`} className="hover:text-amber-300 transition">{item.label}</a></li>
            ))}
          </ul>
        </nav>
        <main className="min-h-screen flex-1 text-white relative overflow-hidden">
          {/* Kimi Galaxy Theme Background */}
          <KimiBackground includeGalaxy={true} />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-12 sm:py-16 md:py-20">
            {/* Animated Logo */}
            <div className="flex justify-center mb-6 mt-8">
              <img
                src="/assets/usdfgtokenn.png"
                alt="USDFG Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 border-purple-500/50 shadow-[0_0_32px_rgba(147,51,234,0.4)] animate-float"
                style={{ background: 'rgba(11,11,12,0.7)' }}
              />
            </div>
            <div className="max-w-2xl mx-auto mb-8 mt-8 px-6 py-4 rounded-xl bg-black/40 backdrop-blur-sm border border-purple-500/20 shadow-lg hover:border-purple-500/50 transition-all animate-fade-in">
              <p className="text-base md:text-lg text-white/80 text-center leading-relaxed">
                <span className="font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Disclaimer</span><br />
                USDFG is a decentralized utility token for gameplay and access within the USDFGAMING platform. It is not a security, equity, or financial investment. There are no promises of profit, yield, or guaranteed value. All use is performance-based, skill-driven, and non-custodial. Participation is optional and self-directed. See our <a href="/terms" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Terms of Service</a> and <a href="/privacy" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Privacy Policy</a> for full details.
              </p>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2 mt-8 text-center animate-fade-in" style={{ textShadow: "0 0 20px rgba(255, 255, 255, 0.3)" }}>
              <span
                className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
                }}
              >
                USDFG Whitepaper
              </span>
            </h1>
            <div className="text-xl sm:text-2xl font-extrabold animate-fade-in mb-4 text-center mt-1" style={{
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
              filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))"
            }}>
              The Token of Gaming
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-2 mb-6 animate-fade-in">
              <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white text-xs font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">100% Non-Custodial</span>
              <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white text-xs font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">No Gambling</span>
              <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white text-xs font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">Skill-Based Only</span>
              <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white text-xs font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">Self-Custody</span>
              <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white text-xs font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">Global Compliance</span>
            </div>
            
            {/* Why This Whitepaper Matters */}
            <section id="intro" className="max-w-2xl mx-auto mb-6 lg:mb-8 text-center animate-fade-in">
              <p className="text-lg lg:text-xl font-semibold mb-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>Why This Whitepaper Matters</p>
              <p className="text-base lg:text-lg text-white/80 leading-relaxed">USDFGAMING is built for elite gamers and crypto users who value skill, fairness, and full control. This platform was designed to reward performance — not purchases. Everything is decentralized, transparent, and self-custodial. USDFG isn't built for passive gain. It's built for those who compete with purpose.</p>
            </section>

            {/* Last Updated Notice */}
            <div className="text-center mb-8 lg:mb-12 animate-fade-in">
              <span className="mt-4 inline-block rounded-md px-4 py-2 text-xs bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white/80 font-medium shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">Last Updated: May 2025 &nbsp;|&nbsp; Version: v2.0</span>
            </div>

            {/* Vision & Mission */}
            <section id="vision" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaTrophy className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Vision & Mission</h2>
                <p className="text-white/90 mb-4 text-lg font-semibold">USDFGAMING exists to prove that <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>skill—not luck—defines success</span>.</p>
                <p className="text-white/80 mb-2 leading-relaxed">Our mission is to build the world's most trusted competitive platform: one where every match is earned, every reward is real, and every user stays in control.</p>
                <p className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold mt-4" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>No middlemen. No house. Just you, your wallet, and your skill.</p>
              </div>
            </section>

            {/* Token Utility & Legal Framing */}
            <section id="utility" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaUserShield className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Token Utility & Legal Framing</h2>
                <p className="text-white/80 mb-2 leading-relaxed">USDFG is a utility token designed for skill-based access, challenge entry, and verifiable rewards.</p>
                <p className="text-white/80 mb-2 leading-relaxed">It is not a security, investment, or speculative asset. USDFG offers no staking, no passive yield, and no financial guarantees — all use is non-custodial and performance-based.</p>
                <p className="text-white/80 mb-2 leading-relaxed">Users retain full control of their wallets and assets at all times. No part of USDFG or this platform is structured for financial gain. <a href="/terms" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent hover:underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>See our Terms of Service</a> for full legal details.</p>
              </div>
            </section>

            {/* Tokenomics & Distribution */}
            <section id="tokenomics" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaLock className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Tokenomics & Distribution</h2>
                <p className="text-white/90 mb-4"><b>Total Supply:</b> 21,000,000 USDFG (Fixed, non-inflationary)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all">
                    <h4 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>65% Public Trading</h4>
                    <p className="text-white/70 leading-relaxed">Non-custodial, open market supply. No presale, no early access, no staking. All users have equal opportunity to acquire tokens through public decentralized exchanges.</p>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all">
                    <h4 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>15% Core Reserve</h4>
                    <p className="text-white/70 leading-relaxed">This allocation is held by the founder with full discretion. It may be used, held, or distributed at any time — including for personal, strategic, or project-related purposes. Tokens remain non-custodial and fully transparent.</p>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all">
                    <h4 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>10% Development & Operations</h4>
                    <p className="text-white/70 leading-relaxed">Supports active platform development, infrastructure, scaling, and operational costs. May also include allocation for external contributors or technical support partners.</p>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all">
                    <h4 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>10% Rewards & Challenges</h4>
                    <p className="text-white/70 leading-relaxed">Used to fund skill-based tournaments, no-entry-fee promotional matches, new player onboarding incentives, and limited challenge-based events.</p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-white/70">
                  For full legal and compliance details, see our{' '}
                  <a href="/privacy" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Privacy Policy</a>{' '}
                  and{' '}
                  <a href="/terms" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Terms of Service</a>.
                </p>
              </div>
            </section>

            {/* Security & Self-Custody */}
            <section id="security" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaLock className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Security & Self-Custody</h2>
                <p className="text-white/80 mb-2 leading-relaxed">USDFGAMING, the skill-based crypto platform, is 100% non-custodial. We never hold your funds, keys, or personal data. All transactions are on-chain, transparent, and user-controlled. Security audits are published and updated regularly. If you lose access to your wallet, we cannot recover it—self-custody is your responsibility and your right.</p>
              </div>
            </section>

            {/* Roadmap */}
            <section id="roadmap" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaChartLine className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> What's Ahead for USDFG</h2>
                <ul className="list-disc pl-6 text-white/70 space-y-2 mb-6 leading-relaxed">
                  <li>Launching head-to-head challenges with verified rewards and full non-custodial control.</li>
                  <li>Expanding game categories to unlock new skill-based arenas.</li>
                  <li>Rolling out competitive leaderboards and limited-supply challenge rewards.</li>
                  <li>Staying fully legal, skill-based, and founder-led — no governance tokens, no staking, no hype games.</li>
                </ul>
                <p className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold mt-4" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>USDFG doesn't grow on hype — it grows with pressure. That's the roadmap.</p>
              </div>
            </section>

            {/* Related Policies */}
            <section id="links" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all">
              <div className="prose prose-invert max-w-none text-center">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 justify-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaGavel className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Related Policies</h2>
                <p className="text-white/80 leading-relaxed">For full legal and privacy details, see our <a href="/privacy" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Privacy Policy</a> and <a href="/terms" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Terms of Service</a>.<br />USDFG is built to stay transparent, secure, and fair — always.</p>
              </div>
            </section>

            {/* Contact & Founder Signature */}
            <section id="contact" className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 animate-fade-in hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50 transition-all text-center">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 justify-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}><FaUsers className="text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))" }} /> Contact & Founder</h2>
                <p className="text-white/80 mb-4 leading-relaxed">For questions, compliance inquiries, or media, contact <a href="mailto:founder@usdfg.pro" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>founder@usdfg.pro</a> or <a href="mailto:support@usdfg.pro" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>support@usdfg.pro</a> or DM <a href="https://twitter.com/USDFGAMING" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" target="_blank" rel="noopener noreferrer" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>@USDFGAMING</a> on Twitter.</p>
                <div className="mt-8 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="/assets/usdfgtokenn.png" alt="USDFG Logo" className="w-10 h-10 rounded-full border border-purple-500/50" />
                    <span className="font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Hussein Ali</span>
                  </div>
                  <div className="text-xs text-white/60 italic">Founder & Lead Developer, USDFGAMING</div>
                  <div className="text-xs text-white/40 mt-1">Signed digitally for legal compliance and user trust.</div>
                </div>
              </div>
            </section>
            {/* Closing Legal Note */}
            <section className="max-w-2xl mx-auto mb-12 px-6 py-4 rounded-xl bg-black/40 backdrop-blur-sm border border-purple-500/20 shadow-lg hover:border-purple-500/50 transition-all animate-fade-in text-center">
              <p className="text-base md:text-lg text-white/80 font-bold leading-relaxed">
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>Legal Note:</span><br />
                This document is not financial advice and does not offer or solicit any investment.<br />
                USDFG is a fixed-supply utility token used only for skill-based access and entertainment. Participation is optional and at your own discretion.
              </p>
            </section>
          </div>
        </main>
      </div>
      <Footer isRevealed={true} />
      <style>{`
        .whitepaper-section { transition: box-shadow 0.3s, transform 0.3s; }
        .whitepaper-section:hover { box-shadow: 0 0 40px rgba(147,51,234,0.3); transform: scale(1.01); }
        
        /* TOC Navigation Styling */
        .toc-nav ul::-webkit-scrollbar {
          width: 6px;
        }

        .toc-nav ul::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .toc-nav ul::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.4);
          border-radius: 3px;
        }

        .toc-nav ul::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.6);
        }

        .toc-list a {
          display: block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          transition: all 0.2s ease;
        }

        .toc-list a:hover {
          background: rgba(147, 51, 234, 0.1);
          padding-left: 0.75rem;
        }

        .toc-list a:active {
          color: rgba(251, 191, 36, 1);
        }
        @media (max-width: 640px) {
          .whitepaper-section { padding: 1rem; margin: 0.5rem; }
          h1 { font-size: 2rem; margin-bottom: 1.5rem; }
          h2 { font-size: 1.5rem; margin-bottom: 1rem; }
          h3 { font-size: 1.25rem; }
          p, li { font-size: 0.95rem; line-height: 1.5; }
        }
        /* Sidebar reduced glow */
        .sidebar-glow { box-shadow: none !important; background: rgba(0, 0, 0, 0.4) !important; border-color: rgba(147, 51, 234, 0.2) !important; }
        /* Tag buttons - pill, less bright */
        .tag-pill { opacity: 0.8; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(147, 51, 234, 0.2); color: rgba(251, 191, 36, 0.9); font-size: 0.85rem; font-weight: 600; border-radius: 9999px; padding: 0.25rem 0.9rem; box-shadow: none; }
        /* Soft fade-in for top elements */
        .animate-fade-in { opacity: 0; animation: fadeInSoft 1.1s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes fadeInSoft { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
      `}</style>
    </>
  );
};

export default Whitepaper; 