import { useCallback, useEffect, useRef, useState } from 'react';
import type { Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { USDFG_MINT } from '@/lib/chain/config';
import {
  auditedGetBalance,
  auditedGetTokenAccountBalance,
} from '@/lib/debug/balance-audit';

const RPC_TIMEOUT_MS = 5_000;

export type WalletBalances = {
  solBalance: number | null;
  usdfgBalance: number | null;
  refreshWalletBalances: (challengeId?: string | null) => Promise<void>;
};

/**
 * Single arena-wide wallet balance source (one SOL + one USDFG RPC read per refresh).
 * Pass effectivePublicKey from ArenaPage (adapter or stored Phantom key).
 */
export function useWalletBalances(
  publicKey: PublicKey | null,
  connection: Connection | null,
  enabled: boolean
): WalletBalances {
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const walletKey = publicKey?.toBase58() ?? null;

  const refreshWalletBalances = useCallback(
    async (challengeId?: string | null): Promise<void> => {
      if (!enabled || !publicKey || !connection || !walletKey) {
        setSolBalance(null);
        setUsdfgBalance(null);
        return;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const walletStr = publicKey.toString();
      const auditMeta = {
        component: 'ArenaPage',
        instance: 'shared-useWalletBalances',
        wallet: walletStr,
        challengeId: challengeId ?? null,
      };

      const run = (async () => {
        try {
          const balanceLamports = await Promise.race([
            auditedGetBalance(
              connection,
              publicKey,
              { ...auditMeta, caller: 'fetchSOLBalance' },
              'confirmed'
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
            ),
          ]);
          setSolBalance(balanceLamports / LAMPORTS_PER_SOL);
        } catch {
          setSolBalance(null);
        }

        try {
          const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, publicKey);
          const tokenBalance = await Promise.race([
            auditedGetTokenAccountBalance(
              connection,
              tokenAccount,
              { ...auditMeta, caller: 'fetchUSDFGBalance' },
              'confirmed'
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
            ),
          ]);
          setUsdfgBalance(tokenBalance.value.uiAmount ?? 0);
        } catch (err: unknown) {
          const msg = String((err as { message?: string })?.message ?? err);
          if (
            msg.includes('could not find account') ||
            msg.includes('Invalid param')
          ) {
            setUsdfgBalance(0);
          } else {
            setUsdfgBalance(0);
          }
        }
      })();

      inFlightRef.current = run;
      try {
        await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    [connection, enabled, publicKey, walletKey]
  );

  useEffect(() => {
    if (!enabled || !walletKey || !connection || !publicKey) {
      setSolBalance(null);
      setUsdfgBalance(null);
      return;
    }
    void refreshWalletBalances();
  }, [connection, enabled, walletKey, refreshWalletBalances]);

  return { solBalance, usdfgBalance, refreshWalletBalances };
}
