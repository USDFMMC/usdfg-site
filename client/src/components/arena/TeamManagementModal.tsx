import React, { useState, useEffect } from 'react';
import { getTeamByMember, createTeam, joinTeam, leaveTeam, removeTeamMember, getTeamStats, TeamStats } from '@/lib/firebase/firestore';
import ElegantButton from '@/components/ui/ElegantButton';

interface TeamManagementModalProps {
  currentWallet: string | null;
  onClose: () => void;
  onTeamUpdated?: () => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ currentWallet, onClose, onTeamUpdated }) => {
  const [userTeam, setUserTeam] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [teamName, setTeamName] = useState<string>('');
  const [joinTeamId, setJoinTeamId] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Fetch user's team
  useEffect(() => {
    const fetchUserTeam = async () => {
      if (!currentWallet) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const team = await getTeamByMember(currentWallet);
        setUserTeam(team);
      } catch (error) {
        console.error('Failed to fetch user team:', error);
        setError('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTeam();
  }, [currentWallet]);

  const handleCreateTeam = async () => {
    if (!currentWallet) {
      setError('Wallet not connected');
      return;
    }

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (teamName.trim().length > 20) {
      setError('Team name must be 20 characters or less');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      setSuccess('');
      await createTeam(currentWallet, teamName.trim());
      // Refresh team data
      const team = await getTeamByMember(currentWallet);
      setUserTeam(team);
      setTeamName('');
      setSuccess('Team created successfully');
      onTeamUpdated?.();
    } catch (error: any) {
      setError(error.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!currentWallet) {
      setError('Wallet not connected');
      return;
    }

    if (!joinTeamId.trim()) {
      setError('Team key holder wallet address is required');
      return;
    }

    try {
      setIsJoining(true);
      setError('');
      setSuccess('');
      await joinTeam(joinTeamId.trim(), currentWallet);
      // Refresh team data
      const team = await getTeamByMember(currentWallet);
      setUserTeam(team);
      setJoinTeamId('');
      setSuccess('Joined team successfully');
      onTeamUpdated?.();
    } catch (error: any) {
      setError(error.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!currentWallet || !userTeam) {
      return;
    }

    if (!window.confirm(`Are you sure you want to leave ${userTeam.teamName}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await leaveTeam(userTeam.teamId, currentWallet);
      setUserTeam(null);
      setSuccess('Left team successfully');
      onTeamUpdated?.();
    } catch (error: any) {
      setError(error.message || 'Failed to leave team');
    }
  };

  const handleRemoveMember = async (member: string) => {
    if (!currentWallet || !userTeam) {
      return;
    }

    if (!window.confirm(`Remove ${member.slice(0, 8)}...${member.slice(-4)} from ${userTeam.teamName}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setRemovingMember(member);
      await removeTeamMember(userTeam.teamId, member, currentWallet);
      // Refresh team data for current user (team key holder)
      const updatedTeam = await getTeamByMember(currentWallet);
      setUserTeam(updatedTeam);
      setSuccess('Member removed successfully');
      onTeamUpdated?.();
    } catch (error: any) {
      setError(error.message || 'Failed to remove team member');
    } finally {
      setRemovingMember(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-emerald-300 text-sm">{success}</p>
          </div>
        )}

      {userTeam ? (
        // User is in a team - Show team info
        <div className="space-y-4">
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">{userTeam.teamName}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Team Key:</span>
                <span className="text-white font-mono text-xs">{userTeam.teamKey.slice(0, 8)}...{userTeam.teamKey.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Members:</span>
                <span className="text-white">{userTeam.members.length}/69</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Wins:</span>
                <span className="text-green-400">{userTeam.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Losses:</span>
                <span className="text-red-400">{userTeam.losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Win Rate:</span>
                <span className="text-cyan-400">{userTeam.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Earned:</span>
                <span className="text-amber-400">{userTeam.totalEarned.toLocaleString()} USDFG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Games Played:</span>
                <span className="text-white">{userTeam.gamesPlayed}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Team Members</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {userTeam.members.map((member, index) => (
                  <div key={member} className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-mono">{member.slice(0, 8)}...{member.slice(-4)}</span>
                      {member === userTeam.teamKey && (
                        <span className="text-amber-400 text-xs">🔑 Key Holder</span>
                      )}
                      {member === currentWallet && (
                        <span className="text-cyan-400 text-xs">You</span>
                      )}
                    </div>
                    {userTeam.teamKey === currentWallet && member !== userTeam.teamKey && (
                      <ElegantButton
                        onClick={() => handleRemoveMember(member)}
                        variant="danger"
                        className="px-2 py-1 text-[10px]"
                        disabled={removingMember === member}
                      >
                        {removingMember === member ? 'Removing...' : 'Remove'}
                      </ElegantButton>
                    )}
                </div>
              ))}
            </div>
          </div>

          {userTeam.teamKey === currentWallet ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-xs font-semibold mb-2">
                🔑 You are the team key holder
              </p>
              <p className="text-zinc-400 text-xs mb-2">
                Only you can create team challenges. Your wallet controls the team account for security. Team members can participate but cannot control the team.
              </p>
              <p className="text-zinc-500 text-xs italic">
                Note: Team leadership is permanent. If you need to transfer leadership, share the wallet seed phrase with another team member.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-zinc-400 text-xs mb-2">
                  <span className="font-semibold text-white">Team Key Holder:</span> {userTeam.teamKey.slice(0, 8)}...{userTeam.teamKey.slice(-4)}
                </p>
                <p className="text-zinc-500 text-xs">
                  Only the team key holder can create team challenges. You can participate in team challenges but cannot control the team account.
                </p>
              </div>
              <ElegantButton
                onClick={handleLeaveTeam}
                variant="danger"
                className="w-full"
              >
                Leave Team
              </ElegantButton>
            </div>
          )}
        </div>
      ) : (
        // User is not in a team - Show create/join options
        <div className="space-y-4">
          {/* Create Team */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h3 className="text-base font-semibold text-white mb-3">Create Team</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Create a new team. Your wallet will be the team key holder and will control all team challenges for security. Team members can participate but cannot control the team account.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError('');
                }}
                placeholder="Enter team name (max 20 characters)"
                maxLength={20}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none"
              />
              <ElegantButton
                onClick={handleCreateTeam}
                variant="primary"
                disabled={isCreating || !teamName.trim()}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </ElegantButton>
            </div>
          </div>

          {/* Join Team */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h3 className="text-base font-semibold text-white mb-3">Join Team</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Join an existing team by entering the team key holder's wallet address. Only the team key holder can create team challenges for security.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={joinTeamId}
                onChange={(e) => {
                  setJoinTeamId(e.target.value);
                  setError('');
                }}
                placeholder="Enter team key holder wallet address"
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none font-mono"
              />
              <ElegantButton
                onClick={handleJoinTeam}
                variant="secondary"
                disabled={isJoining || !joinTeamId.trim()}
                className="w-full"
              >
                {isJoining ? 'Joining...' : 'Join Team'}
              </ElegantButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagementModal;

