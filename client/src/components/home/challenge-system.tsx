import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FaBalanceScale, FaLock, FaGavel, FaExclamationTriangle, FaUserShield, FaCheckCircle } from "react-icons/fa";
import { motion } from "framer-motion";

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

  const imageSrcWebp = "/assets/usdfg-leaderboard-competition-mascot.webp";
  const imageSrcPng = "/assets/usdfg-leaderboard-competition-mascot.png";

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-4 shimmer text-center"
            style={{
              fontWeight: 800,
              fontSize: "2.25rem",
              letterSpacing: "0.04em",
              background: "linear-gradient(90deg, #f5d06f 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 32px #f5d06f88, 0 2px 8px #000",
            }}
          >
            Create a Challenge. Prove it.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real challenges. Real outcomes. Every result is based on skill — not chance.
          </p>
        </div>

        {/* Leaderboard + mascot visual (now visible) */}
        <section className="flex justify-center py-12">
          <div ref={visualRef} className="relative opacity-0 translate-y-3 transition-all duration-700" id="challenge-leaderboard-visual">
            <div className="glow-behind pulse-glow"></div>
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
              className="w-full max-w-2xl drop-shadow-2xl rounded-lg relative z-10 shadow-glow select-none"
            />
          </div>
        </section>

        {/* Rules / Explainer */}
        <Card className="relative bg-gradient-to-br from-[#0a0f1aee] to-[#0a1f2aee] border-2 border-cyan-400/40 max-w-4xl mx-auto shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_32px_#00f0ff99]">
          <CardContent className="relative z-10 p-8 md:p-10">
            <div className="mb-10">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center justify-center text-white drop-shadow-glow tracking-wide"
              >
                <span className="mr-3 text-cyan-300"><FaBalanceScale className="inline-block w-8 h-8 md:w-10 md:h-10" /></span>
                Challenge Rules & Result Verification
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-base text-cyan-300 mb-4 text-center font-medium"
              >
                This system protects fairness by locking funds and verifying skill-based outcomes.
              </motion.p>

              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
                className="space-y-4"
              >
                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-lg">
                  <FaCheckCircle className="text-green-400 mt-1 mr-3" />
                  <span>
                    <span className="font-bold text-white">If both players confirm the result</span>, rewards are released automatically —{" "}
                    <span className="text-cyan-300 font-semibold">no uploads needed</span>.
                  </span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-lg">
                  <FaLock className="text-cyan-400 mt-1 mr-3" />
                  <span>
                    <span className="font-bold text-white">Funds stay locked</span> until both players confirm or a dispute is reviewed.
                  </span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-lg">
                  <FaExclamationTriangle className="text-yellow-400 mt-1 mr-3" />
                  <span>
                    <span className="font-bold text-white">If there's a dispute</span>, players must provide{" "}
                    <span className="text-cyan-300 font-semibold">video or screenshot proof</span> for review.
                  </span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-lg">
                  <FaGavel className="text-purple-400 mt-1 mr-3" />
                  <span>
                    <span className="font-bold text-white">Admins review disputes and make the final call.</span> Verified winners receive the reward.
                  </span>
                </motion.li>

                <motion.li variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex items-start text-lg">
                  <FaUserShield className="text-pink-400 mt-1 mr-3" />
                  <span>
                    <span className="font-bold text-white">Attempts to falsify results</span> may lead to{" "}
                    <span className="text-yellow-300 font-bold">deactivation</span>.
                    <br />
                    <span className="text-xs text-muted-foreground">USDFG does not disclose penalty thresholds.</span>
                  </span>
                </motion.li>
              </motion.ul>
            </div>

            {/* Info callout */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <div className="bg-gradient-to-br from-cyan-900/40 to-purple-900/30 border border-cyan-400/40 rounded-xl p-4 text-base text-center shadow-lg backdrop-blur-md flex items-center justify-center gap-3">
                <FaExclamationTriangle className="text-yellow-300 w-5 h-5" />
                <span className="font-semibold text-cyan-100">
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
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-700 to-purple-700 border-2 border-cyan-400/40 shadow-md text-cyan-100 text-sm font-bold">
                <FaUserShield className="text-cyan-300 w-5 h-5 mr-1" />
                Fair Play Guaranteed
              </div>
            </motion.div>

            {/* --- Challenge creator (mock) --- */}
            <div className="space-y-4 mt-12">
              <div className="text-center mb-6">
                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-wide underline decoration-cyan-500 underline-offset-4">
                  Ready to walk away with the token?
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-muted-foreground mb-1">
                    Category
                  </Label>
                  <select
                    id="category"
                    className="w-full px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                  <Label htmlFor="game" className="text-sm font-medium text-muted-foreground mb-1">
                    Game
                  </Label>
                  <div
                    className={`transition-all duration-300 ease-out ${
                      showGameDropdown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    }`}
                  >
                    <select
                      id="game"
                      className="w-full px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                        className="w-full mt-2 px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder="Enter custom game…"
                        value={customGame}
                        onChange={(e) => setCustomGame(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Challenge mode */}
                <div className="md:col-span-2">
                  <Label htmlFor="challenge-mode" className="text-sm font-medium text-muted-foreground mb-1">
                    Challenge Mode
                  </Label>
                  <div
                    className={`relative transition-all duration-300 ease-out ${
                      showChallengeModeDropdown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    }`}
                  >
                    <select
                      id="challenge-mode"
                      className="w-full px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                        <div className="absolute left-0 mt-2 w-full bg-gray-900 text-xs text-yellow-300 rounded shadow-lg p-2 z-10 border border-yellow-500">
                          {challengeModes[selectedCategory].find((m) => m.label === selectedChallengeMode)?.tooltip}
                        </div>
                      )}
                  </div>
                </div>

                {/* System */}
                <div>
                  <Label htmlFor="system" className="text-sm font-medium text-muted-foreground mb-1">
                    System
                  </Label>
                  <select
                    id="system"
                    className="w-full px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                      className="w-full mt-2 px-4 py-3 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Enter system…"
                      value={customSystem}
                      onChange={(e) => setCustomSystem(e.target.value)}
                    />
                  )}
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="entry-amount" className="text-sm font-medium text-muted-foreground mb-1">
                    Entry Amount (USDFG)
                  </Label>
                  <Input
                    id="entry-amount"
                    type="number"
                    placeholder="Enter amount (e.g., 10.00)"
                    className="w-full"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/* Rules text */}
                <div className="md:col-span-2">
                  <Label htmlFor="challenge-rules" className="text-sm font-medium text-muted-foreground mb-1">
                    Challenge Rules & Details
                  </Label>
                  <Textarea
                    id="challenge-rules"
                    rows={4}
                    placeholder={`Add your gamer tag so your opponent can find you.
If you selected Custom Challenge, make sure your rules are clear, fair, and not outrageous.

Unclear or unfair custom rules may be rejected.`}
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              {/* CTA (disabled placeholder) */}
              <div className="text-center">
                <a
                  className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-semibold shadow-[0_0_6px_#a78bfa33] flex items-center gap-2 transition-all duration-200 text-base"
                  title="Launch real challenges from the full platform"
                  style={{ pointerEvents: "none", opacity: 0.6, cursor: "not-allowed" }}
                >
                  Open in App <span className="ml-2 animate-bounce-x" aria-hidden="true">→</span>
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
          background: linear-gradient(90deg, #f5d06f 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 32px #f5d06f88, 0 2px 8px #000;
          letter-spacing: 0.04em;
          font-weight: 800;
          font-size: 2.25rem;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 40%, #fffbe6 50%, transparent 60%);
          opacity: 0.25; mix-blend-mode: lighten;
          animation: shimmer 4s linear infinite;
          pointer-events: none;
        }
        @keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }

        .glow-behind {
          position: absolute;
          inset: -20px;
          border-radius: 24px;
          background: radial-gradient(60% 60% at 50% 50%, #00e8fc33, transparent 70%);
          filter: blur(24px);
          z-index: 0;
        }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite alternate; }
        @keyframes pulseGlow {
          0% { opacity: 0.35; filter: blur(18px); }
          100% { opacity: 0.75; filter: blur(28px); }
        }

        .shadow-glow { box-shadow: 0 0 24px #00e8fc44, 0 0 4px #fff1; }

        .fade-in-up { opacity: 1 !important; transform: translateY(0) !important; }

        .animate-bounce-x { display:inline-block; animation: bounce-x 1.2s infinite alternate; }
        @keyframes bounce-x { 0% { transform: translateX(0);} 100% { transform: translateX(8px);} }
      `}</style>
    </section>
  );
};

export default ChallengeSystem;
