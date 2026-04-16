# USDFG

Non-custodial, skill-based esports arena: players create challenges, compete, and settle rewards with **Solana** on-chain logic while **Firestore** holds off-chain state (lobbies, chat, tournaments, profiles).

## Requirements

- Node.js 20+ (recommended)
- npm 10+
- A Solana wallet (e.g. Phantom) for local testing
- Firebase project (for Firestore / Auth as configured in the app)

## Setup

```bash
git clone <repository-url>
cd KIMI2USDFG
npm install
```

## Environment

Copy the example file and fill in values (placeholders only in repo; use your own keys locally):

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase and RPC values. The app may still read Firebase from `src/lib/firebase/config.ts` depending on your branch; align env usage with your deployment policy.

Variables in `.env.example`:

- `VITE_FIREBASE_*` — Firebase web client config
- `VITE_SOLANA_RPC_ENDPOINT` — Solana JSON-RPC URL for transactions and reads

## Development

```bash
npm run dev
```

Open the app (default Vite URL, e.g. `http://localhost:5173`). Arena routes live under `/app`.

## Production build

```bash
npm run build
```

Output is written to `dist/`. Lint:

```bash
npm run lint
```

## Deploy

Hosting is configured for **Firebase Hosting** in `firebase.json` (SPA rewrite to `index.html`, `public` build output is `dist`). Deploy with the Firebase CLI after `npm run build`, using your Firebase project and rules in `firestore.rules`.

## Architecture (short)

- **Non-custodial**: entry and payouts go through Solana programs / PDAs as implemented in `src/lib/chain/`.
- **Firestore**: challenge list, lobbies, chat, voice signaling, tournaments, trust reviews, etc. (`src/lib/firebase/`).
- **Solana**: funding, join, cancel, claim, and admin dispute resolution flows (`src/lib/chain/contract.ts` and related).

## Admin

Dispute console route: `/admin/disputes` (Firebase Auth + admin allowlist as implemented in the app).
