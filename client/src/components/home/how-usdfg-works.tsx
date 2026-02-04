import React from "react";

const STEPS = [
  "Connect your wallet",
  "Create a challenge or accept one",
  "Both players lock the required amount",
  "Play on your platform of choice",
  "Both players confirm the result",
  "Winner receives the reward automatically",
];

const HowUsdfgWorks: React.FC = () => {
  return (
    <section id="how-usdfg-works" className="py-8 px-3 text-white text-center relative overflow-hidden">
      <h2 className="neocore-h2 text-center mb-6 text-white animate-fade-in" style={{ textShadow: "0 0 20px rgba(251, 191, 36, 0.3)" }}>
        How USDFG Works
      </h2>
      <div className="max-w-2xl mx-auto">
        <ol className="list-decimal list-inside space-y-3 text-left neocore-panel p-4 md:p-6 rounded-xl">
          {STEPS.map((step, idx) => (
            <li key={idx} className="text-sm md:text-base text-gray-200 pl-1">
              {step}
            </li>
          ))}
        </ol>
        <p className="text-xs md:text-sm text-amber-200/80 mt-4 text-center">
          If there is a dispute, proof is submitted for review before funds are released.
        </p>
      </div>
    </section>
  );
};

export default HowUsdfgWorks;
