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
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeProvisionalChallengeResolutions = exports.pruneStaleAdminNonces = exports.finalizeAdminTournamentDispute = exports.finalizeAdminChallengeDispute = exports.verifyAdmin = exports.createAdminNonce = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var createAdminNonceHandler_1 = require("./createAdminNonceHandler");
Object.defineProperty(exports, "createAdminNonce", { enumerable: true, get: function () { return createAdminNonceHandler_1.createAdminNonce; } });
var verifyAdminHandler_1 = require("./verifyAdminHandler");
Object.defineProperty(exports, "verifyAdmin", { enumerable: true, get: function () { return verifyAdminHandler_1.verifyAdmin; } });
var finalizeChallenge_1 = require("./finalizeChallenge");
Object.defineProperty(exports, "finalizeAdminChallengeDispute", { enumerable: true, get: function () { return finalizeChallenge_1.finalizeAdminChallengeDispute; } });
var finalizeTournament_1 = require("./finalizeTournament");
Object.defineProperty(exports, "finalizeAdminTournamentDispute", { enumerable: true, get: function () { return finalizeTournament_1.finalizeAdminTournamentDispute; } });
var pruneAdminNonces_1 = require("./pruneAdminNonces");
Object.defineProperty(exports, "pruneStaleAdminNonces", { enumerable: true, get: function () { return pruneAdminNonces_1.pruneStaleAdminNonces; } });
var provisionalResolution_1 = require("./provisionalResolution");
Object.defineProperty(exports, "finalizeProvisionalChallengeResolutions", { enumerable: true, get: function () { return provisionalResolution_1.finalizeProvisionalChallengeResolutions; } });
//# sourceMappingURL=index.js.map