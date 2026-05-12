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
