import React from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Gamepad2, Zap, Shield, Trophy } from "lucide-react";

const AppRedirect: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>USDFG Arena - Coming Soon | USDFG.PRO</title>
        <meta name="description" content="The USDFG gaming platform is currently in development. Join our community to stay updated!" />
      </Helmet>

      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
          <div className="absolute inset-0 bg-purple-600/5" />
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] animate-pulse z-[1]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] animate-pulse z-[1]" style={{ animationDelay: '1s' }} />

        {/* Header */}
        <header className="relative z-10 border-b border-purple-500/20 bg-black/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-amber-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-white">USDFG Arena</h1>
                </div>
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  <Zap className="w-3 h-3 mr-1" />
                  In Development
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-8">
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(147,51,234,0.4)]">
                  <Gamepad2 className="w-12 h-12 text-white" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-bold text-white">
                    Arena <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))" }}>Coming Soon</span>
                  </h1>
                  <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                    The ultimate skill-based gaming platform is currently under development. 
                    Get ready to compete, earn, and conquer.
                  </p>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-amber-500 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">Skill-Based Challenges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center leading-relaxed">
                      Compete in verified gaming challenges across multiple genres. 
                      No luck, just skill.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-amber-500 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">Earn USDFG</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center leading-relaxed">
                      Win challenges and earn USDFG tokens. 
                      Your skill directly translates to rewards.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-amber-500 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">100% On-Chain</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center leading-relaxed">
                      Built on Solana blockchain. 
                      Transparent, secure, and verifiable results.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA Section */}
              <div className="space-y-6 mt-12">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white" style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.3)" }}>Stay Updated</h2>
                  <p className="text-white/70 leading-relaxed">
                    Follow our development progress and be the first to know when the Arena launches.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold hover:from-purple-500 hover:to-amber-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all"
                    onClick={() => window.open('https://github.com/USDFGAMING', '_blank')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-purple-500/50 text-white hover:bg-purple-500/20 hover:border-purple-500/80 transition-all"
                    onClick={() => window.open('https://twitter.com/USDFGAMING', '_blank')}
                  >
                    Follow Updates
                  </Button>
                </div>
              </div>

              {/* Development Status */}
              <div className="mt-12 p-6 bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white" style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.2)" }}>Development Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" style={{ boxShadow: "0 0 8px rgba(74, 222, 128, 0.5)" }}></div>
                      <span className="text-white/70">Frontend UI Complete</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" style={{ boxShadow: "0 0 8px rgba(74, 222, 128, 0.5)" }}></div>
                      <span className="text-white/70">Backend API Ready</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" style={{ boxShadow: "0 0 8px rgba(251, 191, 36, 0.5)" }}></div>
                      <span className="text-white/70">Blockchain Integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" style={{ boxShadow: "0 0 8px rgba(251, 191, 36, 0.5)" }}></div>
                      <span className="text-white/70">Testing & Deployment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AppRedirect;
