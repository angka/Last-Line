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
  playerId: string;
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
  partyId?: string;
  pvp: PvPState;
  socialPrefs: SocialPrefs;
  regenState: RegenState;
  /** Phase 7: unlocked achievements */
  achievements: UnlockedAchievement[];
  /** Phase 7: achievement counters */
  achievementStats: {
    totalKills: number;
    bossKills: number;
    tradesCompleted: number;
    itemsCrafted: number;
    resourcesGathered: number;
    pvpKills: number;
    worldBossKills: number;
    dungeonsCleared: string[];
    deepestFloors: Record<string, number>;
    visitedAreas: string[];
  };
  /** Phase 8: PvP leaderboard stats */
  pvpStats: {
    kills: number;        // total PvP kills
    deaths: number;       // total PvP deaths
    winStreak: number;    // current win streak
    bestStreak: number;   // best ever win streak
    seasonWins: number;   // wins this season
    seasonPoints: number; // ranking points (ELO-like)
  };
}

export interface PvPState {
  enabled: boolean;   // player has toggled PvP on
  safeZone: boolean;   // area is a safe zone (no PvP possible)
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

/** Party combat session type (defined in CombatTimerEngine.ts) */
export interface PartyCombatSession {
  sessionId: string;
  participants: CombatParticipant[];
  turnIndex: number;
  round: number;
  areaId: string;
  log: CombatLogEntry[];
  turnStartedAt: number;
  turnTimeoutMs: number;
  timedOutCount: Map<string, number>;
  winner?: 'player' | 'enemy';
  partyId: string;
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
  partyCombatState?: any;   // Phase 5: PartyCombatSession
  combatTimerHandle?: { clear(): void };
  regenInterval?: NodeJS.Timeout;
  regenState: RegenState;
  connectedAt: Date;
  lastActivity: Date;
}

// ─── Multiplayer / Social Types ─────────────────────────────────────────────

export interface PresenceEntry {
  playerId: string;
  playerName: string;
  areaId: string;
  activity: PlayerActivity;
  level: number;
}

export type PlayerActivity = 'Exploring' | 'In Combat' | 'Resting' | 'Shopping' | 'Trading' | 'Crafting' | 'Gathering' | 'Away';

export interface ChatMessage {
  channel: 'area' | 'party' | 'whisper' | 'shout' | 'system';
  from: string;
  to?: string;
  text: string;
  timestamp: number;
}

// ─── Party Types ─────────────────────────────────────────────────────────────

export interface Party {
  partyId: string;
  leaderId: string;
  leaderName: string;
  members: PartyMember[];
  partyChatHistory: ChatMessage[];
  createdAt: number;
  combatSessionId?: string;
}

export interface PartyMember {
  playerId: string;
  playerName: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  activity: PlayerActivity;
  areaId: string;
  isLeader: boolean;
  isDowned: boolean;
  downedAt?: number;
  downedTimeout?: NodeJS.Timeout;
  timedOutCount: number;
}

// ─── Trade Types ─────────────────────────────────────────────────────────────

export interface TradeSession {
  tradeId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  areaId: string;
  itemId: string;
  itemName: string;
  itemRarity: Rarity;
  itemDescription: string;
  offeredPrice: number;
  agreedPrice: number | null;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  goldEscrowed: boolean;
  counterHistory: CounterOffer[];
  createdAt: number;
  expiresAt: number;
  timeoutHandle?: NodeJS.Timeout;
  status: TradeStatus;
}

export interface CounterOffer {
  from: string;
  price: number;
  timestamp: number;
}

export type TradeStatus = 'pending' | 'negotiating' | 'buyer_confirmed' | 'complete' | 'cancelled';

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
  /** Phase 8: newly unlocked achievements from this command */
  newlyUnlocked?: string[];
}

// ─── Achievement Types (Phase 7) ─────────────────────────────────────────

export type AchievementCategory = 'combat' | 'exploration' | 'social' | 'crafting' | 'collection' | 'pvp' | 'dungeon';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  points: number;           // achievement points value
  trigger: AchievementTrigger;
  reward?: {
    gold?: number;
    exp?: number;
    itemId?: string;
  };
}

export type AchievementTrigger =
  | { type: 'kill_count'; enemyType?: string; count: number }
  | { type: 'boss_kills'; count: number }
  | { type: 'area_visit'; areaId: string }
  | { type: 'dungeon_clear'; dungeonId: string }
  | { type: 'level_reach'; level: number }
  | { type: 'gold_earn'; amount: number }
  | { type: 'pvp_kills'; count: number }
  | { type: 'trade_count'; count: number }
  | { type: 'craft_count'; count: number }
  | { type: 'gather_count'; count: number }
  | { type: 'item_equip'; itemRarity: Rarity }
  | { type: 'world_boss_kill'; bossId: string }
  | { type: 'dungeon_floor'; dungeonId: string; floor: number }
  | { type: 'party_size'; size: number }
  | { type: 'login_days'; days: number };

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

// ─── World Boss Types (Phase 7) ──────────────────────────────────────────

export interface WorldBossDef {
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
  dropTableId: string;
  spawnIntervalMinutes: number;   // auto-spawn interval
  minPlayersRequired: number;     // minimum online players to spawn
  broadcastRadius: 'server' | 'region' | 'area';
}

export interface WorldBossEvent {
  bossId: string;
  areaId: string;
  startedAt: number;
  expiresAt: number;             // despawn if not killed in time
  participants: string[];        // playerIds who dealt damage
  damageDealt: Map<string, number>; // playerId → total damage
  currentHp: number;
  maxHp: number;
  isActive: boolean;
}

// ─── PvP Combat Types (Phase 7) ──────────────────────────────────────────

export interface PvPParticipant {
  playerId: string;
  playerName: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  strength: number;
  agility: number;
  critRate: number;
  critDamage: number;
  defense: number;
  statusEffects: StatusEffect[];
  isPlayer: true;
}

export interface PvPCombatSession {
  sessionId: string;
  attackerId: string;
  defenderId: string;
  areaId: string;
  participants: PvPParticipant[];
  turnIndex: number;
  round: number;
  log: CombatLogEntry[];
  turnStartedAt: number;
  turnTimeoutMs: number;
  winner?: 'attacker' | 'defender';
  isActive: boolean;
}

// ─── REST API Types (Phase 7 — Admin) ────────────────────────────────────

export interface ServerStats {
  onlinePlayers: number;
  totalPlayers: number;
  uptime: number;
  version: string;
  activeBossEvents: number;
  activePvPSessions: number;
  memoryUsageMb: number;
}
