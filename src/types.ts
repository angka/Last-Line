// ─── Core Types ─────────────────────────────────────────────────────────────

export interface PlayerStats {
  name: string;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  strength: number;
  agility: number;
  defense: number;
  luck: number;
  attack: number;
  critRate: number;
  critDamage: number;
  freeStatPoints: number;
  perkSlots: number;
}

export interface InventorySlot {
  slotId: string;
  itemId: string;
  quantity: number;
  equipped: boolean;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  description: string;
  damage?: number;
  defense?: number;
  accuracy?: number;
  strengthBonus?: number;
  agilityBonus?: number;
  defenseBonus?: number;
  luckBonus?: number;
  critRateBonus?: number;
  critDamageBonus?: number;
  hpBonus?: number;
  manaBonus?: number;
  effect?: ItemEffect;
  consumable?: boolean;
  healAmount?: number;
  manaRestore?: number;
  stackable: boolean;
  buyPrice: number;
  sellPrice: number;
  tradelock: boolean;
  equipSlot?: EquipSlot;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'scroll' | 'quest' | 'key';
export type EquipSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type ItemEffect = 'heal' | 'mana_restore' | 'poison' | 'burn' | 'cleanse' | 'buff';

export interface PhysicalSkill {
  id: string;
  name: string;
  level: number;
  killCount: number;
  manaCost: number;
  baseDamage: number;
  scalingStat: 'strength';
  description: string;
}

export interface MagicSkill {
  id: string;
  name: string;
  level: number;
  killCount: number;
  manaCost: number;
  baseDamage: number;
  scalingStat: 'mana';
  element: Element;
  description: string;
}

export type Element = 'fire' | 'ice' | 'thunder' | 'shadow' | 'light' | 'earth' | 'wind' | 'arcane' | 'void';

export interface SupportSkill {
  id: string;
  name: string;
  level: number;
  linkedKills: number;
  manaCost: number;
  targetType: 'ally' | 'self' | 'all_allies';
  effectType: 'heal' | 'buff_stat' | 'cleanse' | 'shield' | 'revive';
  effectValue: number;
  duration?: number;
  description: string;
}

// ─── Skill Level Thresholds ─────────────────────────────────────────

export const SKILL_LEVEL_THRESHOLDS: number[] = [
  0,   // Lv 1
  10,  // Lv 2
  25,  // Lv 3
  50,  // Lv 4
  100, // Lv 5
  200, // Lv 6
  400, // Lv 7
  750, // Lv 8
  1500,// Lv 9
  3000,// Lv 10
];

export function getNextSkillLevelThreshold(currentLevel: number): number {
  return SKILL_LEVEL_THRESHOLDS[currentLevel] ?? 3000;
}

// ─── Material & Crafting Types ──────────────────────────────────────

export type MaterialBiome = 'grassland' | 'forest' | 'deep_forest' | 'cave' | 'mountain' | 'swamp' | 'volcanic' | 'savanna' | 'coast' | 'dark_forest' | 'moor' | 'haunted' | 'void' | 'bamboo';

export interface Material {
  id: string;
  name: string;
  type: 'herb' | 'ore' | 'wood' | 'crystal' | 'monster_drop' | 'essence' | 'cloth' | 'bone';
  biome: MaterialBiome[];
  rarity: Rarity;
  description: string;
  stackable: boolean;
}

export interface GatheringNode {
  nodeId: string;
  nodeType: 'herb_patch' | 'mining_vein' | 'lumber_spot' | 'fungal_cluster' | 'water_source' | 'bone_pile';
  verb: 'gather' | 'mine' | 'chop' | 'pick' | 'fill' | 'sift' | 'attune';
  name: string;
  position: string;
  maxUses: number;
  respawnMinutes: number;
  lootTable: GatheringLootEntry[];
  requiresTool: string | null;
  minPlayerLevel: number;
}

export interface GatheringLootEntry {
  itemId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  outputItemId: string;
  outputQty: number;
  skillLevelRequired: number;
  materials: CraftingMaterial[];
  description: string;
}

export interface CraftingMaterial {
  itemId: string;
  qty: number;
}

// ─── Loot Types ──────────────────────────────────────────────────────

export interface LootEntry {
  itemId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
  luckScaling: boolean;
}

export interface BossDropTable {
  bossId: string;
  guaranteed: LootEntry[];
  exclusive: LootEntry[];
  commonPool: LootEntry[];
}

export interface StatusEffect {
  id: string;
  name: string;
  type: StatusType;
  remainingTurns: number;
  value: number;
}

export type StatusType = 'poison' | 'burn' | 'stun' | 'freeze' | 'bleed' | 'weaken' | 'shield' | 'regen' | 'curse' | 'silence';

// ─── Save / World Types ────────────────────────────────────────────────────

export interface SaveFile {
  saveId: string;
  playerName: string;
  savedAt: string;
  playtime: number;
  stats: PlayerStats;
  inventory: InventorySlot[];
  equipped: Record<EquipSlot, string | null>;
  skills: {
    physical: PhysicalSkill[];
    magic: MagicSkill[];
    support: SupportSkill[];
  };
  worldState: {
    currentArea: string;
    currentCity: string;
    unlockedCities: string[];
    unlockedDungeons: string[];
    defeatedBosses: string[];
    dungeonProgress: DungeonProgress[];
    dungeonChests: DungeonChestLoot[];
  };
  pendingLoot: LootDrop[];
  socialPrefs: SocialPrefs;
  regenState: RegenState;
}

export interface DungeonProgress {
  dungeonId: string;
  currentFloor: number;
  completed: boolean;
  clearedFloors: number[];
}

export interface DungeonChestLoot {
  areaId: string;
  items: LootDrop[];
  opened: boolean;
}

// ─── Dungeon Types ────────────────────────────────────────────────────────

export interface DungeonDef {
  id: string;
  name: string;
  entrance: string; // areaId
  floors: DungeonFloor[];
  bossId: string; // enemy id for the boss floor
  unlockArea: string; // wilderness area that unlocks this dungeon on first visit
}

export interface DungeonFloor {
  floor: number;
  areaId: string;
  enemyCount: [number, number]; // [min, max]
  eliteChance: number;
  bossFloor: boolean;
}

// ─── Shop Types ────────────────────────────────────────────────────────────

export interface ShopCatalog {
  cityId: string;
  items: string[]; // item IDs
}

export interface ShopItem {
  itemId: string;
  stock: number;   // -1 = unlimited
  priceMultiplier: number; // 1.0 = retail, >1 = premium
}

export interface SocialPrefs {
  chatVisible: boolean;
  nearbyVisible: boolean;
  chatArea: boolean;
  chatParty: boolean;
  chatShout: boolean;
}

export type RegenState = 'exploring' | 'safe_area' | 'city' | 'inn' | 'combat';

export interface LootDrop {
  itemId: string;
  name: string;
  rarity: Rarity;
  quantity: number;
}

// ─── Combat Types ─────────────────────────────────────────────────────────

export interface CombatParticipant {
  id: string;
  type: 'player' | 'enemy';
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  strength: number;
  agility: number;
  defense: number;
  critRate: number;
  critDamage: number;
  statusEffects: StatusEffect[];
  agiRoll: number;
  isPlayer?: boolean;
  playerId?: string;
  isElite?: boolean;
  isBoss?: boolean;
  level?: number;
}

export interface CombatSession {
  sessionId: string;
  participants: CombatParticipant[];
  turnIndex: number;
  round: number;
  areaId: string;
  log: CombatLogEntry[];
  turnTimer?: NodeJS.Timeout;
  turnStartedAt: number;
  turnTimeoutMs: number;
  timedOutCount: Map<string, number>;
  winner?: 'player' | 'enemy';
}

export interface CombatLogEntry {
  round: number;
  text: string;
}

// ─── Enemy Types ─────────────────────────────────────────────────────────

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
  statusEffects?: StatusEffect[];
  isBoss?: boolean;
  isElite?: boolean;
  dropTableId?: string;
  element?: Element;
}

// ─── Regen Types ──────────────────────────────────────────────────────────

export interface RegenTickResult {
  hpGain: number;
  manaGain: number;
  newHp: number;
  newMana: number;
}

// ─── GameSession Types ───────────────────────────────────────────────────

export interface GameSession {
  sessionId: string;
  socket: import('ws').WebSocket;
  playerId: string;
  saveSlot: number;
  currentState: SaveFile;
  combatState?: CombatSession;
  regenInterval?: NodeJS.Timeout;
  regenState: RegenState;
  connectedAt: Date;
  lastActivity: Date;
}

// ─── Menu Types ──────────────────────────────────────────────────────────

export type MenuState =
  | { type: 'main' }
  | { type: 'save_select' }
  | { type: 'char_create' }
  | { type: 'gameplay' }
  | { type: 'combat' }
  | { type: 'inn' }
  | { type: 'shop' };

// ─── Command Result ───────────────────────────────────────────────────────

export interface CommandResult {
  text: string;
  clear?: boolean;
}
