import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../sections/Navigation';
import Footer from '../sections/Footer';
import ParticleBackground from '../components/ParticleBackground';
import { useLegalPageGsap } from '../hooks/useLegalPageGsap';

function PrivacyPolicyPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  useLegalPageGsap(mainRef);

  useEffect(() => {
    document.title = 'Privacy Policy | USDFG — Skill-Based Esports Arena';
  }, []);

  return (
    <div ref={mainRef} className="relative min-h-screen bg-void overflow-x-hidden">
      <ParticleBackground />
      <Navigation />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-20 lg:py-24">
        <div className="glass border border-purple/20 rounded-2xl p-8 lg:p-12">
          <div className="mb-8" data-animate="legal-back">
            <Link to="/whitepaper" className="text-purple hover:text-orange transition-colors font-body text-sm">
              ← Back to Whitepaper
            </Link>
          </div>

          <p className="text-center text-sm text-white/70 italic mb-6" data-animate="legal-tagline">
            No mercy. No reruns. Just skill.
          </p>
          <h1
            className="font-display font-bold text-4xl sm:text-5xl text-white text-center mb-8"
            data-animate="legal-title"
          >
            <span className="text-gradient">Privacy Policy</span>
          </h1>

          <div className="max-w-2xl mx-auto mb-8 text-center" data-animate="legal-intro">
            <p className="font-display font-semibold text-lg text-purple mb-2">Why This Policy Matters</p>
            <p className="font-body text-white/80 leading-relaxed">
              USDFG is built for elite gamers and crypto users who demand privacy, transparency, and self-custody. This policy explains exactly how we protect your data and your rights—no fine print, no hidden tracking, ever.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10" data-animate="legal-badges">
            {['100% Non-Custodial', 'No Tracking', 'GDPR Aligned', 'Self-Custody'].map((badge) => (
              <span key={badge} className="px-4 py-2 glass rounded-full border border-purple/30 text-sm text-white font-medium">
                {badge}
              </span>
            ))}
          </div>

          <p className="text-center text-white/60 text-sm mb-12" data-animate="legal-meta">
            Last Updated: May 1, 2025 | Version: v1.0
          </p>

          <div className="space-y-10 font-body text-white/80 leading-relaxed" data-animate="legal-content">
            <p className="text-white" data-animate="legal-opening">
              USDFG is built on the principles of decentralization, skill-based competition, and user sovereignty. We minimize data exposure, do not host accounts, and never collect personal identifiers.
            </p>

            <section id="section-1">
              <h3 className="font-display font-bold text-xl text-purple mb-2">1. What We Collect</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG does not collect or store personal data such as names, emails, or passwords. The platform is fully <strong className="text-orange">non-custodial</strong> — we do not manage wallets or user accounts.</p>
              <p className="mt-2">We may process limited public and system-level data strictly for platform functionality:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Public wallet addresses – used to verify challenge entries and reward eligibility</li>
                <li>Challenge participation records – linked to wallets for match history and dispute resolution</li>
                <li>Interaction signals – used for anti-cheat logic and improving performance</li>
              </ul>
            </section>

            <section id="section-2">
              <h3 className="font-display font-bold text-xl text-purple mb-2">2. How We Use Data</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We do not sell, profile, or track users across the internet. All data processing is limited to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Verifying wallet-based challenge participation</li>
                <li>Preventing abuse through basic non-invasive anti-cheat</li>
                <li>Platform analytics and integrity</li>
                <li>Satisfying legal or compliance obligations (if required)</li>
              </ul>
            </section>

            <section id="section-3">
              <h3 className="font-display font-bold text-xl text-purple mb-2">3. No Tracking or Profiling</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p><strong className="text-orange">USDFG does not use tracking pixels, fingerprinting scripts, cross-site cookies, or behavioral advertising systems.</strong> We do not monitor users beyond the platform or build advertising profiles.</p>
            </section>

            <section id="section-4">
              <h3 className="font-display font-bold text-xl text-purple mb-2">4. Platform Security</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>While USDFG does not collect personal data, we apply technical safeguards (e.g., HTTPS encryption, code audits) to protect gameplay, transactions, and system integrity.</p>
            </section>

            <section id="section-5">
              <h3 className="font-display font-bold text-xl text-purple mb-2">5. Smart Contract Transparency</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>All core USDFG challenge and token contracts are publicly viewable on the Solana blockchain. Users are encouraged to review contract logic and interact only through the official platform interface.</p>
            </section>

            <section id="section-6">
              <h3 className="font-display font-bold text-xl text-purple mb-2">6. Audit & Security Notices</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>While best efforts are made to review platform code, USDFG does not guarantee absolute security. Use of the platform is at your own risk. Known vulnerabilities should be reported to the USDFG team immediately for responsible disclosure.</p>
            </section>

            <section id="section-7">
              <h3 className="font-display font-bold text-xl text-purple mb-2">7. Cookies and Local Storage</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We may use cookies or local storage to remember user preferences, such as:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Dark mode settings</li>
                <li>Last connected wallet</li>
                <li>Basic UX enhancements</li>
              </ul>
              <p className="mt-2">These can be disabled in your browser at any time.</p>
            </section>

            <section id="section-8">
              <h3 className="font-display font-bold text-xl text-purple mb-2">8. Third-Party Services</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG integrates with external tools strictly for essential platform operations:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Phantom Wallet – for wallet connection and transaction approval</li>
                <li>Solana RPC infrastructure – for interacting with the blockchain</li>
              </ul>
              <p className="mt-2">These providers may operate under their own terms and policies. USDFG does not store or control any private data from these tools.</p>
            </section>

            <section id="section-9">
              <h3 className="font-display font-bold text-xl text-purple mb-2">9. Data Retention</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We retain only the minimum amount of system-level data needed to operate:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>No personal profiles</li>
                <li>No off-chain identity storage</li>
                <li>Challenge logs are kept only for fair play enforcement and dispute resolution</li>
              </ul>
            </section>

            <section id="section-10">
              <h3 className="font-display font-bold text-xl text-purple mb-2">10. Data Location</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG infrastructure is hosted in the United States or on decentralized cloud services. All data interactions follow U.S. regulatory standards where applicable.</p>
            </section>

            <section id="section-11">
              <h3 className="font-display font-bold text-xl text-purple mb-2">11. Data Access Format</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>If you request access to your data, we will provide any stored system records linked to your wallet in a machine-readable format (e.g., JSON or CSV), where applicable.</p>
            </section>

            <section id="section-12">
              <h3 className="font-display font-bold text-xl text-purple mb-2">12. Your Rights</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Depending on your jurisdiction, you may request to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access data linked to your public wallet address</li>
                <li>Request deletion of match history (if applicable)</li>
                <li>File a data complaint with a regulatory authority</li>
              </ul>
              <p className="mt-2">Submit all requests via the contact methods below.</p>
            </section>

            <section id="section-13">
              <h3 className="font-display font-bold text-xl text-purple mb-2">13. Global Compliance</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG aligns with major global data principles such as GDPR and CCPA by minimizing data processing, avoiding personal identifiers, and honoring data access or deletion requests when applicable. Users may contact us to exercise applicable rights.</p>
            </section>

            <section id="section-14">
              <h3 className="font-display font-bold text-xl text-purple mb-2">14. Fair Play Monitoring</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>To maintain a fair competitive environment, USDFG may monitor gameplay activity, match logs, and behavior patterns for signs of cheating, abuse, or collusion. This data is processed anonymously and used strictly for enforcing platform rules.</p>
            </section>

            <section id="section-15">
              <h3 className="font-display font-bold text-xl text-purple mb-2">15. Non-Custodial Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a non-custodial platform. Users hold and manage their own wallets and private keys. USDFG cannot assist with recovery of lost access, assets sent to incorrect addresses, or unauthorized transactions initiated from a user's wallet.</p>
            </section>

            <section id="section-16">
              <h3 className="font-display font-bold text-xl text-purple mb-2">16. Not a Security</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is not offered or intended to be a security, investment vehicle, or financial product. It has no profit expectation, voting rights, or dividend structure. USDFG is a utility token for skill-based participation only, and its legal structure is designed to comply with U.S. and global regulatory guidelines regarding digital assets.</p>
            </section>

            <section id="section-17">
              <h3 className="font-display font-bold text-xl text-purple mb-2">17. AI and User-Generated Content Usage</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>By submitting, tagging, or creating content related to USDFG — including gameplay clips, memes, or commentary involving the brand, mascot, or platform — you grant USDFG a non-exclusive, royalty-free license to repost, remix, or use that content for marketing or community engagement. This includes AI-generated content incorporating USDFG themes.</p>
            </section>

            <section id="section-18">
              <h3 className="font-display font-bold text-xl text-purple mb-2">18. Community Governance (Non-Binding)</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>If USDFG launches decentralized governance features or DAOs, participation is optional and non-binding unless clearly specified. DAO proposals do not override the platform's legal structure or ownership. Participation does not confer rights, control, or equity in the platform.</p>
            </section>

            <section id="section-19">
              <h3 className="font-display font-bold text-xl text-purple mb-2">19. Platform Evolution</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may update features, integrate third-party tools, or expand use cases over time. Any new functionality will remain subject to these core privacy principles unless explicitly noted.</p>
            </section>

            <section id="section-20">
              <h3 className="font-display font-bold text-xl text-purple mb-2">20. Third-Party Hosted Events</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Tournaments or challenges hosted by external partners, streamers, or organizations using USDFG's infrastructure remain subject to these Terms. USDFG is not liable for rewards, results, or communications managed by third-party hosts. Users must verify host credibility before joining.</p>
            </section>

            <section id="section-21">
              <h3 className="font-display font-bold text-xl text-purple mb-2">21. Policy Updates</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We may update this Privacy Policy as the platform evolves. Major changes will be communicated via the platform or official channels.</p>
            </section>

            <section id="section-22">
              <h3 className="font-display font-bold text-xl text-purple mb-2">22. Children's Privacy</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is not intended for users under the age of 13, or the minimum legal age in your region. We do not knowingly collect any data from minors.</p>
            </section>

            <section id="section-23">
              <h3 className="font-display font-bold text-xl text-purple mb-2">23. Contact</h3>
              <div className="border-t border-purple/30 mb-4" />
              <ul className="list-disc pl-6 space-y-1">
                <li>Email: <a href="mailto:founder@usdfg.pro" className="text-purple hover:text-orange">founder@usdfg.pro</a> or <a href="mailto:support@usdfg.pro" className="text-purple hover:text-orange">support@usdfg.pro</a></li>
                <li>Twitter/X: <a href="https://twitter.com/USDFGAMING" target="_blank" rel="noopener noreferrer" className="text-purple hover:text-orange">@USDFGAMING</a></li>
              </ul>
            </section>

            <section id="section-related">
              <h3 className="font-display font-bold text-xl text-purple mb-2">Related Policies</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p><Link to="/terms" className="text-purple hover:text-orange underline underline-offset-2">View Terms of Service</Link></p>
            </section>

            <div className="pt-10 mt-10 border-t border-purple/30 text-center" data-animate="legal-closing">
              <h3 className="font-display font-bold text-xl text-purple mb-4">Closing Statement</h3>
              <p className="text-white/80">USDFG is founded on self-custody, transparency, and zero reliance on centralized infrastructure.</p>
              <p className="text-white/80 mt-2">We believe in proof over promises — and protecting our players from exploitation at every step.</p>
              <div className="mt-8">
                <span className="font-display font-bold text-lg text-purple">Hussein Ali</span>
                <p className="text-white/60 text-sm">Founder, USDFGAMING</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PrivacyPolicyPage;
