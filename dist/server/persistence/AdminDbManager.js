"use strict";
/**
 * Phase 9 — Admin Database Manager
 * Manages admin accounts, sessions, audit log, PvP settings, and player bans.
 * Uses a separate SQLite file: saves/admin.db
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
exports.issueJwt = issueJwt;
exports.verifyJwt = verifyJwt;
exports.verifyAdminPassword = verifyAdminPassword;
exports.createAdminSession = createAdminSession;
exports.deleteAdminSession = deleteAdminSession;
exports.getAdminById = getAdminById;
exports.changePassword = changePassword;
exports.createAdminAccount = createAdminAccount;
exports.deactivateAdmin = deactivateAdmin;
exports.writeAuditLog = writeAuditLog;
exports.getAuditLog = getAuditLog;
exports.getPvPSettings = getPvPSettings;
exports.setPvPSetting = setPvPSetting;
exports.getAllPvPSettings = getAllPvPSettings;
exports.banPlayer = banPlayer;
exports.unbanPlayer = unbanPlayer;
exports.isPlayerBanned = isPlayerBanned;
exports.getActiveBans = getActiveBans;
exports.getAllAdmins = getAllAdmins;
const sql_js_1 = __importDefault(require("sql.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const ADMIN_DB_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const ADMIN_DB_PATH = path.join(ADMIN_DB_DIR, 'admin.db');
// ─── JWT Helpers ───────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? '';
if (!JWT_SECRET) {
    throw new Error('FATAL: ADMIN_JWT_SECRET environment variable is not set. Set it to a secure random string in production.');
}
const JWT_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours
function issueJwt(adminId, sessionId) {
    const payload = {
        adminId,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (JWT_EXPIRY_MS / 1000),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
}
function verifyJwt(token) {
    try {
        const [encoded, sig] = token.split('.');
        if (!encoded || !sig)
            return null;
        const expected = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
        if (sig !== expected)
            return null;
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
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
            if (!fs.existsSync(ADMIN_DB_DIR))
                fs.mkdirSync(ADMIN_DB_DIR, { recursive: true });
            const SQL = await (0, sql_js_1.default)();
            if (fs.existsSync(ADMIN_DB_PATH)) {
                const buf = fs.readFileSync(ADMIN_DB_PATH);
                _db = new SQL.Database(buf);
            }
            else {
                _db = new SQL.Database();
                _db.run(`
          CREATE TABLE IF NOT EXISTS admins (
            id            TEXT PRIMARY KEY,
            username      TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'admin',
            created_at    TEXT NOT NULL,
            last_login    TEXT,
            is_active     INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS admin_sessions (
            session_id    TEXT PRIMARY KEY,
            admin_id      TEXT NOT NULL,
            token         TEXT UNIQUE NOT NULL,
            ip_address    TEXT,
            created_at    TEXT NOT NULL,
            expires_at    TEXT NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES admins(id)
          );

          CREATE TABLE IF NOT EXISTS admin_audit_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id      TEXT NOT NULL,
            admin_name    TEXT NOT NULL,
            action        TEXT NOT NULL,
            target_type   TEXT,
            target_id     TEXT,
            payload       TEXT,
            ip_address    TEXT,
            performed_at  TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS pvp_settings (
            scope         TEXT PRIMARY KEY,
            enabled       INTEGER DEFAULT 0,
            updated_by    TEXT,
            updated_at    TEXT
          );

          CREATE TABLE IF NOT EXISTS player_bans (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id     TEXT NOT NULL,
            player_name   TEXT,
            banned_by     TEXT NOT NULL,
            reason        TEXT,
            banned_at     TEXT NOT NULL,
            expires_at    TEXT,
            is_active     INTEGER DEFAULT 1
          );

          CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
          CREATE INDEX IF NOT EXISTS idx_audit_performed ON admin_audit_log(performed_at);
          CREATE INDEX IF NOT EXISTS idx_bans_player ON player_bans(player_id);
          CREATE INDEX IF NOT EXISTS idx_bans_active ON player_bans(is_active, expires_at);
          CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_id);
        `);
                // Seed default admin: admin / changeme
                const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
                const hash = await bcrypt.hash('changeme', 10);
                const { v4: uuid } = await Promise.resolve().then(() => __importStar(require('uuid')));
                _db.run(`INSERT OR IGNORE INTO admins (id, username, password_hash, role, created_at, is_active) VALUES (?, ?, ?, 'superadmin', ?, 1)`, [uuid(), 'admin', hash, new Date().toISOString()]);
                _db.run(`INSERT OR IGNORE INTO pvp_settings (scope, enabled) VALUES ('global', 0)`);
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
    fs.writeFileSync(ADMIN_DB_PATH, buf);
}
// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function verifyAdminPassword(username, password) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, password_hash, role, created_at, last_login, is_active
     FROM admins WHERE username = ? AND is_active = 1`, [username]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, uname, hash, role, createdAt, lastLogin, isActive] = rows[0].values[0];
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    const valid = await bcrypt.compare(password, hash);
    if (!valid)
        return null;
    return { id, username: uname, passwordHash: hash, role, createdAt, lastLogin, isActive: !!isActive };
}
async function createAdminSession(adminId, ipAddress) {
    const db = await ensureDb();
    const { v4: uuid } = await Promise.resolve().then(() => __importStar(require('uuid')));
    const sessionId = uuid();
    const token = issueJwt(adminId, sessionId);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + JWT_EXPIRY_MS).toISOString();
    db.run(`INSERT INTO admin_sessions (session_id, admin_id, token, ip_address, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`, [sessionId, adminId, token, ipAddress, now, expiresAt]);
    db.run(`UPDATE admins SET last_login = ? WHERE id = ?`, [now, adminId]);
    saveToDisk();
    return { sessionId, adminId, token, ipAddress, createdAt: now, expiresAt };
}
async function deleteAdminSession(sessionId) {
    const db = await ensureDb();
    db.run(`DELETE FROM admin_sessions WHERE session_id = ?`, [sessionId]);
    saveToDisk();
}
async function getAdminById(adminId) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, password_hash, role, created_at, last_login, is_active FROM admins WHERE id = ? AND is_active = 1`, [adminId]);
    if (!rows.length || !rows[0].values.length)
        return null;
    const [id, username, hash, role, createdAt, lastLogin, isActive] = rows[0].values[0];
    return { id, username, passwordHash: hash, role, createdAt, lastLogin, isActive: !!isActive };
}
async function changePassword(adminId, newPassword) {
    const db = await ensureDb();
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    const hash = await bcrypt.hash(newPassword, 10);
    db.run(`UPDATE admins SET password_hash = ? WHERE id = ?`, [hash, adminId]);
    saveToDisk();
}
async function createAdminAccount(username, password, role, createdByAdminId) {
    const db = await ensureDb();
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    const hash = await bcrypt.hash(password, 10);
    const { v4: uuid } = await Promise.resolve().then(() => __importStar(require('uuid')));
    const id = uuid();
    const now = new Date().toISOString();
    db.run(`INSERT INTO admins (id, username, password_hash, role, created_at, is_active) VALUES (?, ?, ?, ?, ?, 1)`, [id, username, hash, role, now]);
    saveToDisk();
    void createdByAdminId;
    return { id };
}
async function deactivateAdmin(adminId) {
    const db = await ensureDb();
    db.run(`UPDATE admins SET is_active = 0 WHERE id = ?`, [adminId]);
    saveToDisk();
}
// ─── Audit log ────────────────────────────────────────────────────────────────
async function writeAuditLog(entry) {
    const db = await ensureDb();
    db.run(`INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, payload, ip_address, performed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [entry.adminId, entry.adminName, entry.action, entry.targetType, entry.targetId, entry.payload, entry.ipAddress, entry.performedAt]);
    saveToDisk();
}
async function getAuditLog(limit = 100, offset = 0) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, admin_id, admin_name, action, target_type, target_id, payload, ip_address, performed_at
     FROM admin_audit_log ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        id: r[0], adminId: r[1], adminName: r[2], action: r[3],
        targetType: r[4], targetId: r[5], payload: r[6], ipAddress: r[7], performedAt: r[8],
    }));
}
// ─── PvP settings ───────────────────────────────────────────────────────────────
async function getPvPSettings(scope) {
    const db = await ensureDb();
    const rows = db.exec(`SELECT scope, enabled, updated_by, updated_at FROM pvp_settings WHERE scope = ?`, [scope]);
    if (!rows.length || !rows[0].values.length) {
        return { scope, enabled: false, updatedBy: null, updatedAt: null };
    }
    const [s, e, ub, ua] = rows[0].values[0];
    return { scope: s, enabled: !!e, updatedBy: ub, updatedAt: ua };
}
async function setPvPSetting(scope, enabled, adminId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`INSERT INTO pvp_settings (scope, enabled, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(scope) DO UPDATE SET enabled = ?, updated_by = ?, updated_at = ?`, [scope, enabled ? 1 : 0, adminId, now, enabled ? 1 : 0, adminId, now]);
    saveToDisk();
}
async function getAllPvPSettings() {
    const db = await ensureDb();
    const rows = db.exec(`SELECT scope, enabled, updated_by, updated_at FROM pvp_settings`);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        scope: r[0], enabled: !!r[1], updatedBy: r[2], updatedAt: r[3],
    }));
}
// ─── Player bans ──────────────────────────────────────────────────────────────
async function banPlayer(playerId, playerName, adminId, adminName, reason, expiresAt) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    db.run(`INSERT INTO player_bans (player_id, player_name, banned_by, reason, banned_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`, [playerId, playerName, adminId, reason, now, expiresAt]);
    void adminName;
    saveToDisk();
}
async function unbanPlayer(playerId) {
    const db = await ensureDb();
    db.run(`UPDATE player_bans SET is_active = 0 WHERE player_id = ? AND is_active = 1`, [playerId]);
    saveToDisk();
}
async function isPlayerBanned(playerId) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const rows = db.exec(`SELECT id FROM player_bans WHERE player_id = ? AND is_active = 1
     AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`, [playerId, now]);
    return !!(rows.length && rows[0].values.length);
}
async function getActiveBans() {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const rows = db.exec(`SELECT id, player_id, player_name, banned_by, reason, banned_at, expires_at, is_active
     FROM player_bans WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC`, [now]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        id: r[0], playerId: r[1], playerName: r[2], bannedBy: r[3], reason: r[4],
        bannedAt: r[5], expiresAt: r[6], isActive: !!r[7],
    }));
}
async function getAllAdmins() {
    const db = await ensureDb();
    const rows = db.exec(`SELECT id, username, role, created_at, last_login, is_active FROM admins ORDER BY created_at`);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        id: r[0], username: r[1], role: r[2], createdAt: r[3], lastLogin: r[4], isActive: !!r[5],
    }));
}
//# sourceMappingURL=AdminDbManager.js.map