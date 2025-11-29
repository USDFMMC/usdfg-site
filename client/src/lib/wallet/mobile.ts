/**
 * Mobile Safari → DIRECT Phantom universal link method
 * This bypasses wallet adapter completely on mobile Safari
 * Uses official Phantom universal link (https://phantom.app/ul/v1/connect)
 * with full encryption key handshake so Safari returns to the same tab
 * 
 * Phantom REQUIRES:
 * - dapp_encryption_public_key (for encrypted response)
 * - nonce (for encryption)
 * - redirect_link (where to return)
 * - cluster (devnet/mainnet)
 */

import nacl from "tweetnacl";

export function phantomMobileConnect() {
  const appUrl = encodeURIComponent("https://usdfg.pro/app");
  const redirect = encodeURIComponent("https://usdfg.pro/app");

  // Generate a 32-byte keypair used to encrypt Phantom's response
  const dappKeyPair = nacl.box.keyPair();

  // Nonce required by Phantom
  const nonce = nacl.randomBytes(24);

  const link =
    `https://phantom.app/ul/v1/connect?` +
    `app_url=${appUrl}` +
    `&dapp_encryption_public_key=${encodeURIComponent(
      Buffer.from(dappKeyPair.publicKey).toString("base64")
    )}` +
    `&nonce=${encodeURIComponent(Buffer.from(nonce).toString("base64"))}` +
    `&redirect_link=${redirect}` +
    `&cluster=devnet`;

  // Store values so redirect handler can decrypt Phantom's response
  localStorage.setItem(
    "phantom_dapp_keypair",
    JSON.stringify({
      publicKey: Buffer.from(dappKeyPair.publicKey).toString("base64"),
      secretKey: Buffer.from(dappKeyPair.secretKey).toString("base64"),
      nonce: Buffer.from(nonce).toString("base64"),
    })
  );

  console.log("📱 Mobile Safari → using Phantom universal link with encryption keys");
  window.location.href = link;
}

