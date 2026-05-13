import type { Enemy } from '../types';

// ─── Enemy Definitions ───────────────────────────────────────────────────────

export const ENEMIES: Record<string, Enemy> = {
  // ── Region 1: Whispering Plains (Lv 1–8) ──────────────────────────────
  feral_wolf: {
    id: 'feral_wolf', name: 'Feral Wolf', level: 1,
    maxHp: 40, attack: 8, strength: 3, agility: 6, defense: 2,
    expReward: 15, goldReward: 5,
  },
  slime: {
    id: 'slime', name: 'Slime', level: 1,
    maxHp: 25, attack: 5, strength: 1, agility: 3, defense: 5,
    expReward: 8, goldReward: 3,
  },
  bandit: {
    id: 'bandit', name: 'Bandit', level: 3,
    maxHp: 55, attack: 12, strength: 5, agility: 7, defense: 4,
    expReward: 25, goldReward: 12,
  },
  goblin_scout: {
    id: 'goblin_scout', name: 'Goblin Scout', level: 3,
    maxHp: 45, attack: 10, strength: 4, agility: 8, defense: 3,
    expReward: 20, goldReward: 10,
  },
  forest_spider: {
    id: 'forest_spider', name: 'Forest Spider', level: 5,
    maxHp: 65, attack: 14, strength: 6, agility: 9, defense: 5,
    expReward: 35, goldReward: 18,
    statusEffects: [{ id: 'venom', name: 'Poison', type: 'poison', remainingTurns: 3, value: 5 }],
  },
  wild_boar: {
    id: 'wild_boar', name: 'Wild Boar', level: 6,
    maxHp: 80, attack: 16, strength: 8, agility: 5, defense: 7,
    expReward: 45, goldReward: 22,
  },

  // ── Region 2: Mid-level ─────────────────────────────────────────────
  cave_bat: {
    id: 'cave_bat', name: 'Cave Bat', level: 6,
    maxHp: 50, attack: 13, strength: 4, agility: 10, defense: 3,
    expReward: 30, goldReward: 15,
  },
  mine_rat: {
    id: 'mine_rat', name: 'Mine Rat', level: 7,
    maxHp: 60, attack: 14, strength: 5, agility: 6, defense: 6,
    expReward: 38, goldReward: 18,
  },
  marsh_toad: {
    id: 'marsh_toad', name: 'Marsh Toad', level: 10,
    maxHp: 90, attack: 18, strength: 8, agility: 4, defense: 10,
    expReward: 65, goldReward: 30,
  },
  dire_wolf: {
    id: 'dire_wolf', name: 'Dire Wolf', level: 12,
    maxHp: 120, attack: 24, strength: 12, agility: 14, defense: 8,
    expReward: 90, goldReward: 45,
  },
  forest_witch: {
    id: 'forest_witch', name: 'Forest Witch', level: 14,
    maxHp: 100, attack: 20, strength: 6, agility: 12, defense: 6,
    expReward: 100, goldReward: 55,
    element: 'earth',
  },

  // ── Region 3 ──────────────────────────────────────────────────────────
  sand_lion: {
    id: 'sand_lion', name: 'Sand Lion', level: 18,
    maxHp: 160, attack: 32, strength: 18, agility: 20, defense: 12,
    expReward: 150, goldReward: 80,
  },
  crystal_scorpion: {
    id: 'crystal_scorpion', name: 'Crystal Scorpion', level: 22,
    maxHp: 130, attack: 28, strength: 14, agility: 16, defense: 15,
    expReward: 180, goldReward: 95,
    element: 'arcane',
  },
  sand_wyrm: {
    id: 'sand_wyrm', name: 'Sand Wyrm', level: 25,
    maxHp: 200, attack: 38, strength: 22, agility: 12, defense: 18,
    expReward: 220, goldReward: 120,
  },
  fire_imp: {
    id: 'fire_imp', name: 'Fire Imp', level: 28,
    maxHp: 150, attack: 35, strength: 10, agility: 22, defense: 10,
    expReward: 200, goldReward: 100,
    element: 'fire',
  },

  // ── Region 4 ─────────────────────────────────────────────────────────
  swamp_troll: {
    id: 'swamp_troll', name: 'Swamp Troll', level: 32,
    maxHp: 280, attack: 45, strength: 30, agility: 8, defense: 25,
    expReward: 300, goldReward: 160,
  },
  venomfang_viper: {
    id: 'venomfang_viper', name: 'Venomfang Viper', level: 35,
    maxHp: 200, attack: 50, strength: 18, agility: 28, defense: 12,
    expReward: 350, goldReward: 180,
    statusEffects: [{ id: 'venom', name: 'Poison', type: 'poison', remainingTurns: 4, value: 20 }],
    element: 'earth',
  },
  shadow_stalker: {
    id: 'shadow_stalker', name: 'Shadow Stalker', level: 40,
    maxHp: 240, attack: 55, strength: 25, agility: 35, defense: 18,
    expReward: 420, goldReward: 220,
    element: 'shadow',
  },

  // ── Region 5 ─────────────────────────────────────────────────────────
  thunder_drake: {
    id: 'thunder_drake', name: 'Thunder Drake', level: 48,
    maxHp: 350, attack: 65, strength: 35, agility: 40, defense: 28,
    expReward: 550, goldReward: 300,
    element: 'thunder',
  },
  wyvern: {
    id: 'wyvern', name: 'Wyvern', level: 55,
    maxHp: 420, attack: 78, strength: 45, agility: 38, defense: 35,
    expReward: 700, goldReward: 400,
  },

  // ── Region 6 ─────────────────────────────────────────────────────────
  ash_drake: {
    id: 'ash_drake', name: 'Ash Drake', level: 65,
    maxHp: 500, attack: 90, strength: 55, agility: 42, defense: 45,
    expReward: 900, goldReward: 500,
    element: 'fire',
  },
  elder_wyvern: {
    id: 'elder_wyvern', name: 'Elder Wyvern', level: 72,
    maxHp: 620, attack: 105, strength: 65, agility: 48, defense: 55,
    expReward: 1200, goldReward: 650,
  },

  // ── Region 7 ─────────────────────────────────────────────────────────
  spectral_wolf: {
    id: 'spectral_wolf', name: 'Spectral Wolf', level: 80,
    maxHp: 580, attack: 100, strength: 60, agility: 70, defense: 40,
    expReward: 1500, goldReward: 800,
    element: 'shadow',
  },
  wraith_hound: {
    id: 'wraith_hound', name: 'Wraith Hound', level: 82,
    maxHp: 650, attack: 115, strength: 70, agility: 65, defense: 50,
    expReward: 1800, goldReward: 900,
    element: 'shadow',
  },

  // ── Region 8 ─────────────────────────────────────────────────────────
  void_walker: {
    id: 'void_walker', name: 'Void Walker', level: 90,
    maxHp: 800, attack: 130, strength: 80, agility: 75, defense: 65,
    expReward: 2400, goldReward: 1200,
    element: 'void',
  },
  abyssal_knight: {
    id: 'abyssal_knight', name: 'Abyssal Knight', level: 95,
    maxHp: 1000, attack: 155, strength: 100, agility: 70, defense: 85,
    expReward: 3000, goldReward: 1500,
  },
  void_dragon_spawn: {
    id: 'void_dragon_spawn', name: 'Void Dragon Spawn', level: 98,
    maxHp: 900, attack: 140, strength: 90, agility: 80, defense: 70,
    expReward: 2800, goldReward: 1400,
    element: 'void',
  },

  // ── BOSSES ────────────────────────────────────────────────────────────
  goblin_warlord: {
    id: 'goblin_warlord', name: 'Goblin Warlord', level: 6, isBoss: true,
    maxHp: 400, attack: 25, strength: 18, agility: 10, defense: 15,
    expReward: 500, goldReward: 200, dropTableId: 'goblin_warlord',
  },
  ancient_treant: {
    id: 'ancient_treant', name: 'Ancient Treant', level: 10, isBoss: true,
    maxHp: 600, attack: 30, strength: 22, agility: 6, defense: 20,
    expReward: 800, goldReward: 350, dropTableId: 'ancient_treant',
  },
  iron_golem_lord: {
    id: 'iron_golem_lord', name: 'Iron Golem Lord', level: 15, isBoss: true,
    maxHp: 800, attack: 38, strength: 30, agility: 4, defense: 30,
    expReward: 1100, goldReward: 500, dropTableId: 'iron_golem_lord',
  },
  thornwitch_morgara: {
    id: 'thornwitch_morgara', name: 'Thornwitch Morgara', level: 20, isBoss: true,
    maxHp: 700, attack: 35, strength: 15, agility: 18, defense: 14,
    expReward: 1400, goldReward: 600, element: 'earth', dropTableId: 'thornwitch_morgara',
  },
  crystal_golem_sov: {
    id: 'crystal_golem_sov', name: 'Crystal Golem Sovereign', level: 28, isBoss: true,
    maxHp: 1000, attack: 48, strength: 28, agility: 12, defense: 25,
    expReward: 2000, goldReward: 900, element: 'arcane', dropTableId: 'crystal_golem_sov',
  },
  magma_titan_krag: {
    id: 'magma_titan_krag', name: 'Magma Titan Krag', level: 38, isBoss: true,
    maxHp: 1400, attack: 60, strength: 45, agility: 14, defense: 38,
    expReward: 3000, goldReward: 1200, element: 'fire', dropTableId: 'magma_titan_krag',
  },
  void_wraith_zelthar: {
    id: 'void_wraith_zelthar', name: 'Void Wraith Zelthar', level: 48, isBoss: true,
    maxHp: 1600, attack: 75, strength: 50, agility: 40, defense: 40,
    expReward: 4000, goldReward: 1500, element: 'void', dropTableId: 'void_wraith_zelthar',
  },
  storm_archon_velorak: {
    id: 'storm_archon_velorak', name: 'Storm Archon Velorak', level: 62, isBoss: true,
    maxHp: 2000, attack: 95, strength: 60, agility: 55, defense: 55,
    expReward: 5500, goldReward: 2000, element: 'thunder', dropTableId: 'storm_archon_velorak',
  },
  lich_king_malachar: {
    id: 'lich_king_malachar', name: 'Lich King Malachar', level: 82, isBoss: true,
    maxHp: 2500, attack: 120, strength: 80, agility: 50, defense: 70,
    expReward: 7500, goldReward: 3000, element: 'shadow', dropTableId: 'lich_king_malachar',
  },
  archon_of_chaos_xerath: {
    id: 'archon_of_chaos_xerath', name: 'Archon of Chaos Xerath', level: 100, isBoss: true,
    maxHp: 3500, attack: 160, strength: 100, agility: 70, defense: 90,
    expReward: 10000, goldReward: 5000, element: 'arcane', dropTableId: 'archon_of_chaos_xerath',
  },
  // ── Dungeon Bosses ─────────────────────────────────────────────────────────
  goblin_chieftain: {
    id: 'goblin_chieftain', name: 'Goblin Chieftain', level: 5, isBoss: true,
    maxHp: 200, attack: 22, strength: 15, agility: 10, defense: 8,
    expReward: 180, goldReward: 80, dropTableId: 'goblin_warren',
  },
  treant_ancient: {
    id: 'treant_ancient', name: 'Treant Ancient', level: 22, isBoss: true,
    maxHp: 650, attack: 48, strength: 35, agility: 12, defense: 22,
    expReward: 900, goldReward: 350, element: 'earth', dropTableId: 'thornwick_ruins',
  },
  mine_wyrm: {
    id: 'mine_wyrm', name: 'Mine Wyrm', level: 18, isBoss: true,
    maxHp: 480, attack: 40, strength: 30, agility: 14, defense: 18,
    expReward: 600, goldReward: 250, element: 'earth', dropTableId: 'sunken_mines',
  },
  lich_lord: {
    id: 'lich_lord', name: 'Lich Lord Vexar', level: 36, isBoss: true,
    maxHp: 1100, attack: 75, strength: 28, agility: 20, defense: 30,
    expReward: 2200, goldReward: 900, element: 'shadow', dropTableId: 'mirefen_catacombs',
  },
  ancient_dragon: {
    id: 'ancient_dragon', name: 'The Ancient Dragon', level: 85, isBoss: true,
    maxHp: 4500, attack: 160, strength: 100, agility: 55, defense: 90,
    expReward: 12000, goldReward: 6000, element: 'fire', dropTableId: 'dragons_lair',
  },

  the_nameless_void: {
    id: 'the_nameless_void', name: 'The Nameless Void', level: 105, isBoss: true,
    maxHp: 5000, attack: 200, strength: 130, agility: 80, defense: 120,
    expReward: 15000, goldReward: 8000, element: 'void', dropTableId: 'the_nameless_void',
  },
};

export function getEnemy(id: string): Enemy | undefined {
  return ENEMIES[id];
}

export function getEnemyPool(levelRange: [number, number]): Enemy[] {
  return Object.values(ENEMIES).filter(e => !e.isBoss && e.level >= levelRange[0] && e.level <= levelRange[1]);
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
