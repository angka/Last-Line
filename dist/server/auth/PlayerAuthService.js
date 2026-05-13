"use strict";
/**
 * Phase 10 — Player Auth Service
 * Handles player registration, login, logout, and session management.
 */
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
exports.registerPlayer = registerPlayer;
exports.loginPlayer = loginPlayer;
exports.logoutPlayer = logoutPlayer;
exports.changePassword = changePassword;
exports.validateToken = validateToken;
exports.markTokenActive = markTokenActive;
exports.markTokenInactive = markTokenInactive;
exports.isTokenActive = isTokenActive;
exports.steamAuth = steamAuth;
exports.linkSteamAccount = linkSteamAccount;
exports.unlinkSteamAccount = unlinkSteamAccount;
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcryptjs"));
const PlayerDbManager_1 = require("../persistence/PlayerDbManager");
async function registerPlayer(username, email, password) {
    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
        return { success: false, error: 'Username must be 3-20 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Invalid email format.' };
    }
    // Validate password
    if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
    }
    // Check if username exists
    if (await (0, PlayerDbManager_1.usernameExists)(username)) {
        return { success: false, error: 'Username already taken.' };
    }
    // Check if email exists
    if (await (0, PlayerDbManager_1.emailExists)(email)) {
        return { success: false, error: 'Email already registered.' };
    }
    // Create account
    const playerId = (0, uuid_1.v4)();
    const passwordHash = await bcrypt.hash(password, 10);
    await (0, PlayerDbManager_1.createPlayerAccount)(playerId, username, email, passwordHash);
    // Issue token
    const token = (0, PlayerDbManager_1.issuePlayerJwt)(playerId);
    await (0, PlayerDbManager_1.storePlayerToken)(token, playerId);
    return { success: true, playerId, token };
}
async function loginPlayer(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) {
        return { success: false, error: 'Username/email and password required.' };
    }
    // Find account by username or email
    let account;
    if (usernameOrEmail.includes('@')) {
        account = await (0, PlayerDbManager_1.getPlayerByEmail)(usernameOrEmail);
    }
    else {
        account = await (0, PlayerDbManager_1.getPlayerByUsername)(usernameOrEmail);
    }
    if (!account) {
        return { success: false, error: 'Invalid credentials.' };
    }
    // Verify password
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
        return { success: false, error: 'Invalid credentials.' };
    }
    // Update last login
    await (0, PlayerDbManager_1.updateLastLogin)(account.playerId);
    // Issue token
    const token = (0, PlayerDbManager_1.issuePlayerJwt)(account.playerId);
    await (0, PlayerDbManager_1.storePlayerToken)(token, account.playerId);
    return {
        success: true,
        playerId: account.playerId,
        username: account.username,
        token,
    };
}
// ─── Logout ───────────────────────────────────────────────────────────────────
async function logoutPlayer(token) {
    await (0, PlayerDbManager_1.deletePlayerToken)(token);
}
async function changePassword(playerId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
        return { success: false, error: 'Current and new password required.' };
    }
    if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters.' };
    }
    const account = await (0, PlayerDbManager_1.getPlayerById)(playerId);
    if (!account) {
        return { success: false, error: 'Account not found.' };
    }
    const valid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!valid) {
        return { success: false, error: 'Current password is incorrect.' };
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await (0, PlayerDbManager_1.changePlayerPassword)(playerId, hash);
    // Invalidate all existing tokens (force re-login)
    await (0, PlayerDbManager_1.deleteAllPlayerTokens)(playerId);
    return { success: true };
}
// ─── Token Validation ─────────────────────────────────────────────────────────
async function validateToken(token) {
    const { verifyPlayerJwt } = await Promise.resolve().then(() => __importStar(require('../persistence/PlayerDbManager')));
    const payload = verifyPlayerJwt(token);
    if (!payload)
        return null;
    const account = await (0, PlayerDbManager_1.getPlayerById)(payload.playerId);
    if (!account)
        return null;
    return { playerId: account.playerId, username: account.username };
}
// ─── Session Cleanup ─────────────────────────────────────────────────────────
// Track tokens that were issued (in-memory for active sessions)
const activeTokens = new Set();
function markTokenActive(token) {
    activeTokens.add(token);
}
function markTokenInactive(token) {
    activeTokens.delete(token);
}
function isTokenActive(token) {
    return activeTokens.has(token);
}
// ─── Steam Auth (Phase 11) ─────────────────────────────────────────────────────
const SteamAuthService_1 = require("./SteamAuthService");
const PlayerDbManager_2 = require("../persistence/PlayerDbManager");
const CosmeticDbManager_1 = require("../persistence/CosmeticDbManager");
const PlayerDbManager_3 = require("../persistence/PlayerDbManager");
async function steamAuth(ticket) {
    const result = await (0, SteamAuthService_1.validateSteamTicket)(ticket);
    if (!result.success || !result.steamId) {
        return { success: false, error: result.error ?? 'Steam auth failed.' };
    }
    const steamId = result.steamId;
    // Check if this Steam ID is already linked to a player
    const existingPlayer = await (0, PlayerDbManager_2.getPlayerBySteamId)(steamId);
    if (existingPlayer) {
        // Login existing player
        const token = (0, PlayerDbManager_3.issuePlayerJwt)(existingPlayer.playerId);
        await (0, PlayerDbManager_3.storePlayerToken)(token, existingPlayer.playerId);
        // Sync Steam ownership
        await syncSteamOwnership(existingPlayer.playerId, steamId);
        return {
            success: true,
            playerId: existingPlayer.playerId,
            steamId,
            token,
        };
    }
    // Not linked — return needsLinking so client can prompt to link existing account
    return {
        success: false,
        steamId,
        needsLinking: true,
        error: 'Steam account not linked. Please login or register first, then link your Steam account.',
    };
}
async function linkSteamAccount(playerId, ticket) {
    const result = await (0, SteamAuthService_1.validateSteamTicket)(ticket);
    if (!result.success || !result.steamId) {
        return { success: false, error: result.error ?? 'Steam auth failed.' };
    }
    const steamId = result.steamId;
    // Check if already linked to another player
    const existingOwner = await (0, PlayerDbManager_2.getPlayerBySteamId)(steamId);
    if (existingOwner && existingOwner.playerId !== playerId) {
        return { success: false, error: 'This Steam account is already linked to another player.' };
    }
    // Link the Steam account
    await (0, PlayerDbManager_2.linkSteamToPlayer)(playerId, steamId);
    // Sync ownership
    await syncSteamOwnership(playerId, steamId);
    return { success: true, steamId };
}
async function unlinkSteamAccount(playerId) {
    const steamId = await (0, PlayerDbManager_2.getPlayerSteamId)(playerId);
    if (!steamId) {
        return { success: false, error: 'Steam account not linked.' };
    }
    await (0, PlayerDbManager_2.unlinkSteamFromPlayer)(playerId);
    return { success: true };
}
async function syncSteamOwnership(playerId, steamId) {
    const ownedProducts = await (0, SteamAuthService_1.getOwnedProducts)(steamId);
    for (const product of ownedProducts) {
        await (0, CosmeticDbManager_1.grantDlcEntitlement)(playerId, product, 'steam');
    }
    // Handle inventory expansion purchases
    if (ownedProducts.includes('inv_100')) {
        await (0, CosmeticDbManager_1.addInventorySlots)(playerId, 50);
    }
    if (ownedProducts.includes('inv_200')) {
        await (0, CosmeticDbManager_1.addInventorySlots)(playerId, 150);
    }
}
//# sourceMappingURL=PlayerAuthService.js.map