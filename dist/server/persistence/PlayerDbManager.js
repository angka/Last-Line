"use strict";
/**
 * Phase 10 — Player Database Manager
 * Manages player accounts, auth tokens, friends, and blocks.
 * Uses a separate SQLite file: saves/player.db
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuePlayerJwt = issuePlayerJwt;
exports.verifyPlayerJwt = verifyPlayerJwt;
exports.getPlayerByUsername = getPlayerByUsername;
exports.getPlayerById = getPlayerById;
exports.getPlayerByEmail = getPlayerByEmail;
exports.createPlayerAccount = createPlayerAccount;
exports.updateLastLogin = updateLastLogin;
exports.changePlayerPassword = changePlayerPassword;
exports.storePlayerToken = storePlayerToken;
exports.deletePlayerToken = deletePlayerToken;
exports.deleteAllPlayerTokens = deleteAllPlayerTokens;
exports.getFriendEntry = getFriendEntry;
exports.getFriendStatus = getFriendStatus;
exports.addFriendRequest = addFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.removeFriend = removeFriend;
exports.getFriends = getFriends;
exports.getPendingRequests = getPendingRequests;
exports.getSentRequests = getSentRequests;
exports.blockPlayer = blockPlayer;
exports.unblockPlayer = unblockPlayer;
exports.isPlayerBlocked = isPlayerBlocked;
exports.getBlockedPlayers = getBlockedPlayers;
exports.getPlayerIdByUsername = getPlayerIdByUsername;
exports.usernameExists = usernameExists;
exports.emailExists = emailExists;
exports.getPlayerLevel = getPlayerLevel;
exports.getPlayerBySteamId = getPlayerBySteamId;
exports.linkSteamToPlayer = linkSteamToPlayer;
exports.unlinkSteamFromPlayer = unlinkSteamFromPlayer;
exports.getPlayerSteamId = getPlayerSteamId;
const sql_js_1 = __importDefault(require("sql.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const PLAYER_DB_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const PLAYER_DB_PATH = path.join(PLAYER_DB_DIR, 'player.db');
// ─── JWT Helpers ────────────────────────────────────────────────────────────────
const PLAYER_JWT_SECRET = process.env.PLAYER_JWT_SECRET ?? '';
if (!PLAYER_JWT_SECRET) {
    throw new Error('FATAL: PLAYER_JWT_SECRET environment variable is not set. Set it to a secure random string in production.');
}
const PLAYER_JWT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
function issuePlayerJwt(playerId) {
    const payload = {
        playerId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (PLAYER_JWT_EXPIRY_MS / 1000),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', PLAYER_JWT_SECRET).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
}
function verifyPlayerJwt(token) {
    try {
        const [encoded, sig] = token.split('.');
        if (!encoded || !sig)
            return null;
        const expected = crypto.createHmac('sha256', PLAYER_JWT_SECRET).update(encoded).digest('base64url');
        if (sig !== expected)
            return null;
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return { playerId: payload.playerId };
    }
    catch {
        return null;
    }
}
// ─── Database bootstrap ───────────────────────────────────────────────────────
let _db = null;
let _ready;
async function ensureDb() {
    if (_db)
        return _db;
    if (!_ready) {
        _ready = (async () => {
            if (!fs.existsSync(PLAYER_DB_DIR))
                fs.mkdirSync(PLAYER_DB_DIR, { recursive: true });
            const SQL = await (0, sql_js_1.default)();
            if (fs.existsSync(PLAYER_DB_PATH)) {
                const buf = fs.readFileSync(PLAYER_DB_PATH);
                _db = new SQL.Database(buf);
            }
            else {
                _db = new SQL.Database();
                _db.run(`
          CREATE TABLE IF NOT EXISTS players (
            id            TEXT PRIMARY KEY,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            steam_id      TEXT,
            steam_linked_at TEXT,
            created_at    TEXT NOT NULL,
            last_login    TEXT
          );

          CREATE TABLE IF NOT EXISTS player_auth_tokens (
            token         TEXT PRIMARY KEY,
            player_id     TEXT NOT NULL,
            expires_at    TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            FOREIGN KEY (player_id) REFERENCES players(id)
          );

          CREATE TABLE IF NOT EXISTS friends (
            player_id     TEXT NOT NULL,
            friend_id     TEXT NOT NULL,
            status        TEXT NOT NULL DEFAULT 'pending',
            since         INTEGER,
            PRIMARY KEY (player_id, friend_id),
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (friend_id) REFERENCES players(id)
          );

          CREATE TABLE IF NOT EXISTS blocks (
            player_id     TEXT NOT NULL,
            blocked_id    TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            PRIMARY KEY (player_id, blocked_id),
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (blocked_id) REFERENCES players(id)
          );

          CREATE INDEX IF NOT EXISTS idx_auth_player ON player_auth_tokens(player_id);
          CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(player_id, status);
          CREATE INDEX IF NOT EXISTS idx_blocks_player ON blocks(player_id);
          CREATE INDEX IF NOT EXISTS idx_players_steam ON players(steam_id);
        `);
                saveToDisk();
            }
        })();
    }
    await _ready;
    return _db;
}
function saveToDisk() {
    if (!_db)
        return;
    const buf = _db.export();
    fs.writeFileSync(PLAYER_DB_PATH, buf);
}
// ─── Player Account CRUD ───────────────────────────────────────────────────────
async function getPlayerByUsername(username) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE username = ?`, [username]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0];
    return { playerId: id, username: uname, email, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}
async function getPlayerById(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE id = ?`, [playerId]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0];
    return { playerId: id, username: uname, email, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}
async function getPlayerByEmail(email) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE email = ?`, [email]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, uname, em, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0];
    return { playerId: id, username: uname, email: em, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}
async function createPlayerAccount(playerId, username, email, passwordHash) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`INSERT INTO players (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`, [playerId, username, email, passwordHash, now]);
    saveToDisk();
    return { playerId, username, email, passwordHash, createdAt: now, lastLogin: '' };
}
async function updateLastLogin(playerId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`UPDATE players SET last_login = ? WHERE id = ?`, [now, playerId]);
    saveToDisk();
}
async function changePlayerPassword(playerId, newPasswordHash) {
    const db = await ensureDb();
    db.run(`UPDATE players SET password_hash = ? WHERE id = ?`, [newPasswordHash, playerId]);
    saveToDisk();
}
// ─── Auth Token CRUD ───────────────────────────────────────────────────────────
async function storePlayerToken(token, playerId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + PLAYER_JWT_EXPIRY_MS).toISOString();
    db.run(`INSERT INTO player_auth_tokens (token, player_id, expires_at, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET expires_at = excluded.expires_at`, [token, playerId, expiresAt, now]);
    saveToDisk();
}
async function deletePlayerToken(token) {
    const db = await ensureDb();
    db.run(`DELETE FROM player_auth_tokens WHERE token = ?`, [token]);
    saveToDisk();
}
async function deleteAllPlayerTokens(playerId) {
    const db = await ensureDb();
    db.run(`DELETE FROM player_auth_tokens WHERE player_id = ?`, [playerId]);
    saveToDisk();
}
// ─── Friend CRUD ────────────────────────────────────────────────────────────────
async function getFriendEntry(playerId, friendId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT player_id, friend_id, status, since FROM friends WHERE player_id = ? AND friend_id = ?`, [playerId, friendId]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [pid, fid, status, since] = rows[0].values[0];
    return { playerId: pid, friendId: fid, status: status, since: since ?? 0 };
}
async function getFriendStatus(playerId, friendId) {
    const entry = await getFriendEntry(playerId, friendId);
    return entry?.status ?? null;
}
async function addFriendRequest(playerId, friendId) {
    const db = await ensureDb();
    const now = Date.now();
    db.run(`INSERT OR IGNORE INTO friends (player_id, friend_id, status, since) VALUES (?, ?, 'pending', ?)`, [playerId, friendId, now]);
    saveToDisk();
}
async function acceptFriendRequest(playerId, friendId) {
    const db = await ensureDb();
    const now = Date.now();
    // Accept in both directions
    db.run(`UPDATE friends SET status = 'accepted', since = ? WHERE player_id = ? AND friend_id = ? AND status = 'pending'`, [now, playerId, friendId]);
    // Also accept if the other person had sent a request to us
    db.run(`UPDATE friends SET status = 'accepted', since = ? WHERE player_id = ? AND friend_id = ? AND status = 'pending'`, [now, friendId, playerId]);
    saveToDisk();
}
async function declineFriendRequest(playerId, friendId) {
    const db = await ensureDb();
    db.run(`DELETE FROM friends WHERE player_id = ? AND friend_id = ? AND status = 'pending'`, [playerId, friendId]);
    saveToDisk();
}
async function removeFriend(playerId, friendId) {
    const db = await ensureDb();
    // Remove both directions
    db.run(`DELETE FROM friends WHERE (player_id = ? AND friend_id = ?) OR (player_id = ? AND friend_id = ?)`, [playerId, friendId, friendId, playerId]);
    saveToDisk();
}
async function getFriends(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = ? AND f.status = 'accepted'`, [playerId]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        playerId: r[0],
        friendId: r[1],
        status: 'accepted',
        since: r[3] ?? 0,
        friendName: r[4] ?? '',
    }));
}
async function getPendingRequests(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.player_id
     WHERE f.friend_id = ? AND f.status = 'pending'`, [playerId]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        playerId: r[0],
        friendId: r[1],
        status: 'pending',
        since: r[3] ?? 0,
        friendName: r[4] ?? '',
    }));
}
async function getSentRequests(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = ? AND f.status = 'pending'`, [playerId]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        playerId: r[0],
        friendId: r[1],
        status: 'pending',
        since: r[3] ?? 0,
        friendName: r[4] ?? '',
    }));
}
// ─── Block CRUD ────────────────────────────────────────────────────────────────
async function blockPlayer(playerId, blockedId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`INSERT OR IGNORE INTO blocks (player_id, blocked_id, created_at) VALUES (?, ?, ?)`, [playerId, blockedId, now]);
    // Also remove any friend relationship
    db.run(`DELETE FROM friends WHERE (player_id = ? AND friend_id = ?) OR (player_id = ? AND friend_id = ?)`, [playerId, blockedId, blockedId, playerId]);
    saveToDisk();
}
async function unblockPlayer(playerId, blockedId) {
    const db = await ensureDb();
    db.run(`DELETE FROM blocks WHERE player_id = ? AND blocked_id = ?`, [playerId, blockedId]);
    saveToDisk();
}
async function isPlayerBlocked(blockerId, blockedId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT 1 FROM blocks WHERE player_id = ? AND blocked_id = ? LIMIT 1`, [blockerId, blockedId]);
    return rows.length > 0 && rows[0].values.length > 0;
}
async function getBlockedPlayers(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT blocked_id FROM blocks WHERE player_id = ?`, [playerId]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => r[0]);
}
// ─── Username lookup ──────────────────────────────────────────────────────────
async function getPlayerIdByUsername(username) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id FROM players WHERE username = ? LIMIT 1`, [username]);
    if (!rows.length || !rows[0].values.length)
        return null;
    return rows[0].values[0][0];
}
async function usernameExists(username) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT 1 FROM players WHERE username = ? LIMIT 1`, [username]);
    return rows.length > 0 && rows[0].values.length > 0;
}
async function emailExists(email) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT 1 FROM players WHERE email = ? LIMIT 1`, [email]);
    return rows.length > 0 && rows[0].values.length > 0;
}
// ─── Get player level from their save (for friend display) ──────────────────
async function getPlayerLevel(playerId) {
    const db = await ensureDb();
    // Look up from game saves - we need to check the saves table
    // This is handled by SaveManager, so we just return a placeholder
    // The friend manager will fetch this from presence/save data
    void playerId;
    return 0;
}
// ─── Steam Linking (Phase 11) ─────────────────────────────────────────────────
async function getPlayerBySteamId(steamId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE steam_id = ?`, [steamId]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0];
    return {
        playerId: id, username: uname, email, passwordHash: hash,
        steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined,
        createdAt, lastLogin: lastLogin ?? ''
    };
}
async function linkSteamToPlayer(playerId, steamId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`UPDATE players SET steam_id = ?, steam_linked_at = ? WHERE id = ?`, [steamId, now, playerId]);
    saveToDisk();
}
async function unlinkSteamFromPlayer(playerId) {
    const db = await ensureDb();
    db.run(`UPDATE players SET steam_id = NULL, steam_linked_at = NULL WHERE id = ?`, [playerId]);
    saveToDisk();
}
async function getPlayerSteamId(playerId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT steam_id FROM players WHERE id = ?`, [playerId]);
    if (!rows.length || !rows[0].values.length)
        return null;
    return rows[0].values[0][0];
}
//# sourceMappingURL=PlayerDbManager.js.map