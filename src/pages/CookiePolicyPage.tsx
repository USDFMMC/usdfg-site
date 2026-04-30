import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../sections/Navigation';
import Footer from '../sections/Footer';
import ParticleBackground from '../components/ParticleBackground';
import { useLegalPageGsap } from '../hooks/useLegalPageGsap';

function CookiePolicyPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  useLegalPageGsap(mainRef);

  useEffect(() => {
    document.title = 'Cookie Policy | USDFG — Skill-Based Esports Arena';
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

          <p className="text-center text-sm text-white/70 italic mb-6 font-body" data-animate="legal-tagline">
            No mercy. No reruns. Just skill.
          </p>
          <h1
            className="font-display font-bold text-4xl sm:text-5xl text-white text-center mb-8"
            data-animate="legal-title"
          >
            <span className="text-gradient">Cookie Policy</span>
          </h1>

          <p className="text-center text-white/60 text-sm mb-12" data-animate="legal-meta">
            Last Updated: May 1, 2025
          </p>

          <div className="space-y-10 font-body text-white/80 leading-relaxed" data-animate="legal-content">
            <section id="section-1">
              <h3 className="font-display font-bold text-xl text-purple mb-2">1. Overview</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                USDFG is a decentralized, non-custodial platform designed with minimal data collection in mind. This
                Cookie Policy explains how and why limited browser storage technologies (&quot;cookies&quot;) may be
                used when accessing the USDFG platform.
              </p>
              <p className="mt-2">
                USDFG does not rely on traditional account systems, and no personal identity data such as names, emails,
                or passwords is collected or stored.
              </p>
            </section>

            <section id="section-2">
              <h3 className="font-display font-bold text-xl text-purple mb-2">2. Limited Use of Cookies</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG uses only essential cookies required for core platform functionality. These may include:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Maintaining basic session state during navigation</li>
                <li>Preserving interface preferences (such as UI settings)</li>
                <li>Supporting secure and stable platform performance</li>
              </ul>
              <p className="mt-2">
                These cookies are strictly functional and do not track user behavior across websites.
              </p>
            </section>

            <section id="section-3">
              <h3 className="font-display font-bold text-xl text-purple mb-2">3. No Tracking or Advertising Cookies</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG does not use:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Advertising cookies</li>
                <li>Behavioral tracking cookies</li>
                <li>Cross-site tracking technologies</li>
                <li>Data monetization or profiling systems</li>
              </ul>
              <p className="mt-2">User activity is not tracked for marketing, resale, or targeting purposes.</p>
            </section>

            <section id="section-4">
              <h3 className="font-display font-bold text-xl text-purple mb-2">4. Wallet-Based Interaction</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                USDFG operates using wallet-based interaction rather than traditional login systems. Cookies are not used
                to identify users personally. Wallet addresses may be used within the platform strictly for challenge
                participation, verification, and record integrity, as outlined in the Privacy Policy.
              </p>
              <p className="mt-2">Cookies are not used to link wallet addresses to personal identity.</p>
            </section>

            <section id="section-5">
              <h3 className="font-display font-bold text-xl text-purple mb-2">5. Third-Party Infrastructure</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                Infrastructure providers such as content delivery networks (CDNs) may use essential cookies for security
                and performance.
              </p>
            </section>

            <section id="section-6">
              <h3 className="font-display font-bold text-xl text-purple mb-2">6. User Control</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                Users can manage or disable cookies through their browser settings at any time. Disabling essential
                cookies may impact certain platform functionality.
              </p>
            </section>

            <section id="section-7">
              <h3 className="font-display font-bold text-xl text-purple mb-2">7. Policy Scope</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                This Cookie Policy should be read in conjunction with the{' '}
                <Link to="/privacy" className="text-purple-400 hover:text-orange-400 transition-colors">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="text-purple-400 hover:text-orange-400 transition-colors">
                  Terms of Service
                </Link>
                {". It reflects USDFG's commitment to transparency, minimal data usage, and user-controlled interaction."}
              </p>
            </section>

            <section id="section-8">
              <h3 className="font-display font-bold text-xl text-purple mb-2">8. Contact</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>For questions regarding this policy, refer to the official USDFG platform at:</p>
              <p className="mt-2">
                <a
                  href="https://usdfg.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple hover:text-orange font-semibold"
                >
                  USDFG.PRO
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CookiePolicyPage;
