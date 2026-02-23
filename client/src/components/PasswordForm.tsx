import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LetterGlitch from '@/components/effects/LetterGlitch';

interface PasswordFormProps {
  onSuccess: () => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const correctPassword = '6837';

  const handleSubmit = () => {
    if (password === correctPassword) {
      try {
        localStorage.setItem('arena-access', 'true');
      } catch (storageError) {
        console.warn('⚠️ Unable to persist arena access:', storageError);
      }
      onSuccess();
    } else {
      alert('Wrong password');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen text-text-primary flex flex-col items-center justify-center relative overflow-hidden bg-[#040507]">
      {/* LetterGlitch Background */}
      <div className="absolute inset-0 w-full h-full bg-[#040507]">
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth={true}
        />
      </div>
      
      {/* Password Form */}
      <div className="relative z-10 flex flex-col items-center neocore-panel p-8 backdrop-blur-md bg-black/40 border border-amber-500/30">
        <h1 className="neocore-h2 mb-2 text-amber-300">USDFG Arena – Early Access</h1>
        <p className="neocore-body text-white/70 text-center mb-6 max-w-md">
          The browser arena is currently in private testing while we finalize competitive systems and verification logic.
        </p>
        <Link
          to="/"
          className="mb-4 text-sm text-amber-400/90 hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Return to Homepage
        </Link>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="px-3 py-2 rounded-md bg-black/60 border border-amber-500/50 text-amber-100 backdrop-blur-sm focus:border-amber-400 focus:outline-none neocore-body"
          placeholder="Password"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          className="mt-3 elite-btn neocore-button"
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default PasswordForm;

