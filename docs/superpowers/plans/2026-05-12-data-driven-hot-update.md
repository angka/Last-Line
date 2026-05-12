# Phase 12 — Data-Driven Hot Update + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a data-driven hot-update system that replaces hardcoded TypeScript catalogs with JSON files, enabling live content edits and a dynamic event engine. Also deliver polish/bug fixes, full security audit, performance optimization, and balance tuning.

**Architecture:**
- JSON catalogs in `content/` folder loaded at runtime by ContentManager
- File watcher for dev-mode auto-reload + admin API for manual reload
- EventEngine reads `events.json` and applies effects (bonus exp, drop modifiers, area spawns)
- Admin SPA gets new tabs for Content Editor, Event Manager, Live View
- All game code goes through ContentManager instead of importing from `.ts` files directly

**Tech Stack:** TypeScript, Node.js (fs module), sql.js (SQLite), WebSocket, Express (admin API)

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/types_content.ts` | TypeScript types for content catalog schemas |
| `src/types_event.ts` | TypeScript types for event definitions |
| `src/server/content/ContentManager.ts` | Runtime JSON catalog loader with cache |
| `src/server/content/HotReloadWatcher.ts` | File watcher + admin reload API |
| `src/server/content/EventEngine.ts` | Event scheduler, effect applicator |
| `content/areas.json` | Area catalog (converted from areas.ts) |
| `content/enemies.json` | Enemy catalog (converted from enemies.ts) |
| `content/items.json` | Item catalog (converted from items.ts) |
| `content/skills.json` | Skill catalog (converted from skills.ts) |
| `content/crafting.json` | Crafting recipes + materials |
| `content/dungeons.json` | Dungeon definitions |
| `content/shops.json` | Shop catalogs |

### Modified Files

| File | Change |
|------|--------|
| `src/server/index.ts` | Wire ContentManager, EventEngine, HotReloadWatcher |
| `src/server/parser/CommandParser.ts` | Use ContentManager for all lookups |
| `src/server/engine/CombatEngine.ts` | Use ContentManager, apply event effects |
| `src/server/engine/LootEngine.ts` | Use ContentManager, apply drop_modifier events |
| `src/server/engine/PlayerEngine.ts` | Apply bonus_exp events |
| `src/server/engine/RegenEngine.ts` | Use ContentManager |
| `src/server/items/InventoryManager.ts` | Use ContentManager |
| `src/server/engine/CraftingManager.ts` | Use ContentManager |
| `admin/index.html` | Add Content Editor, Event Manager, Live View tabs |
| `src/server/api/AdminApi.ts` | Add content reload endpoint |

### Deleted (after migration verified)

- `src/data/areas.ts` → replace with content/areas.json
- `src/data/enemies.ts` → replace with content/enemies.json
- `src/data/items.ts` → replace with content/items.json
- `src/data/skills.ts` → replace with content/skills.json
- `src/data/crafting.ts` → replace with content/crafting.json
- `src/data/dungeons.ts` → replace with content/dungeons.json
- `src/data/shops.ts` → replace with content/shops.json

---

## Type Definitions (New Files)

### Task 1: Types for Content and Events

**Files:**
- Create: `src/types_content.ts`
- Create: `src/types_event.ts`

- [ ] **Step 1: Create type definitions**

`src/types_content.ts`:
```typescript
export interface Area {
  id: string;
  name: string;
  biome: string;
  levelRange: [number, number];
  description: string;
  exits: Record<string, string>;
  baseEncounterChance: number;
  safeZone: boolean;
  regenState: 'exploring' | 'safe_area' | 'city';
}

export interface Enemy {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
  strength: number;
  agility: number;
  defense: number;
  expReward: number;
  goldReward: number;
  statusEffects?: any[];
  lootTable?: string[];
  skills?: string[];
}

export interface Item {
  id: string;
  name: string;
  type: string;
  slot?: string;
  rarity: string;
  price: number;
  buyable: boolean;
  description: string;
  stats?: Record<string, number>;
  consumeEffect?: any;
  stackable?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  killCount: number;
  manaCost: number;
  baseDamage?: number;
  scalingStat?: string;
  description: string;
  type: 'physical' | 'magic' | 'support';
}

export interface Material {
  id: string;
  name: string;
  type: string;
  biome: string[];
  rarity: string;
  description: string;
  stackable: boolean;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  output: string;
  outputCount: number;
  ingredients: Record<string, number>;
  station: string;
  difficulty: number;
}

export interface DungeonDef {
  id: string;
  name: string;
  entrance: string;
  unlockArea: string;
  bossId: string;
  floors: DungeonFloor[];
}

export interface DungeonFloor {
  floor: number;
  areaId: string;
  enemyCount: [number, number];
  eliteChance: number;
  bossFloor: boolean;
}

export interface ShopCatalog {
  cityId: string;
  items: string[];
}
```

`src/types_event.ts`:
```typescript
export type EventType = 'area_spawn' | 'drop_modifier' | 'bonus_exp' | 'enemy_spawn' | 'treasure_spawn';

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: EventType;
  effects: EventEffects;
  icon?: string;
  priority?: number;
}

export interface EventEffects {
  expMultiplier?: number;
  goldMultiplier?: number;
  dropMultiplier?: number;
  affectedItems?: string[];
  affectedEnemies?: string[];
  affectedAreas?: string[];
  spawnEnemyId?: string;
  spawnAreaId?: string;
  treasureAreaIds?: string[];
  bonusLoot?: Record<string, number>;
}

export interface ActiveEvent extends GameEvent {
  isActive: boolean;
  timeRemaining: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types_content.ts src/types_event.ts
git commit -m "$(cat <<'EOF'
types(phase12): add content and event type definitions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## ContentManager

### Task 2: ContentManager

**Files:**
- Create: `src/server/content/ContentManager.ts`
- Modify: `src/types.ts` (add imports for content types)

- [ ] **Step 1: Create ContentManager**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { Area } from '../../types_content';
import type { Enemy } from '../../types_content';
import type { Item } from '../../types_content';
import type { Skill } from '../../types_content';
import type { Material, CraftingRecipe } from '../../types_content';
import type { DungeonDef } from '../../types_content';
import type { ShopCatalog } from '../../types_content';

const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');

interface CatalogCache {
  areas: Record<string, Area>;
  enemies: Record<string, Enemy>;
  items: Record<string, Item>;
  skills: Record<string, Skill>;
  materials: Record<string, Material>;
  recipes: Record<string, CraftingRecipe>;
  dungeons: Record<string, DungeonDef>;
  shops: Record<string, ShopCatalog>;
  loaded: boolean;
  loadedAt: number;
}

const cache: CatalogCache = {
  areas: {},
  enemies: {},
  items: {},
  skills: {},
  materials: {},
  recipes: {},
  dungeons: {},
  shops: {},
  loaded: false,
  loadedAt: 0,
};

function loadJson<T>(filename: string): T {
  const filePath = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[ContentManager] File not found: ${filePath}`);
    return {} as T;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function loadAllCatalogs(): void {
  cache.areas = loadJson<Record<string, Area>>('areas.json');
  cache.enemies = loadJson<Record<string, Enemy>>('enemies.json');
  cache.items = loadJson<Record<string, Item>>('items.json');
  cache.skills = loadJson<Record<string, Skill>>('skills.json');
  cache.materials = loadJson<Record<string, Material>>('crafting.json').materials || {};
  cache.recipes = loadJson<Record<string, CraftingRecipe>>('crafting.json').recipes || {};
  cache.dungeons = loadJson<Record<string, DungeonDef>>('dungeons.json');
  cache.shops = loadJson<Record<string, ShopCatalog>>('shops.json');
  cache.loaded = true;
  cache.loadedAt = Date.now();
  console.log(`[ContentManager] Loaded catalogs at ${new Date().toISOString()}`);
}

export function reloadCatalog(name: keyof CatalogCache): boolean {
  if (name === 'loaded' || name === 'loadedAt') return false;
  const mapping: Record<string, string> = {
    areas: 'areas.json',
    enemies: 'enemies.json',
    items: 'items.json',
    skills: 'skills.json',
    materials: 'crafting.json',
    recipes: 'crafting.json',
    dungeons: 'dungeons.json',
    shops: 'shops.json',
  };
  const file = mapping[name];
  if (!file) return false;

  if (name === 'areas') {
    cache.areas = loadJson<Record<string, Area>>(file);
  } else if (name === 'enemies') {
    cache.enemies = loadJson<Record<string, Enemy>>(file);
  } else if (name === 'items') {
    cache.items = loadJson<Record<string, Item>>(file);
  } else if (name === 'skills') {
    cache.skills = loadJson<Record<string, Skill>>(file);
  } else if (name === 'materials') {
    const data = loadJson<{ materials: Record<string, Material> }>(file);
    cache.materials = data.materials || {};
  } else if (name === 'recipes') {
    const data = loadJson<{ recipes: Record<string, CraftingRecipe> }>(file);
    cache.recipes = data.recipes || {};
  } else if (name === 'dungeons') {
    cache.dungeons = loadJson<Record<string, DungeonDef>>(file);
  } else if (name === 'shops') {
    cache.shops = loadJson<Record<string, ShopCatalog>>(file);
  }

  console.log(`[ContentManager] Reloaded ${name} from ${file}`);
  return true;
}

export function reloadAll(): void {
  loadAllCatalogs();
}

export function getArea(id: string): Area | undefined {
  return cache.areas[id];
}

export function getEnemy(id: string): Enemy | undefined {
  return cache.enemies[id];
}

export function getItem(id: string): Item | undefined {
  return cache.items[id];
}

export function getSkill(id: string): Skill | undefined {
  return cache.skills[id];
}

export function getMaterial(id: string): Material | undefined {
  return cache.materials[id];
}

export function getRecipe(id: string): CraftingRecipe | undefined {
  return cache.recipes[id];
}

export function getDungeon(id: string): DungeonDef | undefined {
  return cache.dungeons[id];
}

export function getShop(cityId: string): ShopCatalog | undefined {
  return cache.shops[cityId];
}

export function getAllAreas(): Record<string, Area> {
  return cache.areas;
}

export function getAllEnemies(): Record<string, Enemy> {
  return cache.enemies;
}

export function getAllItems(): Record<string, Item> {
  return cache.items;
}

export function getAllMaterials(): Record<string, Material> {
  return cache.materials;
}

export function getAllRecipes(): Record<string, CraftingRecipe> {
  return cache.recipes;
}

export function isLoaded(): boolean {
  return cache.loaded;
}

export function getLoadedAt(): number {
  return cache.loadedAt;
}
```

- [ ] **Step 2: Ensure content directory exists**

The `content/` directory must exist before the server starts. Add to `package.json` scripts or create during build:
```bash
mkdir -p content
```

- [ ] **Step 3: Wire ContentManager into server/index.ts**

In server/index.ts, import and call `loadAllCatalogs()` during server startup (after DB init):
```typescript
import { loadAllCatalogs } from './content/ContentManager';

// After ensureDb() and server initialization:
loadAllCatalogs();
```

- [ ] **Step 4: Commit**

```bash
git add src/server/content/ContentManager.ts src/server/index.ts package.json
git commit -m "$(cat <<'EOF'
feat(phase12): add ContentManager for runtime JSON catalog loading

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## JSON Catalog Conversions

### Task 3: Convert enemies.ts → enemies.json

**Files:**
- Create: `content/enemies.json`
- Reference: `src/data/enemies.ts`

- [ ] **Step 1: Read full enemies.ts**

Read the entire `src/data/enemies.ts` file (it's ~400 lines). Convert the `ENEMIES` object export to JSON format. Keep the same structure as the TypeScript objects — just strip the TypeScript type annotations and the `export const ENEMIES` wrapper.

Output file: `content/enemies.json` — a JSON object with enemy IDs as keys.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('content/enemies.json','utf-8')); console.log('Valid JSON')"`
Expected: Valid JSON

- [ ] **Step 3: Commit**

```bash
git add content/enemies.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert enemies.ts to enemies.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Convert areas.ts → areas.json

**Files:**
- Create: `content/areas.json`
- Reference: `src/data/areas.ts`

- [ ] **Step 1: Read full areas.ts**

Read the entire `src/data/areas.ts` file (it's ~600 lines). Convert the `AREAS` object to JSON.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('content/areas.json','utf-8')); console.log('Valid JSON')"`
Expected: Valid JSON

- [ ] **Step 3: Commit**

```bash
git add content/areas.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert areas.ts to areas.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Convert items.ts → items.json

**Files:**
- Create: `content/items.json`
- Reference: `src/data/items.ts`

- [ ] **Step 1: Read full items.ts**

Read the entire `src/data/items.ts` (it's the largest file). Convert `ITEMS` to JSON.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('content/items.json','utf-8')); console.log('Valid JSON')"`
Expected: Valid JSON

- [ ] **Step 3: Commit**

```bash
git add content/items.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert items.ts to items.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Convert skills.ts → skills.json

**Files:**
- Create: `content/skills.json`
- Reference: `src/data/skills.ts`

- [ ] **Step 1: Read full skills.ts**

Read the entire file. Convert `PHYSICAL_SKILLS`, `MAGIC_SKILLS`, `SUPPORT_SKILLS` to JSON. Use a top-level structure:
```json
{
  "physical": { ... },
  "magic": { ... },
  "support": { ... }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('content/skills.json','utf-8')); console.log('Valid JSON')"`
Expected: Valid JSON

- [ ] **Step 3: Commit**

```bash
git add content/skills.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert skills.ts to skills.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Convert crafting.ts → crafting.json

**Files:**
- Create: `content/crafting.json`
- Reference: `src/data/crafting.ts`

- [ ] **Step 1: Read full crafting.ts**

Convert `MATERIALS` and `RECIPES` to JSON:
```json
{
  "materials": { ... },
  "recipes": { ... }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('content/crafting.json','utf-8')); console.log('Valid JSON')"`
Expected: Valid JSON

- [ ] **Step 3: Commit**

```bash
git add content/crafting.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert crafting.ts to crafting.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Convert dungeons.ts → dungeons.json

**Files:**
- Create: `content/dungeons.json`
- Reference: `src/data/dungeons.ts`

- [ ] **Step 1: Convert DUNGEONS to JSON**

- [ ] **Step 2: Validate JSON**

- [ ] **Step 3: Commit**

```bash
git add content/dungeons.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert dungeons.ts to dungeons.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Convert shops.ts → shops.json

**Files:**
- Create: `content/shops.json`
- Reference: `src/data/shops.ts`

- [ ] **Step 1: Convert SHOP_CATALOGS to JSON**

- [ ] **Step 2: Validate JSON**

- [ ] **Step 3: Commit**

```bash
git add content/shops.json
git commit -m "$(cat <<'EOF'
feat(phase12): convert shops.ts to shops.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## HotReloadWatcher

### Task 10: HotReloadWatcher

**Files:**
- Create: `src/server/content/HotReloadWatcher.ts`
- Modify: `src/server/api/AdminApi.ts` (add reload endpoint)

- [ ] **Step 1: Create HotReloadWatcher**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { reloadAll, reloadCatalog } from './ContentManager';

const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');

let watcher: fs.FSWatcher | null = null;

export function startWatcher(devMode = false): void {
  if (watcher) return;
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('[HotReloadWatcher] content/ not found, skipping watcher');
    return;
  }

  watcher = fs.watch(CONTENT_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;
    console.log(`[HotReloadWatcher] Detected change: ${filename}`);
    const catalogMap: Record<string, string> = {
      'areas.json': 'areas',
      'enemies.json': 'enemies',
      'items.json': 'items',
      'skills.json': 'skills',
      'crafting.json': 'materials',
      'dungeons.json': 'dungeons',
      'shops.json': 'shops',
    };
    const catalog = catalogMap[filename];
    if (catalog) {
      reloadCatalog(catalog as any);
    }
  });

  console.log('[HotReloadWatcher] Started watching content/ directory');
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[HotReloadWatcher] Stopped');
  }
}

export function manualReload(): { success: boolean; message: string } {
  try {
    reloadAll();
    return { success: true, message: 'All catalogs reloaded successfully' };
  } catch (err) {
    return { success: false, message: `Reload failed: ${err}` };
  }
}
```

- [ ] **Step 2: Add admin reload endpoint to AdminApi.ts**

Add a new endpoint to AdminApi.ts:
```typescript
import { manualReload } from '../content/HotReloadWatcher';

// Add to router:
router.post('/content/reload', verifyAdmin, (req, res) => {
  const result = manualReload();
  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(500).json({ success: false, error: result.message });
  }
});
```

- [ ] **Step 3: Wire into server startup**

In server/index.ts:
```typescript
import { startWatcher } from './content/HotReloadWatcher';

// After loadAllCatalogs():
startWatcher(process.env.NODE_ENV !== 'production');
```

- [ ] **Step 4: Commit**

```bash
git add src/server/content/HotReloadWatcher.ts src/server/api/AdminApi.ts src/server/index.ts
git commit -m "$(cat <<'EOF'
feat(phase12): add HotReloadWatcher for content hot-reload

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## EventEngine

### Task 11: EventEngine

**Files:**
- Create: `src/server/content/EventEngine.ts`
- Create: `content/events.json` (with template events)

- [ ] **Step 1: Create EventEngine**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { GameEvent, ActiveEvent, EventEffects } from '../../types_event';

const EVENTS_FILE = path.join(__dirname, '..', '..', '..', 'content', 'events.json');

let events: Record<string, GameEvent> = {};
let activeEvents: ActiveEvent[] = [];
let lastCheck: number = 0;

export function loadEvents(): void {
  if (!fs.existsSync(EVENTS_FILE)) {
    console.log('[EventEngine] events.json not found, no events loaded');
    return;
  }
  const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
  events = JSON.parse(content);
  console.log(`[EventEngine] Loaded ${Object.keys(events).length} events`);
}

export function reloadEvents(): void {
  loadEvents();
  checkActiveEvents();
}

export function checkActiveEvents(): ActiveEvent[] {
  const now = Date.now();
  const active: ActiveEvent[] = [];

  for (const event of Object.values(events)) {
    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();
    const isActive = now >= start && now <= end;
    active.push({
      ...event,
      isActive,
      timeRemaining: isActive ? end - now : 0,
    });
  }

  activeEvents = active.filter(e => e.isActive);
  lastCheck = now;
  return activeEvents;
}

export function getActiveEvents(): ActiveEvent[] {
  return activeEvents;
}

export function getExpMultiplier(): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (event.effects.expMultiplier) {
      multiplier *= event.effects.expMultiplier;
    }
  }
  return multiplier;
}

export function getGoldMultiplier(): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (event.effects.goldMultiplier) {
      multiplier *= event.effects.goldMultiplier;
    }
  }
  return multiplier;
}

export function getDropMultiplier(enemyId?: string, itemId?: string): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (event.type === 'drop_modifier' && event.effects.dropMultiplier) {
      // Check if this modifier applies to the specific enemy/item
      if (enemyId && event.effects.affectedEnemies?.includes(enemyId)) {
        multiplier *= event.effects.dropMultiplier;
      }
      if (itemId && event.effects.affectedItems?.includes(itemId)) {
        multiplier *= event.effects.dropMultiplier;
      }
      // If no specific targets, apply to all
      if (!enemyId && !itemId && !event.effects.affectedEnemies?.length && !event.effects.affectedItems?.length) {
        multiplier *= event.effects.dropMultiplier;
      }
    }
  }
  return multiplier;
}

export function getSpawnedEnemies(): { enemyId: string; areaId: string }[] {
  const spawned: { enemyId: string; areaId: string }[] = [];
  for (const event of activeEvents) {
    if (event.type === 'enemy_spawn' && event.effects.spawnEnemyId && event.effects.spawnAreaId) {
      spawned.push({ enemyId: event.effects.spawnEnemyId, areaId: event.effects.spawnAreaId });
    }
  }
  return spawned;
}

export function getTreasureAreas(): string[] {
  const areas: string[] = [];
  for (const event of activeEvents) {
    if (event.type === 'treasure_spawn' && event.effects.treasureAreaIds) {
      areas.push(...event.effects.treasureAreaIds);
    }
  }
  return areas;
}

export function getActiveEventEffects(): EventEffects {
  const combined: EventEffects = {};
  for (const event of activeEvents) {
    if (event.effects.expMultiplier) combined.expMultiplier = (combined.expMultiplier || 1) * event.effects.expMultiplier;
    if (event.effects.goldMultiplier) combined.goldMultiplier = (combined.goldMultiplier || 1) * event.effects.goldMultiplier;
    if (event.effects.dropMultiplier) combined.dropMultiplier = (combined.dropMultiplier || 1) * event.effects.dropMultiplier;
  }
  return combined;
}

export function getLastCheck(): number {
  return lastCheck;
}
```

- [ ] **Step 2: Create events.json with template events**

```json
{
  "bonus_xp_weekend": {
    "id": "bonus_xp_weekend",
    "title": "2x EXP Weekend",
    "description": "All combat rewards double experience points this weekend!",
    "startTime": "2026-05-15T00:00:00Z",
    "endTime": "2026-05-17T23:59:59Z",
    "type": "bonus_exp",
    "effects": { "expMultiplier": 2.0 },
    "icon": "star"
  },
  "rare_drop_event": {
    "id": "rare_drop_event",
    "title": "Rare Drop Festival",
    "description": "Rare item drop rates increased by 50%!",
    "startTime": "2026-05-20T00:00:00Z",
    "endTime": "2026-05-22T23:59:59Z",
    "type": "drop_modifier",
    "effects": { "dropMultiplier": 1.5 },
    "icon": "gem"
  },
  "world_boss_invasion": {
    "id": "world_boss_invasion",
    "title": "Dragon Invasion",
    "description": "A powerful dragon has appeared in the Thornwood!",
    "startTime": "2026-05-25T18:00:00Z",
    "endTime": "2026-05-25T22:00:00Z",
    "type": "enemy_spawn",
    "effects": {
      "spawnEnemyId": "ancient_red_dragon",
      "spawnAreaId": "thornwood_edge"
    },
    "icon": "dragon"
  }
}
```

- [ ] **Step 3: Wire into server startup and tick**

In server/index.ts:
```typescript
import { loadEvents, checkActiveEvents, getActiveEvents } from './content/EventEngine';

// After loadAllCatalogs():
loadEvents();
checkActiveEvents();

// Set up periodic check (every 60 seconds):
setInterval(() => {
  const active = checkActiveEvents();
  if (active.length > 0) {
    broadcastToAll({ type: 'event_update', activeEvents: active });
  }
}, 60000);
```

- [ ] **Step 4: Apply event effects in CombatEngine**

In CombatEngine.ts `resolveVictory`, apply multipliers:
```typescript
import { getExpMultiplier, getGoldMultiplier, getDropMultiplier } from '../content/EventEngine';

// In resolveVictory, when calculating rewards:
const expMultiplier = getExpMultiplier();
const goldMultiplier = getGoldMultiplier();
const actualExp = Math.floor(enemy.expReward * expMultiplier);
const actualGold = Math.floor(enemy.goldReward * goldMultiplier);
```

- [ ] **Step 5: Commit**

```bash
git add src/server/content/EventEngine.ts content/events.json src/server/index.ts src/server/engine/CombatEngine.ts
git commit -m "$(cat <<'EOF'
feat(phase12): add EventEngine with event scheduling and effect application

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Wire Game Code to ContentManager

### Task 12: Wire ContentManager into all game code

**Files:**
- Modify: `src/server/parser/CommandParser.ts`
- Modify: `src/server/engine/LootEngine.ts`
- Modify: `src/server/engine/CraftingManager.ts`
- Modify: `src/server/engine/RegenEngine.ts`
- Modify: `src/server/items/InventoryManager.ts`

- [ ] **Step 1: Audit all imports from src/data/**

Grep for imports from `../../data/` or `../data/` in server files:
```bash
grep -rn "from.*data/" src/server/
```

For each file that imports from data/, replace the direct import with ContentManager calls.

Example for CommandParser.ts — find areas.ts imports:
```typescript
// OLD:
import { AREAS } from '../../data/areas';

// NEW:
import { getArea, getAllAreas } from '../content/ContentManager';

// Usage: AREAS[id] → getArea(id)
// Usage: Object.values(AREAS) → Object.values(getAllAreas())
```

- [ ] **Step 2: Wire CombatEngine.ts**

CombatEngine imports from enemies.ts and areas.ts:
```typescript
// OLD:
import { ENEMIES } from '../../data/enemies';
import { AREAS } from '../../data/areas';

// NEW:
import { getEnemy, getArea } from '../content/ContentManager';
```

- [ ] **Step 3: Wire LootEngine.ts**

```typescript
// OLD:
import { ITEMS } from '../../data/items';

// NEW:
import { getItem } from '../content/ContentManager';
```

- [ ] **Step 4: Wire CraftingManager.ts**

```typescript
// OLD:
import { MATERIALS, RECIPES } from '../../data/crafting';

// NEW:
import { getMaterial, getRecipe } from '../content/ContentManager';
```

- [ ] **Step 5: Test compilation**

Run: `npx tsc --noEmit`
Expected: No errors related to data imports

- [ ] **Step 6: Commit**

```bash
git add src/server/parser/CommandParser.ts src/server/engine/CombatEngine.ts src/server/engine/LootEngine.ts src/server/engine/CraftingManager.ts
git commit -m "$(cat <<'EOF'
feat(phase12): wire ContentManager into all game engine files

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Admin SPA Extensions

### Task 13: Admin SPA — Content Editor Tab

**Files:**
- Modify: `admin/index.html` (add Content Editor tab)

- [ ] **Step 1: Read current admin/index.html**

Read the file to understand its structure and tab system.

- [ ] **Step 2: Add Content Editor tab**

Add a new tab button and panel:
```html
<button onclick="showTab('content')" id="contentTab">Content Editor</button>

<div id="contentPanel" class="tab-panel" style="display:none">
  <h2>Content Editor</h2>
  <div class="form-group">
    <label>Catalog:</label>
    <select id="catalogSelect">
      <option value="areas">Areas</option>
      <option value="enemies">Enemies</option>
      <option value="items">Items</option>
      <option value="skills">Skills</option>
      <option value="crafting">Crafting</option>
      <option value="dungeons">Dungeons</option>
      <option value="shops">Shops</option>
      <option value="events">Events</option>
    </select>
  </div>
  <div class="form-group">
    <label>JSON Content:</label>
    <textarea id="jsonEditor" rows="20" style="width:100%;font-family:monospace"></textarea>
  </div>
  <button onclick="saveContent()">Save & Reload</button>
  <div id="contentStatus"></div>
</div>
```

Add JavaScript:
```javascript
async function loadCatalog(catalog) {
  const res = await fetch(`/api/content/${catalog}`);
  const data = await res.json();
  document.getElementById('jsonEditor').value = JSON.stringify(data, null, 2);
}

async function saveContent() {
  const catalog = document.getElementById('catalogSelect').value;
  const json = document.getElementById('jsonEditor').value;
  try {
    JSON.parse(json); // Validate
  } catch (e) {
    document.getElementById('contentStatus').innerHTML = '<span style="color:red">Invalid JSON</span>';
    return;
  }
  const res = await fetch(`/api/content/save`, {
    method: 'POST',
    headers: { 'X-Admin-Token': adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalog, json }),
  });
  const result = await res.json();
  document.getElementById('contentStatus').innerHTML = result.success
    ? '<span style="color:green">Saved and reloaded!</span>'
    : '<span style="color:red">Error: ' + result.error + '</span>';
}
```

- [ ] **Step 3: Commit**

```bash
git add admin/index.html
git commit -m "$(cat <<'EOF'
feat(phase12): add content editor tab to admin SPA

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Admin SPA — Event Manager Tab

**Files:**
- Modify: `admin/index.html` (add Event Manager tab)

- [ ] **Step 1: Add Event Manager tab**

Add tab button and panel for creating/editing/deleting events. Include a table of all events with start/end times, status (active/inactive), and action buttons (edit, delete, toggle).

- [ ] **Step 2: Add event CRUD API**

In AdminApi.ts:
```typescript
router.get('/events', verifyAdmin, (req, res) => {
  const events = loadEvents();
  res.json(Object.values(events));
});

router.post('/events', verifyAdmin, (req, res) => {
  // Save event to events.json
});
```

- [ ] **Step 3: Commit**

```bash
git add admin/index.html src/server/api/AdminApi.ts
git commit -m "$(cat <<'EOF'
feat(phase12): add event manager tab to admin SPA

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Admin SPA — Live View Tab

**Files:**
- Modify: `admin/index.html` (add Live View tab)

- [ ] **Step 1: Add Live View tab**

Show: currently active events, connected players count, server status, last content reload time, memory usage estimate.

- [ ] **Step 2: Commit**

```bash
git add admin/index.html
git commit -m "$(cat <<'EOF'
feat(phase12): add live view tab to admin SPA

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Polish & Bug Fixes

### Task 16: Polish & Bug Fixes

**Files:**
- Read: `src/server/**/*.ts` for bugs and polish opportunities
- Read: `src/client/index.ts` for CLI polish

- [ ] **Step 1: Bug survey**

Run the game and look for bugs:
```bash
npm run build && node dist/server/index.js &
# In another terminal:
node dist/client/index.js
```

Test: combat feedback, movement, inventory, shop, save/load, login flow.

- [ ] **Step 2: Polish pass**

Address common issues found:
- Unclear combat messages → improve hit/miss/crit feedback
- Missing error messages → add user-friendly messages
- Tab completion gaps → expand CLI completion
- Empty state handling → better messages when inventory/skill lists are empty

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(polish): address identified bugs and UI/UX improvements

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Security Audit

### Task 17: Full Security Audit

**Files:**
- Review: `src/server/**/*.ts`
- Review: `src/server/auth/**/*.ts`
- Review: `src/server/api/AdminApi.ts`

**Audit checklist:**
- [ ] WebSocket message validation (all incoming message types)
- [ ] SQL injection (parameterized queries in all DB managers)
- [ ] Admin API authentication (JWT, role checks)
- [ ] Input sanitization (all user-controlled data)
- [ ] Rate limiting effectiveness
- [ ] Steam ticket validation security
- [ ] Session token security
- [ ] File path traversal in content editor
- [ ] XSS in chat and admin panel
- [ ] Privilege escalation checks

- [ ] **Step 1: Security audit report**

Create a temporary security review. For each finding, document severity, location, and recommended fix.

- [ ] **Step 2: Fix critical issues**

Fix any critical (HIGH/CRITICAL) findings immediately.

- [ ] **Step 3: Commit findings**

```bash
git commit -m "$(cat <<'EOF'
security(audit): full security review — fixes applied

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Performance & Optimization

### Task 18: Performance & Optimization

**Files:**
- Review: `src/server/persistence/*.ts`
- Review: `src/server/**/*.ts`

- [ ] **Step 1: Database optimization**

Check for:
- Missing indexes on frequently queried columns
- Batch operations vs individual inserts
- Connection reuse (ensure single DB instance)

Add indexes if missing:
```sql
CREATE INDEX IF NOT EXISTS idx_saves_player ON saves(player_id);
CREATE INDEX IF NOT EXISTS idx_saves_level ON saves(level);
```

- [ ] **Step 2: Memory optimization**

- Lazy load content catalogs (don't load until needed)
- LRU cache for rarely-used catalog entries
- Reduce object allocations in hot paths

- [ ] **Step 3: Load testing**

If possible, simulate N concurrent players with a simple load test script:
```bash
# Create a simple WebSocket load test
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
perf(optimization): database indexing and memory optimizations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Balance & Economy Tuning

### Task 19: Balance & Economy Tuning

**Files:**
- Read: `content/enemies.json`
- Read: `content/items.json`

- [ ] **Step 1: Enemy balance analysis**

Check stat curves by level:
- For each level, compute average HP/ATK/DEF
- Plot progression curve
- Identify outliers (enemies much harder or easier than their level suggests)

- [ ] **Step 2: Loot table review**

- Check drop rates for rare items — are they actually rare?
- Ensure crafting material prices align with vendor prices
- Balance equipment progression curve

- [ ] **Step 3: Economy analysis**

- Sample gold earned per hour at different levels
- Sample gold spent on equipment/consumables per hour
- Identify if gold sinks are adequate

- [ ] **Step 4: Apply balance adjustments**

Update JSON catalogs with adjusted values.

- [ ] **Step 5: Commit**

```bash
git add content/*.json
git commit -m "$(cat <<'EOF'
balance(tuning): enemy stat curves, loot rates, and economy adjustments

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final Integration

### Task 20: Archive old TypeScript catalogs

**Files:**
- Delete: `src/data/areas.ts`, `src/data/enemies.ts`, `src/data/items.ts`, `src/data/skills.ts`, `src/data/crafting.ts`, `src/data/dungeons.ts`, `src/data/shops.ts`

- [ ] **Step 1: Verify all game code uses ContentManager**

Ensure no remaining imports from `../../data/` or `../data/`:
```bash
grep -rn "from.*data/" src/server/
grep -rn "from.*data/" src/client/
```
Expected: No matches.

- [ ] **Step 2: Archive files**

Delete the old TypeScript catalog files. Move to `archive/` instead of deleting:
```bash
mkdir -p src/data/archive
git mv src/data/areas.ts src/data/archive/
git mv src/data/enemies.ts src/data/archive/
# etc.
```

- [ ] **Step 3: Full integration test**

```bash
npm run build && node dist/server/index.js
```
Verify: game loads, combat works, content hot-reload works, events trigger.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(phase12): archive old TypeScript catalogs — fully migrated to JSON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Summary

**20 tasks across 5 workstreams:**

| Workstream | Tasks |
|-----------|-------|
| Content Manager | 1 (types), 2 (ContentManager) |
| JSON Migration | 3–9 (7 catalog files) |
| Hot Reload & Events | 10 (watcher), 11 (EventEngine) |
| Game Code Wiring | 12 (wire all imports) |
| Admin SPA | 13–15 (3 tabs) |
| Polish | 16 (bug fixes + UX) |
| Security | 17 (full audit) |
| Performance | 18 (DB + memory) |
| Balance | 19 (enemy/loot/economy) |
| Final Integration | 20 (archive old files) |

---

## Self-Review Checklist

- [ ] All 20 tasks have clear file paths and commands
- [ ] No "TBD" or placeholder steps
- [ ] Type definitions in Task 1 match usage in all subsequent tasks
- [ ] All imports from `src/data/` are replaced with ContentManager calls
- [ ] ContentManager methods (`getArea`, `getEnemy`, etc.) are consistently named
- [ ] EventEngine effect getters are consistently named and wired in CombatEngine
- [ ] Admin SPA tabs are added without breaking existing tabs
- [ ] Old TypeScript files are archived, not deleted (git mv)
