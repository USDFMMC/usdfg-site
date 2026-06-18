"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.getFirestore = exports.FieldValue = exports.WALLET_NONCE_TTL_MS = void 0;
exports.parseEd25519Signature = parseEd25519Signature;
exports.parseWalletAddress = parseWalletAddress;
exports.verifyAndConsumeWalletNonce = verifyAndConsumeWalletNonce;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "getFirestore", { enumerable: true, get: function () { return firestore_1.getFirestore; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const normalizeAddress_1 = require("./normalizeAddress");
exports.WALLET_NONCE_TTL_MS = 5 * 60 * 1000;
function parseEd25519Signature(signatureB64) {
    const trimmed = signatureB64.trim();
    if (!trimmed || trimmed.length > 120) {
        throw new https_1.HttpsError("invalid-argument", "Invalid signature encoding");
    }
    if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid signature encoding");
    }
    let buf;
    try {
        buf = Buffer.from(trimmed, "base64");
    }
    catch {
        throw new https_1.HttpsError("invalid-argument", "Invalid signature encoding");
    }
    if (buf.length !== 64) {
        throw new https_1.HttpsError("invalid-argument", "Invalid signature length");
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
function parseWalletAddress(addressRaw) {
    const displayAddress = addressRaw.trim();
    const normalized = (0, normalizeAddress_1.normalizeAddress)(displayAddress);
    if (!normalized) {
        throw new https_1.HttpsError("invalid-argument", "Invalid address");
    }
    let pubkeyBytes;
    try {
        pubkeyBytes = new web3_js_1.PublicKey(displayAddress).toBytes();
    }
    catch {
        throw new https_1.HttpsError("invalid-argument", "Invalid Solana address");
    }
    if (pubkeyBytes.length !== 32) {
        throw new https_1.HttpsError("invalid-argument", "Invalid public key");
    }
    return { normalized, pubkeyBytes, displayAddress };
}
/**
 * Verify detached ed25519 signature over UTF-8 nonce and consume the nonce doc atomically.
 */
async function verifyAndConsumeWalletNonce(params) {
    const { normalized, pubkeyBytes, displayAddress } = parseWalletAddress(params.addressRaw);
    if (typeof params.nonce !== "string" || params.nonce.length < 16 || params.nonce.length > 128) {
        throw new https_1.HttpsError("invalid-argument", "Invalid nonce");
    }
    const sigBytes = parseEd25519Signature(params.signatureB64);
    const message = new TextEncoder().encode(params.nonce);
    const db = (0, firestore_1.getFirestore)();
    const nonceRef = db.collection(params.collection).doc(params.nonce);
    await db.runTransaction(async (tx) => {
        const doc = await tx.get(nonceRef);
        if (!doc.exists) {
            throw new https_1.HttpsError("not-found", "Invalid or unknown nonce");
        }
        const nd = doc.data();
        if (nd.used === true) {
            throw new https_1.HttpsError("permission-denied", "Nonce already used");
        }
        if ((0, normalizeAddress_1.normalizeAddress)(nd.address) !== normalized) {
            throw new https_1.HttpsError("permission-denied", "Nonce is not bound to this wallet");
        }
        const createdAt = nd.createdAt;
        if (!createdAt) {
            throw new https_1.HttpsError("failed-precondition", "Invalid nonce record");
        }
        const ageMs = Date.now() - createdAt.toMillis();
        if (ageMs > exports.WALLET_NONCE_TTL_MS) {
            throw new https_1.HttpsError("deadline-exceeded", "Nonce expired; request a new one");
        }
        const ok = tweetnacl_1.default.sign.detached.verify(message, sigBytes, pubkeyBytes);
        if (!ok) {
            throw new https_1.HttpsError("permission-denied", "Signature verification failed");
        }
        tx.delete(nonceRef);
    });
    return { normalized, displayAddress };
}
//# sourceMappingURL=walletSignatureVerify.js.map