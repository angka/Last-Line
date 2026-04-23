/**
 * Phase 7 — Achievement System
 * Defines achievements, unlock logic, and `achievements` command formatting.
 */

import type { AchievementDef, AchievementCategory, UnlockedAchievement, SaveFile, Rarity } from '../../types';

// ─── Achievement Definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: Record<string, AchievementDef> = {

  // ── COMBAT ────────────────────────────────────────────────────────────────
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Defeat your first enemy.',
    category: 'combat',
    icon: '⚔',
    points: 10,
    trigger: { type: 'kill_count', count: 1 },
    reward: { exp: 50 },
  },
  monster_hunter: {
    id: 'monster_hunter',
    name: 'Monster Hunter',
    description: 'Defeat 50 enemies.',
    category: 'combat',
    icon: '🗡',
    points: 50,
    trigger: { type: 'kill_count', count: 50 },
    reward: { gold: 200 },
  },
  slayer: {
    id: 'slayer',
    name: 'Slayer',
    description: 'Defeat 200 enemies.',
    category: 'combat',
    icon: '💀',
    points: 100,
    trigger: { type: 'kill_count', count: 200 },
    reward: { exp: 2000 },
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    description: 'Defeat 500 enemies.',
    category: 'combat',
    icon: '🏅',
    points: 250,
    trigger: { type: 'kill_count', count: 500 },
    reward: { gold: 1000 },
  },
  champion_of_the_line: {
    id: 'champion_of_the_line',
    name: 'Champion of the Line',
    description: 'Defeat 1000 enemies.',
    category: 'combat',
    icon: '👑',
    points: 500,
    trigger: { type: 'kill_count', count: 1000 },
    reward: { exp: 10000, gold: 5000 },
  },

  // ── BOSSES ────────────────────────────────────────────────────────────────
  boss_slayer_1: {
    id: 'boss_slayer_1',
    name: 'Dungeon Delver',
    description: 'Defeat your first dungeon boss.',
    category: 'combat',
    icon: '🛡',
    points: 25,
    trigger: { type: 'boss_kills', count: 1 },
    reward: { exp: 500 },
  },
  boss_slayer_5: {
    id: 'boss_slayer_5',
    name: 'Boss Breaker',
    description: 'Defeat 5 dungeon bosses.',
    category: 'combat',
    icon: '⚡',
    points: 75,
    trigger: { type: 'boss_kills', count: 5 },
    reward: { gold: 1000 },
  },
  boss_slayer_all: {
    id: 'boss_slayer_all',
    name: 'Last Line Holder',
    description: 'Defeat all 5 dungeon bosses.',
    category: 'combat',
    icon: '🔥',
    points: 300,
    trigger: { type: 'boss_kills', count: 5 },
    reward: { exp: 5000, gold: 2500 },
  },

  // ── LEVEL ─────────────────────────────────────────────────────────────────
  level_10: {
    id: 'level_10',
    name: 'Rising Hero',
    description: 'Reach level 10.',
    category: 'combat',
    icon: '⭐',
    points: 20,
    trigger: { type: 'level_reach', level: 10 },
    reward: { exp: 300 },
  },
  level_25: {
    id: 'level_25',
    name: 'Veteran Warrior',
    description: 'Reach level 25.',
    category: 'combat',
    icon: '🌟',
    points: 60,
    trigger: { type: 'level_reach', level: 25 },
    reward: { exp: 2000 },
  },
  level_50: {
    id: 'level_50',
    name: 'Elite Champion',
    description: 'Reach level 50.',
    category: 'combat',
    icon: '✨',
    points: 150,
    trigger: { type: 'level_reach', level: 50 },
    reward: { gold: 3000 },
  },

  // ── DUNGEONS ─────────────────────────────────────────────────────────────
  dungeon_cleared_goblin: {
    id: 'dungeon_cleared_goblin',
    name: 'Goblin Purger',
    description: 'Clear Goblin Warren.',
    category: 'dungeon',
    icon: '🏚',
    points: 30,
    trigger: { type: 'dungeon_clear', dungeonId: 'goblin_warren' },
    reward: { exp: 400 },
  },
  dungeon_cleared_thornwick: {
    id: 'dungeon_cleared_thornwick',
    name: 'Thornwick Guardian',
    description: 'Clear Thornwick Ruins.',
    category: 'dungeon',
    icon: '🌿',
    points: 50,
    trigger: { type: 'dungeon_clear', dungeonId: 'thornwick_ruins' },
    reward: { exp: 1500 },
  },
  dungeon_cleared_sunken: {
    id: 'dungeon_cleared_sunken',
    name: 'Mine Breaker',
    description: 'Clear Sunken Mines.',
    category: 'dungeon',
    icon: '⛏',
    points: 60,
    trigger: { type: 'dungeon_clear', dungeonId: 'sunken_mines' },
    reward: { exp: 2500 },
  },
  dungeon_cleared_mirefen: {
    id: 'dungeon_cleared_mirefen',
    name: 'Grave Walker',
    description: 'Clear Mirefen Catacombs.',
    category: 'dungeon',
    icon: '🦴',
    points: 80,
    trigger: { type: 'dungeon_clear', dungeonId: 'mirefen_catacombs' },
    reward: { gold: 2000 },
  },
  dungeon_cleared_dragon: {
    id: 'dungeon_cleared_dragon',
    name: 'Dragon Slayer',
    description: 'Clear Dragon\'s Lair.',
    category: 'dungeon',
    icon: '🐉',
    points: 200,
    trigger: { type: 'dungeon_clear', dungeonId: 'dragons_lair' },
    reward: { exp: 10000, gold: 5000 },
  },
  deepest_floor: {
    id: 'deepest_floor',
    name: 'Bottom Feeder',
    description: 'Reach the deepest floor of any dungeon.',
    category: 'dungeon',
    icon: '🕳',
    points: 40,
    trigger: { type: 'dungeon_floor', dungeonId: '__any__', floor: 99 },
    reward: { exp: 500 },
  },

  // ── EXPLORATION ───────────────────────────────────────────────────────────
  world_explorer: {
    id: 'world_explorer',
    name: 'World Explorer',
    description: 'Visit all 8 regions.',
    category: 'exploration',
    icon: '🗺',
    points: 75,
    trigger: { type: 'area_visit', areaId: '__all_regions__' },
    reward: { exp: 1000 },
  },

  // ── CRAFTING ─────────────────────────────────────────────────────────────
  apprentice_crafter: {
    id: 'apprentice_crafter',
    name: 'Apprentice Crafter',
    description: 'Craft 10 items.',
    category: 'crafting',
    icon: '🔨',
    points: 20,
    trigger: { type: 'craft_count', count: 10 },
    reward: { gold: 100 },
  },
  master_crafter: {
    id: 'master_crafter',
    name: 'Master Crafter',
    description: 'Craft 50 items.',
    category: 'crafting',
    icon: '🛠',
    points: 80,
    trigger: { type: 'craft_count', count: 50 },
    reward: { gold: 500 },
  },

  // ── GATHERING ────────────────────────────────────────────────────────────
  gatherer: {
    id: 'gatherer',
    name: 'Resource Gatherer',
    description: 'Gather 100 resources.',
    category: 'collection',
    icon: '🌾',
    points: 30,
    trigger: { type: 'gather_count', count: 100 },
    reward: { gold: 300 },
  },
  master_gatherer: {
    id: 'master_gatherer',
    name: 'Master Gatherer',
    description: 'Gather 500 resources.',
    category: 'collection',
    icon: '💎',
    points: 100,
    trigger: { type: 'gather_count', count: 500 },
    reward: { exp: 2000 },
  },

  // ── TRADING ─────────────────────────────────────────────────────────────
  trader: {
    id: 'trader',
    name: 'Merchant',
    description: 'Complete 10 trades.',
    category: 'social',
    icon: '💰',
    points: 25,
    trigger: { type: 'trade_count', count: 10 },
    reward: { gold: 250 },
  },
  big_trader: {
    id: 'big_trader',
    name: 'Commerce Master',
    description: 'Complete 50 trades.',
    category: 'social',
    icon: '📦',
    points: 70,
    trigger: { type: 'trade_count', count: 50 },
    reward: { gold: 1500 },
  },

  // ── PvP ──────────────────────────────────────────────────────────────────
  first_pvp_kill: {
    id: 'first_pvp_kill',
    name: 'Warlord',
    description: 'Defeat another player in PvP combat.',
    category: 'pvp',
    icon: '⚔',
    points: 50,
    trigger: { type: 'pvp_kills', count: 1 },
    reward: { exp: 500 },
  },
  pvp_veteran: {
    id: 'pvp_veteran',
    name: 'Arena Veteran',
    description: 'Defeat 10 players in PvP combat.',
    category: 'pvp',
    icon: '🛡',
    points: 150,
    trigger: { type: 'pvp_kills', count: 10 },
    reward: { gold: 2000 },
  },

  // ── WORLD BOSS ───────────────────────────────────────────────────────────
  world_boss_hunter: {
    id: 'world_boss_hunter',
    name: 'World Boss Hunter',
    description: 'Participate in defeating a World Boss.',
    category: 'combat',
    icon: '🌍',
    points: 100,
    trigger: { type: 'world_boss_kill', bossId: '__any__' },
    reward: { exp: 3000 },
  },

  // ── RARITY ─────────────────────────────────────────────────────────────
  legendary_gear: {
    id: 'legendary_gear',
    name: 'Legendary Gear',
    description: 'Equip your first legendary item.',
    category: 'collection',
    icon: '💍',
    points: 100,
    trigger: { type: 'item_equip', itemRarity: 'legendary' },
    reward: { exp: 1000 },
  },
  mythic_gear: {
    id: 'mythic_gear',
    name: 'Mythic Power',
    description: 'Equip your first mythic item.',
    category: 'collection',
    icon: '💠',
    points: 200,
    trigger: { type: 'item_equip', itemRarity: 'mythic' },
    reward: { exp: 2500 },
  },
};

// ─── Achievement Stats (tracked per-save, persisted in SaveFile) ────────────

export interface AchievementStats {
  totalKills: number;
  bossKills: number;
  tradesCompleted: number;
  itemsCrafted: number;
  resourcesGathered: number;
  pvpKills: number;
  worldBossKills: number;
  dungeonsCleared: Set<string>;    // dungeonIds
  deepestFloors: Record<string, number>; // dungeonId → floor reached
  visitedAreas: Set<string>;        // areaIds
}

export function createDefaultAchievementStats(): AchievementStats {
  return {
    totalKills: 0,
    bossKills: 0,
    tradesCompleted: 0,
    itemsCrafted: 0,
    resourcesGathered: 0,
    pvpKills: 0,
    worldBossKills: 0,
    dungeonsCleared: new Set(),
    deepestFloors: {},
    visitedAreas: new Set(),
  };
}

// ─── Check if achievement is unlocked ────────────────────────────────────────

export function isAchievementUnlocked(save: SaveFile, achievementId: string): boolean {
  return save.achievements?.some(a => a.id === achievementId) ?? false;
}

// ─── Check achievement trigger ───────────────────────────────────────────────

export function checkAchievementTrigger(
  def: AchievementDef,
  stats: AchievementStats,
  currentLevel: number,
): boolean {
  const t = def.trigger;

  switch (t.type) {
    case 'kill_count':
      return stats.totalKills >= t.count;

    case 'boss_kills':
      return stats.bossKills >= t.count;

    case 'level_reach':
      return currentLevel >= t.level;

    case 'dungeon_clear':
      return stats.dungeonsCleared.has(t.dungeonId);

    case 'dungeon_floor':
      if (t.dungeonId === '__any__') {
        return Object.values(stats.deepestFloors).some(f => f >= t.floor);
      }
      return (stats.deepestFloors[t.dungeonId] ?? 0) >= t.floor;

    case 'area_visit':
      if (t.areaId === '__all_regions__') {
        // Count unique regions (first 2 segments of areaId)
        const regions = new Set([...stats.visitedAreas].map(a => a.split('_')[0]));
        return regions.size >= 8;
      }
      return stats.visitedAreas.has(t.areaId);

    case 'trade_count':
      return stats.tradesCompleted >= t.count;

    case 'craft_count':
      return stats.itemsCrafted >= t.count;

    case 'gather_count':
      return stats.resourcesGathered >= t.count;

    case 'pvp_kills':
      return stats.pvpKills >= t.count;

    case 'world_boss_kill':
      return stats.worldBossKills >= 1;

    case 'item_equip':
      // Checked via inventory scan after equip — handled separately
      return false;

    default:
      return false;
  }
}

// ─── Check all achievements for a save ───────────────────────────────────────

export interface AchievementUnlockResult {
  newlyUnlocked: AchievementDef[];
  totalPoints: number;
}

export function checkAndUnlockAchievements(
  save: SaveFile,
  stats: AchievementStats,
): AchievementUnlockResult {
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of Object.values(ACHIEVEMENTS)) {
    if (isAchievementUnlocked(save, def.id)) continue;
    if (checkAchievementTrigger(def, stats, save.stats.level)) {
      newlyUnlocked.push(def);
    }
  }

  const allUnlocked = [...(save.achievements ?? []), ...newlyUnlocked.map(d => ({ id: d.id, unlockedAt: Date.now() }))];
  const totalPoints = allUnlocked.reduce((sum, a) => {
    const def = ACHIEVEMENTS[a.id];
    return sum + (def?.points ?? 0);
  }, 0);

  return { newlyUnlocked, totalPoints };
}

// ─── Apply achievement reward to save ────────────────────────────────────────

export function applyAchievementReward(save: SaveFile, def: AchievementDef): SaveFile {
  if (!def.reward) return save;

  let newSave = { ...save };
  const stats = { ...newSave.stats };

  if (def.reward.exp) {
    stats.exp = (stats.exp ?? 0) + def.reward.exp;
  }
  if (def.reward.gold) {
    stats.gold = (stats.gold ?? 0) + def.reward.gold;
  }

  return { ...newSave, stats };
}

// ─── Format achievements command output ──────────────────────────────────────

export function formatAchievements(save: SaveFile, stats: AchievementStats): string {
  const unlocked = new Set((save.achievements ?? []).map(a => a.id));
  const totalPoints = unlocked.size > 0
    ? Object.values(ACHIEVEMENTS).filter(d => unlocked.has(d.id)).reduce((s, d) => s + d.points, 0)
    : 0;

  const categories: AchievementCategory[] = ['combat', 'dungeon', 'exploration', 'crafting', 'collection', 'social', 'pvp'];
  const categoryLabels: Record<AchievementCategory, string> = {
    combat: '⚔ Combat & Levels',
    dungeon: '🏰 Dungeons',
    exploration: '🗺 Exploration',
    crafting: '🔨 Crafting',
    collection: '📦 Collection',
    social: '🤝 Social',
    pvp: '⚔ PvP',
  };

  const lines: string[] = [];
  lines.push(`\n  ╔══════════════════════════════════════════════════════════════════════╗`);
  lines.push(`  ║  🏆 ACHIEVEMENTS                                    Points: ${String(totalPoints).padStart(4)}    ║`);
  lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);

  for (const cat of categories) {
    const catAchievements = Object.values(ACHIEVEMENTS).filter(a => a.category === cat);
    if (catAchievements.length === 0) continue;

    lines.push(`  ║  ── ${categoryLabels[cat].padEnd(64)} ──║`);

    for (const def of catAchievements) {
      const done = unlocked.has(def.id);
      const icon = done ? '✅' : '🔒';
      const name = def.name.padEnd(24);
      const pts = `[${def.points}pt]`;
      const line = `  ║  ${icon} ${name} ${pts.padStart(8)}`;
      lines.push(line.padEnd(77) + '║');
    }
  }

  lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
  lines.push(`  ║  Unlocked: ${String(unlocked.size).padStart(2)}/${Object.keys(ACHIEVEMENTS).length}                                            ║`);
  lines.push(`  ╚══════════════════════════════════════════════════════════════════════╝`);
  lines.push(`\n  Achievement stats: Kills=${stats.totalKills} | Bosses=${stats.bossKills} | Crafts=${stats.itemsCrafted}`);
  lines.push(`  Trades=${stats.tradesCompleted} | Gathered=${stats.resourcesGathered} | PvP Kills=${stats.pvpKills}`);

  return lines.join('\n');
}

// ─── Format achievement unlock notification ─────────────────────────────────

export function formatAchievementUnlock(def: AchievementDef): string {
  const reward = def.reward
    ? `\n  Reward: ${def.reward.exp ? `+${def.reward.exp} EXP ` : ''}${def.reward.gold ? `+${def.reward.gold}g ` : ''}${def.reward.itemId ? `+${def.reward.itemId}` : ''}`.trim()
    : '';
  return `\n  ╔═══════════════════════════════════════════════════════╗\n` +
    `  ║  🏆 ACHIEVEMENT UNLOCKED: ${def.name.padEnd(30)}║\n` +
    `  ║  ${def.description.padEnd(54)}║\n` +
    `  ║  ${def.icon} ${String(def.points).padStart(3)} points${reward.padEnd(40)}   ║\n` +
    `  ╚═══════════════════════════════════════════════════════╝`;
}

// ─── Update achievement stats and check for unlocks ───────────────────────────

export interface AchievementStatUpdate {
  totalKills?: number;
  bossKills?: number;
  tradesCompleted?: number;
  itemsCrafted?: number;
  resourcesGathered?: number;
  pvpKills?: number;
  worldBossKills?: number;
  dungeonClear?: string;
  dungeonFloorReached?: { dungeonId: string; floor: number };
  areaVisited?: string;
  itemEquippedRarity?: Rarity;
}

export function processAchievementStats(
  save: SaveFile,
  updates: AchievementStatUpdate,
): { save: SaveFile; newlyUnlocked: AchievementDef[] } {
  const stats = save.achievementStats ?? {
    totalKills: 0, bossKills: 0, tradesCompleted: 0, itemsCrafted: 0,
    resourcesGathered: 0, pvpKills: 0, worldBossKills: 0,
    dungeonsCleared: [], deepestFloors: {}, visitedAreas: [],
  };

  let newStats = { ...stats };

  if (updates.totalKills !== undefined) newStats.totalKills += updates.totalKills;
  if (updates.bossKills !== undefined) newStats.bossKills += updates.bossKills;
  if (updates.tradesCompleted !== undefined) newStats.tradesCompleted += updates.tradesCompleted;
  if (updates.itemsCrafted !== undefined) newStats.itemsCrafted += updates.itemsCrafted;
  if (updates.resourcesGathered !== undefined) newStats.resourcesGathered += updates.resourcesGathered;
  if (updates.pvpKills !== undefined) newStats.pvpKills += updates.pvpKills;
  if (updates.worldBossKills !== undefined) newStats.worldBossKills += updates.worldBossKills;

  if (updates.dungeonClear) {
    newStats.dungeonsCleared = [...new Set([...(stats.dungeonsCleared ?? []), updates.dungeonClear])];
  }
  if (updates.dungeonFloorReached) {
    const { dungeonId, floor } = updates.dungeonFloorReached;
    const current = (stats.deepestFloors ?? {})[dungeonId] ?? 0;
    if (floor > current) {
      newStats.deepestFloors = { ...(stats.deepestFloors ?? {}), [dungeonId]: floor };
    }
  }
  if (updates.areaVisited) {
    newStats.visitedAreas = [...new Set([...(stats.visitedAreas ?? []), updates.areaVisited])];
  }

  // Build AchievementStats with Sets for check
  const achStats: AchievementStats = {
    totalKills: newStats.totalKills,
    bossKills: newStats.bossKills,
    tradesCompleted: newStats.tradesCompleted,
    itemsCrafted: newStats.itemsCrafted,
    resourcesGathered: newStats.resourcesGathered,
    pvpKills: newStats.pvpKills,
    worldBossKills: newStats.worldBossKills,
    dungeonsCleared: new Set(newStats.dungeonsCleared),
    deepestFloors: newStats.deepestFloors,
    visitedAreas: new Set(newStats.visitedAreas),
  };

  // Check unlocks
  const { newlyUnlocked } = checkAndUnlockAchievements(save, achStats);

  // Apply rewards
  let newSave = { ...save, achievementStats: newStats };
  for (const def of newlyUnlocked) {
    newSave = applyAchievementReward(newSave, def);
    newSave.achievements = [
      ...(newSave.achievements ?? []).filter(a => a.id !== def.id),
      { id: def.id, unlockedAt: Date.now() },
    ];
  }

  return { save: newSave, newlyUnlocked };
}

// ─── Batch format unlock notifications ─────────────────────────────────────────

export function formatAchievementUnlockBatch(unlocked: AchievementDef[]): string {
  if (unlocked.length === 0) return '';
  const lines: string[] = [];
  for (const def of unlocked) {
    const reward = def.reward
      ? `Reward: ${def.reward.exp ? `+${def.reward.exp} EXP ` : ''}${def.reward.gold ? `+${def.reward.gold}g` : ''}`.trim()
      : '';
    const ptsLine = `${def.icon} ${String(def.points).padStart(3)} points`;
    lines.push(
      `\n  ╔═══════════════════════════════════════════════════════╗` +
      `\n  ║  🏆 ACHIEVEMENT UNLOCKED: ${def.name.padEnd(30)}║` +
      `\n  ║  ${def.description.padEnd(54)}║` +
      `\n  ║  ${ptsLine.padEnd(54)}║` +
      (reward ? `\n  ║  ${reward.padEnd(54)}║` : '') +
      `\n  ╚═══════════════════════════════════════════════════════╝`
    );
  }
  return lines.join('');
}

export function serializeAchievementSets(stats: AchievementStats): {
  dungeonsCleared: string[];
  deepestFloors: Record<string, number>;
  visitedAreas: string[];
} {
  return {
    dungeonsCleared: [...stats.dungeonsCleared],
    deepestFloors: stats.deepestFloors,
    visitedAreas: [...stats.visitedAreas],
  };
}

export function deserializeAchievementSets(data: {
  dungeonsCleared?: string[];
  deepestFloors?: Record<string, number>;
  visitedAreas?: string[];
}): Pick<AchievementStats, 'dungeonsCleared' | 'deepestFloors' | 'visitedAreas'> {
  return {
    dungeonsCleared: new Set(data.dungeonsCleared ?? []),
    deepestFloors: data.deepestFloors ?? {},
    visitedAreas: new Set(data.visitedAreas ?? []),
  };
}
