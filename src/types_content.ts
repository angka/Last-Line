// Content types used by ContentManager (aligned with types.ts for seamless game code integration)
// These types must be compatible with src/types.ts since ContentManager returns values used by game code.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'scroll' | 'quest' | 'key';
export type EquipSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type Element = 'fire' | 'ice' | 'thunder' | 'shadow' | 'light' | 'earth' | 'wind' | 'arcane' | 'void';
export type StatusType = 'poison' | 'burn' | 'stun' | 'freeze' | 'bleed' | 'weaken' | 'shield' | 'regen' | 'curse' | 'silence';

export interface StatusEffect {
  id: string;
  name: string;
  type: StatusType;
  remainingTurns: number;
  value: number;
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
  statusEffects?: StatusEffect[];
  lootTable?: string[];
  skills?: string[];
  // Fields added by the game (not in JSON, set at runtime or via type extension)
  isBoss?: boolean;
  isElite?: boolean;
  element?: Element;
  dropTableId?: string;
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
  // Skill scroll type (for scroll items that teach skills)
  teachesSkill?: string;
}

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

// Unified Skill type used by ContentManager
export type Skill = PhysicalSkill | MagicSkill | SupportSkill;

export interface Material {
  id: string;
  name: string;
  type: 'herb' | 'ore' | 'wood' | 'crystal' | 'monster_drop' | 'essence' | 'cloth' | 'bone';
  biome: string[];
  rarity: string;
  description: string;
  stackable: boolean;
}

export interface CraftingMaterial {
  itemId: string;
  qty: number;
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

export interface GatheringNode {
  nodeId: string;
  nodeType: string;
  verb: string;
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
