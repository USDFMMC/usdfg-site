import type { Plugin } from 'vite';

/**
 * Fails the build only when deploying with VITE_APP_ENV=production while still on devnet.
 * Preview/staging/dev builds may continue using devnet (default).
 */
export function validateProductionSolanaEnv(): Plugin {
  return {
    name: 'validate-production-solana-env',
    enforce: 'pre',
    config() {
      const env = { ...process.env };
      const appEnv = env.VITE_APP_ENV?.trim().toLowerCase();
      if (appEnv !== 'production' && appEnv !== 'prod') {
        return;
      }

      const cluster = env.VITE_SOLANA_CLUSTER?.trim().toLowerCase() || 'devnet';
      if (cluster === 'devnet' || cluster === '') {
        throw new Error(
          '[build-guard] VITE_APP_ENV=production cannot use devnet. ' +
            'Set VITE_SOLANA_CLUSTER=mainnet-beta and production program/mint IDs in Cloudflare Production env, ' +
            'or use VITE_APP_ENV=staging for devnet preview builds.'
        );
      }

      if (cluster !== 'mainnet-beta' && cluster !== 'mainnet') {
        console.warn(
          `[build-guard] VITE_APP_ENV=production with VITE_SOLANA_CLUSTER=${cluster} — verify this is intentional.`
        );
      }
    },
  };
}
