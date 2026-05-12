/**
 * Phase 10 — Player Database Manager
 * Manages player accounts, auth tokens, friends, and blocks.
 * Uses a separate SQLite file: saves/player.db
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  PlayerAccount,
  PlayerAuthToken,
  FriendEntry,
  BlockEntry,
} from '../../types_player';

const PLAYER_DB_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const PLAYER_DB_PATH = path.join(PLAYER_DB_DIR, 'player.db');

// ─── JWT Helpers ────────────────────────────────────────────────────────────────

const PLAYER_JWT_SECRET: string = process.env.PLAYER_JWT_SECRET ?? '';
if (!PLAYER_JWT_SECRET) {
  throw new Error('FATAL: PLAYER_JWT_SECRET environment variable is not set. Set it to a secure random string in production.');
}
const PLAYER_JWT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function issuePlayerJwt(playerId: string): string {
  const payload = {
    playerId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (PLAYER_JWT_EXPIRY_MS / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', PLAYER_JWT_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyPlayerJwt(token: string): { playerId: string } | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', PLAYER_JWT_SECRET).update(encoded).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { playerId: payload.playerId };
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
      if (!fs.existsSync(PLAYER_DB_DIR)) fs.mkdirSync(PLAYER_DB_DIR, { recursive: true });
      const SQL = await initSqlJs();
      if (fs.existsSync(PLAYER_DB_PATH)) {
        const buf = fs.readFileSync(PLAYER_DB_PATH);
        _db = new SQL.Database(buf);
      } else {
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
        `);
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
  fs.writeFileSync(PLAYER_DB_PATH, buf);
}

// ─── Player Account CRUD ───────────────────────────────────────────────────────

export async function getPlayerByUsername(username: string): Promise<PlayerAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE username = ?`,
    [username],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0] as any[];
  return { playerId: id, username: uname, email, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}

export async function getPlayerById(playerId: string): Promise<PlayerAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE id = ?`,
    [playerId],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0] as any[];
  return { playerId: id, username: uname, email, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}

export async function getPlayerByEmail(email: string): Promise<PlayerAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE email = ?`,
    [email],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, uname, em, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0] as any[];
  return { playerId: id, username: uname, email: em, passwordHash: hash, steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, createdAt, lastLogin: lastLogin ?? '' };
}

export async function createPlayerAccount(
  playerId: string,
  username: string,
  email: string,
  passwordHash: string,
): Promise<PlayerAccount> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO players (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
    [playerId, username, email, passwordHash, now],
  );
  saveToDisk();
  return { playerId, username, email, passwordHash, createdAt: now, lastLogin: '' };
}

export async function updateLastLogin(playerId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(`UPDATE players SET last_login = ? WHERE id = ?`, [now, playerId]);
  saveToDisk();
}

export async function changePlayerPassword(playerId: string, newPasswordHash: string): Promise<void> {
  const db = await ensureDb();
  db.run(`UPDATE players SET password_hash = ? WHERE id = ?`, [newPasswordHash, playerId]);
  saveToDisk();
}

// ─── Auth Token CRUD ───────────────────────────────────────────────────────────

export async function storePlayerToken(token: string, playerId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PLAYER_JWT_EXPIRY_MS).toISOString();
  db.run(
    `INSERT INTO player_auth_tokens (token, player_id, expires_at, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET expires_at = excluded.expires_at`,
    [token, playerId, expiresAt, now],
  );
  saveToDisk();
}

export async function deletePlayerToken(token: string): Promise<void> {
  const db = await ensureDb();
  db.run(`DELETE FROM player_auth_tokens WHERE token = ?`, [token]);
  saveToDisk();
}

export async function deleteAllPlayerTokens(playerId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`DELETE FROM player_auth_tokens WHERE player_id = ?`, [playerId]);
  saveToDisk();
}

// ─── Friend CRUD ────────────────────────────────────────────────────────────────

export async function getFriendEntry(playerId: string, friendId: string): Promise<FriendEntry | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT player_id, friend_id, status, since FROM friends WHERE player_id = ? AND friend_id = ?`,
    [playerId, friendId],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [pid, fid, status, since] = rows[0].values[0] as any[];
  return { playerId: pid, friendId: fid, status: status as any, since: since ?? 0 };
}

export async function getFriendStatus(playerId: string, friendId: string): Promise<string | null> {
  const entry = await getFriendEntry(playerId, friendId);
  return entry?.status ?? null;
}

export async function addFriendRequest(playerId: string, friendId: string): Promise<void> {
  const db = await ensureDb();
  const now = Date.now();
  db.run(
    `INSERT OR IGNORE INTO friends (player_id, friend_id, status, since) VALUES (?, ?, 'pending', ?)`,
    [playerId, friendId, now],
  );
  saveToDisk();
}

export async function acceptFriendRequest(playerId: string, friendId: string): Promise<void> {
  const db = await ensureDb();
  const now = Date.now();
  // Accept in both directions
  db.run(
    `UPDATE friends SET status = 'accepted', since = ? WHERE player_id = ? AND friend_id = ? AND status = 'pending'`,
    [now, playerId, friendId],
  );
  // Also accept if the other person had sent a request to us
  db.run(
    `UPDATE friends SET status = 'accepted', since = ? WHERE player_id = ? AND friend_id = ? AND status = 'pending'`,
    [now, friendId, playerId],
  );
  saveToDisk();
}

export async function declineFriendRequest(playerId: string, friendId: string): Promise<void> {
  const db = await ensureDb();
  db.run(
    `DELETE FROM friends WHERE player_id = ? AND friend_id = ? AND status = 'pending'`,
    [playerId, friendId],
  );
  saveToDisk();
}

export async function removeFriend(playerId: string, friendId: string): Promise<void> {
  const db = await ensureDb();
  // Remove both directions
  db.run(`DELETE FROM friends WHERE (player_id = ? AND friend_id = ?) OR (player_id = ? AND friend_id = ?)`,
    [playerId, friendId, friendId, playerId]);
  saveToDisk();
}

export async function getFriends(playerId: string): Promise<FriendEntry[]> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = ? AND f.status = 'accepted'`,
    [playerId],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    playerId: r[0],
    friendId: r[1],
    status: 'accepted' as const,
    since: r[3] ?? 0,
    friendName: r[4] ?? '',
  }));
}

export async function getPendingRequests(playerId: string): Promise<FriendEntry[]> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.player_id
     WHERE f.friend_id = ? AND f.status = 'pending'`,
    [playerId],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    playerId: r[0],
    friendId: r[1],
    status: 'pending' as const,
    since: r[3] ?? 0,
    friendName: r[4] ?? '',
  }));
}

export async function getSentRequests(playerId: string): Promise<FriendEntry[]> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT f.player_id, f.friend_id, f.status, f.since, p.username, p.id
     FROM friends f
     LEFT JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = ? AND f.status = 'pending'`,
    [playerId],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    playerId: r[0],
    friendId: r[1],
    status: 'pending' as const,
    since: r[3] ?? 0,
    friendName: r[4] ?? '',
  }));
}

// ─── Block CRUD ────────────────────────────────────────────────────────────────

export async function blockPlayer(playerId: string, blockedId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO blocks (player_id, blocked_id, created_at) VALUES (?, ?, ?)`,
    [playerId, blockedId, now],
  );
  // Also remove any friend relationship
  db.run(`DELETE FROM friends WHERE (player_id = ? AND friend_id = ?) OR (player_id = ? AND friend_id = ?)`,
    [playerId, blockedId, blockedId, playerId]);
  saveToDisk();
}

export async function unblockPlayer(playerId: string, blockedId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`DELETE FROM blocks WHERE player_id = ? AND blocked_id = ?`, [playerId, blockedId]);
  saveToDisk();
}

export async function isPlayerBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT 1 FROM blocks WHERE player_id = ? AND blocked_id = ? LIMIT 1`,
    [blockerId, blockedId],
  );
  return rows.length > 0 && rows[0].values.length > 0;
}

export async function getBlockedPlayers(playerId: string): Promise<string[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT blocked_id FROM blocks WHERE player_id = ?`, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => r[0] as string);
}

// ─── Username lookup ──────────────────────────────────────────────────────────

export async function getPlayerIdByUsername(username: string): Promise<string | null> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT id FROM players WHERE username = ? LIMIT 1`, [username]);
  if (!rows.length || !rows[0].values.length) return null;
  return rows[0].values[0][0] as string;
}

export async function usernameExists(username: string): Promise<boolean> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT 1 FROM players WHERE username = ? LIMIT 1`, [username]);
  return rows.length > 0 && rows[0].values.length > 0;
}

export async function emailExists(email: string): Promise<boolean> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT 1 FROM players WHERE email = ? LIMIT 1`, [email]);
  return rows.length > 0 && rows[0].values.length > 0;
}

// ─── Get player level from their save (for friend display) ──────────────────

export async function getPlayerLevel(playerId: string): Promise<number> {
  const db = await ensureDb();
  // Look up from game saves - we need to check the saves table
  // This is handled by SaveManager, so we just return a placeholder
  // The friend manager will fetch this from presence/save data
  void playerId;
  return 0;
}

// ─── Steam Linking (Phase 11) ─────────────────────────────────────────────────

export async function getPlayerBySteamId(steamId: string): Promise<PlayerAccount | null> {
  const db = await ensureDb();
  const rows = db.exec(
    `SELECT id, username, email, password_hash, steam_id, steam_linked_at, created_at, last_login
     FROM players WHERE steam_id = ?`,
    [steamId],
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [id, uname, email, hash, sid, slAt, createdAt, lastLogin] = rows[0].values[0] as any[];
  return {
    playerId: id, username: uname, email, passwordHash: hash,
    steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined,
    createdAt, lastLogin: lastLogin ?? ''
  };
}

export async function linkSteamToPlayer(playerId: string, steamId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(`UPDATE players SET steam_id = ?, steam_linked_at = ? WHERE id = ?`, [steamId, now, playerId]);
  saveToDisk();
}

export async function unlinkSteamFromPlayer(playerId: string): Promise<void> {
  const db = await ensureDb();
  db.run(`UPDATE players SET steam_id = NULL, steam_linked_at = NULL WHERE id = ?`, [playerId]);
  saveToDisk();
}

export async function getPlayerSteamId(playerId: string): Promise<string | null> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT steam_id FROM players WHERE id = ?`, [playerId]);
  if (!rows.length || !rows[0].values.length) return null;
  return rows[0].values[0][0] as string | null;
}