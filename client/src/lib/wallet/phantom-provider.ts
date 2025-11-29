import { useEffect, useState, useCallback } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-phantom";

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent
);
const skipAutoConnect = isIOS && isSafari;
const RPC = clusterApiUrl("devnet");

export function usePhantom() {
  const [adapter] = useState(() => new PhantomWalletAdapter());
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // ---------- CLEAN NONCE BEFORE CONNECT ----------
  const resetNonce = () => {
    try {
      localStorage.removeItem("walletAdapterMobileNonce");
    } catch (e) {}
  };

  // ---------- CONNECT ----------
  const connect = useCallback(async () => {
    try {
      resetNonce();
      setConnecting(true);
      await adapter.connect({
        onlyIfTrusted: false,
        allowRedirect: true,
      });
      // Wait for Phantom to return without looping
    } catch (err) {
      console.log("Connect canceled:", err);
    } finally {
      setConnecting(false);
    }
  }, [adapter]);

  // ---------- DISCONNECT ----------
  const disconnect = useCallback(async () => {
    try {
      await adapter.disconnect();
    } catch (err) {
      console.log(err);
    }
    setPublicKey(null);
    setConnected(false);
  }, [adapter]);

  // ---------- PHANTOM EVENTS ----------
  useEffect(() => {
    const handleConnect = () => {
      setPublicKey(adapter.publicKey);
      setConnected(true);
    };

    const handleDisconnect = () => {
      setPublicKey(null);
      setConnected(false);
    };

    adapter.on("connect", handleConnect);
    adapter.on("disconnect", handleDisconnect);

    return () => {
      adapter.off("connect", handleConnect);
      adapter.off("disconnect", handleDisconnect);
    };
  }, [adapter]);

  // ---------- RESTORE SESSION (SAFE) ----------
  useEffect(() => {
    if (skipAutoConnect) {
      console.log("iOS Safari detected — skipping auto-connect.");
      return;
    }

    // Try restore once
    if (!adapter.connected) {
      adapter
        .connect({ onlyIfTrusted: true })
        .catch(() => {
          /* fail silently without looping */
        });
    }
  }, [adapter]);

  return {
    adapter,
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    connection: new Connection(RPC),
  };
}

