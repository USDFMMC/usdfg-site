import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Gamepad2, Zap } from "lucide-react";
import { getPlayerStats, getPlayerEarningsByChallenge } from "@/lib/firebase/firestore";
import { MOCK_EARNINGS_BY_CHALLENGE } from "@/lib/mock/earningsByChallenge";

interface PlayerProfile {
  address: string;
  displayName: string;
  avatar?: string;
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    totalEarnings: number;
    gamesPlayed: number;
  };
  earningsByChallenge: Array<{
    challengeId: string;
    game?: string;
    title?: string;
    amount: number;
    completedAt: Date;
  }>;
}

const PlayerProfile: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!address) return;

      setLoading(true);
      try {
        if (address.toLowerCase() === "demo") {
          setProfile({
            address: "demo",
            displayName: "Demo Player",
            stats: {
              wins: 12,
              losses: 4,
              winRate: 75,
              totalEarnings: 1375,
              gamesPlayed: 16,
            },
            earningsByChallenge: MOCK_EARNINGS_BY_CHALLENGE.map((e) => ({
              challengeId: e.challengeId,
              game: e.game,
              title: e.title,
              amount: e.amount,
              completedAt: e.completedAt,
            })),
          });
          setLoading(false);
          return;
        }

        const [stats, earnings] = await Promise.all([
          getPlayerStats(address),
          getPlayerEarningsByChallenge(address, 50),
        ]);

        if (!stats && earnings.length === 0) {
          setProfile(null);
          return;
        }

        const displayName = stats?.displayName?.trim()
          ? stats.displayName
          : `Player_${address.slice(0, 8)}`;

        setProfile({
          address,
          displayName,
          stats: {
            wins: stats?.wins ?? 0,
            losses: stats?.losses ?? 0,
            winRate: stats?.winRate ?? 0,
            totalEarnings: stats?.totalEarned ?? 0,
            gamesPlayed: stats?.gamesPlayed ?? 0,
          },
          earningsByChallenge: earnings.map((e) => ({
            challengeId: e.challengeId,
            game: e.game,
            title: e.title,
            amount: e.amount,
            completedAt: e.completedAt,
          })),
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <p className="text-gray-400">Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Player Not Found</h1>
          <p className="text-gray-400">This player profile could not be found.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/app">
              <Button className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black">
                Back to Arena
              </Button>
            </Link>
            <Link to="/app/profile/demo">
              <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                View demo profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{profile.displayName} - Player Profile | USDFG Arena</title>
        <meta name="description" content={`View ${profile.displayName}'s gaming stats and challenge history in the USDFG Arena.`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
        {/* Header */}
        <header className="border-b border-gray-800 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/app">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Arena
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-xl font-bold text-white">Player Profile</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Header */}
            <Card className="bg-card/50 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black text-2xl font-bold">
                      {profile.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
                      {profile.address.toLowerCase() === "demo" && (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                          Demo
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 font-mono text-sm">{profile.address}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        <Trophy className="w-3 h-3 mr-1" />
                        {profile.stats.wins} Wins
                      </Badge>
                      <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                        <Zap className="w-3 h-3 mr-1" />
                        {profile.stats.totalEarnings} USDFG
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card/50 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">{profile.stats.winRate}%</div>
                  <p className="text-sm text-gray-400">{profile.stats.wins}W / {profile.stats.losses}L</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-cyan-400">{profile.stats.totalEarnings}</div>
                  <p className="text-sm text-gray-400">USDFG</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{profile.stats.gamesPlayed}</div>
                  <p className="text-sm text-gray-400">Challenges</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Challenges Won</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-400">
                    {profile.earningsByChallenge.length || MOCK_EARNINGS_BY_CHALLENGE.length}
                  </div>
                  <p className="text-sm text-gray-400">
                    {profile.earningsByChallenge.length === 0 ? "Demo below" : "Earnings listed below"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings per challenge */}
            {(() => {
              const list = profile.earningsByChallenge.length > 0
                ? profile.earningsByChallenge
                : MOCK_EARNINGS_BY_CHALLENGE;
              const isDemo = profile.earningsByChallenge.length === 0;
              return (
                <Card className="bg-card/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Trophy className="w-5 h-5 mr-2" />
                      Earnings per challenge
                      {isDemo && (
                        <span className="text-sm font-normal text-gray-500 ml-2">(demo)</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      {isDemo ? "Preview with sample data." : "Wins only; amounts earned in USDFG."}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {list.length === 0 ? (
                      <p className="text-gray-400">No completed challenges yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {list.map((e) => (
                          <div
                            key={e.challengeId}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-gray-800"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
                                <Trophy className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white font-semibold">{e.game || e.title || "Challenge"}</p>
                                <p className="text-sm text-gray-400">{e.completedAt.toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className="font-semibold text-green-400">+{e.amount} USDFG</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </main>
      </div>
    </>
  );
};

export default PlayerProfile;
