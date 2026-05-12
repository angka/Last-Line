/**
 * Phase 11 — Cosmetic Database Manager
 * Manages cosmetics catalog, player owned items, DLC entitlements, rewards.
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import type {
  CosmeticItem,
  PlayerCosmetic,
  CosmeticReward,
} from '../../types_cosmetics';

const COSMETIC_DB_DIR = path.join(__dirname, '..', '..', '..', 'saves');
const COSMETIC_DB_PATH = path.join(COSMETIC_DB_DIR, 'cosmetics.db');

// ─── Database bootstrap ───────────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;
let _ready: Promise<void>;

async function ensureDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (!_ready) {
    _ready = (async () => {
      if (!fs.existsSync(COSMETIC_DB_DIR)) fs.mkdirSync(COSMETIC_DB_DIR, { recursive: true });
      const SQL = await initSqlJs();
      if (fs.existsSync(COSMETIC_DB_PATH)) {
        const buf = fs.readFileSync(COSMETIC_DB_PATH);
        _db = new SQL.Database(buf);
      } else {
        _db = new SQL.Database();
        _db.run(`
          CREATE TABLE IF NOT EXISTS cosmetics (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            rarity TEXT NOT NULL,
            description TEXT,
            price_usd REAL,
            steam_product_id TEXT,
            effect_data TEXT,
            equip_slot TEXT,
            is_dlc INTEGER DEFAULT 0,
            dlc_required TEXT,
            requires_level INTEGER,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS player_cosmetics (
            player_id TEXT NOT NULL,
            cosmetic_id TEXT NOT NULL,
            equipped INTEGER DEFAULT 0,
            acquired_at TEXT NOT NULL,
            source TEXT,
            PRIMARY KEY (player_id, cosmetic_id)
          );

          CREATE TABLE IF NOT EXISTS player_entitlements (
            player_id TEXT NOT NULL,
            dlc_id TEXT NOT NULL,
            purchased_at TEXT NOT NULL,
            source TEXT,
            PRIMARY KEY (player_id, dlc_id)
          );

          CREATE TABLE IF NOT EXISTS inventory_slots (
            player_id TEXT PRIMARY KEY,
            base_slots INTEGER DEFAULT 50,
            purchased_slots INTEGER DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS cosmetic_rewards (
            reward_id TEXT PRIMARY KEY,
            cosmetic_id TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            trigger_value TEXT,
            title TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS player_reward_claims (
            player_id TEXT NOT NULL,
            reward_id TEXT NOT NULL,
            claimed_at TEXT NOT NULL,
            PRIMARY KEY (player_id, reward_id)
          );
        `);
        seedDefaultCosmetics(_db);
        seedDefaultRewards(_db);
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
  fs.writeFileSync(COSMETIC_DB_PATH, buf);
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

function seedDefaultCosmetics(db: SqlJsDatabase): void {
  const now = new Date().toISOString();
  const cosmetics = [
    // Skins
    { id: 'skin_flame_sword', name: 'Flame Sword', category: 'skin', subcategory: 'weapon', rarity: 'epic', description: 'A sword wreathed in flames.', priceUsd: 4.99, equipSlot: 'weapon' },
    { id: 'skin_iron_shield', name: 'Iron Shield', category: 'skin', subcategory: 'armor', rarity: 'rare', description: 'Sturdy iron shield.', priceUsd: 2.99, equipSlot: 'armor' },
    { id: 'skin_royal_crown', name: 'Royal Crown', category: 'skin', subcategory: 'accessory', rarity: 'legendary', description: 'A crown fit for royalty.', priceUsd: 9.99, equipSlot: 'accessory' },
    // Chat Effects
    { id: 'chat_gold_name', name: 'Golden Name', category: 'chat', subcategory: 'name_color', rarity: 'rare', description: 'Your name appears in gold.', priceUsd: 1.99, effectData: { color: '#FFD700' } },
    { id: 'chat_emerald_bubble', name: 'Emerald Chat Bubble', category: 'chat', subcategory: 'bubble', rarity: 'uncommon', description: 'Emerald-colored chat bubbles.', priceUsd: 0.99, effectData: { bubbleStyle: 'emerald' } },
    { id: 'chat_sparkle_particle', name: 'Premium Sparkle', category: 'chat', subcategory: 'particle', rarity: 'epic', description: 'Sparkles follow your messages.', priceUsd: 2.99, effectData: { particle: 'sparkle' } },
    // Titles
    { id: 'title_champion', name: 'Champion', category: 'title', subcategory: 'prefix', rarity: 'rare', description: 'A title earned through glory.', priceUsd: 1.99, effectData: { prefix: 'Champion' } },
    { id: 'title_veteran', name: 'Veteran', category: 'title', subcategory: 'suffix', rarity: 'epic', description: 'A respected veteran.', priceUsd: 2.99, effectData: { suffix: 'the Veteran' } },
    { id: 'title_new_adventurer', name: 'New Adventurer', category: 'title', subcategory: 'prefix', rarity: 'common', description: 'A fresh adventurer.', priceUsd: null },
    // Effects
    { id: 'effect_golden_glow', name: 'Golden Glow', category: 'effect', subcategory: 'aura', rarity: 'epic', description: 'A golden aura surrounds you.', priceUsd: 3.99, effectData: { color: '#FFD700', particle: 'glow' } },
    { id: 'effect_shadow_trail', name: 'Shadow Trail', category: 'effect', subcategory: 'trail', rarity: 'rare', description: 'Leave shadows in your wake.', priceUsd: 2.49, effectData: { particle: 'shadow' } },
    // Housing
    { id: 'housing_torch', name: 'Cozy Torch', category: 'housing', subcategory: 'decoration', rarity: 'common', description: 'A warm torch for your home.', priceUsd: null },
    { id: 'housing_crystal_vase', name: 'Crystal Vase', category: 'housing', subcategory: 'decoration', rarity: 'uncommon', description: 'A decorative crystal vase.', priceUsd: 1.49 },
    // DLC
    { id: 'dlc_forest_pack', name: 'Deep Forest Expansion', category: 'skin', isDlc: true, rarity: 'legendary', description: 'Unlocks the Deep Forest area and content.', priceUsd: 9.99, dlcRequired: 'dlc_forest' },
    { id: 'dlc_cave_pack', name: 'Cave System Expansion', category: 'skin', isDlc: true, rarity: 'legendary', description: 'Unlocks the Cave system.', priceUsd: 9.99, dlcRequired: 'dlc_cave' },
    // Inventory Expansion
    { id: 'inv_100', name: 'Inventory +50', category: 'skin', subcategory: 'inventory', rarity: 'common', description: 'Adds 50 inventory slots.', priceUsd: 2.99 },
    { id: 'inv_200', name: 'Inventory +150', category: 'skin', subcategory: 'inventory', rarity: 'uncommon', description: 'Adds 150 inventory slots.', priceUsd: 4.99 },
  ];

  for (const c of cosmetics) {
    db.exec(`INSERT OR REPLACE INTO cosmetics (id, name, category, subcategory, rarity, description, price_usd, steam_product_id, effect_data, equip_slot, is_dlc, dlc_required, requires_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.category, c.subcategory ?? null, c.rarity, c.description,
       c.priceUsd ?? null, null, c.effectData ? JSON.stringify(c.effectData) : null,
       c.equipSlot ?? null, c.isDlc ? 1 : 0, c.dlcRequired ?? null, null, now]);
  }
}

function seedDefaultRewards(db: SqlJsDatabase): void {
  const now = new Date().toISOString();
  const rewards = [
    { rewardId: 'reward_login_1', cosmeticId: 'title_new_adventurer', triggerType: 'login', triggerValue: null, title: 'Welcome Gift', description: 'Claim your starter title!' },
    { rewardId: 'reward_level_10', cosmeticId: 'chat_gold_name', triggerType: 'level', triggerValue: JSON.stringify({ level: 10 }), title: 'Level 10 Reward', description: 'Golden name effect!' },
    { rewardId: 'reward_level_25', cosmeticId: 'skin_iron_shield', triggerType: 'level', triggerValue: JSON.stringify({ level: 25 }), title: 'Level 25 Reward', description: 'Iron Shield skin!' },
    { rewardId: 'reward_level_50', cosmeticId: 'title_veteran', triggerType: 'level', triggerValue: JSON.stringify({ level: 50 }), title: 'Level 50 Reward', description: 'Veteran title!' },
    { rewardId: 'reward_dungeon_1', cosmeticId: 'skin_flame_sword', triggerType: 'action', triggerValue: JSON.stringify({ action: 'dungeon_clear' }), title: 'First Dungeon', description: 'Clear your first dungeon!' },
    { rewardId: 'reward_pvp_1', cosmeticId: 'chat_emerald_bubble', triggerType: 'action', triggerValue: JSON.stringify({ action: 'pvp_kill' }), title: 'First Blood', description: 'Win your first PvP!' },
    { rewardId: 'reward_friends_10', cosmeticId: 'title_champion', triggerType: 'action', triggerValue: JSON.stringify({ action: 'friends_10' }), title: 'Social Butterfly', description: 'Have 10 friends!' },
  ];

  for (const r of rewards) {
    db.exec(`INSERT OR REPLACE INTO cosmetic_rewards (reward_id, cosmetic_id, trigger_type, trigger_value, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.rewardId, r.cosmeticId, r.triggerType, r.triggerValue, r.title, r.description, now]);
  }
}

// ─── Cosmetic CRUD ──────────────────────────────────────────────────────────────

export async function getAllCosmetics(): Promise<CosmeticItem[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT * FROM cosmetics ORDER BY category, price_usd`);
  if (!rows.length) return [];
  return rows[0].values.map(mapRowToCosmetic);
}

export async function getCosmeticById(id: string): Promise<CosmeticItem | null> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT * FROM cosmetics WHERE id = ?`, [id]);
  if (!rows.length || !rows[0].values.length) return null;
  return mapRowToCosmetic(rows[0].values[0]);
}

export async function getCosmeticsByCategory(category: string): Promise<CosmeticItem[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT * FROM cosmetics WHERE category = ?`, [category]);
  if (!rows.length) return [];
  return rows[0].values.map(mapRowToCosmetic);
}

function mapRowToCosmetic(row: any[]): CosmeticItem {
  return {
    id: row[0], name: row[1], category: row[2], subcategory: row[3],
    rarity: row[4], description: row[5], priceUsd: row[6], steamProductId: row[7],
    effectData: row[8] ? JSON.parse(row[8]) : undefined, equipSlot: row[9],
    isDlc: !!row[10], dlcRequired: row[11], requiresLevel: row[12], createdAt: row[13],
  };
}

// ─── Player Cosmetics ──────────────────────────────────────────────────────────

export async function getPlayerCosmetics(playerId: string): Promise<PlayerCosmetic[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT * FROM player_cosmetics WHERE player_id = ?`, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    playerId: r[0], cosmeticId: r[1], equipped: !!r[2], acquiredAt: r[3], source: r[4] as any,
  }));
}

export async function getPlayerOwnedCosmeticIds(playerId: string): Promise<string[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT cosmetic_id FROM player_cosmetics WHERE player_id = ?`, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => r[0] as string);
}

export async function addCosmeticToPlayer(playerId: string, cosmeticId: string, source: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(`INSERT OR IGNORE INTO player_cosmetics (player_id, cosmetic_id, equipped, acquired_at, source) VALUES (?, ?, 0, ?, ?)`,
    [playerId, cosmeticId, now, source]);
  saveToDisk();
}

export async function setCosmeticEquipped(playerId: string, cosmeticId: string, equipped: boolean): Promise<void> {
  const db = await ensureDb();
  db.run(`UPDATE player_cosmetics SET equipped = ? WHERE player_id = ? AND cosmetic_id = ?`,
    [equipped ? 1 : 0, playerId, cosmeticId]);
  saveToDisk();
}

export async function getPlayerEquippedCosmetics(playerId: string): Promise<Record<string, string>> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT c.cosmetic_id, c.category FROM player_cosmetics pc JOIN cosmetics c ON c.id = pc.cosmetic_id WHERE pc.player_id = ? AND pc.equipped = 1`, [playerId]);
  if (!rows.length) return {};
  const result: Record<string, string> = {};
  for (const r of rows[0].values) {
    const cid = r[0] as string;
    const cat = r[1] as string;
    result[cat] = cid;
  }
  return result;
}

// ─── DLC Entitlements ────────────────────────────────────────────────────────────

export async function grantDlcEntitlement(playerId: string, dlcId: string, source: string = 'steam'): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(`INSERT OR IGNORE INTO player_entitlements (player_id, dlc_id, purchased_at, source) VALUES (?, ?, ?, ?)`,
    [playerId, dlcId, now, source]);
  saveToDisk();
}

export async function getPlayerEntitlements(playerId: string): Promise<string[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT dlc_id FROM player_entitlements WHERE player_id = ?`, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => r[0] as string);
}

export async function hasDlcEntitlement(playerId: string, dlcId: string): Promise<boolean> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT 1 FROM player_entitlements WHERE player_id = ? AND dlc_id = ? LIMIT 1`, [playerId, dlcId]);
  return rows.length > 0 && rows[0].values.length > 0;
}

// ─── Inventory Slots ────────────────────────────────────────────────────────────

export async function getInventorySlots(playerId: string): Promise<number> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT COALESCE(base_slots + purchased_slots, 50) FROM inventory_slots WHERE player_id = ?`, [playerId]);
  if (!rows.length || !rows[0].values.length) return 50;
  return rows[0].values[0][0] as number;
}

export async function addInventorySlots(playerId: string, additional: number): Promise<number> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT purchased_slots FROM inventory_slots WHERE player_id = ?`, [playerId]);
  if (!rows.length || !rows[0].values.length) {
    db.run(`INSERT INTO inventory_slots (player_id, base_slots, purchased_slots) VALUES (?, 50, ?)`, [playerId, additional]);
  } else {
    const current = rows[0].values[0][0] as number;
    db.run(`UPDATE inventory_slots SET purchased_slots = ? WHERE player_id = ?`, [current + additional, playerId]);
  }
  saveToDisk();
  return 50 + additional;
}

// ─── Rewards ───────────────────────────────────────────────────────────────────

export async function getAvailableRewards(playerId: string): Promise<CosmeticReward[]> {
  const db = await ensureDb();
  const rows = db.exec(`
    SELECT r.* FROM cosmetic_rewards r
    LEFT JOIN player_reward_claims c ON c.reward_id = r.reward_id AND c.player_id = ?
    WHERE c.reward_id IS NULL
  `, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => ({
    rewardId: r[0], cosmeticId: r[1], triggerType: r[2] as any,
    triggerValue: r[3], title: r[4], description: r[5], createdAt: r[6],
  }));
}

export async function claimReward(playerId: string, rewardId: string): Promise<string | null> {
  const db = await ensureDb();
  const existing = db.exec(`SELECT 1 FROM player_reward_claims WHERE player_id = ? AND reward_id = ?`, [playerId, rewardId]);
  if (existing.length && existing[0].values.length) return null;

  const rewardRows = db.exec(`SELECT cosmetic_id FROM cosmetic_rewards WHERE reward_id = ?`, [rewardId]);
  if (!rewardRows.length || !rewardRows[0].values.length) return null;
  const cosmeticId = rewardRows[0].values[0][0] as string;

  const now = new Date().toISOString();
  db.run(`INSERT INTO player_reward_claims (player_id, reward_id, claimed_at) VALUES (?, ?, ?)`, [playerId, rewardId, now]);
  db.run(`INSERT OR IGNORE INTO player_cosmetics (player_id, cosmetic_id, equipped, acquired_at, source) VALUES (?, ?, 0, ?, 'reward')`, [playerId, cosmeticId, now]);
  saveToDisk();
  return cosmeticId;
}

export async function getClaimedRewardIds(playerId: string): Promise<string[]> {
  const db = await ensureDb();
  const rows = db.exec(`SELECT reward_id FROM player_reward_claims WHERE player_id = ?`, [playerId]);
  if (!rows.length) return [];
  return rows[0].values.map((r: any[]) => r[0] as string);
}

// ─── Level Rewards (Phase 11) ────────────────────────────────────────────────

export async function checkAndGrantLevelRewards(playerId: string, newLevel: number): Promise<CosmeticReward[]> {
  const rewards = await getAvailableRewards(playerId);
  const granted: CosmeticReward[] = [];

  for (const reward of rewards) {
    if (reward.triggerType === 'level') {
      try {
        const value = JSON.parse(reward.triggerValue ?? '{}');
        if (value.level && newLevel >= value.level) {
          await claimReward(playerId, reward.rewardId);
          granted.push(reward);
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return granted;
}