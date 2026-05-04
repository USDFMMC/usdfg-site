/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_SOLANA_RPC_ENDPOINT?: string;
  /** WebSocket URL for ephemeral lobby (chat + WebRTC signaling relay). Example: wss://lobby.example.com */
  readonly VITE_LOBBY_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
