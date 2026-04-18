"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const normalizeAddress_1 = require("./normalizeAddress");
const rateLimit_1 = require("./rateLimit");
const NONCE_TTL_MS = 5 * 60 * 1000;
/**
 * Strict base64 + ed25519 detached signature length (64 bytes).
 */
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
exports.verifyAdmin = (0, https_1.onCall)(async (request) => {
    const addressRaw = request.data?.address;
    const signatureB64 = request.data?.signature;
    const nonce = request.data?.nonce;
    if (!addressRaw || !signatureB64 || nonce === undefined || nonce === null) {
        throw new https_1.HttpsError("invalid-argument", "address, signature, and nonce are required");
    }
    if (typeof nonce !== "string" || nonce.length < 16 || nonce.length > 128) {
        throw new https_1.HttpsError("invalid-argument", "Invalid nonce");
    }
    const sigBytes = parseEd25519Signature(signatureB64);
    const normalized = (0, normalizeAddress_1.normalizeAddress)(addressRaw.trim());
    if (!normalized) {
        throw new https_1.HttpsError("invalid-argument", "Invalid address");
    }
    await (0, rateLimit_1.enforceRateLimit)(`verify_addr_${normalized}`);
    await (0, rateLimit_1.enforceRateLimit)(`verify_ip_${(0, rateLimit_1.clientIpFromRequest)(request.rawRequest)}`);
    const message = new TextEncoder().encode(nonce);
    let pubkeyBytes;
    try {
        pubkeyBytes = new web3_js_1.PublicKey(addressRaw.trim()).toBytes();
    }
    catch {
        throw new https_1.HttpsError("invalid-argument", "Invalid Solana address");
    }
    if (pubkeyBytes.length !== 32) {
        throw new https_1.HttpsError("invalid-argument", "Invalid public key");
    }
    const db = (0, firestore_1.getFirestore)();
    const nonceRef = db.collection("admin_auth_nonces").doc(nonce);
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
        if (ageMs > NONCE_TTL_MS) {
            throw new https_1.HttpsError("deadline-exceeded", "Nonce expired; request a new one");
        }
        const ok = tweetnacl_1.default.sign.detached.verify(message, sigBytes, pubkeyBytes);
        if (!ok) {
            throw new https_1.HttpsError("permission-denied", "Signature verification failed");
        }
        tx.delete(nonceRef);
    });
    const adminDoc = await db.collection("admins").doc(normalized).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Wallet is not an authorized admin");
    }
    const roleData = adminDoc.data();
    if (roleData?.role && roleData.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Invalid admin role");
    }
    const customToken = await admin.auth().createCustomToken(normalized, {
        admin: true,
        wallet: normalized,
    });
    return { customToken };
});
//# sourceMappingURL=verifyAdminHandler.js.map