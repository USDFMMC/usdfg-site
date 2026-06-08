export const TRANSACTION_DELAYED_USER_MESSAGE =
  'Transaction delayed due to network traffic. You can retry now or return later.';

const NETWORK_ERROR_PATTERNS = [
  '429',
  'rate limit',
  'too many requests',
  'timeout',
  'timed out',
  'blockhash not found',
  'block height exceeded',
  'blockheight exceeded',
  'transactionexpiredblockheightexceeded',
  'transactionexpiredtimeouterror',
  'was not confirmed',
  'not confirmed in',
  'confirmation timeout',
  'failed to fetch',
  'network request failed',
  'network error',
  'service unavailable',
  '503',
  '502',
  '504',
  'econnreset',
  'etimedout',
  'enotfound',
  'fetch failed',
  'socket hang up',
  'rpc request failed',
  'jsonrpc',
  'connection refused',
  'unable to reach',
  'overloaded',
  'devnet.solana.com',
  'api.devnet.solana.com',
  'public devnet rpc',
];

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  const visit = (value: unknown) => {
    if (value == null) return;
    if (typeof value === 'string') {
      parts.push(value);
      return;
    }
    if (value instanceof Error) {
      parts.push(value.message);
      if (value.name) parts.push(value.name);
      const extra = value as {
        code?: string | number;
        logs?: unknown[];
        cause?: unknown;
      };
      if (extra.code != null) parts.push(String(extra.code));
      if (Array.isArray(extra.logs)) {
        parts.push(...extra.logs.map((log) => String(log)));
      }
      if (extra.cause) visit(extra.cause);
      return;
    }
    if (typeof value === 'object') {
      try {
        parts.push(JSON.stringify(value));
      } catch {
        parts.push(String(value));
      }
      return;
    }
    parts.push(String(value));
  };
  visit(error);
  return parts.join(' ').toLowerCase();
}

export function isLikelyRpcNetworkError(error: unknown): boolean {
  const haystack = collectErrorText(error);
  return NETWORK_ERROR_PATTERNS.some((pattern) => haystack.includes(pattern));
}

export type TransactionFailureKind = 'fund' | 'claim';

export function presentTransactionFailure(
  error: unknown,
  kind: TransactionFailureKind,
  options?: { walletRejected?: boolean }
): {
  message: string;
  type: 'warning' | 'error';
  title: string;
} {
  if (options?.walletRejected) {
    return {
      message: 'Transaction was rejected in your wallet. You can try again when ready.',
      type: 'warning',
      title: 'Wallet rejected',
    };
  }

  console.error(`[transaction:${kind}]`, error);

  if (isLikelyRpcNetworkError(error)) {
    return {
      message: TRANSACTION_DELAYED_USER_MESSAGE,
      type: 'warning',
      title: 'Network busy',
    };
  }

  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? 'Unknown error');

  const title = kind === 'claim' ? 'Claim failed' : 'Funding failed';
  const prefix = kind === 'claim' ? 'Failed to claim reward: ' : 'Failed to fund challenge: ';
  return {
    message: `${prefix}${raw}`,
    type: 'error',
    title,
  };
}
