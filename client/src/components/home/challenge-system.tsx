import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { FaBalanceScale, FaLock, FaGavel, FaExclamationTriangle, FaUserShield, FaCheckCircle } from "react-icons/fa";
import { motion } from "framer-motion";

const ChallengeSystem: React.FC = () => {
  const challengeRules = [
    "Both players MUST record the necessary gameplay segment(s) showing the final result/win condition being met.",
    "After the match, both players return here to confirm the outcome.",
    "When both players agree, the play tokens are transferred automatically to the winner.",
    "If there is a dispute, the tokens are held. Players must submit video proof in the official Discord channel for review.",
    "An admin will review the proof and release tokens to the verified winner.",
    "Attempting to claim a false win will result in a strike. Three strikes lead to a permanent ban."
  ];

  // Add state for category and game selection
  const [selectedCategory, setSelectedCategory] = useState<"Sports" | "Racing" | "Fighting" | "Shooting" | "">("");
  const [selectedGame, setSelectedGame] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [customGame, setCustomGame] = useState("");
  const [customSystem, setCustomSystem] = useState("");
  const [selectedChallengeMode, setSelectedChallengeMode] = useState("");
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showChallengeModeDropdown, setShowChallengeModeDropdown] = useState(false);

  const gameOptions: Record<"Sports" | "Racing" | "Fighting" | "Shooting", string[]> = {
    Sports: ["EA UFC 6", "FC 26", "Madden 26", "NBA 2K26", "Custom"].sort(),
    Racing: ["F1 2023", "Mario Kart", "Gran Turismo 7", "Custom"].sort(),
    Fighting: ["Mortal Kombat 1", "Street Fighter 6", "Tekken 8", "Custom"].sort(),
    Shooting: ["COD MW3", "Fortnite", "Valorant", "Custom"].sort(),
  };

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

  const leaderboardRef = useScrollFadeIn<HTMLDivElement>();

  useEffect(() => {
    if (selectedCategory) {
      setShowGameDropdown(true);
    } else {
      setShowGameDropdown(false);
      setShowChallengeModeDropdown(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedGame) {
      const timeout = setTimeout(() => {
        setShowChallengeModeDropdown(true);
      }, 150);
      return () => clearTimeout(timeout);
    } else {
      setShowChallengeModeDropdown(false);
    }
  }, [selectedGame]);

  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 
            className="text-3xl md:text-4xl font-extrabold mb-4 shimmer text-center"
            style={{
              fontWeight: 800,
              fontSize: '2.25rem',
              letterSpacing: '0.04em',
              background: 'linear-gradient(90deg, #f5d06f 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 32px #f5d06f88, 0 2px 8px #000'
            }}
          >
            Create a Challenge. Prove it.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real challenges. Real outcomes. Every result is based on skill — not chance.
          </p>
        </div>
        {/* Leaderboard Ghostly Image - Pro-level polish */}
        <section className="flex justify-center py-12">
          <div className="relative fade-in-up" id="challenge-leaderboard-visual" ref={leaderboardRef}>
            <div className="glow-behind pulse-glow"></div>
            <img
              src="/assets/usdfg-leaderboard-competition-mascot.png"
              alt="USDFG mascot in front of glowing leaderboard - skill gaming competition"
              className="w-full max-w-2xl drop-shadow-2xl rounded-lg relative z-10 shadow-glow"
            />
          </div>
        </section>

        <Card className="relative bg-gradient-to-br from-[#0a0f1aee] to-[#0a1f2aee] border-2 border-cyan-400/40 max-w-4xl mx-auto shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_0_32px_#00f0ff99] before:absolute before:inset-0 before:rounded-lg before:bg-black/20 before:blur-md before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-300 before:z-0 neon-outline">
          <CardContent className="relative z-10 p-8 md:p-10">
            <div className="mb-10">
              <motion.h3 initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center justify-center text-white drop-shadow-glow tracking-wide">
                <span className="mr-3 text-cyan-300 animate-glow"><FaBalanceScale className="inline-block w-8 h-8 md:w-10 md:h-10" /></span>
                Challenge Rules & Result Verification
              </motion.h3>
              {/* Clarifying sentence under the title */}
              <motion.p initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.15}} className="text-base text-cyan-300 mb-2 text-center font-medium">
                This system protects fairness by locking funds and verifying skill-based outcomes.
              </motion.p>
              <motion.ul initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:0.13}}}} className="space-y-4">
                <motion.li variants={{hidden:{opacity:0, y:20},visible:{opacity:1, y:0}}} className="flex items-start text-lg">
                  <FaCheckCircle className="text-green-400 mt-1 mr-3 animate-bounce" />
                  <span><span className="font-bold text-white">If both players confirm the result</span>, rewards are released automatically — <span className="text-cyan-300 font-semibold">no uploads needed</span>.</span>
                </motion.li>
                <motion.li variants={{hidden:{opacity:0, y:20},visible:{opacity:1, y:0}}} className="flex items-start text-lg">
                  <FaLock className="text-cyan-400 mt-1 mr-3 animate-pulse" />
                  <span><span className="font-bold text-white">Funds stay locked</span> until both players confirm or a dispute is reviewed.</span>
                </motion.li>
                <motion.li variants={{hidden:{opacity:0, y:20},visible:{opacity:1, y:0}}} className="flex items-start text-lg">
                  <FaExclamationTriangle className="text-yellow-400 mt-1 mr-3 animate-shake" />
                  <span><span className="font-bold text-white">If there's a dispute</span>, players must provide <span className="text-cyan-300 font-semibold">video or screenshot proof</span> for review.</span>
                </motion.li>
                <motion.li variants={{hidden:{opacity:0, y:20},visible:{opacity:1, y:0}}} className="flex items-start text-lg">
                  <FaGavel className="text-purple-400 mt-1 mr-3 animate-bounce" />
                  <span><span className="font-bold text-white">Admins review disputes and make the final call.</span> Verified winners receive the reward.</span>
                </motion.li>
                <motion.li variants={{hidden:{opacity:0, y:20},visible:{opacity:1, y:0}}} className="flex items-start text-lg">
                  <FaUserShield className="text-pink-400 mt-1 mr-3 animate-pulse" />
                  <span><span className="font-bold text-white">Attempts to falsify results</span> may lead to <span className="text-yellow-300 font-bold">deactivation</span>.<br /><span className="text-xs text-muted-foreground">USDFG does not disclose penalty thresholds.</span></span>
                </motion.li>
              </motion.ul>
            </div>
            {/* Info callout box */}
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.7}} className="mb-8">
              <div className="bg-gradient-to-br from-cyan-900/40 to-purple-900/30 border border-cyan-400/40 rounded-xl p-4 text-base text-center shadow-lg backdrop-blur-md flex items-center justify-center gap-3 animate-pulse-glow neon-outline">
                <FaExclamationTriangle className="text-yellow-300 w-6 h-6 animate-shake" />
                <span className="font-semibold text-cyan-100">Make sure your challenge description clearly defines all win conditions and game settings.</span>
              </div>
            </motion.div>
            {/* Trust badge */}
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.9}} className="flex justify-center mt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-700 to-purple-700 border-2 border-cyan-400/40 shadow-md text-cyan-100 text-sm font-bold animate-glow">
                <FaUserShield className="text-cyan-300 w-5 h-5 mr-1 animate-pulse" />
                Fair Play Guaranteed
              </div>
            </motion.div>
            <div className="space-y-4">
              <div className="text-center mt-12 mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-wide underline decoration-cyan-500 underline-offset-4 shadow-[0_0_12px_rgba(72,216,255,0.25)]">
                  Ready to walk away with the token?
                </h3>
              </div>
              <h3 className="text-xl font-bold flex items-center">
                <span className="mr-2">🎮</span> Create a Challenge
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-muted-foreground mb-1">Category</Label>
                  <select
                    id="category"
                    className="w-full px-4 py-3 bg-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedCategory}
                    onChange={e => {
                      setSelectedCategory(e.target.value as "Sports" | "Racing" | "Fighting" | "Shooting" | "");
                      setSelectedGame("");
                      setSelectedChallengeMode("");
                    }}
                  >
                    <option value="">Select a category…</option>
                    {Object.keys(gameOptions).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="game" className="text-sm font-medium text-muted-foreground mb-1">Game</Label>
                  <div
                    className={`transition-opacity transition-transform duration-300 ease-out ${showGameDropdown ? 'fade-in' : ''}`}
                    style={{ opacity: showGameDropdown ? 1 : 0, transform: showGameDropdown ? 'translateY(0)' : 'translateY(10px)' }}
                  >
                  <select
                    id="game"
                    className="w-full px-4 py-3 bg-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedGame}
                    onChange={e => {
                      setSelectedGame(e.target.value);
                      setCustomGame("");
                        setSelectedChallengeMode("");
                    }}
                    disabled={!selectedCategory}
                  >
                    <option value="">{selectedCategory ? "Select a game…" : "Choose a category first"}</option>
                    {selectedCategory &&
                      gameOptions[selectedCategory as keyof typeof gameOptions].map((game: string) => (
                        <option key={game} value={game}>{game}</option>
                      ))}
                  </select>
                  {selectedGame === "Custom" && (
                    <input
                      type="text"
                      className="w-full mt-2 px-4 py-3 bg-white border border-cyan-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter custom game…"
                      value={customGame}
                      onChange={e => setCustomGame(e.target.value)}
                    />
                  )}
                  </div>
                </div>
                {/* Challenge Mode Dropdown */}
                <div className="mt-4 md:col-span-2">
                  <Label htmlFor="challenge-mode" className="text-sm font-medium text-muted-foreground mb-1">Challenge Mode</Label>
                  <div
                    className={`relative transition-opacity transition-transform duration-300 ease-out ${showChallengeModeDropdown ? 'fade-in' : ''}`}
                    style={{ opacity: showChallengeModeDropdown ? 1 : 0, transform: showChallengeModeDropdown ? 'translateY(0)' : 'translateY(10px)' }}
                  >
                    <select
                      id="challenge-mode"
                      className="w-full px-4 py-3 bg-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                      value={selectedChallengeMode}
                      onChange={e => setSelectedChallengeMode(e.target.value)}
                      disabled={!selectedCategory}
                    >
                      <option value="">{selectedCategory ? "Select a mode…" : "Choose a category first"}</option>
                      {selectedCategory && challengeModes[selectedCategory]?.map((mode) => (
                        <option key={mode.label} value={mode.label}>{mode.label}</option>
                      ))}
                    </select>
                    {/* Tooltip for Custom Challenge */}
                    {selectedCategory &&
                      challengeModes[selectedCategory]?.find(m => m.label === selectedChallengeMode && m.tooltip) && (
                        <div className="absolute left-0 mt-2 w-full bg-gray-900 text-xs text-yellow-300 rounded shadow-lg p-2 z-10 border border-yellow-500 animate-fade-in">
                          {challengeModes[selectedCategory].find(m => m.label === selectedChallengeMode)?.tooltip}
                        </div>
                      )}
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="system" className="text-sm font-medium text-muted-foreground mb-1">System</Label>
                  <select
                    id="system"
                    className="w-full px-4 py-3 bg-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedSystem}
                    onChange={e => setSelectedSystem(e.target.value)}
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
                      className="w-full mt-2 px-4 py-3 bg-white border border-cyan-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter system…"
                      value={customSystem}
                      onChange={e => setCustomSystem(e.target.value)}
                    />
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="entry-amount" className="text-sm font-medium text-muted-foreground mb-1">Entry Amount ($USDFG)</Label>
                <Input
                  id="entry-amount"
                  type="number"
                  placeholder="Enter amount (e.g., 10.00)"
                  className="w-full"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="challenge-rules" className="text-sm font-medium text-muted-foreground mb-1">Challenge Rules & Details</Label>
                <Textarea 
                  id="challenge-rules"
                  rows={4} 
                  placeholder={`Add your gamer tag so your opponent can find you.\nIf you selected Custom Challenge, make sure your rules are clear, fair, and not outrageous.\n\nUnclear or unfair custom rules may be rejected.`}
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              
              <div className="text-center">
                <a
                  className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-semibold shadow-[0_0_4px_#a78bfa33] flex items-center gap-2 transition-all duration-200 text-base"
                  title="Launch real challenges from the full platform"
                  style={{ pointerEvents: 'none', opacity: 0.6, cursor: 'not-allowed' }}
                >
                  Open in App <span className="ml-2 animate-bounce-x" aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ChallengeSystem;

<style>{`
.animate-bounce-x {
  display: inline-block;
  animation: bounce-x 1.2s infinite alternate;
}
@keyframes bounce-x {
  0% { transform: translateX(0); }
  100% { transform: translateX(8px); }
}
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
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(120deg, transparent 40%, #fffbe6 50%, transparent 60%);
  opacity: 0.25;
  mix-blend-mode: lighten;
  animation: shimmer 4s linear infinite;
  pointer-events: none;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.fade-in {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
.neon-outline {
  outline: 2px solid #00ffff;
  outline-offset: 0px;
}
`}</style>
