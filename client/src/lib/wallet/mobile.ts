/**
 * Mobile Safari → DIRECT Phantom deep link method
 * This bypasses wallet adapter completely on mobile Safari
 * Uses the same deep link system as phantom-deeplink.ts for consistency
 */

import { launchPhantomDeepLink } from './phantom-deeplink';

export async function phantomMobileConnect() {
  console.log("📱 Mobile Safari → using direct Phantom deep link");
  // Use the existing deep link function which handles encryption, nonce, etc.
  launchPhantomDeepLink();
}

