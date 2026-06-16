# Backlog

## Temporary gate: replace query-string Phantom auto-grant with validated Phantom return handling

| Field | Value |
|-------|--------|
| **Priority** | LOW |
| **Status** | Deferred (audit accepted) |
| **Implement now?** | No |

### Context

Security sanity audit accepted. `ArenaPasswordGate` currently grants access when the URL **contains** `phantom_encryption_public_key`, without validating a real Phantom callback. A fake query string can bypass the password form.

Recommended future fix (when prioritized): auto-grant only after `isPhantomReturn()` + successful `handlePhantomReturn()` from `src/lib/wallet/phantom-deeplink.ts`, with minimal wallet-state persistence so `index.tsx` UX is unchanged.

### Why deferred

- Temporary client-side gate only; not a production security boundary
- **Cloudflare Access** remains the long-term solution at the edge
- **Funding diagnostics** are higher priority right now
- `localStorage` bypass means the security model stays client-side regardless

### Revisit only after

1. Funding issue resolved
2. Cloudflare Access deployed

### Removal

Delete this item when the temporary gate folder is removed (`src/temporary/arena-password-gate/`) or when Cloudflare Access replaces client-side gating entirely.
