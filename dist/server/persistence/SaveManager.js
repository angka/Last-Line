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
exports.listSaves = listSaves;
exports.loadSave = loadSave;
exports.saveSave = saveSave;
exports.deleteSave = deleteSave;
exports.registerPlayer = registerPlayer;
const sql_js_1 = __importDefault(require("sql.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SAVE_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const DB_PATH = path.join(SAVE_DIR, 'game.db');
let _db = null;
let _ready;
async function ensureDb() {
    if (_db)
        return _db;
    if (!_ready) {
        _ready = (async () => {
            if (!fs.existsSync(SAVE_DIR))
                fs.mkdirSync(SAVE_DIR, { recursive: true });
            const SQL = await (0, sql_js_1.default)();
            if (fs.existsSync(DB_PATH)) {
                const buf = fs.readFileSync(DB_PATH);
                _db = new SQL.Database(buf);
            }
            else {
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
    return _db;
}
function saveToDisk() {
    if (!_db)
        return;
    const buf = _db.export();
    fs.writeFileSync(DB_PATH, buf);
}
async function listSaves(playerId) {
    const db = await ensureDb();
    const rows = db.exec('SELECT slot, saved_at, playtime, level, area FROM saves WHERE player_id = ? ORDER BY slot', [playerId]);
    if (!rows.length)
        return [];
    return rows[0].values.map((r) => ({
        slot: r[0],
        savedAt: r[1],
        playtime: r[2],
        level: r[3],
        area: r[4],
    }));
}
async function loadSave(playerId, slot) {
    const db = await ensureDb();
    const rows = db.exec('SELECT data FROM saves WHERE player_id = ? AND slot = ?', [playerId, slot]);
    if (!rows.length || !rows[0].values.length)
        return null;
    try {
        return JSON.parse(rows[0].values[0][0]);
    }
    catch {
        return null;
    }
}
async function saveSave(playerId, slot, save, playtime) {
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
async function deleteSave(playerId, slot) {
    const db = await ensureDb();
    db.run('DELETE FROM saves WHERE player_id = ? AND slot = ?', [playerId, slot]);
    saveToDisk();
}
async function registerPlayer(playerId, name) {
    const db = await ensureDb();
    db.run('INSERT OR IGNORE INTO players (player_id, name) VALUES (?, ?)', [playerId, name]);
    saveToDisk();
}
//# sourceMappingURL=SaveManager.js.map