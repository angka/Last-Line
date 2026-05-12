import * as fs from 'fs';
import * as path from 'path';
import type { Area } from '../../types_content';
import type { Enemy } from '../../types_content';
import type { Item } from '../../types_content';
import type { Skill } from '../../types_content';
import type { Material, CraftingRecipe } from '../../types_content';
import type { DungeonDef } from '../../types_content';
import type { ShopCatalog } from '../../types_content';
import type { EquipSlot } from '../../types';

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
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`[ContentManager] Failed to parse ${filename}: ${err}`);
    return {} as T;
  }
}

export function loadAllCatalogs(): void {
  cache.areas = loadJson<Record<string, Area>>('areas.json');
  cache.enemies = loadJson<Record<string, Enemy>>('enemies.json');
  cache.items = loadJson<Record<string, Item>>('items.json');
  cache.skills = loadJson<Record<string, Skill>>('skills.json');
  const craftingData = loadJson<{ materials: Record<string, Material>; recipes: Record<string, CraftingRecipe> }>('crafting.json');
  cache.materials = craftingData.materials || {};
  cache.recipes = craftingData.recipes || {};
  cache.dungeons = loadJson<Record<string, DungeonDef>>('dungeons.json');
  cache.shops = loadJson<Record<string, ShopCatalog>>('shops.json');
  cache.loaded = true;
  cache.loadedAt = Date.now();
  console.log(`[ContentManager] Loaded catalogs at ${new Date().toISOString()}`);
}

export function reloadCatalog(name: keyof Omit<CatalogCache, 'loaded' | 'loadedAt'>): boolean {
  const mapping: Record<string, string> = {
    areas: 'areas.json',
    enemies: 'enemies.json',
    items: 'items.json',
    skills: 'skills.json',
    dungeons: 'dungeons.json',
    shops: 'shops.json',
  };

  if (name === 'materials' || name === 'recipes') {
    const data = loadJson<{ materials: Record<string, Material>; recipes: Record<string, CraftingRecipe> }>('crafting.json');
    if (name === 'materials') cache.materials = data.materials || {};
    else cache.recipes = data.recipes || {};
    console.log(`[ContentManager] Reloaded ${name} from crafting.json`);
    return true;
  }

  const file = mapping[name];
  if (!file) return false;

  if (name === 'areas') cache.areas = loadJson<Record<string, Area>>(file);
  else if (name === 'enemies') cache.enemies = loadJson<Record<string, Enemy>>(file);
  else if (name === 'items') cache.items = loadJson<Record<string, Item>>(file);
  else if (name === 'skills') cache.skills = loadJson<Record<string, Skill>>(file);
  else if (name === 'dungeons') cache.dungeons = loadJson<Record<string, DungeonDef>>(file);
  else if (name === 'shops') cache.shops = loadJson<Record<string, ShopCatalog>>(file);

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

// ─── Utility Functions (ported from data/*.ts) ─────────────────────────────────

export function getAllCities(): { id: string; name: string; minLevel?: number; tier: number }[] {
  // Cities are extracted from areas that are safeZone + city regenState
  return Object.values(cache.areas)
    .filter(a => a.safeZone && a.regenState === 'city')
    .map(a => ({ id: a.id, name: a.name, tier: 1 }))
    .sort((a, b) => {
      // Known city order by tier
      const order: string[] = [
        'ashford_village_square', 'iron_gate_town_square',
        'thornwick_square', 'millhaven_square',
        'crystalmere_city_square', 'emberveil_square',
        'duskhollow_square', 'stormspire_citadel_square',
        'veilreach_square', 'cinderpeak_square', 'ashenmoor_square',
        'wraithgate_square', 'obsidian_keep_square', 'the_sanctum_square',
      ];
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}

export function getCityById(id: string) {
  const cities = getAllCities();
  return cities.find(c => c.id === id);
}

export function isDungeonArea(areaId: string): boolean {
  const area = cache.areas[areaId];
  return area?.biome === 'dungeon';
}

export function describeArea(areaId: string): string {
  const area = cache.areas[areaId];
  if (!area) return 'Unknown area.';
  const isDungeon = area.biome === 'dungeon';
  const isBossFloor = area.name.toLowerCase().includes('boss') || area.name.toLowerCase().includes('ancient wyrm');
  let out = `\n  ${area.name}  [Lv ${area.levelRange[0]}–${area.levelRange[1]}, ${area.biome}]`;
  if (isBossFloor) out += '  ⚔ BOSS FLOOR';
  out += '\n  ──────────────────────────────────────────────────────────';
  out += '\n  ' + area.description;
  out += '\n  ──────────────────────────────────────────────────────────';
  out += '\n  Exits:';
  for (const [dir, target] of Object.entries(area.exits)) {
    const targetArea = cache.areas[target];
    out += `\n    [${dir}] ${targetArea?.name ?? target}`;
  }
  if (isDungeon) {
    out += '\n  [DUNGEON] Use "enter" to explore this floor for encounters.';
    out += '\n            Use "up" to go to previous floor, "down" to go deeper.';
  }
  if (area.baseEncounterChance > 0) {
    const pct = Math.round(area.baseEncounterChance * 100);
    out += `\n  Enemies patrol this area. [encounter chance: ${pct}%]`;
  } else {
    out += '\n  This is a safe area. No enemies will spawn here.';
  }
  return out;
}

export function rarityColor(rarity: string): string {
  const RARITY_COLORS: Record<string, string> = {
    common: '\x1b[37m', uncommon: '\x1b[32m', rare: '\x1b[36m',
    epic: '\x1b[35m', legendary: '\x1b[33m', mythic: '\x1b[31m',
  };
  return RARITY_COLORS[rarity] ?? '\x1b[0m';
}

export const RARITY_RESET = '\x1b[0m';

export function rarityName(rarity: string): string {
  return `[${rarity.charAt(0).toUpperCase() + rarity.slice(1)}]`;
}

export function getShopCatalog(cityId: string): ShopCatalog | undefined {
  return cache.shops[cityId];
}

export function scaleEnemy(enemy: Enemy, isElite = false): Enemy {
  if (!isElite) return enemy;
  return {
    ...enemy,
    id: `${enemy.id}_elite`,
    name: `Elite ${enemy.name}`,
    maxHp: Math.floor(enemy.maxHp * 1.5),
    attack: Math.floor(enemy.attack * 1.5),
    strength: Math.floor(enemy.strength * 1.5),
    agility: Math.floor(enemy.agility * 1.5),
    defense: Math.floor(enemy.defense * 1.5),
    expReward: Math.floor(enemy.expReward * 2),
    goldReward: Math.floor(enemy.goldReward * 2),
    isElite: true,
  };
}

export function getDungeonForArea(areaId: string): DungeonDef | undefined {
  return Object.values(cache.dungeons).find(d =>
    d.entrance === areaId || d.floors.some(f => f.areaId === areaId)
  );
}

export function getDungeonFloor(areaId: string): { dungeon: DungeonDef; floor: number } | null {
  for (const dungeon of Object.values(cache.dungeons)) {
    const idx = dungeon.floors.findIndex(f => f.areaId === areaId);
    if (idx !== -1) return { dungeon, floor: idx + 1 };
  }
  return null;
}

export function getNextFloorArea(areaId: string): string | null {
  const info = getDungeonFloor(areaId);
  if (!info) return null;
  const nextIdx = info.floor;
  const dungeon = info.dungeon;
  if (nextIdx >= dungeon.floors.length) return null;
  return dungeon.floors[nextIdx].areaId;
}

export function getPrevFloorArea(areaId: string): string | null {
  const info = getDungeonFloor(areaId);
  if (!info || info.floor <= 1) return null;
  return info.dungeon.floors[info.floor - 2].areaId;
}

export function getNextFloorArea2(areaId: string): string | null {
  // Check normal next floor
  const normalNext = getNextFloorArea(areaId);
  if (normalNext) return normalNext;
  // Check if at a normal last floor — transition to infinite
  const floorInfo = getDungeonFloor(areaId);
  if (floorInfo) {
    const dungeon = floorInfo.dungeon;
    const lastFloorIdx = dungeon.floors.length - 1;
    if (floorInfo.floor === dungeon.floors.length) {
      return `${INFINITE_FLOOR_PREFIX}${dungeon.id}__1`;
    }
  }
  return null;
}

export function getPrevFloorArea2(areaId: string): string | null {
  const info = getInfiniteFloorInfo(areaId);
  if (info) {
    if (info.infiniteFloor === 1) {
      const lastFloorIdx = info.dungeon.floors.length - 1;
      return info.dungeon.floors[lastFloorIdx].areaId;
    }
    return getPrevInfiniteFloorArea(areaId);
  }
  return getPrevFloorArea(areaId);
}

export const INFINITE_FLOOR_PREFIX = '__inf__';

export function isInfiniteFloor(areaId: string): boolean {
  return areaId.startsWith(INFINITE_FLOOR_PREFIX);
}

export function getInfiniteFloorInfo(areaId: string): { dungeon: DungeonDef; infiniteFloor: number } | null {
  if (!isInfiniteFloor(areaId)) return null;
  const parts = areaId.split('__');
  if (parts.length < 4) return null;
  const dungeonId = parts[2];
  const infiniteFloor = parseInt(parts[3]);
  const dungeon = cache.dungeons[dungeonId];
  if (!dungeon) return null;
  return { dungeon, infiniteFloor };
}

function getPrevInfiniteFloorArea(areaId: string): string | null {
  const info = getInfiniteFloorInfo(areaId);
  if (!info) return null;
  if (info.infiniteFloor <= 1) return null;
  return `${INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor - 1}`;
}

function getNextInfiniteFloorArea(areaId: string): string | null {
  const info = getInfiniteFloorInfo(areaId);
  if (!info) return null;
  if (info.infiniteFloor >= 50) return null;
  return `${INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor + 1}`;
}

export function describeInfiniteFloor(dungeon: DungeonDef, infiniteFloor: number): string {
  const depth = infiniteFloor - dungeon.floors.length;
  const tier = depth <= 2 ? 'Challenging' : depth <= 5 ? 'Perilous' : depth <= 10 ? 'Nightmarish' : 'Abyssal';
  const level = Math.min(99, 30 + depth * 3);
  return [
    `  ╔═══════════════════════════════════════════════════════╗`,
    `  ║  ${dungeon.name.toUpperCase()} — INFINITE DEPTH                      ║`,
    `  ╠═══════════════════════════════════════════════════════╣`,
    `  ║  Deep Floor ${String(infiniteFloor).padStart(2)} / ???    [${tier.padEnd(12)}]        ║`,
    `  ║  ──────────────────────────────────────────────────   ║`,
    `  ║  The air grows cold. Shadows move in the depths.     ║`,
    `  ║  Enemies here are level ${String(level).padStart(2)}+ — deadly.         ║`,
    `  ║  Boss has been vanquished. Deeper floors yield riches. ║`,
    `  ╠═══════════════════════════════════════════════════════╣`,
    `  ║  Exits: south (back up)                               ║`,
    `  ╚═══════════════════════════════════════════════════════╝`,
  ].join('\n');
}

export function getScrollDropsForTier(tier: number): string[] {
  const allSkills = Object.values(cache.skills);
  if (tier === 1) {
    return [
      'power_strike_scroll', 'quick_slash_scroll', 'bash_scroll',
      'fireball_scroll', 'ice_shard_scroll',
      'healing_touch_scroll', 'cleanse_scroll',
    ];
  }
  if (tier === 2) {
    return [
      'power_strike_scroll', 'quick_slash_scroll', 'cleave_scroll', 'bash_scroll',
      'thunder_bolt_scroll', 'ice_shard_scroll', 'frost_nova_scroll',
      'healing_touch_scroll', 'healing_light_scroll', 'haste_scroll', 'cleanse_scroll',
    ];
  }
  if (tier === 3) {
    return [
      'cleave_scroll', 'bash_scroll', 'execute_scroll', 'bleed_blade_scroll',
      'shadow_strike_scroll', 'thunder_bolt_scroll', 'chain_lightning_scroll',
      'holy_light_scroll', 'iron_guard_scroll', 'cleanse_scroll',
    ];
  }
  if (tier === 4) {
    return [
      'execute_scroll', 'bleed_blade_scroll', 'iron_swing_scroll',
      'soul_drain_scroll', 'void_blast_scroll', 'chain_lightning_scroll',
      'divine_smite_scroll', 'arcane_surge_scroll',
      'healing_light_scroll', 'empower_scroll', 'iron_guard_scroll', 'barrier_scroll',
    ];
  }
  return [
    'iron_swing_scroll', 'whirlwind_scroll', 'crushing_blow_scroll',
    'blaze_storm_scroll', 'glacial_spike_scroll', 'storm_urge_scroll',
    'void_blast_scroll', 'divine_smite_scroll', 'arcane_surge_scroll',
    'greater_heal_scroll', 'full_restore_scroll', 'empower_scroll',
    'arcane_infuse_scroll', 'barrier_scroll', 'resurrection_scroll', 'rally_scroll',
    'null_zone_scroll', 'void_collapse_scroll',
  ];
}

export function getSkillManaCost(skillLevel: number, baseCost: number): number {
  return Math.max(Math.floor(baseCost * Math.max(0.30, 1 - (skillLevel - 1) * 0.05)), 1);
}

export function getSkillLevelMultiplier(skillLevel: number): number {
  return 1 + (skillLevel - 1) * 0.10;
}

export function getSkillByItemId(itemId: string): { type: 'physical' | 'magic' | 'support'; skill: Skill } | undefined {
  const skill = cache.skills[itemId];
  if (!skill) return undefined;
  // Use type discriminator to determine skill type
  const s = skill as any;
  if (s.element) return { type: 'magic' as const, skill };
  if (s.targetType === 'ally' || s.targetType === 'self' || s.targetType === 'all_allies') return { type: 'support' as const, skill };
  return { type: 'physical' as const, skill };
}

export function getToolRequirementLabel(verb: string): string {
  switch (verb) {
    case 'mine': return 'requires Pickaxe';
    case 'chop': return 'requires Wood Axe';
    case 'fill': return 'consumes empty Water Flask';
    case 'sift': return 'no tool required';
    case 'attune': return 'requires attunement (void zones only)';
    default: return '';
  }
}

export function countMaterialsInInventory(inventory: Array<{ itemId: string; quantity: number }>, itemId: string): number {
  const slot = inventory.find(s => s.itemId === itemId);
  return slot?.quantity ?? 0;
}

export function canCraftRecipe(recipe: CraftingRecipe, inventory: Array<{ itemId: string; quantity: number }>): boolean {
  return recipe.materials.every(mat => {
    const have = countMaterialsInInventory(inventory, mat.itemId);
    return have >= mat.qty;
  });
}

export function getDefaultEquipment(): Record<EquipSlot, string | null> {
  return {
    weapon: 'wooden_sword',
    armor: 'tattered_cloth',
    accessory1: null,
    accessory2: null,
  };
}

// ─── Gathering Nodes (from crafting.json) ─────────────────────────────────────

interface GatheringNode {
  nodeId: string;
  nodeType: string;
  verb: string;
  name: string;
  position: string;
  maxUses: number;
  respawnMinutes: number;
  lootTable: Array<{ itemId: string; chance: number; qtyMin: number; qtyMax: number }>;
  requiresTool: string | null;
  minPlayerLevel: number;
}

interface CraftingData {
  materials: Record<string, Material>;
  recipes: Record<string, CraftingRecipe>;
  gatheringNodes?: Record<string, GatheringNode[]>;
}

let gatheringNodesCache: Record<string, GatheringNode[]> = {};

export function loadGatheringNodes(): void {
  const data = loadJson<CraftingData>('crafting.json');
  gatheringNodesCache = data.gatheringNodes ?? {};
}

export function getGatheringNodesForArea(areaId: string): GatheringNode[] {
  return gatheringNodesCache[areaId] ?? [];
}

export function getAreaNodes(areaId: string): GatheringNode[] {
  return getGatheringNodesForArea(areaId);
}