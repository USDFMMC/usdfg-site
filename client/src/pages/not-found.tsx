import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] animate-pulse z-[1]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] animate-pulse z-[1]" style={{ animationDelay: '1s' }} />

      <Card className="relative z-10 w-full max-w-md mx-4 bg-black/40 backdrop-blur-sm border border-purple-500/20 shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(147,51,234,0.4)] transition-all">
        <CardContent className="relative z-10 pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-amber-400" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))" }} />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))" }}>404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-white/70 leading-relaxed">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
