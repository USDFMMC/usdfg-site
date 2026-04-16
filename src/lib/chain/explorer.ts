import { SOLANA_CLUSTER } from './config';

export function getExplorerTxUrl(signature: string): string {
  if (!signature) {
    return '';
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}
