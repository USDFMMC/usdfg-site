import React from "react";

const AboutSection: React.FC = () => {
  return (
    <section id="about-usdfg" className="relative flex justify-center items-center min-h-[60vh] px-3 py-8 overflow-hidden bg-[#07080C]">
      <div className="relative w-full max-w-4xl mx-auto px-3">
        <div className="relative w-full max-w-4xl mx-auto px-4 py-4 rounded-lg bg-[#07080C]/98 border border-amber-400/20 shadow-[0_0_20px_rgba(255,215,130,0.08)] backdrop-blur-md flex flex-col items-center transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,215,130,0.12)]">
          <div className="w-full flex flex-col items-center text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">What is <span className="text-amber-400">USDFG?</span></h2>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-base md:text-lg text-center mb-4 font-bold">
                USDFG is the access token for a decentralized competition platform—built for those who outperform, not those who get lucky.
              </p>
              <p className="text-sm md:text-base text-center mb-4">
                <strong>No gambling. No randomness. Only verified performance.</strong>
              </p>
              <p className="text-sm md:text-base text-center mb-4">
                Every challenge is <span className="text-amber-400 font-medium">merit-based</span>, and every reward is <span className="text-amber-400 font-medium">earned</span>.<br/>
                USDFG exists to reward skill—not speculation.
              </p>
              <p className="text-sm md:text-base text-center mb-4">
                This isn't a passive asset. It's a <strong>competitive layer for digital performance</strong>, tied to strategy, execution, and outcome.
              </p>
              <p className="text-sm md:text-base text-center mb-4">
                <strong>Fixed supply.</strong> No inflation. No hidden mechanics. Just a clean contract and a clear goal: <span className="text-amber-400 font-medium">reward performance</span>.
              </p>
              <p className="text-sm md:text-base text-center mt-4 font-bold">
                USDFG is for players who win on skill—nothing else.<br/>
                If that's you, step forward. The next challenge awaits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
