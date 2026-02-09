import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FaBalanceScale, FaLock, FaGavel, FaExclamationTriangle, FaUserShield, FaCheckCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * ChallengeSystem
 * - Shows the rules/verification explainer
 * - Lets users mock-configure a challenge (category, game, mode, system, amount, rules)
 * - Displays the leaderboard + mascot visual with graceful fallback from WEBP → PNG
 */
const ChallengeSystem: React.FC = () => {
  // -----------------------------
  // Options
  // -----------------------------
  const gameOptions = useMemo(
    () => ({
      Sports: ["EA UFC 6", "FC 26", "Madden 26", "NBA 2K26", "Custom"].sort(),
      Racing: ["F1 2023", "Mario Kart", "Gran Turismo 7", "Custom"].sort(),
      Fighting: ["Mortal Kombat 1", "Street Fighter 6", "Tekken 8", "Custom"].sort(),
      Shooting: ["COD MW3", "Fortnite", "Valorant", "Custom"].sort(),
    }),
    []
  ) as Record<"Sports" | "Racing" | "Fighting" | "Shooting", string[]>;

  const challengeModes: Record<string, { label: string; tooltip?: string }[]> = {
    Sports: [
      { label: "Full Match" },
      { label: "Quick Match (No halftime)" },
      { label: "2v2 Challenge" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." },
    ],
    Racing: [
      { label: "Best Lap Time" },
      { label: "1v1 Race to Finish" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." },
    ],
    Fighting: [
      { label: "Best of 3" },
      { label: "Mirror Match" },
      { label: "2v2 Team Fight" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." },
    ],
    Shooting: [
      { label: "Search and Destroy" },
      { label: "Run the Fade" },
      { label: "10 and Done" },
      { label: "Snipers Only" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." },
    ],
  };

  // -----------------------------
  // State
  // -----------------------------
  const [selectedCategory, setSelectedCategory] = useState<"Sports" | "Racing" | "Fighting" | "Shooting" | "">("");
  const [selectedGame, setSelectedGame] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [customGame, setCustomGame] = useState("");
  const [customSystem, setCustomSystem] = useState("");
  const [selectedChallengeMode, setSelectedChallengeMode] = useState("");

  // simple reveal helpers
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showChallengeModeDropdown, setShowChallengeModeDropdown] = useState(false);

  useEffect(() => {
    setShowGameDropdown(!!selectedCategory);
    if (!selectedCategory) {
      setSelectedGame("");
      setSelectedChallengeMode("");
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedGame) {
      const t = setTimeout(() => setShowChallengeModeDropdown(true), 150);
      return () => clearTimeout(t);
    }
    setShowChallengeModeDropdown(false);
    setSelectedChallengeMode("");
  }, [selectedGame]);

  // -----------------------------
  // Leaderboard visual: lazy reveal + WEBP → PNG fallback
  // -----------------------------
  const visualRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!visualRef.current) return;
    const el = visualRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("fade-in-up");
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const imageSrcWebp = "/assets/usdfg-leaderboard-competition.webp";
  const imageSrcPng = "/assets/usdfg-leaderboard-competition.png";

  // -----------------------------
  // GSAP Animations
  // -----------------------------
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(headingRef.current, { opacity: 0, y: 12 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 8 });
      gsap.set(imageRef.current, { opacity: 0, y: 16 });
      gsap.set(cardRef.current, { opacity: 0, y: 12 });

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
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .to(
          imageRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .to(
          cardRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.6'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <section ref={sectionRef} className="py-12 lg:py-16 relative overflow-hidden">

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Heading */}
        <div className="text-center mb-8 lg:mb-12">
          <h2
            ref={headingRef}
            className="neocore-h2 mb-3 text-center text-3xl md:text-4xl lg:text-5xl font-bold"
            style={{
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 24px rgba(251, 191, 36, 0.4), 0 2px 6px #000",
              filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
            }}
          >
            Create a Challenge. Prove it.
          </h2>
          <p
            ref={subtitleRef}
            className="neocore-body max-w-2xl mx-auto text-base md:text-lg text-white/70 leading-relaxed"
          >
            Real challenges. Real outcomes. Verified by players, enforced by smart contracts.
          </p>
        </div>

        {/* Leaderboard + mascot visual (now visible) */}
        <section className="flex justify-center py-6 lg:py-8">
          <div
            ref={(el) => {
              if (el) {
                visualRef.current = el;
                imageRef.current = el;
              }
            }}
            className="relative"
            id="challenge-leaderboard-visual"
          >
            <img
              src={imageSrcWebp}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.dataset.fallback) {
                  target.src = imageSrcPng; // fallback to PNG once
                  target.dataset.fallback = "1";
                }
              }}
              loading="lazy"
              alt="USDFG mascot in front of glowing leaderboard - skill gaming competition"
              className="w-full max-w-xl rounded-lg relative z-10 select-none shadow-[0_0_40px_rgba(147,51,234,0.2)]"
            />
          </div>
        </section>

        {/* Rules / Explainer */}
        <Card
          ref={cardRef}
          className="relative max-w-4xl mx-auto bg-black/40 backdrop-blur-sm rounded-lg transition-all duration-300 kimi-bottom-neon" style={{ 
            '--neon-color': 'rgba(168, 85, 247, 0.3)',
            '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
          } as React.CSSProperties}
        >
          {/* Gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
          <CardContent className="relative z-10 p-4 md:p-6 lg:p-8">
            <div className="mb-6">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="neocore-h2 mb-3 flex items-center justify-center text-white tracking-wide"
                style={{
                  textShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
                  filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))",
                }}
              >
                <span
                  className="mr-3"
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))",
                  }}
                >
                  <FaBalanceScale className="inline-block w-5 h-5 md:w-6 md:h-6 text-amber-300" />
                </span>
                Challenge Rules & Result Verification
              </motion.h3>

              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
                className="space-y-3"
              >
                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-sm md:text-base">
                  <FaCheckCircle className="text-green-400 mt-1 mr-3 w-4 h-4 flex-shrink-0" />
                  <span>If both players confirm the result, verified rewards release automatically.</span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-sm md:text-base">
                  <FaLock className="text-amber-400 mt-1 mr-3 w-4 h-4 flex-shrink-0" />
                  <span>Challenge assets remain locked until confirmation or dispute review.</span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-sm md:text-base">
                  <FaExclamationTriangle className="text-amber-400 mt-1 mr-3 w-4 h-4 flex-shrink-0" />
                  <span>If disputed, players submit video or screenshot proof.</span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-sm md:text-base">
                  <FaGavel className="text-amber-400 mt-1 mr-3 w-4 h-4 flex-shrink-0" />
                  <span>Disputes are reviewed and resolved based on submitted proof.</span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-sm md:text-base">
                  <FaUserShield className="text-amber-400 mt-1 mr-3 w-4 h-4 flex-shrink-0" />
                  <span>Attempts to falsify results can lead to deactivation.</span>
                </motion.li>
              </motion.ul>
            </div>

            {/* Info callout */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4"
            >
              <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/30 p-3 text-sm text-center shadow-[0_0_20px_rgba(251,191,36,0.15)] backdrop-blur-md rounded-lg flex items-center justify-center gap-2">
                <FaExclamationTriangle className="text-amber-300 w-4 h-4" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))" }} />
                <span className="font-semibold text-amber-100">
                  Make sure your challenge description clearly defines all win conditions and game settings.
                </span>
              </div>
            </motion.div>

            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center mt-4"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/40 to-amber-600/40 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.2)] text-white text-sm font-semibold">
                <FaUserShield className="text-amber-300 w-4 h-4 mr-1" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))" }} />
                Clear rules. Verified results.
              </div>
            </motion.div>

            {/* --- Challenge creator (mock) --- */}
            <div className="space-y-3 mt-6">
              <div className="text-center mb-6">
                <h3
                  className="neocore-h2 text-white tracking-wide underline decoration-amber-400 underline-offset-2"
                  style={{
                    textShadow: "0 0 15px rgba(251, 191, 36, 0.3)",
                  }}
                >
                  Ready to walk away with the token?
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-muted-foreground mb-2">
                    Category
                  </Label>
                  <select
                    id="category"
                    className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                    value={selectedCategory}
                    onChange={(e) => {
                      const val = e.target.value as "Sports" | "Racing" | "Fighting" | "Shooting" | "";
                      setSelectedCategory(val);
                      setSelectedGame("");
                      setSelectedChallengeMode("");
                      setCustomGame("");
                    }}
                  >
                    <option value="">Select a category…</option>
                    {Object.keys(gameOptions).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Game */}
                <div>
                  <Label htmlFor="game" className="text-sm font-medium text-muted-foreground mb-2">
                    Game
                  </Label>
                  <div
                    className={`transition-all duration-300 ease-out ${
                      showGameDropdown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    }`}
                  >
                    <select
                      id="game"
                      className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                      value={selectedGame}
                      onChange={(e) => {
                        setSelectedGame(e.target.value);
                        setCustomGame("");
                        setSelectedChallengeMode("");
                      }}
                      disabled={!selectedCategory}
                    >
                      <option value="">{selectedCategory ? "Select a game…" : "Choose a category first"}</option>
                      {!!selectedCategory &&
                        gameOptions[selectedCategory as keyof typeof gameOptions].map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                    </select>

                    {selectedGame === "Custom" && (
                      <input
                        type="text"
                        className="w-full mt-2 px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                        placeholder="Enter custom game…"
                        value={customGame}
                        onChange={(e) => setCustomGame(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Challenge mode */}
                <div className="md:col-span-2">
                  <Label htmlFor="challenge-mode" className="text-sm font-medium text-muted-foreground mb-2">
                    Challenge Mode
                  </Label>
                  <div
                    className={`relative transition-all duration-300 ease-out ${
                      showChallengeModeDropdown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    }`}
                  >
                    <select
                      id="challenge-mode"
                      className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                      value={selectedChallengeMode}
                      onChange={(e) => setSelectedChallengeMode(e.target.value)}
                      disabled={!selectedGame}
                    >
                      <option value="">{selectedCategory ? "Select a mode…" : "Choose a category first"}</option>
                      {selectedCategory &&
                        challengeModes[selectedCategory]?.map((m) => (
                          <option key={m.label} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                    </select>

                    {/* Tooltip for Custom Challenge */}
                    {selectedCategory &&
                      challengeModes[selectedCategory]?.find((m) => m.label === selectedChallengeMode && m.tooltip) && (
                        <div className="absolute left-0 mt-2 w-full bg-gray-900/95 text-sm text-amber-300 rounded shadow-lg p-2 z-10 border border-amber-500/50">
                          {challengeModes[selectedCategory].find((m) => m.label === selectedChallengeMode)?.tooltip}
                        </div>
                      )}
                  </div>
                </div>

                {/* System */}
                <div>
                  <Label htmlFor="system" className="text-sm font-medium text-muted-foreground mb-2">
                    System
                  </Label>
                  <select
                    id="system"
                    className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    disabled={!selectedGame}
                  >
                    <option value="">{selectedGame ? "Select a system…" : "Choose a game first"}</option>
                    <option value="PS5">PS5</option>
                    <option value="Xbox">Xbox</option>
                    <option value="PC">PC</option>
                    <option value="Switch">Switch</option>
                    <option value="Wii">Wii</option>
                    <option value="Other">Other</option>
                  </select>

                  {selectedSystem === "Other" && (
                    <input
                      type="text"
                      className="w-full mt-2 px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                      placeholder="Enter system…"
                      value={customSystem}
                      onChange={(e) => setCustomSystem(e.target.value)}
                    />
                  )}
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="entry-amount" className="text-sm font-medium text-muted-foreground mb-2">
                    Entry Amount (USDFG)
                  </Label>
                  <Input
                    id="entry-amount"
                    type="number"
                    placeholder="Enter amount (e.g., 10.00)"
                    className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/* Rules text */}
                <div className="md:col-span-2">
                  <Label htmlFor="challenge-rules" className="text-sm font-medium text-muted-foreground mb-2">
                    Challenge Rules & Details
                  </Label>
                  <Textarea
                    id="challenge-rules"
                    rows={4}
                    placeholder={`Add your gamer tag so your opponent can find you.
If you selected Custom Challenge, make sure your rules are clear, fair, and not outrageous.

Unclear or unfair custom rules may be rejected.`}
                    className="w-full px-3 py-2 bg-zinc-800/60 text-white border border-zinc-700/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50 resize-none"
                  />
                </div>
              </div>

              {/* CTA (disabled placeholder) */}
              <div className="text-center">
                <a
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600/60 to-amber-500/60 border border-purple-500/30 rounded-lg text-white hover:from-purple-500/60 hover:to-amber-400/60 flex items-center gap-2 transition-all duration-200 text-sm font-semibold mx-auto"
                  title="Launch real challenges from the full platform"
                  style={{ pointerEvents: "none", opacity: 0.6, cursor: "not-allowed" }}
                >
                  Open in App <span className="ml-1.5 animate-bounce-x" aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Local styles just for this component */}
      <style>{`
        .shimmer {
          position: relative;
          display: inline-block;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 32px rgba(251, 191, 36, 0.4), 0 2px 8px #000;
          letter-spacing: 0.04em;
          font-weight: 800;
          font-size: 2.25rem;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 40%, #fef3c7 50%, transparent 60%);
          opacity: 0.25; mix-blend-mode: lighten;
          animation: shimmer 4s linear infinite;
          pointer-events: none;
        }
        @keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }

        .glow-behind {
          position: absolute;
          inset: -20px;
          border-radius: 24px;
          background: radial-gradient(60% 60% at 50% 50%, rgba(251, 191, 36, 0.2), transparent 70%);
          filter: blur(24px);
          z-index: 0;
        }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite alternate; }
        @keyframes pulseGlow {
          0% { opacity: 0.35; filter: blur(18px); }
          100% { opacity: 0.75; filter: blur(28px); }
        }

        .shadow-glow { box-shadow: 0 0 24px rgba(251, 191, 36, 0.3), 0 0 4px rgba(255, 255, 255, 0.1); }

        .fade-in-up { opacity: 1 !important; transform: translateY(0) !important; }

        .animate-bounce-x { display:inline-block; animation: bounce-x 1.2s infinite alternate; }
        @keyframes bounce-x { 0% { transform: translateX(0);} 100% { transform: translateX(8px);} }
      `}</style>
    </section>
  );
};

export default ChallengeSystem;
