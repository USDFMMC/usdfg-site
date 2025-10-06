import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Target,
  Gamepad2,
  Zap,
  Shield
} from "lucide-react";
import { deriveStats } from "@/lib/derive/stats";
import { fetchPlayerEvents } from "@/lib/chain/events";

interface PlayerProfile {
  address: string;
  displayName: string;
  avatar?: string;
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    totalEarnings: number;
    currentStreak: number;
    bestStreak: number;
    last10: Array<{ result: 'win' | 'loss'; game: string; amount: number; timestamp: number }>;
  };
  recentChallenges: Array<{
    id: string;
    game: string;
    result: 'win' | 'loss';
    amount: number;
    timestamp: number;
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
        // TODO: Replace with actual on-chain data fetching
        const events = await fetchPlayerEvents(address);
        const stats = deriveStats(events);
        
        // Mock profile data - replace with real data
        const mockProfile: PlayerProfile = {
          address,
          displayName: `Player_${address.slice(0, 8)}`,
          stats: {
            wins: 23,
            losses: 7,
            winRate: 76.7,
            totalEarnings: 1250,
            currentStreak: 5,
            bestStreak: 12,
            last10: [
              { result: 'win', game: 'Street Fighter 6', amount: 100, timestamp: Date.now() - 2 * 60 * 60 * 1000 },
              { result: 'loss', game: 'Tekken 8', amount: -50, timestamp: Date.now() - 5 * 60 * 60 * 1000 },
              { result: 'win', game: 'Mortal Kombat 1', amount: 75, timestamp: Date.now() - 24 * 60 * 60 * 1000 },
            ]
          },
          recentChallenges: [
            { id: '1', game: 'Street Fighter 6', result: 'win', amount: 100, timestamp: Date.now() - 2 * 60 * 60 * 1000 },
            { id: '2', game: 'Tekken 8', result: 'loss', amount: -50, timestamp: Date.now() - 5 * 60 * 60 * 1000 },
            { id: '3', game: 'Mortal Kombat 1', result: 'win', amount: 75, timestamp: Date.now() - 24 * 60 * 60 * 1000 },
          ]
        };
        
        setProfile(mockProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
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
          <Link to="/app">
            <Button className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black">
              Back to Arena
            </Button>
          </Link>
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
                    <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
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
                  <CardTitle className="text-sm font-medium text-gray-400">Current Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400">{profile.stats.currentStreak}</div>
                  <p className="text-sm text-gray-400">Best: {profile.stats.bestStreak}</p>
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
                  <div className="text-3xl font-bold text-white">{profile.stats.wins + profile.stats.losses}</div>
                  <p className="text-sm text-gray-400">Challenges</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-card/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.recentChallenges.map((challenge, index) => (
                    <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-gray-800">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          challenge.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {challenge.result === 'win' ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{challenge.game}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(challenge.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          challenge.amount > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {challenge.amount > 0 ? "+" : ""}{challenge.amount} USDFG
                        </p>
                        <p className={`text-sm ${
                          challenge.result === 'win' ? "text-green-400" : "text-red-400"
                        }`}>
                          {challenge.result === 'win' ? 'Victory' : 'Defeat'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default PlayerProfile;
