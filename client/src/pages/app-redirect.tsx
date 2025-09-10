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
        <title>USDFG Arena - Coming Soon | USDFGAMING</title>
        <meta name="description" content="The USDFG gaming platform is currently in development. Join our community to stay updated!" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
        {/* Header */}
        <header className="border-b border-gray-800 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-black" />
                  </div>
                  <h1 className="text-xl font-bold text-white">USDFG Arena</h1>
                </div>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  In Development
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-8">
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Gamepad2 className="w-12 h-12 text-black" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-bold text-white">
                    Arena <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Coming Soon</span>
                  </h1>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    The ultimate skill-based gaming platform is currently under development. 
                    Get ready to compete, earn, and conquer.
                  </p>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Card className="bg-card/50 border-gray-800 hover:border-cyan-400/50 transition-colors">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Trophy className="w-6 h-6 text-black" />
                    </div>
                    <CardTitle className="text-white">Skill-Based Challenges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-center">
                      Compete in verified gaming challenges across multiple genres. 
                      No luck, just skill.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-gray-800 hover:border-purple-400/50 transition-colors">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-6 h-6 text-black" />
                    </div>
                    <CardTitle className="text-white">Earn $USDFG</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-center">
                      Win challenges and earn $USDFG tokens. 
                      Your skill directly translates to rewards.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-gray-800 hover:border-green-400/50 transition-colors">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-6 h-6 text-black" />
                    </div>
                    <CardTitle className="text-white">100% On-Chain</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-center">
                      Built on Solana blockchain. 
                      Transparent, secure, and verifiable results.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA Section */}
              <div className="space-y-6 mt-12">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white">Stay Updated</h2>
                  <p className="text-gray-400">
                    Follow our development progress and be the first to know when the Arena launches.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold hover:brightness-110"
                    onClick={() => window.open('https://github.com/USDFGAMING', '_blank')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-white hover:bg-gray-800"
                    onClick={() => window.open('https://twitter.com/USDFGAMING', '_blank')}
                  >
                    Follow Updates
                  </Button>
                </div>
              </div>

              {/* Development Status */}
              <div className="mt-12 p-6 bg-card/30 border border-gray-800 rounded-lg">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Development Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-400">Frontend UI Complete</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-400">Backend API Ready</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-400">Blockchain Integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-400">Testing & Deployment</span>
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
