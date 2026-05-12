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

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'accessory' | 'quest' | 'key';
export type EquipSlot = 'head' | 'chest' | 'legs' | 'feet' | 'hands' | 'weapon' | 'offhand' | 'accessory1' | 'accessory2' | 'ring';

export interface StatusEffect {
  id: string;
  name: string;
  type: 'poison' | 'burn' | 'freeze' | 'paralyze' | 'sleep' | 'stun' | 'blind' | 'silence';
  remainingTurns: number;
  value: number;
}

export interface ConsumableEffect {
  type: 'heal' | 'mana' | 'buff' | 'debuff' | 'revive';
  value: number;
  duration?: number;
  stat?: string;
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
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  rarity: Rarity;
  price: number;
  buyable: boolean;
  description: string;
  stats?: Record<string, number>;
  consumeEffect?: ConsumableEffect;
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
