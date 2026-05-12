import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import type { SaveFile } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

const SAVE_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const DB_PATH = path.join(SAVE_DIR, 'game.db');

let _db: SqlJsDatabase | null = null;
let _ready: Promise<void>;

async function ensureDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (!_ready) {
    _ready = (async () => {
      if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
      const SQL = await initSqlJs();
      if (fs.existsSync(DB_PATH)) {
        const buf = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(buf);
      } else {
        _db = new SQL.Database();
        _db.run(`
          CREATE TABLE IF NOT EXISTS players (
            player_id TEXT PRIMARY KEY,
            name      TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS saves (
            slot      INTEGER NOT NULL,
            player_id TEXT    NOT NULL,
            data      TEXT    NOT NULL,
            saved_at   TEXT    NOT NULL,
            playtime  INTEGER NOT NULL DEFAULT 0,
            level     INTEGER NOT NULL DEFAULT 1,
            area      TEXT    NOT NULL DEFAULT 'ashford_village_square',
            PRIMARY KEY (player_id, slot),
            FOREIGN KEY (player_id) REFERENCES players(player_id)
          );

          CREATE INDEX IF NOT EXISTS idx_saves_player ON saves(player_id);
          CREATE INDEX IF NOT EXISTS idx_saves_level ON saves(level);
          CREATE INDEX IF NOT EXISTS idx_saves_area ON saves(area);
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
  fs.writeFileSync(DB_PATH, buf);
}

export async function listSaves(playerId: string): Promise<{ slot: number; savedAt: string; playtime: number; level: number; area: string }[]> {
  const db = await ensureDb();
  const rows = db.exec(
    'SELECT slot, saved_at, playtime, level, area FROM saves WHERE player_id = ? ORDER BY slot',
    [playerId],
  );
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    slot: r[0],
    savedAt: r[1],
    playtime: r[2],
    level: r[3],
    area: r[4],
  }));
}

export async function loadSave(playerId: string, slot: number): Promise<SaveFile | null> {
  const db = await ensureDb();
  const rows = db.exec('SELECT data FROM saves WHERE player_id = ? AND slot = ?', [playerId, slot]);
  if (!rows.length || !rows[0].values.length) return null;
  try {
    return JSON.parse(rows[0].values[0][0] as string) as SaveFile;
  } catch {
    return null;
  }
}

export async function saveSave(playerId: string, slot: number, save: SaveFile, playtime: number): Promise<void> {
  const db = await ensureDb();
  const data = JSON.stringify(save);
  const now = new Date().toISOString();
  db.run(`
    INSERT INTO saves (player_id, slot, data, saved_at, playtime, level, area)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id, slot) DO UPDATE SET
      data = excluded.data,
      saved_at = excluded.saved_at,
      playtime = excluded.playtime,
      level = excluded.level,
      area = excluded.area
  `, [playerId, slot, data, now, playtime, save.stats.level, save.worldState.currentArea]);
  saveToDisk();
}

export async function deleteSave(playerId: string, slot: number): Promise<void> {
  const db = await ensureDb();
  db.run('DELETE FROM saves WHERE player_id = ? AND slot = ?', [playerId, slot]);
  saveToDisk();
}

export async function registerPlayer(playerId: string, name: string): Promise<void> {
  const db = await ensureDb();
  db.run('INSERT OR IGNORE INTO players (player_id, name) VALUES (?, ?)', [playerId, name]);
  saveToDisk();
}
