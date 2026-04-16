import { useState } from 'react';
import { Link } from 'react-router-dom';
import LetterGlitch from './effects/LetterGlitch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PasswordFormProps {
  onSuccess: () => void;
}

const correctPassword = '6837';

const PasswordForm = ({ onSuccess }: PasswordFormProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = password.trim();
    if (trimmed === correctPassword) {
      setError(null);
      try {
        localStorage.setItem('arena-access', 'true');
      } catch {
        // ignore storage errors
      }
      onSuccess();
    } else {
      setError('Wrong password');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-void">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden>
        <LetterGlitch
          glitchSpeed={50}
          centerVignette
          outerVignette={false}
          smooth
        />
      </div>

      <form
        className="relative z-10 flex flex-col items-center p-8 backdrop-blur-md bg-void/80 border border-purple/30 rounded-2xl max-w-md w-full mx-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h1 className="font-display font-bold text-2xl text-purple mb-2">
          USDFG Arena – Early Access
        </h1>
        <p className="font-body text-white/70 text-center mb-6">
          The browser arena is currently in private testing while we finalize
          competitive systems and verification logic.
        </p>
        <Link
          to="/"
          className="mb-4 text-sm text-purple/90 hover:text-purple underline underline-offset-2 transition-colors"
        >
          Return to Homepage
        </Link>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 bg-black/40 border-purple/50 text-white placeholder:text-white/40 focus:border-purple"
          autoFocus
          autoComplete="off"
        />
        {error && (
          <div className="w-full mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white"
        >
          Enter
        </Button>
      </form>
    </div>
  );
};

export default PasswordForm;
