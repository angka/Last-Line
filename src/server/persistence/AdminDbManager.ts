/**
 * Phase 9 — Admin Database Manager
 * Manages admin accounts, sessions, audit log, PvP settings, and player bans.
 * Uses a separate SQLite file: saves/admin.db
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  AdminAccount,
  AdminSession,
  AuditLogEntry,
  PvpSetting,
  PlayerBan,
} from '../../types_admin';

const ADMIN_DB_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const ADMIN_DB_PATH = path.join(ADMIN_DB_DIR, 'admin.db');

// ─── JWT Helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET: string = process.env.ADMIN_JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('FATAL: ADMIN_JWT_SECRET environment variable is not set. Set it to a secure random string in production.');
}
const JWT_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

export function issueJwt(adminId: string, sessionId: string): string {
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

export function verifyJwt(token: string): { adminId: string; sessionId: string } | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ─── Database bootstrap ───────────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;
let _ready: Promise<void>;

async function ensureDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (!_ready) {
    _ready = (async () => {
      if (!fs.existsSync(ADMIN_DB_DIR)) fs.mkdirSync(ADMIN_DB_DIR, { recursive: true });
      const SQL = await initSqlJs();
      if (fs.existsSync(ADMIN_DB_PATH)) {
        const buf = fs.readFileSync(ADMIN_DB_PATH);
        _db = new SQL.Database(buf);
      } else {
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
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('changeme', 10);
        const { v4: uuid } = await import('uuid');
        _db!.run(
          `INSERT OR IGNORE INTO admins (id, username, password_hash, role, created_at, is_active) VALUES (?, ?, ?, 'superadmin', ?, 1)`,
          [uuid(), 'admin', hash, new Date().toISOString()],
        );
        _db!.run(
          `INSERT OR IGNORE INTO pvp_settings (scope, enabled) VALUES ('global', 0)`,
        );
        saveToDisk();
      }
    })();
  }
  await _ready;
  return _db!;
}

function saveToDisk(): void {
  if (!_db) return;
  const buf = _db.export();
  fs.writeFileSync(ADMIN_DB_PATH, buf);
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function verifyAdminPassword(username: string, password: string): Promise<AdminAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, password_hash, role, created_at, last_login, is_active
     FROM admins WHERE username = ? AND is_active = 1`,
    [username],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, uname, hash, role, createdAt, lastLogin, isActive] = rows[0].values[0] as any[];
  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.compare(password, hash as string);
  if (!valid) return null;
  return { id, username: uname, passwordHash: hash, role, createdAt, lastLogin, isActive: !!isActive };
}

export async function createAdminSession(
  adminId: string,
  ipAddress: string,
): Promise<AdminSession> {
  const db = await ensureDb();
  const { v4: uuid } = await import('uuid');
  const sessionId = uuid();
  const token = issueJwt(adminId, sessionId);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + JWT_EXPIRY_MS).toISOString();
  db.run(
    `INSERT INTO admin_sessions (session_id, admin_id, token, ip_address, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, adminId, token, ipAddress, now, expiresAt],
  );
  db.run(`UPDATE admins SET last_login = ? WHERE id = ?`, [now, adminId]);
  saveToDisk();
  return { sessionId, adminId, token, ipAddress, createdAt: now, expiresAt };
}

export async function deleteAdminSession(sessionId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`DELETE FROM admin_sessions WHERE session_id = ?`, [sessionId]);
  saveToDisk();
}

export async function getAdminById(adminId: string): Promise<AdminAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, password_hash, role, created_at, last_login, is_active FROM admins WHERE id = ? AND is_active = 1`,
    [adminId],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, username, hash, role, createdAt, lastLogin, isActive] = rows[0].values[0] as any[];
  return { id, username, passwordHash: hash, role, createdAt, lastLogin, isActive: !!isActive };
}

export async function changePassword(adminId: string, newPassword: string): Promise<void> {
  const db = await ensureDb();
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(newPassword, 10);
  db.run(`UPDATE admins SET password_hash = ? WHERE id = ?`, [hash, adminId]);
  saveToDisk();
}

export async function createAdminAccount(
  username: string,
  password: string,
  role: 'admin' | 'superadmin',
  createdByAdminId: string,
): Promise<{ id: string }> {
  const db = await ensureDb();
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(password, 10);
  const { v4: uuid } = await import('uuid');
  const id = uuid();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO admins (id, username, password_hash, role, created_at, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [id, username, hash, role, now],
  );
  saveToDisk();
  void createdByAdminId;
  return { id };
}

export async function deactivateAdmin(adminId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`UPDATE admins SET is_active = 0 WHERE id = ?`, [adminId]);
  saveToDisk();
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function writeAuditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<void> {
  const db = await ensureDb();
  db.run(
    `INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, payload, ip_address, performed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.adminId, entry.adminName, entry.action, entry.targetType, entry.targetId, entry.payload, entry.ipAddress, entry.performedAt],
  );
  saveToDisk();
}

export async function getAuditLog(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, admin_id, admin_name, action, target_type, target_id, payload, ip_address, performed_at
     FROM admin_audit_log ORDER BY id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    id: r[0], adminId: r[1], adminName: r[2], action: r[3],
    targetType: r[4], targetId: r[5], payload: r[6], ipAddress: r[7], performedAt: r[8],
  }));
}

// ─── PvP settings ───────────────────────────────────────────────────────────────

export async function getPvPSettings(scope: string): Promise<PvpSetting> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT scope, enabled, updated_by, updated_at FROM pvp_settings WHERE scope = ?`, [scope]);
  if (!rows.length || !rows[0].values.length) {
    return { scope, enabled: false, updatedBy: null, updatedAt: null };
  }
  const [s, e, ub, ua] = rows[0].values[0] as any[];
  return { scope: s, enabled: !!e, updatedBy: ub, updatedAt: ua };
}

export async function setPvPSetting(scope: string, enabled: boolean, adminId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO pvp_settings (scope, enabled, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(scope) DO UPDATE SET enabled = ?, updated_by = ?, updated_at = ?`,
    [scope, enabled ? 1 : 0, adminId, now, enabled ? 1 : 0, adminId, now],
  );
  saveToDisk();
}

export async function getAllPvPSettings(): Promise<PvpSetting[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT scope, enabled, updated_by, updated_at FROM pvp_settings`);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    scope: r[0], enabled: !!r[1], updatedBy: r[2], updatedAt: r[3],
  }));
}

// ─── Player bans ──────────────────────────────────────────────────────────────

export async function banPlayer(
  playerId: string,
  playerName: string,
  adminId: string,
  adminName: string,
  reason: string | null,
  expiresAt: string | null,
): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO player_bans (player_id, player_name, banned_by, reason, banned_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [playerId, playerName, adminId, reason, now, expiresAt],
  );
  void adminName;
  saveToDisk();
}

export async function unbanPlayer(playerId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`UPDATE player_bans SET is_active = 0 WHERE player_id = ? AND is_active = 1`, [playerId]);
  saveToDisk();
}

export async function isPlayerBanned(playerId: string): Promise<boolean> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const rows = db.exec(
    `SELECT id FROM player_bans WHERE player_id = ? AND is_active = 1
     AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`,
    [playerId, now],
  );
  return !!(rows.length && rows[0].values.length);
}

export async function getActiveBans(): Promise<PlayerBan[]> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const rows = db.exec(
    `SELECT id, player_id, player_name, banned_by, reason, banned_at, expires_at, is_active
     FROM player_bans WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC`,
    [now],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    id: r[0], playerId: r[1], playerName: r[2], bannedBy: r[3], reason: r[4],
    bannedAt: r[5], expiresAt: r[6], isActive: !!r[7],
  }));
}

export async function getAllAdmins(): Promise<Pick<AdminAccount, 'id' | 'username' | 'role' | 'createdAt' | 'lastLogin' | 'isActive'>[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT id, username, role, created_at, last_login, is_active FROM admins ORDER BY created_at`);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    id: r[0], username: r[1], role: r[2], createdAt: r[3], lastLogin: r[4], isActive: !!r[5],
  }));
}
