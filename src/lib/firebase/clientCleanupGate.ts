/** Hard-off client-side challenge delete/cleanup (rules deny client delete). */
export const CLIENT_AUTO_CLEANUP_ENABLED = false;

let loggedCleanupDisabled = false;

export function logClientCleanupDisabledOnce(): void {
  if (loggedCleanupDisabled) return;
  loggedCleanupDisabled = true;
  console.log('Client cleanup disabled during devnet QA');
}
