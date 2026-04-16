import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import KimiBackground from '@/components/KimiBackground';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <KimiBackground includeGalaxy={true} />

      <Card className="relative z-10 w-full max-w-md mx-4 bg-black/40 backdrop-blur-sm border border-purple-500/20 shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(147,51,234,0.4)] transition-all">
        <CardContent className="relative z-10 pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle
              className="h-8 w-8 text-amber-400"
              style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' }}
            />
            <h1
              className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))' }}
            >
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-white/70 leading-relaxed">
            This path does not exist. Head back to the site or open the arena.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="text-sm font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
            >
              Home
            </Link>
            <Link
              to="/app"
              className="text-sm font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
            >
              Arena
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
