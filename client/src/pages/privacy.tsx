import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import KimiBackground from "@/components/KimiBackground";
import Reveal from "@/components/Reveal";

const Privacy: React.FC = () => {
  useEffect(() => {
    // Smooth scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy | USDFG.PRO – Skill-Based Crypto Gaming Platform</title>
        <meta name="description" content="Read the Privacy Policy for USDFGAMING. Learn how we protect your data and privacy on the elite, skill-based crypto gaming platform." />
        <meta name="keywords" content="USDFG, USDFG, privacy policy, crypto gaming privacy, skill-based gaming, data protection, non-custodial, USDFGAMING" />
        <link rel="canonical" href="https://usdfg.pro/privacy" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usdfg.pro/privacy" />
        <meta property="og:title" content="Privacy Policy | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta property="og:description" content="Read the Privacy Policy for USDFGAMING. Learn how we protect your data and privacy on the elite, skill-based crypto gaming platform." />
        <meta property="og:image" content="https://usdfg.pro/usdfg-og-banner.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:title" content="Privacy Policy | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Read the Privacy Policy for USDFGAMING. Learn how we protect your data and privacy on the elite, skill-based crypto gaming platform." />
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
                "url": "https://usdfg.pro/privacy",
                "name": "Privacy Policy | USDFGAMING – Skill-Based Crypto Gaming Platform",
                "description": "Read the Privacy Policy for USDFGAMING. Learn how we protect your data and privacy on the elite, skill-based crypto gaming platform."
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
            <li><a href="#section-1" className="hover:text-amber-300 transition">What We Collect</a></li>
            <li><a href="#section-2" className="hover:text-amber-300 transition">How We Use Data</a></li>
            <li><a href="#section-3" className="hover:text-white transition">No Tracking or Profiling</a></li>
            <li><a href="#section-4" className="hover:text-white transition">Platform Security</a></li>
            <li><a href="#section-5" className="hover:text-white transition">Smart Contract Transparency</a></li>
            <li><a href="#section-6" className="hover:text-white transition">Audit & Security Notices</a></li>
            <li><a href="#section-7" className="hover:text-white transition">Cookies & Local Storage</a></li>
            <li><a href="#section-8" className="hover:text-white transition">Third-Party Services</a></li>
            <li><a href="#section-9" className="hover:text-white transition">Data Retention</a></li>
            <li><a href="#section-10" className="hover:text-white transition">Data Location</a></li>
            <li><a href="#section-11" className="hover:text-white transition">Data Access Format</a></li>
            <li><a href="#section-12" className="hover:text-white transition">Your Rights</a></li>
            <li><a href="#section-13" className="hover:text-white transition">Global Compliance</a></li>
            <li><a href="#section-14" className="hover:text-white transition">Fair Play Monitoring</a></li>
            <li><a href="#section-15" className="hover:text-white transition">Non-Custodial Disclaimer</a></li>
            <li><a href="#section-16" className="hover:text-white transition">Not a Security</a></li>
            <li><a href="#section-17" className="hover:text-white transition">AI & User-Generated Content</a></li>
            <li><a href="#section-18" className="hover:text-white transition">Community Governance</a></li>
            <li><a href="#section-19" className="hover:text-white transition">Platform Evolution</a></li>
            <li><a href="#section-20" className="hover:text-white transition">Third-Party Hosted Events</a></li>
            <li><a href="#section-21" className="hover:text-white transition">Policy Updates</a></li>
            <li><a href="#section-22" className="hover:text-white transition">Children's Privacy</a></li>
            <li><a href="#section-23" className="hover:text-white transition">Contact</a></li>
            <li><a href="#section-related" className="hover:text-white transition">Related Policies</a></li>
          </ul>
        </nav>
        <Reveal
          as="main"
          className="min-h-screen flex-1 text-white relative overflow-hidden"
          selector="[data-privacy-reveal]"
        >
          {/* Kimi Galaxy Theme Background */}
          <KimiBackground includeGalaxy={true} />

          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-12 sm:py-16 md:py-20">
            <p className="text-center text-sm md:text-base text-white/70 italic mb-6 leading-relaxed">
              No mercy. No reruns. Just skill.
            </p>
            <h1
              data-privacy-reveal
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 text-center"
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
                Privacy Policy
              </span>
            </h1>

            {/* Why This Policy Matters */}
            <div data-privacy-reveal className="max-w-2xl mx-auto mb-6 lg:mb-8 text-center">
              <p className="text-lg lg:text-xl font-semibold mb-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>Why This Policy Matters</p>
              <p className="text-base lg:text-lg text-white/80 leading-relaxed">USDFG is built for elite gamers and crypto users who demand privacy, transparency, and self-custody. This policy explains exactly how we protect your data and your rights—no fine print, no hidden tracking, ever.</p>
            </div>

            {/* Trust Badges */}
            <div data-privacy-reveal className="flex flex-wrap justify-center gap-4 mb-8 lg:mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all text-sm">100% Non-Custodial</span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all text-sm">No Tracking</span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all text-sm">GDPR Aligned</span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all text-sm">Self-Custody</span>
            </div>

            {/* Last Updated Notice */}
            <div className="text-center mb-8 lg:mb-12">
              <span className="inline-block px-4 py-2 rounded bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white/80 font-medium text-xs tracking-wide shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all">Last Updated: May 1, 2025 &nbsp;|&nbsp; Version: v1.0</span>
            </div>

            <section data-privacy-reveal className="whitepaper-section max-w-4xl mx-auto bg-black/40 backdrop-blur-sm border border-purple-500/20 p-6 sm:p-8 lg:p-10 rounded-lg shadow-lg mb-10 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:border-purple-500/50">
              <div className="prose prose-invert max-w-none">
                <p className="text-base sm:text-lg mb-8 text-white">USDFG is built on the principles of decentralization, skill-based competition, and user sovereignty. We minimize data exposure, do not host accounts, and never collect personal identifiers.</p>
                
                <div className="space-y-8 text-white">
                  {/* Core Privacy Principles */}
                  <div id="section-1" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>→ 1. What We Collect</h3>
                    </div>
                    <div className="border-t border-purple-500/30 mb-4"></div>
                    <p>USDFG does not collect or store personal data such as names, emails, or passwords. The platform is fully <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>non-custodial</span> — we do not manage wallets or user accounts.</p>
                    <p>We may process limited public and system-level data strictly for platform functionality:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Public wallet addresses – used to verify challenge entries and reward eligibility</li>
                      <li>Challenge participation records – linked to wallets for match history and dispute resolution</li>
                      <li>Interaction signals – used for anti-cheat logic and improving performance</li>
                    </ul>
                  </div>

                  <div id="section-2" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 2. How We Use Data</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>We do not sell, profile, or track users across the internet. All data processing is limited to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Verifying wallet-based challenge participation</li>
                      <li>Preventing abuse through basic non-invasive anti-cheat</li>
                      <li>Platform analytics and integrity</li>
                      <li>Satisfying legal or compliance obligations (if required)</li>
                    </ul>
                  </div>

                  <div id="section-3" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 3. No Tracking or Profiling</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p><span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>USDFG does not use tracking pixels, fingerprinting scripts, cross-site cookies, or behavioral advertising systems.</span> We do not monitor users beyond the platform or build advertising profiles.</p>
                  </div>

                  {/* Technical Implementation */}
                  <div id="section-4" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 4. Platform Security</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>While USDFG does not collect personal data, we apply technical safeguards (e.g., HTTPS encryption, code audits) to protect gameplay, transactions, and system integrity.</p>
                  </div>

                  <div id="section-5" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 5. Smart Contract Transparency</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>All core USDFG challenge and token contracts are publicly viewable on the Solana blockchain. Users are encouraged to review contract logic and interact only through the official platform interface.</p>
                  </div>

                  <div id="section-6" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 6. Audit & Security Notices</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>While best efforts are made to review platform code, USDFG does not guarantee absolute security. Use of the platform is at your own risk. Known vulnerabilities should be reported to the USDFG team immediately for responsible disclosure.</p>
                  </div>

                  {/* User Experience */}
                  <div id="section-7" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 7. Cookies and Local Storage</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>We may use cookies or local storage to remember user preferences, such as:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Dark mode settings</li>
                      <li>Last connected wallet</li>
                      <li>Basic UX enhancements</li>
                    </ul>
                    <p>These can be disabled in your browser at any time.</p>
                  </div>

                  <div id="section-8" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 8. Third-Party Services</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG integrates with external tools strictly for essential platform operations:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Phantom Wallet – for wallet connection and transaction approval</li>
                      <li>Solana RPC infrastructure – for interacting with the blockchain</li>
                    </ul>
                    <p>These providers may operate under their own terms and policies. USDFG does not store or control any private data from these tools.</p>
                  </div>

                  {/* Data Management */}
                  <div id="section-9" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 9. Data Retention</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>We retain only the minimum amount of system-level data needed to operate:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>No personal profiles</li>
                      <li>No off-chain identity storage</li>
                      <li>Challenge logs are kept only for fair play enforcement and dispute resolution</li>
                    </ul>
                  </div>

                  <div id="section-10" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 10. Data Location</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG infrastructure is hosted in the United States or on decentralized cloud services. All data interactions follow U.S. regulatory standards where applicable.</p>
                  </div>

                  <div id="section-11" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 11. Data Access Format</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>If you request access to your data, we will provide any stored system records linked to your wallet in a machine-readable format (e.g., JSON or CSV), where applicable.</p>
                  </div>

                  {/* User Rights & Compliance */}
                  <div id="section-12" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 12. Your Rights</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>Depending on your jurisdiction, you may request to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Access data linked to your public wallet address</li>
                      <li>Request deletion of match history (if applicable)</li>
                      <li>File a data complaint with a regulatory authority</li>
                    </ul>
                    <p>Submit all requests via the contact methods below.</p>
                  </div>

                  <div id="section-13" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 13. Global Compliance</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG aligns with major global data principles such as GDPR and CCPA by minimizing data processing, avoiding personal identifiers, and honoring data access or deletion requests when applicable. Users may contact us to exercise applicable rights.</p>
                  </div>

                  {/* Platform Features */}
                  <div id="section-14" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 14. Fair Play Monitoring</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>To maintain a fair competitive environment, USDFG may monitor gameplay activity, match logs, and behavior patterns for signs of cheating, abuse, or collusion. This data is processed anonymously and used strictly for enforcing platform rules.</p>
                  </div>

                  <div id="section-15" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 15. Non-Custodial Disclaimer</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG is a non-custodial platform. Users hold and manage their own wallets and private keys. USDFG cannot assist with recovery of lost access, assets sent to incorrect addresses, or unauthorized transactions initiated from a user's wallet.</p>
                  </div>

                  <div id="section-16" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 16. Not a Security</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG is not offered or intended to be a security, investment vehicle, or financial product. It has no profit expectation, voting rights, or dividend structure. USDFG is a utility token for skill-based participation only, and its legal structure is designed to comply with U.S. and global regulatory guidelines regarding digital assets.</p>
                  </div>

                  {/* Content & Governance */}
                  <div id="section-17" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 17. AI and User-Generated Content Usage</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>By submitting, tagging, or creating content related to USDFG — including gameplay clips, memes, or commentary involving the brand, mascot, or platform — you grant USDFG a non-exclusive, royalty-free license to repost, remix, or use that content for marketing or community engagement. This includes AI-generated content incorporating USDFG themes.</p>
                  </div>

                  <div id="section-18" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 18. Community Governance (Non-Binding)</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>If USDFG launches decentralized governance features or DAOs, participation is optional and non-binding unless clearly specified. DAO proposals do not override the platform's legal structure or ownership. Participation does not confer rights, control, or equity in the platform.</p>
                  </div>

                  {/* Platform Evolution */}
                  <div id="section-19" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 19. Platform Evolution</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG may update features, integrate third-party tools, or expand use cases over time. Any new functionality will remain subject to these core privacy principles unless explicitly noted.</p>
                  </div>

                  <div id="section-20" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 20. Third-Party Hosted Events</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>Tournaments or challenges hosted by external partners, streamers, or organizations using USDFG's infrastructure remain subject to these Terms. USDFG is not liable for rewards, results, or communications managed by third-party hosts. Users must verify host credibility before joining.</p>
                  </div>

                  {/* Policy Management */}
                  <div id="section-21" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 21. Policy Updates</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>We may update this Privacy Policy as the platform evolves. Major changes will be communicated via the platform or official channels.</p>
                  </div>

                  <div id="section-22" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 22. Children's Privacy</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p>USDFG is not intended for users under the age of 13, or the minimum legal age in your region.</p>
                    <p>We do not knowingly collect any data from minors.</p>
                  </div>

                  <div id="section-23" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ 23. Contact</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <div className="bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 shadow-[0_0_20px_rgba(147,51,234,0.2)] max-w-lg mx-auto hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all">
                      <ul className="list-disc pl-5 space-y-2">
                        <li>📧 Email: <a href="mailto:founder@usdfg.pro" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent hover:underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>founder@usdfg.pro</a> or <a href="mailto:support@usdfg.pro" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent hover:underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>support@usdfg.pro</a></li>
                        <li>🐦 Twitter/X: <a href="https://twitter.com/USDFGAMING" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent hover:underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>@USDFGAMING</a></li>
                      </ul>
                    </div>
                  </div>

                  <div id="section-related" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tracking-wide" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>→ Related Policies</h3>
                    </div>
                    <div className="border-t border-amber-400/30 mb-4"></div>
                    <p><a href="/terms" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent underline hover:no-underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>View Terms of Service</a></p>
                  </div>

                  <div className="mt-8 pt-8 border-t border-purple-500/30 text-center">
                    <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>🔚 Closing Statement</h3>
                    <p className="text-white/80">USDFG is founded on self-custody, transparency, and zero reliance on centralized infrastructure.</p>
                    <p className="text-white/80">We believe in proof over promises — and protecting our players from exploitation at every step.</p>
                    <div className="mt-8 flex flex-col items-center">
                      <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-bold text-lg" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))" }}>Hussein Ali</span>
                      <span className="text-white/60 text-xs">Founder, USDFGAMING</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Reveal>
      </div>
      <Footer />

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm border border-purple-500/20 text-white rounded-full px-4 py-2 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:bg-gradient-to-r hover:from-purple-600 hover:to-amber-500 hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all duration-300 text-sm font-bold md:block hidden"
        aria-label="Back to Top"
      >
        ↑ Back to Top
      </button>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-slide-in {
          opacity: 0;
          animation: slideIn 0.5s ease-out forwards;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .whitepaper-section {
            padding: 1rem;
            margin: 0.5rem;
            border-width: 1px;
          }

          h1 {
            font-size: 2rem;
            margin-bottom: 1.5rem;
            padding: 0 0.5rem;
          }

          h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }

          h3 {
            font-size: 1.25rem;
            line-height: 1.4;
          }

          p, li {
            font-size: 0.875rem;
            line-height: 1.5;
          }

          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          ul {
            padding-left: 1.25rem;
          }

          /* Adjust spacing for mobile */
          .space-y-8 > div {
            margin-bottom: 1.5rem;
          }

          /* Ensure links are easily tappable */
          a {
            padding: 0.25rem 0;
            display: inline-block;
          }

          /* Adjust disclaimer banner for mobile */
          .fixed.bottom-0 {
            padding: 0.75rem 1rem;
          }

          .fixed.bottom-0 p {
            font-size: 0.75rem;
            line-height: 1.4;
          }
        }

        /* Smooth scrolling for the entire page */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #111;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.8);
        }

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
      `}</style>
    </>
  );
};

export default Privacy; 