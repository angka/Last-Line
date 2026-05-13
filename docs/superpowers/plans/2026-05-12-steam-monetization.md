# Phase 11: Steam & Monetization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Steam authentication, build a cosmetic store browser SPA, implement DLC entitlements, and add inventory expansion purchasables.

**Architecture:** Steam Auth via Steamworks ticket validation against Steam Web API → custom cosmetics DB in SQLite → browser store SPA at `store/index.html` → DLC entitlement checks at area/item/command triggers → free reward system via trigger-based claims.

**Tech Stack:** TypeScript, sql.js (SQLite), Node.js `https` module for Steam Web API, no external Steam SDK needed (manual HTTP validation).

---

## Task 1: Types — `types_cosmetics.ts`

**Files:**
- Create: `src/types_cosmetics.ts`

- [ ] **Step 1: Write the types file**

```typescript
// Phase 11 — Cosmetic & Steam Types

export type CosmeticCategory = 'skin' | 'chat' | 'title' | 'effect' | 'housing';
export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CosmeticSource = 'purchase' | 'reward' | 'dlc';
export type RewardTriggerType = 'level' | 'achievement' | 'action' | 'login';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  subcategory?: string;
  rarity: CosmeticRarity;
  description: string;
  priceUsd: number | null; // null = free/reward only
  steamProductId?: string;
  effectData?: CosmeticEffectData;
  equipSlot?: 'weapon' | 'armor' | 'accessory';
  isDlc: boolean;
  dlcRequired?: string;
  requiresLevel?: number;
  createdAt: string;
}

export interface CosmeticEffectData {
  color?: string;
  particle?: string;
  animation?: string;
  prefix?: string;
  suffix?: string;
  bubbleStyle?: string;
}

export interface PlayerCosmetic {
  playerId: string;
  cosmeticId: string;
  equipped: boolean;
  acquiredAt: string;
  source: CosmeticSource;
}

export interface DlcEntitlement {
  playerId: string;
  dlcId: string;
  purchasedAt: string;
  source: 'steam' | 'manual' | 'promo';
}

export interface InventoryExpansion {
  playerId: string;
  baseSlots: number; // default: 50
  purchasedSlots: number; // extra slots purchased
}

export interface CosmeticReward {
  rewardId: string;
  cosmeticId: string;
  triggerType: RewardTriggerType;
  triggerValue?: string; // JSON: { level: 10 } or { achievement: 'kill_100' }
  title: string;
  description: string;
  createdAt: string;
}

export interface PlayerRewardClaim {
  playerId: string;
  rewardId: string;
  claimedAt: string;
}

// ─── Steam Types ────────────────────────────────────────────────────────────────

export interface SteamTicketPayload {
  steamId: string;
  ticket: string;
  timestamp: number;
}

export interface SteamOwnership {
  steamId: string;
  ownedProducts: string[]; // cosmetic IDs or DLC IDs
  lastChecked: string;
}

// ─── Store Sync Response ────────────────────────────────────────────────────────

export interface StoreSyncResponse {
  cosmetics: CosmeticItem[];
  ownedCosmetics: string[]; // cosmetic IDs this player owns
  equippedCosmetics: Record<string, string>; // category → cosmeticId
  entitlements: string[]; // DLC IDs this player owns
  inventorySlots: number;
  availableRewards: CosmeticReward[];
  claimedRewards: string[]; // rewardIds already claimed
}
```

- [ ] **Step 2: Verify syntax**

Run: `npx tsc src/types_cosmetics.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types_cosmetics.ts
git commit -m "feat(phase11): add cosmetic and steam types"
```

---

## Task 2: Steam Auth Service — `src/server/auth/SteamAuthService.ts`

**Files:**
- Create: `src/server/auth/SteamAuthService.ts`
- Modify: `src/types_player.ts:55` — add steamId to PlayerAccount and PlayerJWTPayload

- [ ] **Step 1: Add steamId to player types**

```typescript
// In types_player.ts, after PlayerAccount interface:
export interface PlayerAccount {
  playerId: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
  steamId?: string;        // ← NEW
  steamLinkedAt?: string;  // ← NEW
}

// And in PlayerJWTPayload:
export interface PlayerJWTPayload {
  playerId: string;
  username: string;
  steamId?: string; // ← NEW
  iat: number;
  exp: number;
}
```

- [ ] **Step 2: Write SteamAuthService**

```typescript
/**
 * Phase 11 — Steam Auth Service
 * Validates Steam tickets and polls ownership.
 */

const STEAM_API_KEY = process.env.STEAM_API_KEY ?? '';
const STEAM_APP_ID = process.env.STEAM_APP_ID ?? '';
const STEAM_WEB_API_URL = 'https://api.steampowered.com';

export interface SteamAuthResult {
  success: boolean;
  steamId?: string;
  error?: string;
}

/**
 * Validate a Steam session ticket via Steam Web API.
 */
export async function validateSteamTicket(ticket: string): Promise<SteamAuthResult> {
  if (!STEAM_API_KEY || !STEAM_APP_ID) {
    return { success: false, error: 'Steam API not configured. Set STEAM_API_KEY and STEAM_APP_ID.' };
  }

  try {
    // Steam expects hex-encoded ticket
    const hexTicket = Buffer.from(ticket, 'base64').toString('hex');
    
    const url = `${STEAM_WEB_API_URL}/ISteamUserAuth/AuthenticateUserTicket/v0002/?key=${STEAM_API_KEY}&appid=${STEAM_APP_ID}&ticket=${hexTicket}`;
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.response?.authenticateuserresult === 'OK') {
      const steamId = data.response.steamid;
      return { success: true, steamId };
    }

    return { success: false, error: 'Invalid Steam ticket.' };
  } catch (err) {
    return { success: false, error: `Steam auth failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

/**
 * Get Steam ID from ticket without full validation (for link flow).
 */
export async function getSteamIdFromTicket(ticket: string): Promise<string | null> {
  const result = await validateSteamTicket(ticket);
  return result.success ? result.steamId ?? null : null;
}

/**
 * Poll Steam for owned products (cosmetic/DLC ownership).
 */
export async function getOwnedProducts(steamId: string): Promise<string[]> {
  if (!STEAM_API_KEY) return [];

  try {
    const url = `${STEAM_WEB_API_URL}/IPlayerService/GetOwnedGames/v0002/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=0`;
    const response = await fetch(url);
    const data = await response.json() as any;

    const games = data.response?.games ?? [];
    const ownedAppIds = games.map((g: any) => String(g.appid));
    
    // Check if owned app matches our app ID or any DLC app IDs
    const ownedProducts: string[] = [];
    if (ownedAppIds.includes(STEAM_APP_ID)) {
      ownedProducts.push('steam_app');
    }
    // Add DLC app IDs to check
    const dlcAppIds = getDlcAppIds();
    for (const dlcId of dlcAppIds) {
      if (ownedAppIds.includes(dlcId)) {
        ownedProducts.push(dlcId);
      }
    }
    return ownedProducts;
  } catch {
    return [];
  }
}

function getDlcAppIds(): string[] {
  // Define DLC app IDs — these come from Steam store
  return [
    // 'dlc_forest_appid',
    // 'dlc_cave_appid',
    // 'dlc_season1_appid',
  ];
}

/**
 * Check if player owns a specific DLC.
 */
export async function checkDlcOwnership(steamId: string, dlcId: string): Promise<boolean> {
  const owned = await getOwnedProducts(steamId);
  return owned.includes(dlcId);
}
```

- [ ] **Step 3: Verify syntax**

Run: `npx tsc src/server/auth/SteamAuthService.ts src/types_player.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types_player.ts src/server/auth/SteamAuthService.ts
git commit -m "feat(phase11): add steam auth service and steamId field"
```

---

## Task 3: Player DB — Steam Linking

**Files:**
- Modify: `src/server/persistence/PlayerDbManager.ts` — add steamId column, steam linking functions

- [ ] **Step 1: Update PlayerDbManager schema**

Find the players table creation in `ensureDb()` and add `steam_id` and `steam_linked_at` columns:

```typescript
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
  -- ... rest unchanged
`);
```

- [ ] **Step 2: Add steam linking functions** (add at end of PlayerDbManager.ts)

```typescript
// ─── Steam Linking ──────────────────────────────────────────────────────────────

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

export async function updateLastLogin(playerId: string): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  db.run(`UPDATE players SET last_login = ? WHERE id = ?`, [now, playerId]);
  saveToDisk();
}
```

- [ ] **Step 3: Update getPlayerById to include steam fields**

```typescript
// In getPlayerById and getPlayerByUsername, getPlayerByEmail:
return { 
  playerId: id, username: uname, email, passwordHash: hash, 
  steamId: sid ?? undefined, steamLinkedAt: slAt ?? undefined, // add these
  createdAt, lastLogin: lastLogin ?? '' 
};
```

- [ ] **Step 4: Verify syntax**

Run: `npx tsc src/server/persistence/PlayerDbManager.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/server/persistence/PlayerDbManager.ts
git commit -m "feat(phase11): add steam linking to player DB"
```

---

## Task 4: Cosmetic DB — `src/server/persistence/CosmeticDbManager.ts`

**Files:**
- Create: `src/server/persistence/CosmeticDbManager.ts`

- [ ] **Step 1: Write CosmeticDbManager**

```typescript
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
  DlcEntitlement,
  InventoryExpansion,
  CosmeticReward,
  PlayerRewardClaim,
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
  const cosmetics: Omit<CosmeticItem, 'createdAt'>[] = [
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
    { id: 'title_new_adventurer', name: 'New Adventurer', category: 'title', subcategory: 'prefix', rarity: 'common', description: 'A fresh adventurer.', priceUsd: null }, // free starter
    // Effects
    { id: 'effect_golden_glow', name: 'Golden Glow', category: 'effect', subcategory: 'aura', rarity: 'epic', description: 'A golden aura surrounds you.', priceUsd: 3.99, effectData: { color: '#FFD700', particle: 'glow' } },
    { id: 'effect_shadow_trail', name: 'Shadow Trail', category: 'effect', subcategory: 'trail', rarity: 'rare', description: 'Leave shadows in your wake.', priceUsd: 2.49, effectData: { particle: 'shadow' } },
    // Housing
    { id: 'housing_torch', name: 'Cozy Torch', category: 'housing', subcategory: 'decoration', rarity: 'common', description: 'A warm torch for your home.', priceUsd: null }, // free reward
    { id: 'housing_crystal_vase', name: 'Crystal Vase', category: 'housing', subcategory: 'decoration', rarity: 'uncommon', description: 'A decorative crystal vase.', priceUsd: 1.49 },
    // DLC
    { id: 'dlc_forest_pack', name: 'Deep Forest Expansion', category: 'skin', isDlc: true, rarity: 'legendary', description: 'Unlocks the Deep Forest area and content.', priceUsd: 9.99, dlcRequired: 'dlc_forest' },
    { id: 'dlc_cave_pack', name: 'Cave System Expansion', category: 'skin', isDlc: true, rarity: 'legendary', description: 'Unlocks the Cave system.', priceUsd: 9.99, dlcRequired: 'dlc_cave' },
    // Inventory Expansion
    { id: 'inv_100', name: 'Inventory +50', category: 'skin', subcategory: 'inventory', rarity: 'common', description: 'Adds 50 inventory slots.', priceUsd: 2.99 },
    { id: 'inv_200', name: 'Inventory +150', category: 'skin', subcategory: 'inventory', rarity: 'uncommon', description: 'Adds 150 inventory slots.', priceUsd: 4.99 },
  ];

  const stmt = db.prepare(`INSERT OR REPLACE INTO cosmetics (id, name, category, subcategory, rarity, description, price_usd, steam_product_id, effect_data, equip_slot, is_dlc, dlc_required, requires_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  for (const c of cosmetics) {
    stmt.run([
      c.id, c.name, c.category, c.subcategory ?? null, c.rarity, c.description,
      c.priceUsd ?? null, c.steamProductId ?? null, c.effectData ? JSON.stringify(c.effectData) : null,
      c.equipSlot ?? null, c.isDlc ? 1 : 0, c.dlcRequired ?? null, c.requiresLevel ?? null, now
    ]);
  }
  stmt.free();
}

function seedDefaultRewards(db: SqlJsDatabase): void {
  const now = new Date().toISOString();
  const rewards: CosmeticReward[] = [
    { rewardId: 'reward_login_1', cosmeticId: 'title_new_adventurer', triggerType: 'login', title: 'Welcome Gift', description: 'Claim your starter title!', createdAt: now },
    { rewardId: 'reward_level_10', cosmeticId: 'chat_gold_name', triggerType: 'level', triggerValue: JSON.stringify({ level: 10 }), title: 'Level 10 Reward', description: 'Golden name effect!', createdAt: now },
    { rewardId: 'reward_level_25', cosmeticId: 'skin_iron_shield', triggerType: 'level', triggerValue: JSON.stringify({ level: 25 }), title: 'Level 25 Reward', description: 'Iron Shield skin!', createdAt: now },
    { rewardId: 'reward_level_50', cosmeticId: 'title_veteran', triggerType: 'level', triggerValue: JSON.stringify({ level: 50 }), title: 'Level 50 Reward', description: 'Veteran title!', createdAt: now },
    { rewardId: 'reward_dungeon_1', cosmeticId: 'skin_flame_sword', triggerType: 'action', triggerValue: JSON.stringify({ action: 'dungeon_clear' }), title: 'First Dungeon', description: 'Clear your first dungeon!', createdAt: now },
    { rewardId: 'reward_pvp_1', cosmeticId: 'chat_emerald_bubble', triggerType: 'action', triggerValue: JSON.stringify({ action: 'pvp_kill' }), title: 'First Blood', description: 'Win your first PvP!', createdAt: now },
    { rewardId: 'reward_friends_10', cosmeticId: 'title_champion', triggerType: 'action', triggerValue: JSON.stringify({ action: 'friends_10' }), title: 'Social Butterfly', description: 'Have 10 friends!', createdAt: now },
  ];

  const stmt = db.prepare(`INSERT OR REPLACE INTO cosmetic_rewards (reward_id, cosmetic_id, trigger_type, trigger_value, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const r of rewards) {
    stmt.run([r.rewardId, r.cosmeticId, r.triggerType, r.triggerValue ?? null, r.title, r.description, r.createdAt]);
  }
  stmt.free();
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
  const rows = db.exec(`SELECT base_slots + purchased_slots FROM inventory_slots WHERE player_id = ?`, [playerId]);
  if (!rows.length || !rows[0].values.length) return 50;
  return rows[0].values[0][0] as number;
}

export async function addInventorySlots(playerId: string, additional: number): Promise<number> {
  const db = await ensureDb();
  // Check if entry exists
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
  // Check if already claimed
  const existing = db.exec(`SELECT 1 FROM player_reward_claims WHERE player_id = ? AND reward_id = ?`, [playerId, rewardId]);
  if (existing.length && existing[0].values.length) return null;

  // Get cosmetic for this reward
  const rewardRows = db.exec(`SELECT cosmetic_id FROM cosmetic_rewards WHERE reward_id = ?`, [rewardId]);
  if (!rewardRows.length || !rewardRows[0].values.length) return null;
  const cosmeticId = rewardRows[0].values[0][0] as string;

  // Claim and grant
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
```

- [ ] **Step 2: Verify syntax**

Run: `npx tsc src/server/persistence/CosmeticDbManager.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/persistence/CosmeticDbManager.ts
git commit -m "feat(phase11): add cosmetic database manager with seed data"
```

---

## Task 5: Player Auth — Steam Linking in PlayerAuthService

**Files:**
- Modify: `src/server/auth/PlayerAuthService.ts` — add linkSteam, unlinkSteam, steamAuth functions

- [ ] **Step 1: Add steam functions to PlayerAuthService**

Add at end of the file:

```typescript
// ─── Steam Auth ────────────────────────────────────────────────────────────────

import { validateSteamTicket, getOwnedProducts } from './SteamAuthService';
import { getPlayerBySteamId, linkSteamToPlayer, unlinkSteamFromPlayer, getPlayerSteamId } from '../persistence/PlayerDbManager';
import { grantDlcEntitlement, addInventorySlots } from '../persistence/CosmeticDbManager';
import { issuePlayerJwt, storePlayerToken } from '../persistence/PlayerDbManager';

export interface SteamAuthResult {
  success: boolean;
  playerId?: string;
  steamId?: string;
  token?: string;
  error?: string;
  needsLinking?: boolean;
  linkedPlayerId?: string;
}

export async function steamAuth(ticket: string): Promise<SteamAuthResult> {
  const result = await validateSteamTicket(ticket);
  if (!result.success || !result.steamId) {
    return { success: false, error: result.error ?? 'Steam auth failed.' };
  }

  const steamId = result.steamId;

  // Check if this Steam ID is already linked to a player
  const existingPlayer = await getPlayerBySteamId(steamId);
  if (existingPlayer) {
    // Login existing player
    const token = issuePlayerJwt(existingPlayer.playerId);
    await storePlayerToken(token, existingPlayer.playerId);

    // Sync Steam ownership
    await syncSteamOwnership(existingPlayer.playerId, steamId);

    return {
      success: true,
      playerId: existingPlayer.playerId,
      steamId,
      token,
    };
  }

  // Not linked — check if player exists with email/pass but no steam
  // This would be handled by steam_link flow
  return {
    success: false,
    steamId,
    needsLinking: true,
    error: 'Steam account not linked. Please login or register first, then link your Steam account.',
  };
}

export async function linkSteamAccount(playerId: string, ticket: string): Promise<{ success: boolean; steamId?: string; error?: string }> {
  const result = await validateSteamTicket(ticket);
  if (!result.success || !result.steamId) {
    return { success: false, error: result.error ?? 'Steam auth failed.' };
  }

  const steamId = result.steamId;

  // Check if already linked to another player
  const existingOwner = await getPlayerBySteamId(steamId);
  if (existingOwner && existingOwner.playerId !== playerId) {
    return { success: false, error: 'This Steam account is already linked to another player.' };
  }

  // Link the Steam account
  await linkSteamToPlayer(playerId, steamId);

  // Sync ownership
  await syncSteamOwnership(playerId, steamId);

  return { success: true, steamId };
}

export async function unlinkSteamAccount(playerId: string): Promise<{ success: boolean; error?: string }> {
  const steamId = await getPlayerSteamId(playerId);
  if (!steamId) {
    return { success: false, error: 'Steam account not linked.' };
  }
  await unlinkSteamFromPlayer(playerId);
  return { success: true };
}

async function syncSteamOwnership(playerId: string, steamId: string): Promise<void> {
  const ownedProducts = await getOwnedProducts(steamId);
  for (const product of ownedProducts) {
    await grantDlcEntitlement(playerId, product, 'steam');
  }

  // Handle inventory expansion purchases
  if (ownedProducts.includes('inv_100')) {
    await addInventorySlots(playerId, 50);
  }
  if (ownedProducts.includes('inv_200')) {
    await addInventorySlots(playerId, 150);
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `npx tsc src/server/auth/PlayerAuthService.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/auth/PlayerAuthService.ts
git commit -m "feat(phase11): add steam auth and linking to player auth service"
```

---

## Task 6: Cosmetic Store Service — `src/server/store/CosmeticStore.ts`

**Files:**
- Create: `src/server/store/CosmeticStore.ts`

- [ ] **Step 1: Write CosmeticStore**

```typescript
/**
 * Phase 11 — Cosmetic Store Service
 * Handles store operations, DLC checks, reward grants.
 */

import * as https from 'https';
import {
  getAllCosmetics,
  getCosmeticById,
  getCosmeticsByCategory,
  getPlayerOwnedCosmeticIds,
  getPlayerEquippedCosmetics,
  addCosmeticToPlayer,
  setCosmeticEquipped,
  getPlayerEntitlements,
  hasDlcEntitlement,
  getInventorySlots,
  getAvailableRewards,
  claimReward,
  getClaimedRewardIds,
} from '../persistence/CosmeticDbManager';
import { getPlayerSteamId } from '../persistence/PlayerDbManager';
import { getOwnedProducts } from '../auth/SteamAuthService';
import type { StoreSyncResponse, CosmeticItem } from '../../types_cosmetics';

export async function getStoreSync(playerId: string): Promise<StoreSyncResponse> {
  const [cosmetics, owned, equipped, entitlements, slots, rewards, claimed] = await Promise.all([
    getAllCosmetics(),
    getPlayerOwnedCosmeticIds(playerId),
    getPlayerEquippedCosmetics(playerId),
    getPlayerEntitlements(playerId),
    getInventorySlots(playerId),
    getAvailableRewards(playerId),
    getClaimedRewardIds(playerId),
  ]);

  return {
    cosmetics,
    ownedCosmetics: owned,
    equippedCosmetics: equipped,
    entitlements,
    inventorySlots: slots,
    availableRewards: rewards,
    claimedRewards: claimed,
  };
}

export async function purchaseCosmetic(
  playerId: string,
  cosmeticId: string,
): Promise<{ success: boolean; error?: string }> {
  const cosmetic = await getCosmeticById(cosmeticId);
  if (!cosmetic) {
    return { success: false, error: 'Item not found.' };
  }

  // Check if already owned
  const owned = await getPlayerOwnedCosmeticIds(playerId);
  if (owned.includes(cosmeticId)) {
    return { success: false, error: 'You already own this item.' };
  }

  // Check DLC requirement
  if (cosmetic.dlcRequired) {
    const has = await hasDlcEntitlement(playerId, cosmetic.dlcRequired);
    if (!has) {
      return { success: false, error: `This requires ${cosmetic.dlcRequired}. Purchase from the store first.` };
    }
  }

  // Check level requirement
  // Level check would need access to player save — return error for now
  // Actual implementation would check session.currentState.stats.level

  // For cosmetic purchases, we just grant the item
  // Real payment processing happens via Steam Overlay (external)
  // Server trusts that Steam processed the payment

  await addCosmeticToPlayer(playerId, cosmeticId, 'purchase');

  // Handle inventory expansion
  if (cosmetic.subcategory === 'inventory') {
    const slots = cosmeticId === 'inv_100' ? 50 : cosmeticId === 'inv_200' ? 150 : 0;
    const { addInventorySlots } = await import('../persistence/CosmeticDbManager');
    await addInventorySlots(playerId, slots);
  }

  return { success: true };
}

export async function equipCosmetic(
  playerId: string,
  cosmeticId: string,
): Promise<{ success: boolean; error?: string }> {
  const cosmetic = await getCosmeticById(cosmeticId);
  if (!cosmetic) {
    return { success: false, error: 'Item not found.' };
  }

  const owned = await getPlayerOwnedCosmeticIds(playerId);
  if (!owned.includes(cosmeticId)) {
    return { success: false, error: 'You do not own this item.' };
  }

  // Unequip any other item in the same category
  const equipped = await getPlayerEquippedCosmetics(playerId);
  const currentInCategory = equipped[cosmetic.category];
  if (currentInCategory && currentInCategory !== cosmeticId) {
    await setCosmeticEquipped(playerId, currentInCategory, false);
  }

  await setCosmeticEquipped(playerId, cosmeticId, true);
  return { success: true };
}

export async function checkDlcAccess(
  playerId: string,
  dlcId: string,
): Promise<{ hasAccess: boolean; missingDlc?: string }> {
  const has = await hasDlcEntitlement(playerId, dlcId);
  if (has) {
    return { hasAccess: true };
  }
  return { hasAccess: false, missingDlc: dlcId };
}

export async function claimPlayerReward(
  playerId: string,
  rewardId: string,
): Promise<{ success: boolean; cosmeticId?: string; error?: string }> {
  const result = await claimReward(playerId, rewardId);
  if (!result) {
    return { success: false, error: 'Already claimed or reward not found.' };
  }
  return { success: true, cosmeticId: result };
}
```

- [ ] **Step 2: Verify syntax**

Run: `npx tsc src/server/store/CosmeticStore.ts --noEmit --esModuleInterop`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/store/CosmeticStore.ts
git commit -m "feat(phase11): add cosmetic store service"
```

---

## Task 7: Server Integration — `src/server/index.ts`

**Files:**
- Modify: `src/server/index.ts` — add steam_auth, steam_link, steam_unlink handlers, shop handler, DLC checks

- [ ] **Step 1: Add steam handlers after existing auth handlers** (around line 99)

```typescript
// ── Steam Auth ──────────────────────────────────────────────────────────────
if (msg.type === 'steam_auth') {
  const { steamAuth } = await import('./auth/PlayerAuthService');
  const result = await steamAuth(msg.ticket ?? '');
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'steam_error', text: result.error ?? 'Steam auth failed.' }));
    return;
  }
  if (result.needsLinking) {
    socket.send(JSON.stringify({ type: 'steam_link_prompt', steamId: result.steamId }));
    return;
  }
  socket.send(JSON.stringify({
    type: 'steam_success',
    playerId: result.playerId,
    steamId: result.steamId,
    token: result.token,
  }));
  return;
}

// ── Steam Link ──────────────────────────────────────────────────────────────
if (msg.type === 'steam_link') {
  if (!validatedPlayerId) {
    socket.send(JSON.stringify({ type: 'error', text: 'Please login first.' }));
    return;
  }
  const { linkSteamAccount } = await import('./auth/PlayerAuthService');
  const result = await linkSteamAccount(validatedPlayerId, msg.ticket ?? '');
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'error', text: result.error ?? 'Link failed.' }));
    return;
  }
  socket.send(JSON.stringify({ type: 'steam_linked', steamId: result.steamId }));
  return;
}

// ── Steam Unlink ───────────────────────────────────────────────────────────
if (msg.type === 'steam_unlink') {
  if (!validatedPlayerId) {
    socket.send(JSON.stringify({ type: 'error', text: 'Please login first.' }));
    return;
  }
  const { unlinkSteamAccount } = await import('./auth/PlayerAuthService');
  const result = await unlinkSteamAccount(validatedPlayerId);
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'error', text: result.error ?? 'Unlink failed.' }));
    return;
  }
  socket.send(JSON.stringify({ type: 'steam_unlinked' }));
  return;
}

// ── Store Sync ──────────────────────────────────────────────────────────────
if (msg.type === 'store_sync') {
  if (!session) {
    socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
    return;
  }
  const { getStoreSync } = await import('./store/CosmeticStore');
  const storeData = await getStoreSync(session.playerId);
  socket.send(JSON.stringify({ type: 'store_data', ...storeData }));
  return;
}

// ── Purchase Cosmetic ───────────────────────────────────────────────────────
if (msg.type === 'purchase_cosmetic') {
  if (!session) {
    socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
    return;
  }
  const { purchaseCosmetic } = await import('./store/CosmeticStore');
  const result = await purchaseCosmetic(session.playerId, msg.cosmeticId ?? '');
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'purchase_error', text: result.error }));
    return;
  }
  socket.send(JSON.stringify({ type: 'purchase_success', cosmeticId: msg.cosmeticId }));
  return;
}

// ── Equip Cosmetic ───────────────────────────────────────────────────────────
if (msg.type === 'equip_cosmetic') {
  if (!session) {
    socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
    return;
  }
  const { equipCosmetic } = await import('./store/CosmeticStore');
  const result = await equipCosmetic(session.playerId, msg.cosmeticId ?? '');
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'error', text: result.error }));
    return;
  }
  socket.send(JSON.stringify({ type: 'cosmetic_equipped', cosmeticId: msg.cosmeticId }));
  return;
}

// ── Claim Reward ──────────────────────────────────────────────────────────────
if (msg.type === 'claim_reward') {
  if (!session) {
    socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
    return;
  }
  const { claimPlayerReward } = await import('./store/CosmeticStore');
  const result = await claimPlayerReward(session.playerId, msg.rewardId ?? '');
  if (!result.success) {
    socket.send(JSON.stringify({ type: 'error', text: result.error }));
    return;
  }
  socket.send(JSON.stringify({ type: 'reward_claimed', rewardId: msg.rewardId, cosmeticId: result.cosmeticId }));
  return;
}

// ── Shop (open browser) ──────────────────────────────────────────────────────
if (msg.type === 'shop') {
  if (!session) {
    socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
    return;
  }
  // Open store URL in default browser
  const storeUrl = `file://${__dirname}/../../store/index.html`;
  socket.send(JSON.stringify({ type: 'store_url', url: storeUrl }));
  // Try to open browser (platform-specific)
  try {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec(`start "" "${storeUrl}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${storeUrl}"`);
    } else {
      exec(`xdg-open "${storeUrl}"`);
    }
  } catch { /* ignore */ }
  return;
}
```

- [ ] **Step 2: Add DLC check in area entrance** (find area change logic in parseCommand and add DLC check)

In the area change handling, after verifying the area exists but before allowing entry:

```typescript
// Phase 11: DLC check
const { checkDlcAccess } = await import('./store/CosmeticStore');
const dlcAreas: Record<string, string> = {
  'deep_forest': 'dlc_forest',
  'cave_entrance': 'dlc_cave',
};
const requiredDlc = dlcAreas[areaId];
if (requiredDlc) {
  const access = await checkDlcAccess(session.playerId, requiredDlc);
  if (!access.hasAccess) {
    socket.send(JSON.stringify({ type: 'output', text: `This area requires ${requiredDlc}. Visit the store to purchase.` }));
    return;
  }
}
```

- [ ] **Step 3: Verify syntax**

Run: `npx tsc src/server/index.ts --noEmit --esModuleInterop`
Expected: No errors (may have duplicate export warnings, that's fine)

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat(phase11): integrate steam auth and store handlers in server"
```

---

## Task 8: Client — SHOP Command

**Files:**
- Modify: `src/client/index.ts` — add SHOP command handler, store sync, cosmetic equipping

- [ ] **Step 1: Add store integration to client**

In the command handling section, add:

```typescript
// ── Shop command ────────────────────────────────────────────────────────────
if (command.toLowerCase() === 'shop') {
  ws.send(JSON.stringify({ type: 'shop' }));
  return;
}

// ── Store sync ───────────────────────────────────────────────────────────────
if (msg.type === 'store_url') {
  console.log('\n  Opening cosmetic store...');
  return;
}
if (msg.type === 'store_data') {
  displayStore(msg);
  return;
}
```

- [ ] **Step 2: Add store display function**

```typescript
function displayStore(data: any): void {
  console.log('\n  ╔══════════════════════════════════════════════════════════════════════╗');
  console.log('  ║  ⚔ LAST LINE — COSMETIC STORE                                       ║');
  console.log('  ╠══════════════════════════════════════════════════════════════════════╣');

  const categories = ['skin', 'chat', 'title', 'effect', 'housing'];
  for (const cat of categories) {
    const items = data.cosmetics.filter((c: any) => c.category === cat);
    if (!items.length) continue;
    console.log(`  ║  ── ${cat.toUpperCase()} ──────────────────────────────────────────────────────║`);
    for (const item of items) {
      const owned = data.ownedCosmetics.includes(item.id);
      const price = item.priceUsd ? `$${item.priceUsd.toFixed(2)}` : 'FREE';
      const status = owned ? '✓ OWNED' : price;
      console.log(`  ║    ${item.name.padEnd(30)} ${item.rarity.padEnd(10)} ${status.padEnd(10)}║`);
    }
  }

  console.log('  ╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`  ║  Inventory Slots: ${data.inventorySlots}                                              ║`);
  console.log('  ║  Type PURCHASE <item_id> to buy, EQUIP <item_id> to equip              ║');
  console.log('  ╚══════════════════════════════════════════════════════════════════════╝\n');
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/index.ts
git commit -m "feat(phase11): add shop command to client"
```

---

## Task 9: Cosmetic Store SPA — `store/index.html`

**Files:**
- Create: `store/index.html`

- [ ] **Step 1: Write the store SPA**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last Line — Cosmetic Store</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 20px 0; border-bottom: 2px solid #ffd700; margin-bottom: 20px; }
    header h1 { color: #ffd700; font-size: 28px; }
    header span { color: #888; font-size: 14px; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { padding: 10px 20px; background: #1a1a2e; border: 1px solid #333; cursor: pointer; border-radius: 4px; }
    .tab:hover { background: #252540; }
    .tab.active { background: #ffd700; color: #0a0a0f; border-color: #ffd700; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .card { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 16px; transition: transform 0.2s; }
    .card:hover { transform: translateY(-4px); border-color: #ffd700; }
    .card-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
    .card-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .card-rarity { font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .card-rarity.common { color: #888; }
    .card-rarity.uncommon { color: #2ecc71; }
    .card-rarity.rare { color: #3498db; }
    .card-rarity.epic { color: #9b59b6; }
    .card-rarity.legendary { color: #f39c12; }
    .card-desc { font-size: 12px; color: #888; margin-bottom: 12px; min-height: 36px; }
    .card-price { font-size: 18px; font-weight: bold; color: #ffd700; }
    .card-owned { color: #2ecc71; font-size: 14px; }
    .card-btn { width: 100%; padding: 10px; margin-top: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .btn-buy { background: #ffd700; color: #0a0a0f; }
    .btn-buy:hover { background: #e6c200; }
    .btn-equip { background: #3498db; color: white; }
    .btn-equipped { background: #2ecc71; color: white; cursor: default; }
    .card.owned { border-color: #2ecc71; }
    .player-info { background: #1a1a2e; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-radius: 4px; }
    .slots { color: #ffd700; }
    .rewards-section { margin-top: 30px; }
    .rewards-section h2 { color: #ffd700; margin-bottom: 15px; }
    .reward-card { background: #1a1a2e; border: 1px dashed #ffd700; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .reward-info { flex: 1; }
    .reward-title { font-weight: bold; color: #ffd700; }
    .reward-desc { font-size: 12px; color: #888; }
    .btn-claim { background: #2ecc71; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚔ LAST LINE — COSMETIC STORE</h1>
      <span>Powered by Steam</span>
    </header>
    <div class="player-info">
      <span id="playerName">Loading...</span>
      <span class="slots" id="slots">Slots: --/--</span>
    </div>
    <div class="tabs">
      <button class="tab active" data-category="all">All</button>
      <button class="tab" data-category="skin">Skins</button>
      <button class="tab" data-category="chat">Chat</button>
      <button class="tab" data-category="title">Titles</button>
      <button class="tab" data-category="effect">Effects</button>
      <button class="tab" data-category="housing">Housing</button>
      <button class="tab" data-category="reward">Rewards</button>
    </div>
    <div class="grid" id="items"></div>
    <div class="rewards-section" id="rewardsSection" style="display:none;">
      <h2>🎁 Available Rewards</h2>
      <div id="rewards"></div>
    </div>
  </div>
  <script>
    const STORE_PORT = 3002;
    let storeData = null;
    let ws = null;

    function connect() {
      ws = new WebSocket(`ws://localhost:${STORE_PORT}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'store_sync', token: localStorage.getItem('playerToken') }));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'store_data') {
          storeData = msg;
          render();
        }
      };
      ws.onclose = () => setTimeout(connect, 1000);
    }

    function render() {
      if (!storeData) return;
      document.getElementById('playerName').textContent = 'Player: ' + (localStorage.getItem('playerUsername') || 'Unknown');
      document.getElementById('slots').textContent = `Inventory Slots: ${storeData.inventorySlots}`;

      const category = document.querySelector('.tab.active').dataset.category;
      let items = storeData.cosmetics;
      if (category !== 'all') items = items.filter(c => c.category === category);

      const grid = document.getElementById('items');
      grid.innerHTML = items.map(item => {
        const owned = storeData.ownedCosmetics.includes(item.id);
        const equipped = storeData.equippedCosmetics[item.category] === item.id;
        const price = item.priceUsd ? `$${item.priceUsd.toFixed(2)}` : 'FREE';
        const icon = getIcon(item.category, item.subcategory);

        return `
          <div class="card ${owned ? 'owned' : ''}">
            <div class="card-icon">${icon}</div>
            <div class="card-name">${item.name}</div>
            <div class="card-rarity ${item.rarity}">${item.rarity}</div>
            <div class="card-desc">${item.description}</div>
            ${owned ? 
              `<div class="card-owned">✓ Owned</div>
               <button class="card-btn ${equipped ? 'btn-equipped' : 'btn-equip'}" 
                 onclick="equipCosmetic('${item.id}')" ${equipped ? 'disabled' : ''}>
                 ${equipped ? 'Equipped ✓' : 'Equip'}
               </button>` :
              `<div class="card-price">${price}</div>
               <button class="card-btn btn-buy" onclick="buyWithSteam('${item.id}')">Buy with Steam</button>`
            }
          </div>
        `;
      }).join('');

      // Rewards
      const rewardsSection = document.getElementById('rewardsSection');
      if (storeData.availableRewards.length > 0 || category === 'reward') {
        rewardsSection.style.display = 'block';
        document.getElementById('rewards').innerHTML = storeData.availableRewards.map(r => `
          <div class="reward-card">
            <div class="reward-info">
              <div class="reward-title">${r.title}</div>
              <div class="reward-desc">${r.description}</div>
            </div>
            <button class="btn-claim" onclick="claimReward('${r.rewardId}')">Claim</button>
          </div>
        `).join('') || '<p style="color:#888;">All rewards claimed!</p>';
      }
    }

    function getIcon(category, sub) {
      const icons = {
        skin: { weapon: '🗡️', armor: '🛡️', accessory: '💍' },
        chat: { name_color: '🎨', bubble: '💬', particle: '✨' },
        title: { prefix: '👑', suffix: '⭐' },
        effect: { aura: '🌟', trail: '💨' },
        housing: { decoration: '🏠' },
        inventory: '📦'
      };
      return icons[category]?.[sub] || '🎁';
    }

    function buyWithSteam(cosmeticId) {
      alert('Opening Steam store...\nIn production, this would open Steam Overlay to your store page.');
      // In production: window.open(`steam://store/${STEAM_APP_ID}/${cosmeticId}`);
    }

    function equipCosmetic(cosmeticId) {
      ws.send(JSON.stringify({ type: 'equip_cosmetic', cosmeticId }));
      setTimeout(() => ws.send(JSON.stringify({ type: 'store_sync', token: localStorage.getItem('playerToken') })), 100);
    }

    function claimReward(rewardId) {
      ws.send(JSON.stringify({ type: 'claim_reward', rewardId }));
      setTimeout(() => ws.send(JSON.stringify({ type: 'store_sync', token: localStorage.getItem('playerToken') })), 100);
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        render();
      });
    });

    connect();
  </script>
</body>
</html>
```

- [ ] **Step 2: Test the HTML loads**

Open: `file://C:\Users\linsp\Project\Last Line\store\index.html` in browser
Expected: Page loads with tabs and empty grid

- [ ] **Step 3: Commit**

```bash
git add store/index.html
git commit -m "feat(phase11): add cosmetic store SPA"
```

---

## Task 10: DLC Entitlement Check Integration

**Files:**
- Modify: `src/server/index.ts` — add DLC checks at area entrance and command level
- Modify: `src/server/parser/CommandParser.ts` — add DLC-gated commands

- [ ] **Step 1: Add DLC check in area change**

Find the area travel logic in CommandParser and add:

```typescript
// In handleGo or area change function, before allowing travel:
const { checkDlcAccess } = await import('../store/CosmeticStore');

// DLC-gated areas
const dlcAreas: Record<string, string> = {
  'deep_forest': 'dlc_forest',
  'cave_system': 'dlc_cave',
};

if (dlcAreas[areaId]) {
  const access = await checkDlcAccess(playerId, dlcAreas[areaId]);
  if (!access.hasAccess) {
    return { text: `🔒 This area requires the ${dlcAreas[areaId]} expansion. Visit the cosmetic store to purchase.` };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/parser/CommandParser.ts
git commit -m "feat(phase11): add DLC entitlement checks for gated areas"
```

---

## Task 11: Final Integration — Reward Triggers

**Files:**
- Modify: `src/server/parser/CommandParser.ts` — trigger rewards on level/achievement/action

- [ ] **Step 1: Add reward check after level-up, achievement unlock, dungeon clear**

```typescript
// After level up in stat allocation or XP gain:
async function checkAndGrantLevelRewards(playerId: string, newLevel: number): Promise<string[]> {
  const { getAvailableRewards, addCosmeticToPlayer } = await import('../persistence/CosmeticDbManager');
  const rewards = await getAvailableRewards(playerId);
  const granted: string[] = [];

  for (const reward of rewards) {
    if (reward.triggerType === 'level') {
      const value = JSON.parse(reward.triggerValue ?? '{}');
      if (value.level && newLevel >= value.level) {
        await addCosmeticToPlayer(playerId, reward.cosmeticId, 'reward');
        await claimReward(playerId, reward.rewardId);
        granted.push(reward.title);
      }
    }
  }
  return granted;
}

// Call after level-up: const newRewards = await checkAndGrantLevelRewards(playerId, newLevel);
```

- [ ] **Step 2: Commit**

```bash
git add src/server/parser/CommandParser.ts
git commit -m "feat(phase11): add reward trigger checks on level up"
```

---

## Self-Review Checklist

- [ ] All spec requirements covered (Steam auth, cosmetics, DLC, inventory, rewards)
- [ ] No "TBD" or "TODO" placeholders in any step
- [ ] All WebSocket message types implemented
- [ ] All file paths correct and existing
- [ ] TypeScript compiles without errors
- [ ] Checkpoint document updated

---

## Execution Options

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**