import React from "react";
import { Link } from "react-router-dom";

const CTASection: React.FC = () => {
  return (
    <section className="py-12 relative">
      <div className="container mx-auto px-3">
        <div className="max-w-4xl mx-auto text-center">
          {/* Enter the Challenge Image - Pro-level polish */}
          <section className="flex flex-col items-center py-8 px-3">
            <div className="flex justify-center mb-4 relative w-full" style={{ alignItems: 'center', minHeight: '280px' }}>
              <div className="relative rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '260px' }}>
                <img
                  src="/assets/usdfg-enter-the-challenge-arcade.webp"
                  alt="USDFG Mascot Entering the Challenge Arena"
                  className="w-full max-w-2xl rounded-xl"
                  style={{ display: 'block', margin: '0 auto' }}
                  loading="lazy" decoding="async"
                />
              </div>
            </div>
            <p className="text-center text-sm text-neutral-400 mt-2 italic">
              Step in. Only the skilled walk out.
            </p>
          </section>
          <p className="text-center text-base md:text-lg text-white font-semibold mt-8">
            Ready to enter the arena?
          </p>
          <Link to="/app" className="flex justify-center">
            <button className="elite-btn neocore-button mt-4 px-5 py-2.5 text-sm md:text-base text-amber-300 hover:text-amber-200">
              Enter the Arena →
            </button>
          </Link>
          <div className="flex justify-center mt-8">
            <div className="relative max-w-2xl w-full">
              <blockquote className="text-center text-neutral-300 italic font-medium px-4 py-4 text-base">
                "I built USDFG to reward the ones who never begged for a seat. No mercy. No reruns. If you're waiting for permission, you already lost."
                <br />
                <span className="block mt-1.5 text-xs text-neutral-500">— Hussein A.</span>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
