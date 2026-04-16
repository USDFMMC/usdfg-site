import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../sections/Navigation';
import Footer from '../sections/Footer';
import ParticleBackground from '../components/ParticleBackground';
import { useLegalPageGsap } from '../hooks/useLegalPageGsap';

function TermsOfServicePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  useLegalPageGsap(mainRef);

  useEffect(() => {
    document.title = 'Terms of Service | USDFG — Skill-Based Esports Arena';
  }, []);

  return (
    <div ref={mainRef} className="relative min-h-screen bg-void overflow-x-hidden">
      <ParticleBackground />
      <Navigation />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-20 lg:py-24">
        <div className="glass border border-purple/20 rounded-2xl p-8 lg:p-12">
          <div className="mb-8" data-animate="legal-back">
            <Link
              to="/whitepaper"
              className="text-purple hover:text-orange transition-colors font-body text-sm"
            >
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
            <span className="text-gradient">Terms of Service</span>
          </h1>

          {/* Why These Terms Matter */}
          <div className="max-w-2xl mx-auto mb-6 lg:mb-8 text-center" data-animate="legal-intro">
            <p className="font-display font-semibold text-lg text-purple mb-2">Why These Terms Matter</p>
            <p className="font-body text-white/80 leading-relaxed">
              USDFG is built for elite gamers and crypto users who demand fairness, transparency, and self-custody. These Terms set the standard for how we protect your rights, your assets, and your experience—no fine print, no hidden risks, ever.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 lg:mb-10" data-animate="legal-badges">
            {['100% Non-Custodial', 'No Gambling', 'Skill-Based', 'Self-Custody'].map((badge) => (
              <span key={badge} className="px-4 py-2 glass rounded-full border border-purple/30 text-sm text-white font-medium">
                {badge}
              </span>
            ))}
          </div>

          {/* Last Updated */}
          <p className="text-center text-white/60 text-sm mb-12" data-animate="legal-meta">
            Last Updated: May 1, 2025 | Version: v1.0
          </p>

          <div className="space-y-10 font-body text-white/80 leading-relaxed" data-animate="legal-content">
            <div className="space-y-4" data-animate="legal-preamble">
              <p className="text-white">Effective Date: May 1, 2025</p>
              <p className="text-white font-semibold">
                USDFG is founded and led by Hussein Ali, a builder who created the platform to champion skill, self-sovereignty, and competition over chance.
              </p>
            </div>

            <section id="section-0">
              <h3 className="font-display font-bold text-xl text-purple mb-2">0. Founder and Team Structure</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a platform founded and currently operated solely by <span className="text-orange font-bold">Hussein Ali</span> (the &quot;Founder&quot;). For the purposes of this agreement, any references to the &quot;USDFG team&quot; shall be interpreted as referring to the Founder and any authorized representatives who may be appointed in the future. This structure ensures clear accountability while allowing for future operational growth.</p>
            </section>

            <section id="section-1">
              <h3 className="font-display font-bold text-xl text-purple mb-2">1. Legal Classification Statement</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a skill-based digital competition platform operated solely by its Founder. It does not offer any form of gambling, wagering, lotteries, or games of chance. Participation is voluntary and rewards are based exclusively on user skill and verified performance. USDFG is a utility token used solely to access platform features and has no guaranteed monetary value. These Terms are designed to comply with applicable laws related to gaming, digital assets, and consumer protections.</p>
            </section>

            <section id="section-2">
              <h3 className="font-display font-bold text-xl text-purple mb-2">2. Service Overview</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a skill-based digital platform where users participate in challenges, earn rewards, and engage with competitive content. The platform is powered by the USDFG token, used strictly for in-platform utilities and skill-based competitions. No gambling, betting, or games of chance are offered or supported. All competitions are based solely on user skill and verified performance metrics.</p>
            </section>

            <section id="section-3">
              <h3 className="font-display font-bold text-xl text-purple mb-2">3. Eligibility</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a platform for users 18 and older. Players aged 13 to 17 may participate only if parental or legal guardian consent is granted and verifiable. Users under 13 are strictly prohibited.</p>
              <p>USDFG does not collect personal identifiers or account data. Proof of age or consent may be requested where legally required.</p>
            </section>

            <section id="section-4">
              <h3 className="font-display font-bold text-xl text-purple mb-2">4. Skill-Based Platform Only</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a skill-based competition platform. We do not host, facilitate, or allow gambling, betting, lotteries, or games of chance. All outcomes are based solely on performance, gameplay ability, and user verification.</p>
            </section>

            <section id="section-5">
              <h3 className="font-display font-bold text-xl text-purple mb-2">5. Token Use &amp; Risk Disclosure</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a utility token with no guaranteed value, used exclusively for platform participation and skill-based competitions.</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Token values may fluctuate and are not guaranteed.</li>
                <li>USDFG is non-custodial - we do not store or control your wallet or private keys.</li>
                <li>We cannot restore lost access or funds - users are responsible for their wallet security.</li>
                <li>You are fully responsible for complying with your local crypto laws.</li>
                <li>Tokens are for utility only - not for speculative investment.</li>
              </ul>
            </section>

            <section id="section-6">
              <h3 className="font-display font-bold text-xl text-purple mb-2">6. User Conduct</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>By using USDFG, you agree to play fairly, respect others, stay legal, and protect the platform. Violations may result in immediate suspension or permanent ban.</p>
            </section>

            <section id="section-7">
              <h3 className="font-display font-bold text-xl text-purple mb-2">7. Limitation of Liability</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>To the maximum extent allowed by law, USDFG and its founder are not liable for losses related to token use, platform downtime, unauthorized access, regulatory action, or indirect/incidental damages. Services are provided as-is.</p>
            </section>

            <section id="section-8">
              <h3 className="font-display font-bold text-xl text-purple mb-2">8. Platform Availability</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We do not guarantee 24/7 uptime. Downtime may occur due to blockchain outages, maintenance, or technical failures.</p>
            </section>

            <section id="section-9">
              <h3 className="font-display font-bold text-xl text-purple mb-2">9. Modifications</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>These Terms may be updated at any time. If major changes are made, we&apos;ll notify you via in-platform notice or email. Continued use of USDFG constitutes acceptance of the new Terms.</p>
            </section>

            <section id="section-10">
              <h3 className="font-display font-bold text-xl text-purple mb-2">10. Termination</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>We may terminate or suspend your access at any time for violating these Terms, abusing the platform, or engaging in fraudulent or illegal activity.</p>
            </section>

            <section id="section-11">
              <h3 className="font-display font-bold text-xl text-purple mb-2">11. Governing Law</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>These Terms are governed by the laws of the United States. All legal matters must be resolved in U.S. courts.</p>
            </section>

            <section id="section-12">
              <h3 className="font-display font-bold text-xl text-purple mb-2">12. Contact</h3>
              <div className="border-t border-purple/30 mb-4" />
              <div className="glass border border-purple/20 rounded-lg p-6">
                <ul className="list-disc pl-6 space-y-1">
                  <li>X (Twitter): <a href="https://twitter.com/USDFGAMING" target="_blank" rel="noopener noreferrer" className="text-purple hover:text-orange transition-colors">https://twitter.com/USDFGAMING</a></li>
                  <li>Email: <a href="mailto:founder@usdfg.pro" className="text-purple hover:text-orange transition-colors">founder@usdfg.pro</a> or <a href="mailto:support@usdfg.pro" className="text-purple hover:text-orange transition-colors">support@usdfg.pro</a></li>
                  <li>Official Website: <a href="https://usdfg.pro" className="text-purple hover:text-orange transition-colors">USDFG.PRO</a></li>
                </ul>
              </div>
            </section>

            <section id="section-13">
              <h3 className="font-display font-bold text-xl text-purple mb-2">13. Dispute Resolution</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>All disputes shall be resolved through binding arbitration under the rules of the American Arbitration Association. Class actions, collective claims, and public litigation are not permitted.</p>
            </section>

            <section id="section-14">
              <h3 className="font-display font-bold text-xl text-purple mb-2">14. No Financial Advice</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG does not provide any financial, investment, or tax advice. The platform is strictly for competitive entertainment.</p>
            </section>

            <section id="section-15">
              <h3 className="font-display font-bold text-xl text-purple mb-2">15. User Responsibility</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>You are fully responsible for wallet security, lawful use of the platform, and your own actions. USDFG is a non-custodial platform and does not manage user funds.</p>
            </section>

            <section id="section-16">
              <h3 className="font-display font-bold text-xl text-purple mb-2">16. Assumption of Risk</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>You understand that cryptocurrency is volatile, features may change, and technical issues can occur. You use USDFG at your own risk.</p>
            </section>

            <section id="section-17">
              <h3 className="font-display font-bold text-xl text-purple mb-2">17. Severability</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>If any clause is unenforceable, the remaining Terms remain valid.</p>
            </section>

            <section id="section-18">
              <h3 className="font-display font-bold text-xl text-purple mb-2">18. Naming Notice</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>The official name is United We Stand Divided We Fall Gaming. The Solana-registered token is United We Stand Gaming. The brand is USDFGAMING and the ticker is USDFG. All references refer to the same entity.</p>
            </section>

            <section id="section-19">
              <h3 className="font-display font-bold text-xl text-purple mb-2">19. Indemnification</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>You agree to defend and hold harmless USDFG, its Founder, and any future authorized representatives. The Founder is not liable for the project&apos;s legal or operational obligations.</p>
            </section>

            <section id="section-20">
              <h3 className="font-display font-bold text-xl text-purple mb-2">20. Jurisdictional Use</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>You must verify that your local laws permit use of skill-based digital platforms and crypto. USDFG is not available in restricted regions.</p>
            </section>

            <section id="section-21">
              <h3 className="font-display font-bold text-xl text-purple mb-2">21. No Agency</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>No agency, partnership, or employment relationship is created by using this platform.</p>
            </section>

            <section id="section-22">
              <h3 className="font-display font-bold text-xl text-purple mb-2">22. No Ownership Rights</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Holding USDFG does not grant ownership, equity, voting power, or legal claim over the platform.</p>
            </section>

            <section id="section-23">
              <h3 className="font-display font-bold text-xl text-purple mb-2">23. Token Acquisition and Use</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Users may acquire USDFG tokens to access features, create or join challenges, and participate in skill-based competitions. Acquiring tokens is not a bet, wager, or speculative investment, and using tokens to enter a challenge is not gambling. Challenge rewards are based solely on measurable performance and outcome verification. Users may withdraw earned tokens to their wallets and convert them using external platforms at their discretion. USDFG does not offer, facilitate, or control currency exchange or financial speculation.</p>
            </section>

            <section id="section-24">
              <h3 className="font-display font-bold text-xl text-purple mb-2">24. Legal Safeguards and Gambling Exclusion</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG only hosts competitions where skill determines the result, and chance plays no role. Challenge rewards are distributed by programmatic smart contracts based on verifiable performance outcomes. USDFG&apos;s platform is structured in accordance with legal standards governing skill-based contests under U.S. law. USDFG is prepared to demonstrate the technical structure of its skill-based competitions upon formal legal request.</p>
            </section>

            <section id="section-25">
              <h3 className="font-display font-bold text-xl text-purple mb-2">25. Third-Party Tools Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG integrates with external services like Phantom Wallet and Solana infrastructure. We are not responsible for issues on these third-party platforms.</p>
            </section>

            <section id="section-26">
              <h3 className="font-display font-bold text-xl text-purple mb-2">26. Intellectual Property Ownership</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>All branding, designs, logos, mascots, token structures, and code are owned by USDFG or its licensors.</p>
            </section>

            <section id="section-27">
              <h3 className="font-display font-bold text-xl text-purple mb-2">26.1. Third-Party Game Publisher Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is not affiliated with or endorsed by any third-party game publishers. All game trademarks, logos, and intellectual property belong to their respective owners. USDFG&apos;s platform operates independently and does not claim any official association with the games featured on our platform.</p>
            </section>

            <section id="section-28">
              <h3 className="font-display font-bold text-xl text-purple mb-2">26.2. Game IP Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>All game titles referenced by users are owned by their respective publishers. USDFG is not affiliated with or endorsed by any game company.</p>
            </section>

            <section id="section-29">
              <h3 className="font-display font-bold text-xl text-purple mb-2">27. Token Use Limitation</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Holding or acquiring USDFG does not entitle users to revenue, profits, dividends, ownership, or governance influence.</p>
            </section>

            <section id="section-30">
              <h3 className="font-display font-bold text-xl text-purple mb-2">28. Autonomous Execution Clause</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Challenges and rewards operate via smart contracts. Results are final unless fraud or verified dispute is proven.</p>
            </section>

            <section id="section-31">
              <h3 className="font-display font-bold text-xl text-purple mb-2">29. No Promoter Liability</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Marketing and community content is for entertainment only and does not constitute advice or guarantees. The Founder and any future authorized representatives are not liable for promotional content.</p>
            </section>

            <section id="section-32">
              <h3 className="font-display font-bold text-xl text-purple mb-2">30. Wallet &amp; Transaction Responsibility</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Users are solely responsible for wallet access, transaction accuracy, and associated fees.</p>
            </section>

            <section id="section-33">
              <h3 className="font-display font-bold text-xl text-purple mb-2">31. International Use Exemption</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Users accessing the platform from outside the U.S. do so at their own risk.</p>
            </section>

            <section id="section-34">
              <h3 className="font-display font-bold text-xl text-purple mb-2">32. Platform Fees and Use of Funds</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG applies a 5% fee on challenge transactions. Fees fund platform operations, compensation, and future growth. This is disclosed before challenge entry.</p>
            </section>

            <section id="section-35">
              <h3 className="font-display font-bold text-xl text-purple mb-2">33. No Guarantee of Earnings or Results</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG does not guarantee earnings, token value, or personal results. It is not an investment or passive income scheme.</p>
            </section>

            <section id="section-36">
              <h3 className="font-display font-bold text-xl text-purple mb-2">34. Acknowledgment of Blockchain Risks</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Users accept risks like volatility, delays, bugs, and external threats when using the platform.</p>
            </section>

            <section id="section-37">
              <h3 className="font-display font-bold text-xl text-purple mb-2">35. No Fiduciary Relationship</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Using USDFG does not create a fiduciary relationship. Users are responsible for their own decisions.</p>
            </section>

            <section id="section-38">
              <h3 className="font-display font-bold text-xl text-purple mb-2">36. Misuse, False Claims, and Public Harassment</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may take legal or platform action against users spreading false claims or harassing the founder.</p>
            </section>

            <section id="section-39">
              <h3 className="font-display font-bold text-xl text-purple mb-2">37. Regulatory Cooperation and Jurisdiction</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is not a security, investment, or gambling offering. We will comply with legal requests and may restrict access when required.</p>
            </section>

            <section id="section-40">
              <h3 className="font-display font-bold text-xl text-purple mb-2">38. No Custodial Holdings or Token Sales</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG does not offer custodial services. Users manage their own wallets and tokens.</p>
            </section>

            <section id="section-41">
              <h3 className="font-display font-bold text-xl text-purple mb-2">39. Community Participation Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Token holders do not have rights to influence financial or operational decisions. Feedback is optional and non-binding.</p>
            </section>

            <section id="section-42">
              <h3 className="font-display font-bold text-xl text-purple mb-2">40. KYC / Identity Verification Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may implement identity verification to prevent fraud and meet legal requirements.</p>
            </section>

            <section id="section-43">
              <h3 className="font-display font-bold text-xl text-purple mb-2">41. Content Ownership</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Users retain ownership of uploaded content but grant USDFG a license to use it in promotional materials.</p>
            </section>

            <section id="section-44">
              <h3 className="font-display font-bold text-xl text-purple mb-2">42. Challenge Dispute Resolution System</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Disputes may be reviewed based on logs or smart contract outcomes. No guarantees of reversal unless fraud is proven.</p>
            </section>

            <section id="section-45">
              <h3 className="font-display font-bold text-xl text-purple mb-2">43. Affiliate or Referral System Terms</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Referral programs may be offered and changed at any time by the Founder or future authorized representatives. Abuse may lead to disqualification.</p>
            </section>

            <section id="section-46">
              <h3 className="font-display font-bold text-xl text-purple mb-2">44. AI Use and Automation Disclosure</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may use automated systems for moderation, verification, and platform optimization.</p>
            </section>

            <section id="section-47">
              <h3 className="font-display font-bold text-xl text-purple mb-2">45. Analytics and Anti-Cheat Monitoring</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may analyze user behavior, device metadata, and in-game activity to detect suspicious patterns, enforce fair play, or improve platform experience. This includes automated systems that detect botting, collusion, or exploitative behavior. By using the platform, users consent to this monitoring.</p>
            </section>

            <section id="section-48">
              <h3 className="font-display font-bold text-xl text-purple mb-2">46. Bounty &amp; Community Reward Programs</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may, at its discretion, offer rewards for community-reported bugs, exploits, or valuable contributions. Participation in any bounty program is optional and subject to terms provided at the time of the offer. Rewards are not guaranteed unless explicitly confirmed by USDFG.</p>
            </section>

            <section id="section-49">
              <h3 className="font-display font-bold text-xl text-purple mb-2">47. Platform Lifecycle and Discontinuation</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG makes no guarantee of indefinite platform availability. We reserve the right to suspend, evolve, or discontinue any feature, product, or service based on economic, legal, or operational requirements. Users accept that such decisions may occur without liability or obligation.</p>
            </section>

            <section id="section-50">
              <h3 className="font-display font-bold text-xl text-purple mb-2">48. Legal Jurisdiction Flexibility</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to restructure or relocate platform operations to alternative legal jurisdictions in response to regulatory changes or legal requirements. Any changes will be communicated via official channels and updated in these Terms accordingly.</p>
            </section>

            <section id="section-51">
              <h3 className="font-display font-bold text-xl text-purple mb-2">49. Community Content and AI Use</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Any artwork, memes, commentary, or content submitted or created using USDFG&apos;s platform, mascot, or brand assets may be reused, reposted, or modified by USDFG for community engagement, marketing, or archival purposes. Content generated through AI using USDFG branding is considered part of the platform ecosystem and may be curated or removed at USDFG&apos;s discretion.</p>
            </section>

            <section id="section-52">
              <h3 className="font-display font-bold text-xl text-purple mb-2">50. DAO Participation Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>If USDFG evolves into a decentralized governance structure (&quot;DAO&quot;), user participation will be non-binding, optional, and informational only unless explicitly defined through smart contract voting mechanisms. No DAO action shall imply platform ownership, employment, or fiduciary relationship with the Founder or any future authorized representatives.</p>
            </section>

            <section id="section-53">
              <h3 className="font-display font-bold text-xl text-purple mb-2">51. Successor Entity and Assignment</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>In the event of a platform restructure, merger, sale, or transition to a successor organization, all rights and responsibilities under these Terms shall transfer accordingly. Continued use of the platform constitutes acceptance of the updated controlling entity.</p>
            </section>

            <section id="section-54">
              <h3 className="font-display font-bold text-xl text-purple mb-2">52. AI Gameplay Systems and Disclaimers</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may use automated systems and machine learning to assist in challenge validation, cheating detection, dispute resolution, and gameplay moderation. These systems are designed to support—not replace—human oversight and do not guarantee perfect accuracy.</p>
            </section>

            <section id="section-55">
              <h3 className="font-display font-bold text-xl text-purple mb-2">53. Account Suspension Review</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to suspend or permanently ban user accounts based on suspected misconduct, fraud, or policy violations. Suspensions may be automated or manual. USDFG is not obligated to provide an appeal or review process unless required by law.</p>
            </section>

            <section id="section-56">
              <h3 className="font-display font-bold text-xl text-purple mb-2">54. Token Migration and Upgrade</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to migrate or upgrade the USDFG token, smart contracts, or platform infrastructure to a new blockchain, contract address, or versioned system. Users may be required to follow official migration instructions. Failure to do so may result in permanent loss of legacy tokens or access.</p>
            </section>

            <section id="section-57">
              <h3 className="font-display font-bold text-xl text-purple mb-2">55. Data Retention and Access</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG stores only the minimal personal data required to operate the platform. Users may request a copy of their stored data or request deletion where legally applicable. Certain records may be retained as required by law or for platform integrity.</p>
            </section>

            <section id="section-58">
              <h3 className="font-display font-bold text-xl text-purple mb-2">56. No Service-Level Guarantee</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG makes no guarantees regarding uptime, platform availability, or service responsiveness. While we aim to provide stable and continuous access, unexpected downtime, latency, or outages may occur without notice or compensation.</p>
            </section>

            <section id="section-59">
              <h3 className="font-display font-bold text-xl text-purple mb-2">57. Regulatory Change Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to modify services, user permissions, fees, wallet integrations, or platform access to comply with future legal or regulatory changes in any applicable jurisdiction. These modifications may occur without prior notice and without user compensation.</p>
            </section>

            <section id="section-60">
              <h3 className="font-display font-bold text-xl text-purple mb-2">58. Sponsored Content &amp; Advertising</h3>
              <div className="border-t border-purple/30 mb-4" />
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>USDFG may feature limited sponsored content or advertising placements in designated areas (e.g., footer, landing page, or &quot;Powered By&quot; banners).</li>
                <li>All ads are manually reviewed to ensure alignment with the platform&apos;s values.</li>
                <li>We do not sell user data, enable third-party tracking, or run external ad networks.</li>
                <li>Sponsored placements will be clearly labeled and selected based on relevance to gaming, crypto, or competitive ecosystems.</li>
                <li>Ads promoting gambling, staking, or speculative financial products are strictly prohibited.</li>
                <li>USDFG reserves the right to approve or reject any sponsorship based on integrity, legal safety, and brand alignment.</li>
              </ul>
            </section>

            <section id="section-61">
              <h3 className="font-display font-bold text-xl text-purple mb-2">59. AI and User-Generated Content Usage</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>By submitting, tagging, or creating content related to USDFG, including gameplay, memes, or commentary involving the brand, mascot, or platform, you grant USDFG a non-exclusive, royalty-free license to repost, remix, or use that content for marketing or community engagement. This includes AI-generated content that incorporates USDFG themes.</p>
            </section>

            <section id="section-62">
              <h3 className="font-display font-bold text-xl text-purple mb-2">60. Community Governance (Non-Binding)</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>If USDFG launches decentralized governance features or DAOs, participation is optional and non-binding unless clearly specified. DAO proposals do not override the platform&apos;s legal structure or ownership. Participation does not confer rights, control, or equity in the platform.</p>
            </section>

            <section id="section-63">
              <h3 className="font-display font-bold text-xl text-purple mb-2">61. Third-Party Hosted Events</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Tournaments or challenges hosted by external partners, streamers, or organizations using USDFG&apos;s infrastructure remain subject to these Terms. USDFG is not liable for rewards, results, or communications managed by third-party hosts. Users must verify host credibility before joining.</p>
            </section>

            <section id="section-64">
              <h3 className="font-display font-bold text-xl text-purple mb-2">62. Not a Security</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is not offered or intended to be a security, investment vehicle, or financial product. It has no profit expectation, voting rights, or dividend structure. USDFG is a utility token for skill-based participation only, and its legal structure is designed to comply with U.S. and global regulatory guidelines regarding digital assets.</p>
            </section>

            <section id="section-65">
              <h3 className="font-display font-bold text-xl text-purple mb-2">63. Non-Custodial Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG is a non-custodial platform. Users hold and manage their own wallets and private keys. USDFG cannot assist with recovery of lost access, assets sent to incorrect addresses, or unauthorized transactions initiated from a user&apos;s wallet.</p>
            </section>

            <section id="section-66">
              <h3 className="font-display font-bold text-xl text-purple mb-2">64. Platform Snapshot Rights</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to take on-chain and off-chain snapshots of platform state (e.g., active challenges, wallet balances, user interactions) for auditing, dispute resolution, or governance-related decisions. These snapshots are non-editable and used solely for integrity and accountability.</p>
            </section>

            <section id="section-67">
              <h3 className="font-display font-bold text-xl text-purple mb-2">65. Forking &amp; Derivative Work Restrictions</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>Unless explicitly licensed, no part of USDFG&apos;s codebase, smart contracts, branding, or platform logic may be copied, forked, or redeployed under a new project. This includes unauthorized derivatives using USDFG&apos;s token model, mascot, or core platform mechanics.</p>
            </section>

            <section id="section-68">
              <h3 className="font-display font-bold text-xl text-purple mb-2">66. Platform Integrity Enforcement</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG reserves the right to monitor gameplay and ecosystem interactions for manipulation, exploits, or abusive automation. This includes but is not limited to: reward farming, collusion, botnet participation, and vote brigading. Breaches may result in penalties or bans.</p>
            </section>

            <section id="section-69">
              <h3 className="font-display font-bold text-xl text-purple mb-2">67. Multichain Integration Disclaimer</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG may integrate with additional blockchains or Layer 2 systems in the future. Any such integrations are subject to the same non-custodial, utility-only terms. Token bridging, wrapping, or migration tools will be optional and clearly disclosed.</p>
            </section>

            <section id="section-70">
              <h3 className="font-display font-bold text-xl text-purple mb-2">68. Fixed Supply Statement</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>The USDFG token has a permanently fixed maximum supply of 21 million tokens. No additional minting, inflation, or hidden reserves exist. All token-related functions are transparent and verifiable on-chain.</p>
            </section>

            <section id="section-71">
              <h3 className="font-display font-bold text-xl text-purple mb-2">69. Smart Contract Stability Notice</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>USDFG smart contracts are immutable or upgradeable only through public, documented processes. Users will not be subject to hidden contract changes, forced migrations, or stealth updates that alter core platform functionality or token behavior.</p>
            </section>

            <section id="section-related">
              <h3 className="font-display font-bold text-xl text-purple mb-2">70. Related Policies</h3>
              <div className="border-t border-purple/30 mb-4" />
              <p>
                For details on how we handle platform data and privacy, please review our{' '}
                <Link to="/privacy" className="text-purple hover:text-orange transition-colors underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TermsOfServicePage;
