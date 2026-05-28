import { appEnvironment, solanaCluster } from '@/lib/chain/environment';

const STALE_PRODUCTION_PAGES_HOST = 'usdfg-app.pages.dev';

/** True when QA likely opened the production Pages URL instead of a branch Preview. */
export function shouldShowStalePagesWarning(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname !== STALE_PRODUCTION_PAGES_HOST) return false;

  const nonProdAppEnv =
    appEnvironment === 'development' || appEnvironment === 'staging';
  const onDevnet = solanaCluster === 'devnet';

  return nonProdAppEnv || onDevnet;
}

export function getDeployLabelParts(): string[] {
  const parts: string[] = [];
  parts.push(`env: ${appEnvironment}`);
  parts.push(`cluster: ${solanaCluster}`);

  const branch = import.meta.env.VITE_DEPLOY_BRANCH?.trim();
  const commit = import.meta.env.VITE_DEPLOY_COMMIT?.trim();
  if (branch) parts.push(`branch: ${branch}`);
  if (commit) parts.push(`commit: ${commit.slice(0, 7)}`);

  return parts;
}
