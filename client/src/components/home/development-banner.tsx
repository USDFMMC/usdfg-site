import React from "react";

const AboutSection: React.FC = () => {
  return (
    <section id="about-usdfg" className="relative flex justify-center items-center min-h-[60vh] px-3 py-8 overflow-hidden">
      <div className="relative w-full max-w-4xl mx-auto px-3">
        <div className="neocore-panel relative w-full max-w-4xl mx-auto px-4 py-4 flex flex-col items-center transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,215,130,0.12)]">
          <div className="w-full flex flex-col items-center text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">What is <span className="text-amber-400">USDFG?</span></h2>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-base md:text-lg text-center mb-4 font-bold">
                USDFG is the access token for a skill based competition platform where players challenge each other directly, lock funds, play, verify results, and receive rewards through clear outcomes.
              </p>
              <p className="text-sm md:text-base text-center text-amber-200/90">
                Built for performance and execution, not luck.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
