import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const Terms: React.FC = () => {
  useEffect(() => {
    // Smooth scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service | USDFGAMING – Skill-Based Crypto Gaming Platform</title>
        <meta name="description" content="Read the Terms of Service for USDFGAMING, the elite, skill-based crypto gaming platform. Understand your rights, responsibilities, and our commitment to fair, on-chain competition." />
        <meta name="keywords" content="USDFG, USDFG, terms of service, crypto gaming terms, skill-based gaming, fair play, non-custodial, USDFGAMING" />
        <link rel="canonical" href="https://usdfg.pro/terms" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usdfg.pro/terms" />
        <meta property="og:title" content="Terms of Service | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta property="og:description" content="Read the Terms of Service for USDFGAMING, the elite, skill-based crypto gaming platform. Understand your rights, responsibilities, and our commitment to fair, on-chain competition." />
        <meta property="og:image" content="https://usdfg.pro/usdfg-og-banner.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:title" content="Terms of Service | USDFGAMING – Skill-Based Crypto Gaming Platform" />
        <meta name="twitter:description" content="Read the Terms of Service for USDFGAMING, the elite, skill-based crypto gaming platform. Understand your rights, responsibilities, and our commitment to fair, on-chain competition." />
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
                "url": "https://usdfg.pro/terms",
                "name": "Terms of Service | USDFGAMING – Skill-Based Crypto Gaming Platform",
                "description": "Read the Terms of Service for USDFGAMING, the elite, skill-based crypto gaming platform. Understand your rights, responsibilities, and our commitment to fair, on-chain competition."
              }
            ]
          }
        `}</script>
      </Helmet>
      <Navbar />
      <div className="relative flex flex-col md:flex-row">
        {/* Sticky Table of Contents for desktop */}
        <nav className="hidden md:block md:w-64 sticky top-24 h-fit self-start px-2 py-6 mr-8 bg-[#0b0b0c]/80 border border-cyan-400/30 rounded-lg shadow-[0_0_12px_#22d3ee22] mt-12 animate-fade-in">
          <h2 className="text-cyan-400 font-bold text-lg mb-4 tracking-wide">On This Page</h2>
          <ul className="space-y-2 text-cyan-200 text-sm" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <li><a href="#section-0" className="hover:text-white transition">Founder & Team</a></li>
            <li><a href="#section-1" className="hover:text-white transition">Legal Classification</a></li>
            <li><a href="#section-2" className="hover:text-white transition">Service Overview</a></li>
            <li><a href="#section-3" className="hover:text-white transition">Eligibility</a></li>
            <li><a href="#section-4" className="hover:text-white transition">Skill-Based Platform</a></li>
            <li><a href="#section-5" className="hover:text-white transition">Token Use & Risk</a></li>
            <li><a href="#section-6" className="hover:text-white transition">User Conduct</a></li>
            <li><a href="#section-7" className="hover:text-white transition">Limitation of Liability</a></li>
            <li><a href="#section-8" className="hover:text-white transition">Platform Availability</a></li>
            <li><a href="#section-9" className="hover:text-white transition">Modifications</a></li>
            <li><a href="#section-10" className="hover:text-white transition">Termination</a></li>
            <li><a href="#section-11" className="hover:text-white transition">Governing Law</a></li>
            <li><a href="#section-12" className="hover:text-white transition">Contact</a></li>
            <li><a href="#section-13" className="hover:text-white transition">Dispute Resolution</a></li>
            <li><a href="#section-14" className="hover:text-white transition">No Financial Advice</a></li>
            <li><a href="#section-15" className="hover:text-white transition">User Responsibility</a></li>
            <li><a href="#section-16" className="hover:text-white transition">Assumption of Risk</a></li>
            <li><a href="#section-17" className="hover:text-white transition">Severability</a></li>
            <li><a href="#section-18" className="hover:text-white transition">Naming Notice</a></li>
            <li><a href="#section-19" className="hover:text-white transition">Indemnification</a></li>
            <li><a href="#section-20" className="hover:text-white transition">Jurisdictional Use</a></li>
            <li><a href="#section-21" className="hover:text-white transition">No Agency</a></li>
            <li><a href="#section-22" className="hover:text-white transition">No Ownership Rights</a></li>
            <li><a href="#section-23" className="hover:text-white transition">Token Acquisition & Use</a></li>
            <li><a href="#section-24" className="hover:text-white transition">Legal Safeguards</a></li>
            <li><a href="#section-25" className="hover:text-white transition">Third-Party Tools</a></li>
            <li><a href="#section-26" className="hover:text-white transition">Intellectual Property</a></li>
            <li><a href="#section-27" className="hover:text-white transition">Token Use Limitation</a></li>
            <li><a href="#section-28" className="hover:text-white transition">Autonomous Execution</a></li>
            <li><a href="#section-29" className="hover:text-white transition">No Promoter Liability</a></li>
            <li><a href="#section-30" className="hover:text-white transition">Wallet & Transaction</a></li>
            <li><a href="#section-31" className="hover:text-white transition">International Use</a></li>
            <li><a href="#section-32" className="hover:text-white transition">Platform Fees</a></li>
            <li><a href="#section-33" className="hover:text-white transition">No Guarantee of Earnings</a></li>
            <li><a href="#section-34" className="hover:text-white transition">Blockchain Risks</a></li>
            <li><a href="#section-35" className="hover:text-white transition">No Fiduciary Relationship</a></li>
            <li><a href="#section-36" className="hover:text-white transition">Misuse & Harassment</a></li>
            <li><a href="#section-37" className="hover:text-white transition">Regulatory Cooperation</a></li>
            <li><a href="#section-38" className="hover:text-white transition">No Custodial Holdings</a></li>
            <li><a href="#section-39" className="hover:text-white transition">Community Participation</a></li>
            <li><a href="#section-40" className="hover:text-white transition">KYC / Identity</a></li>
            <li><a href="#section-41" className="hover:text-white transition">Content Ownership</a></li>
            <li><a href="#section-42" className="hover:text-white transition">Challenge Dispute</a></li>
            <li><a href="#section-43" className="hover:text-white transition">Affiliate/Referral</a></li>
            <li><a href="#section-44" className="hover:text-white transition">AI Use & Automation</a></li>
            <li><a href="#section-45" className="hover:text-white transition">Analytics & Anti-Cheat</a></li>
            <li><a href="#section-46" className="hover:text-white transition">Bounty & Rewards</a></li>
            <li><a href="#section-47" className="hover:text-white transition">Platform Lifecycle</a></li>
            <li><a href="#section-48" className="hover:text-white transition">Legal Jurisdiction</a></li>
            <li><a href="#section-49" className="hover:text-white transition">Community Content & AI</a></li>
            <li><a href="#section-50" className="hover:text-white transition">DAO Participation</a></li>
            <li><a href="#section-51" className="hover:text-white transition">Successor Entity</a></li>
            <li><a href="#section-52" className="hover:text-white transition">AI Gameplay</a></li>
            <li><a href="#section-53" className="hover:text-white transition">Account Suspension</a></li>
            <li><a href="#section-54" className="hover:text-white transition">Token Migration</a></li>
            <li><a href="#section-55" className="hover:text-white transition">Data Retention</a></li>
            <li><a href="#section-56" className="hover:text-white transition">No Service-Level Guarantee</a></li>
            <li><a href="#section-57" className="hover:text-white transition">Regulatory Change</a></li>
            <li><a href="#section-58" className="hover:text-white transition">Sponsored Content</a></li>
            <li><a href="#section-59" className="hover:text-white transition">AI & User Content</a></li>
            <li><a href="#section-60" className="hover:text-white transition">Community Governance</a></li>
            <li><a href="#section-61" className="hover:text-white transition">Third-Party Events</a></li>
            <li><a href="#section-62" className="hover:text-white transition">Not a Security</a></li>
            <li><a href="#section-63" className="hover:text-white transition">Non-Custodial</a></li>
            <li><a href="#section-64" className="hover:text-white transition">Platform Snapshot</a></li>
            <li><a href="#section-65" className="hover:text-white transition">Forking Restrictions</a></li>
            <li><a href="#section-66" className="hover:text-white transition">Platform Integrity</a></li>
            <li><a href="#section-67" className="hover:text-white transition">Multichain Disclaimer</a></li>
            <li><a href="#section-68" className="hover:text-white transition">Fixed Supply</a></li>
            <li><a href="#section-69" className="hover:text-white transition">Smart Contract Stability</a></li>
            <li><a href="#section-70" className="hover:text-white transition">Related Policies</a></li>
          </ul>
        </nav>
        <main className="min-h-screen bg-gradient-to-b from-[#181c2f] via-[#1a142e] to-[#181c2f] flex-1 text-cyan-100">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <p className="text-center text-sm text-neutral-400 italic mb-6">
            No mercy. No reruns. Just skill.
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center"
              style={{
                color: 'var(--text-light)',
                textShadow: 'var(--neon-glow)'
              }}>
            Terms of Service
          </h1>

            {/* Why These Terms Matter */}
            <div className="max-w-2xl mx-auto mb-6 text-center animate-fade-in">
              <p className="text-lg font-semibold text-cyan-400 mb-2">Why These Terms Matter</p>
              <p className="text-base text-white/90">USDFG is built for elite gamers and crypto users who demand fairness, transparency, and self-custody. These Terms set the standard for how we protect your rights, your assets, and your experience—no fine print, no hidden risks, ever.</p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-in">
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#0b0b0c] border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_#22d3ee] text-sm">100% Non-Custodial</span>
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#0b0b0c] border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_#22d3ee] text-sm">No Gambling</span>
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#0b0b0c] border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_#22d3ee] text-sm">Skill-Based</span>
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#0b0b0c] border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_#22d3ee] text-sm">Self-Custody</span>
            </div>

            {/* Last Updated Notice */}
            <div className="text-center mb-8 animate-fade-in">
              <span className="inline-block px-4 py-1 rounded bg-[#0b0b0c] border border-cyan-400 text-cyan-200 font-medium text-xs tracking-wide shadow-[0_0_8px_#22d3ee]">Last Updated: May 1, 2025 &nbsp;|&nbsp; Version: v1.0</span>
            </div>

          <section className="whitepaper-section max-w-4xl mx-auto bg-[#111]/90 border border-[#22d3ee] p-6 sm:p-8 rounded-lg shadow-lg mb-10 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <div className="prose prose-invert max-w-none">
              <p className="text-base sm:text-lg mb-4 text-white">Effective Date: May 1, 2025</p>
              <p className="text-base sm:text-lg mb-4 text-white font-semibold">USDFG is founded and led by Hussein Ali, a builder who created the platform to champion skill, self-sovereignty, and competition over chance.</p>
              <div className="space-y-8 text-white">
                  {/* Core Terms */}
                  <div id="section-0" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 0. Founder and Team Structure</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG is a platform founded and currently operated solely by <span className="text-cyan-400 font-bold">Hussein Ali</span> (the "Founder"). For the purposes of this agreement, any references to the "USDFG team" shall be interpreted as referring to the Founder and any authorized representatives who may be appointed in the future. This structure ensures clear accountability while allowing for future operational growth.</p>
                </div>

                  <div id="section-1" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 1. Legal Classification Statement</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is a skill-based digital competition platform operated solely by its Founder. It does not offer any form of gambling, wagering, lotteries, or games of chance. Participation is voluntary and rewards are based exclusively on user skill and verified performance. USDFG is a utility token used solely to access platform features and has no guaranteed monetary value. These Terms are designed to comply with applicable laws related to gaming, digital assets, and consumer protections.</p>
                </div>

                  <div id="section-2" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 2. Service Overview</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is a skill-based digital platform where users participate in challenges, earn rewards, and engage with competitive content. The platform is powered by the USDFG token, used strictly for in-platform utilities and skill-based competitions. No gambling, betting, or games of chance are offered or supported. All competitions are based solely on user skill and verified performance metrics.</p>
                </div>

                  <div id="section-3" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 3. Eligibility</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is a platform for users 18 and older. Players aged 13 to 17 may participate only if parental or legal guardian consent is granted and verifiable. Users under 13 are strictly prohibited.</p>
                  <p>USDFG does not collect personal identifiers or account data. Proof of age or consent may be requested where legally required.</p>
                </div>

                  <div id="section-4" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 4. Skill-Based Platform Only</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is a skill-based competition platform. We do not host, facilitate, or allow gambling, betting, lotteries, or games of chance. All outcomes are based solely on performance, gameplay ability, and user verification.</p>
                </div>

                  <div id="section-5" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 5. Token Use & Risk Disclosure</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is a utility token with no guaranteed value, used exclusively for platform participation and skill-based competitions.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Token values may fluctuate and are not guaranteed.</li>
                    <li>USDFG is non-custodial - we do not store or control your wallet or private keys.</li>
                    <li>We cannot restore lost access or funds - users are responsible for their wallet security.</li>
                    <li>You are fully responsible for complying with your local crypto laws.</li>
                    <li>Tokens are for utility only - not for speculative investment.</li>
                  </ul>
                </div>

                  <div id="section-6" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 6. User Conduct</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>By using USDFG, you agree to play fairly, respect others, stay legal, and protect the platform. Violations may result in immediate suspension or permanent ban.</p>
                </div>

                  <div id="section-7" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 7. Limitation of Liability</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>To the maximum extent allowed by law, USDFG and its founder are not liable for losses related to token use, platform downtime, unauthorized access, regulatory action, or indirect/incidental damages. Services are provided as-is.</p>
                </div>

                  <div id="section-8" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 8. Platform Availability</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>We do not guarantee 24/7 uptime. Downtime may occur due to blockchain outages, maintenance, or technical failures.</p>
                </div>

                  <div id="section-9" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 9. Modifications</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>These Terms may be updated at any time. If major changes are made, we'll notify you via in-platform notice or email. Continued use of USDFG constitutes acceptance of the new Terms.</p>
                </div>

                  <div id="section-10" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 10. Termination</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>We may terminate or suspend your access at any time for violating these Terms, abusing the platform, or engaging in fraudulent or illegal activity.</p>
                </div>

                  <div id="section-11" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 11. Governing Law</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>These Terms are governed by the laws of the United States. All legal matters must be resolved in U.S. courts.</p>
                </div>

                  <div id="section-12" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 12. Contact</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <div className="bg-[#0b0b0c] border border-cyan-400 rounded-lg p-6 shadow-[0_0_16px_rgba(72,216,255,0.2)] max-w-lg mx-auto">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>X (Twitter): <a href="https://twitter.com/USDFGAMING" className="text-[#22d3ee] hover:underline">https://twitter.com/USDFGAMING</a></li>
                    <li>Email: <a href="mailto:founder@usdfg.pro" className="text-[#22d3ee] hover:underline">founder@usdfg.pro</a> or <a href="mailto:support@usdfg.pro" className="text-[#22d3ee] hover:underline">support@usdfg.pro</a></li>
                    <li>Official Website: <a href="https://usdfg.pro" className="text-[#22d3ee] hover:underline">https://usdfg.pro</a></li>
                  </ul>
                    </div>
                </div>

                  <div id="section-13" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 13. Dispute Resolution</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>All disputes shall be resolved through binding arbitration under the rules of the American Arbitration Association. Class actions, collective claims, and public litigation are not permitted.</p>
                </div>

                  <div id="section-14" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 14. No Financial Advice</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG does not provide any financial, investment, or tax advice. The platform is strictly for competitive entertainment.</p>
                </div>

                  <div id="section-15" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 15. User Responsibility</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>You are fully responsible for wallet security, lawful use of the platform, and your own actions. USDFG is a non-custodial platform and does not manage user funds.</p>
                </div>

                  <div id="section-16" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 16. Assumption of Risk</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>You understand that cryptocurrency is volatile, features may change, and technical issues can occur. You use USDFG at your own risk.</p>
                </div>

                  <div id="section-17" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 17. Severability</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>If any clause is unenforceable, the remaining Terms remain valid.</p>
                </div>

                  <div id="section-18" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 18. Naming Notice</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>The official name is United We Stand Divided We Fall Gaming. The Solana-registered token is United We Stand Gaming. The brand is USDFGAMING and the ticker is USDFG. All references refer to the same entity.</p>
                </div>

                  <div id="section-19" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 19. Indemnification</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>You agree to defend and hold harmless USDFG, its Founder, and any future authorized representatives. The Founder is not liable for the project's legal or operational obligations.</p>
                </div>

                  <div id="section-20" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 20. Jurisdictional Use</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>You must verify that your local laws permit use of skill-based digital platforms and crypto. USDFG is not available in restricted regions.</p>
                </div>

                  <div id="section-21" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 21. No Agency</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>No agency, partnership, or employment relationship is created by using this platform.</p>
                </div>

                  <div id="section-22" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 22. No Ownership Rights</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Holding USDFG does not grant ownership, equity, voting power, or legal claim over the platform.</p>
                </div>

                  <div id="section-23" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 23. Token Acquisition and Use</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Users may acquire USDFG tokens to access features, create or join challenges, and participate in skill-based competitions. Acquiring tokens is not a bet, wager, or speculative investment, and using tokens to enter a challenge is not gambling. Challenge rewards are based solely on measurable performance and outcome verification. Users may withdraw earned tokens to their wallets and convert them using external platforms at their discretion. USDFG does not offer, facilitate, or control currency exchange or financial speculation.</p>
                </div>

                  <div id="section-24" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 24. Legal Safeguards and Gambling Exclusion</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG only hosts competitions where skill determines the result, and chance plays no role. Challenge rewards are distributed by programmatic smart contracts based on verifiable performance outcomes. USDFG's platform is structured in accordance with legal standards governing skill-based contests under U.S. law. USDFG is prepared to demonstrate the technical structure of its skill-based competitions upon formal legal request.</p>
                </div>

                  <div id="section-25" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 25. Third-Party Tools Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG integrates with external services like Phantom Wallet and Solana infrastructure. We are not responsible for issues on these third-party platforms.</p>
                </div>

                  <div id="section-26" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 26. Intellectual Property Ownership</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>All branding, designs, logos, mascots, token structures, and code are owned by USDFG or its licensors.</p>
                </div>

                  <div id="section-27" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 26.1. Third-Party Game Publisher Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is not affiliated with or endorsed by any third-party game publishers. All game trademarks, logos, and intellectual property belong to their respective owners. USDFG's platform operates independently and does not claim any official association with the games featured on our platform.</p>
                </div>

                  <div id="section-28" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 26.2. Game IP Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>All game titles referenced by users are owned by their respective publishers. USDFG is not affiliated with or endorsed by any game company.</p>
                  </div>

                  <div id="section-29" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 27. Token Use Limitation</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Holding or acquiring USDFG does not entitle users to revenue, profits, dividends, ownership, or governance influence.</p>
                </div>

                  <div id="section-30" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 28. Autonomous Execution Clause</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Challenges and rewards operate via smart contracts. Results are final unless fraud or verified dispute is proven.</p>
                </div>

                  <div id="section-31" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 29. No Promoter Liability</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Marketing and community content is for entertainment only and does not constitute advice or guarantees. The Founder and any future authorized representatives are not liable for promotional content.</p>
                </div>

                  <div id="section-32" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 30. Wallet & Transaction Responsibility</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Users are solely responsible for wallet access, transaction accuracy, and associated fees.</p>
                </div>

                  <div id="section-33" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 31. International Use Exemption</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Users accessing the platform from outside the U.S. do so at their own risk.</p>
                </div>

                  <div id="section-34" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 32. Platform Fees and Use of Funds</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG applies a 5% fee on challenge transactions. Fees fund platform operations, compensation, and future growth. This is disclosed before challenge entry.</p>
                </div>

                  <div id="section-35" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 33. No Guarantee of Earnings or Results</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG does not guarantee earnings, token value, or personal results. It is not an investment or passive income scheme.</p>
                </div>

                  <div id="section-36" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 34. Acknowledgment of Blockchain Risks</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Users accept risks like volatility, delays, bugs, and external threats when using the platform.</p>
                </div>

                  <div id="section-37" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 35. No Fiduciary Relationship</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Using USDFG does not create a fiduciary relationship. Users are responsible for their own decisions.</p>
                </div>

                  <div id="section-38" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 36. Misuse, False Claims, and Public Harassment</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may take legal or platform action against users spreading false claims or harassing the founder.</p>
                </div>

                  <div id="section-39" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 37. Regulatory Cooperation and Jurisdiction</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG is not a security, investment, or gambling offering. We will comply with legal requests and may restrict access when required.</p>
                </div>

                  <div id="section-40" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 38. No Custodial Holdings or Token Sales</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG does not offer custodial services. Users manage their own wallets and tokens.</p>
                </div>

                  <div id="section-41" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 39. Community Participation Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Token holders do not have rights to influence financial or operational decisions. Feedback is optional and non-binding.</p>
                </div>

                  <div id="section-42" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 40. KYC / Identity Verification Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may implement identity verification to prevent fraud and meet legal requirements.</p>
                </div>

                  <div id="section-43" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 41. Content Ownership</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Users retain ownership of uploaded content but grant USDFG a license to use it in promotional materials.</p>
                </div>

                  <div id="section-44" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 42. Challenge Dispute Resolution System</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Disputes may be reviewed based on logs or smart contract outcomes. No guarantees of reversal unless fraud is proven.</p>
                </div>

                  <div id="section-45" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 43. Affiliate or Referral System Terms</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Referral programs may be offered and changed at any time by the Founder or future authorized representatives. Abuse may lead to disqualification.</p>
                </div>

                  <div id="section-46" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 44. AI Use and Automation Disclosure</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may use automated systems for moderation, verification, and platform optimization.</p>
                </div>

                  <div id="section-47" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 45. Analytics and Anti-Cheat Monitoring</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may analyze user behavior, device metadata, and in-game activity to detect suspicious patterns, enforce fair play, or improve platform experience. This includes automated systems that detect botting, collusion, or exploitative behavior. By using the platform, users consent to this monitoring.</p>
                </div>

                  <div id="section-48" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 46. Bounty & Community Reward Programs</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may, at its discretion, offer rewards for community-reported bugs, exploits, or valuable contributions. Participation in any bounty program is optional and subject to terms provided at the time of the offer. Rewards are not guaranteed unless explicitly confirmed by USDFG.</p>
                </div>

                  <div id="section-49" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 47. Platform Lifecycle and Discontinuation</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG makes no guarantee of indefinite platform availability. We reserve the right to suspend, evolve, or discontinue any feature, product, or service based on economic, legal, or operational requirements. Users accept that such decisions may occur without liability or obligation.</p>
                </div>

                  <div id="section-50" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 48. Legal Jurisdiction Flexibility</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG reserves the right to restructure or relocate platform operations to alternative legal jurisdictions in response to regulatory changes or legal requirements. Any changes will be communicated via official channels and updated in these Terms accordingly.</p>
                </div>

                  <div id="section-51" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 49. Community Content and AI Use</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>Any artwork, memes, commentary, or content submitted or created using USDFG's platform, mascot, or brand assets may be reused, reposted, or modified by USDFG for community engagement, marketing, or archival purposes. Content generated through AI using USDFG branding is considered part of the platform ecosystem and may be curated or removed at USDFG's discretion.</p>
                </div>

                  <div id="section-52" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 50. DAO Participation Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>If USDFG evolves into a decentralized governance structure ("DAO"), user participation will be non-binding, optional, and informational only unless explicitly defined through smart contract voting mechanisms. No DAO action shall imply platform ownership, employment, or fiduciary relationship with the Founder or any future authorized representatives.</p>
                </div>

                  <div id="section-53" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 51. Successor Entity and Assignment</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>In the event of a platform restructure, merger, sale, or transition to a successor organization, all rights and responsibilities under these Terms shall transfer accordingly. Continued use of the platform constitutes acceptance of the updated controlling entity.</p>
                </div>

                  <div id="section-54" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 52. AI Gameplay Systems and Disclaimers</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG may use automated systems and machine learning to assist in challenge validation, cheating detection, dispute resolution, and gameplay moderation. These systems are designed to support—not replace—human oversight and do not guarantee perfect accuracy.</p>
                </div>

                  <div id="section-55" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 53. Account Suspension Review</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG reserves the right to suspend or permanently ban user accounts based on suspected misconduct, fraud, or policy violations. Suspensions may be automated or manual. USDFG is not obligated to provide an appeal or review process unless required by law.</p>
                </div>

                  <div id="section-56" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 54. Token Migration and Upgrade</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG reserves the right to migrate or upgrade the USDFG token, smart contracts, or platform infrastructure to a new blockchain, contract address, or versioned system. Users may be required to follow official migration instructions. Failure to do so may result in permanent loss of legacy tokens or access.</p>
                </div>

                  <div id="section-57" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 55. Data Retention and Access</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG stores only the minimal personal data required to operate the platform. Users may request a copy of their stored data or request deletion where legally applicable. Certain records may be retained as required by law or for platform integrity.</p>
                </div>

                  <div id="section-58" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 56. No Service-Level Guarantee</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG makes no guarantees regarding uptime, platform availability, or service responsiveness. While we aim to provide stable and continuous access, unexpected downtime, latency, or outages may occur without notice or compensation.</p>
                </div>

                  <div id="section-59" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 57. Regulatory Change Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <p>USDFG reserves the right to modify services, user permissions, fees, wallet integrations, or platform access to comply with future legal or regulatory changes in any applicable jurisdiction. These modifications may occur without prior notice and without user compensation.</p>
                </div>

                  <div id="section-60" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 58. Sponsored Content & Advertising</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>USDFG may feature limited sponsored content or advertising placements in designated areas (e.g., footer, landing page, or "Powered By" banners).</li>
                    <li>All ads are manually reviewed to ensure alignment with the platform's values.</li>
                    <li>We do not sell user data, enable third-party tracking, or run external ad networks.</li>
                    <li>Sponsored placements will be clearly labeled and selected based on relevance to gaming, crypto, or competitive ecosystems.</li>
                    <li>Ads promoting gambling, staking, or speculative financial products are strictly prohibited.</li>
                    <li>USDFG reserves the right to approve or reject any sponsorship based on integrity, legal safety, and brand alignment.</li>
                  </ul>
                  </div>

                  <div id="section-61" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 59. AI and User-Generated Content Usage</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>By submitting, tagging, or creating content related to USDFG, including gameplay, memes, or commentary involving the brand, mascot, or platform, you grant USDFG a non-exclusive, royalty-free license to repost, remix, or use that content for marketing or community engagement. This includes AI-generated content that incorporates USDFG themes.</p>
                  </div>

                  <div id="section-62" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 60. Community Governance (Non-Binding)</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>If USDFG launches decentralized governance features or DAOs, participation is optional and non-binding unless clearly specified. DAO proposals do not override the platform's legal structure or ownership. Participation does not confer rights, control, or equity in the platform.</p>
                  </div>

                  <div id="section-63" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 61. Third-Party Hosted Events</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>Tournaments or challenges hosted by external partners, streamers, or organizations using USDFG's infrastructure remain subject to these Terms. USDFG is not liable for rewards, results, or communications managed by third-party hosts. Users must verify host credibility before joining.</p>
                  </div>

                  <div id="section-64" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 62. Not a Security</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG is not offered or intended to be a security, investment vehicle, or financial product. It has no profit expectation, voting rights, or dividend structure. USDFG is a utility token for skill-based participation only, and its legal structure is designed to comply with U.S. and global regulatory guidelines regarding digital assets.</p>
                  </div>

                  <div id="section-65" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 63. Non-Custodial Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG is a non-custodial platform. Users hold and manage their own wallets and private keys. USDFG cannot assist with recovery of lost access, assets sent to incorrect addresses, or unauthorized transactions initiated from a user's wallet.</p>
                  </div>

                  <div id="section-66" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 64. Platform Snapshot Rights</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG reserves the right to take on-chain and off-chain snapshots of platform state (e.g., active challenges, wallet balances, user interactions) for auditing, dispute resolution, or governance-related decisions. These snapshots are non-editable and used solely for integrity and accountability.</p>
                  </div>

                  <div id="section-67" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 65. Forking & Derivative Work Restrictions</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>Unless explicitly licensed, no part of USDFG's codebase, smart contracts, branding, or platform logic may be copied, forked, or redeployed under a new project. This includes unauthorized derivatives using USDFG's token model, mascot, or core platform mechanics.</p>
                  </div>

                  <div id="section-68" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 66. Platform Integrity Enforcement</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG reserves the right to monitor gameplay and ecosystem interactions for manipulation, exploits, or abusive automation. This includes but is not limited to: reward farming, collusion, botnet participation, and vote brigading. Breaches may result in penalties or bans.</p>
                  </div>

                  <div id="section-69" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 67. Multichain Integration Disclaimer</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG may integrate with additional blockchains or Layer 2 systems in the future. Any such integrations are subject to the same non-custodial, utility-only terms. Token bridging, wrapping, or migration tools will be optional and clearly disclosed.</p>
                  </div>

                  <div id="section-70" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 68. Fixed Supply Statement</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>The USDFG token has a permanently fixed maximum supply of 21 million tokens. No additional minting, inflation, or hidden reserves exist. All token-related functions are transparent and verifiable on-chain.</p>
                  </div>

                  <div id="section-71" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 69. Smart Contract Stability Notice</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>USDFG smart contracts are immutable or upgradeable only through public, documented processes. Users will not be subject to hidden contract changes, forced migrations, or stealth updates that alter core platform functionality or token behavior.</p>
                  </div>

                  <div id="section-72" className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      <h3 className="text-xl font-semibold text-[#22d3ee] tracking-wide">→ 70. Related Policies</h3>
                    </div>
                    <div className="border-t border-cyan-400/30 mb-4"></div>
                    <p>For details on how we handle platform data and privacy, please review our <a href="/privacy" className="text-cyan-400 underline">Privacy Policy</a>.</p>
                  </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      </div>
      <Footer />
      <p className="text-sm text-muted-foreground text-center mt-10 mb-4">
        This platform is operated at <a href="https://usdfg.pro" className="underline">https://usdfg.pro</a> and governed by these Terms.
      </p>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-50 bg-[#0b0b0c] border border-cyan-400 text-cyan-200 rounded-full px-4 py-2 shadow-[0_0_12px_#22d3ee] hover:bg-cyan-400 hover:text-[#0b0b0c] transition-all duration-300 text-sm font-bold md:block hidden"
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
          background: #22d3ee;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #67e8f9;
        }
      `}</style>
    </>
  );
};

export default Terms; 