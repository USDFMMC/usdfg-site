import React, { useState } from 'react';
import LetterGlitch from '@/components/effects/LetterGlitch';
import { safeLocalStorageSetItem } from '@/lib/utils/storage';

interface PasswordFormProps {
  onSuccess: () => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const correctPassword = '6996';

  const handleSubmit = () => {
    if (password === correctPassword) {
      safeLocalStorageSetItem('arena-access', 'true');
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
    <div className="min-h-screen text-text-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* LetterGlitch Background */}
      <div className="absolute inset-0 w-full h-full">
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth={true}
        />
      </div>
      
      {/* Password Form */}
      <div className="relative z-10 flex flex-col items-center neocore-panel p-8 backdrop-blur-md bg-black/40 border border-amber-500/30">
        <h1 className="neocore-h2 mb-4 text-amber-300">Enter Arena Password</h1>
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

