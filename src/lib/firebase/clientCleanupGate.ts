/**
 * Client-side challenge delete/cleanup is disabled: Firestore rules deny `delete` on
 * `challenges`. Expired/pre-fund docs are hidden via UI filters and dismissed with
 * `dismissPreFundChallenge()` (status → cancelled), not hard-deleted.
 */
export const CLIENT_AUTO_CLEANUP_ENABLED = false;
