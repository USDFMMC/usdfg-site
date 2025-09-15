import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, Zap, Target } from "lucide-react";

interface ProfileCardProps {
  address: string;
  displayName: string;
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    totalEarnings: number;
    currentStreak: number;
  };
  isCompact?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  address,
  displayName,
  stats,
  isCompact = false
}) => {
  if (isCompact) {
    return (
      <Link to={`/app/profile/${address}`}>
        <Card className="bg-card/50 border-gray-800 hover:border-cyan-400/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-bold">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{displayName}</p>
                <p className="text-sm text-gray-400 truncate">{address.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-400 font-semibold">{stats.winRate}%</p>
                <p className="text-xs text-gray-400">{stats.wins}W</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="bg-card/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black text-2xl font-bold">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-white text-xl">{displayName}</CardTitle>
            <p className="text-gray-400 font-mono text-sm">{address}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Trophy className="w-3 h-3 mr-1" />
                {stats.wins} Wins
              </Badge>
              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                <Zap className="w-3 h-3 mr-1" />
                {stats.totalEarnings} $USDFG
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.winRate}%</div>
            <p className="text-sm text-gray-400">Win Rate</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.currentStreak}</div>
            <p className="text-sm text-gray-400">Current Streak</p>
          </div>
        </div>
        <div className="mt-4">
          <Link to={`/app/profile/${address}`}>
            <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800">
              <Target className="w-4 h-4 mr-2" />
              View Full Profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
