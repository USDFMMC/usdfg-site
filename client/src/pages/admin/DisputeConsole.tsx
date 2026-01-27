import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { 
  isAdmin, 
  getDisputedChallenges, 
  listenToDisputedChallenges,
  resolveAdminChallenge,
  ChallengeData 
} from '@/lib/firebase/firestore';
import { resolveAdminChallengeOnChain } from '@/lib/chain/contract';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const DisputeConsole: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [disputedChallenges, setDisputedChallenges] = useState<ChallengeData[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  
  const { connection } = useConnection();
  const wallet = useWallet();

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const admin = await isAdmin(firebaseUser.uid);
        setIsAdminUser(admin);
        if (!admin) {
          setError('You are not authorized to access this page');
          await signOut(auth);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to disputed challenges
  useEffect(() => {
    if (!isAdminUser) return;

    const unsubscribe = listenToDisputedChallenges((challenges) => {
      setDisputedChallenges(challenges);
    });

    return () => unsubscribe();
  }, [isAdminUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const admin = await isAdmin(userCredential.user.uid);
      
      if (!admin) {
        await signOut(auth);
        setError('You are not authorized to access this page');
        setIsAdminUser(false);
      } else {
        setIsAdminUser(true);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsAdminUser(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdminUser(false);
    setDisputedChallenges([]);
  };

  const handleResolve = async (challengeId: string, winnerWallet: string) => {
    if (!user || !isAdminUser) {
      setError('You must be logged in as an admin');
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet to resolve disputes');
      return;
    }

    setResolving(challengeId);
    setError(null);

    try {
      // First, call on-chain instruction
      console.log('🔗 Calling resolve_admin on-chain...');
      const txSignature = await resolveAdminChallengeOnChain(
        wallet,
        connection,
        challengeId,
        winnerWallet
      );

      console.log('✅ On-chain resolution successful:', txSignature);

      // Then update Firestore
      await resolveAdminChallenge(
        challengeId,
        winnerWallet,
        user.uid,
        user.email || 'unknown',
        txSignature
      );

      console.log('✅ Dispute resolved successfully');
    } catch (err: any) {
      console.error('❌ Error resolving dispute:', err);
      setError(err.message || 'Failed to resolve dispute');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdminUser) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1f2e] rounded-lg p-8 border border-cyan-500/20">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Admin Dispute Console
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#0f1419] border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#0f1419] border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Dispute Resolution Console</h1>
          <div className="flex items-center gap-4">
            {wallet.connected && (
              <span className="text-sm text-gray-400">
                Wallet: {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-6)}
              </span>
            )}
            <WalletMultiButton />
            <span className="text-gray-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded border border-red-500/50 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {!wallet.connected && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-300">
            <div className="flex items-center justify-between">
              <span>⚠️ Please connect your wallet to resolve disputes</span>
              <div className="ml-4">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 text-gray-400">
          {disputedChallenges.length} disputed challenge{disputedChallenges.length !== 1 ? 's' : ''}
        </div>

        {disputedChallenges.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No disputed challenges at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {disputedChallenges.map((challenge) => {
              const players = challenge.players || [];
              const results = challenge.results || {};
              const player1 = players[0];
              const player2 = players[1];
              const player1Result = results[player1];
              const player2Result = results[player2];

              return (
                <div
                  key={challenge.id}
                  className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-700"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Challenge: {challenge.game || 'Unknown Game'}
                    </h3>
                    <div className="text-sm text-gray-400">
                      Entry Fee: {challenge.entryFee} USDFG | Created: {challenge.createdAt?.toDate().toLocaleString()}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* Player 1 */}
                    <div className="bg-[#0f1419] rounded p-4">
                      <div className="font-semibold text-white mb-2">
                        Player A: {player1?.slice(0, 8)}...{player1?.slice(-6)}
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        Claimed: {player1Result?.didWin ? '✅ Won' : '❌ Lost'}
                      </div>
                      {player1Result?.proofImageData && (
                        <div className="mt-2">
                          <img
                            src={player1Result.proofImageData}
                            alt="Player A proof"
                            className="max-w-full h-auto rounded border border-gray-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div className="bg-[#0f1419] rounded p-4">
                      <div className="font-semibold text-white mb-2">
                        Player B: {player2?.slice(0, 8)}...{player2?.slice(-6)}
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        Claimed: {player2Result?.didWin ? '✅ Won' : '❌ Lost'}
                      </div>
                      {player2Result?.proofImageData && (
                        <div className="mt-2">
                          <img
                            src={player2Result.proofImageData}
                            alt="Player B proof"
                            className="max-w-full h-auto rounded border border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleResolve(challenge.id!, player1)}
                      disabled={resolving === challenge.id || !wallet.connected}
                      className="flex-1 py-3 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-300 rounded border border-green-500/50 transition font-semibold"
                    >
                      {resolving === challenge.id ? 'Resolving...' : `Approve Player A`}
                    </button>
                    <button
                      onClick={() => handleResolve(challenge.id!, player2)}
                      disabled={resolving === challenge.id || !wallet.connected}
                      className="flex-1 py-3 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-300 rounded border border-blue-500/50 transition font-semibold"
                    >
                      {resolving === challenge.id ? 'Resolving...' : `Approve Player B`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputeConsole;
