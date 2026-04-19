import type { SaveFile, LootDrop, BossDropTable, LootEntry } from '../../types';
import { ITEMS, getItem } from '../../data/items';
import { PHYSICAL_SCROLL_DROPS, MAGIC_SCROLL_DROPS, SUPPORT_SCROLL_DROPS, getScrollDropsForTier } from '../../data/skills';

// ─── Dungeon Tier by Dungeon ID ────────────────────────────────────────────────

export function getDungeonTier(dungeonId: string): number {
  const tierMap: Record<string, number> = {
    goblin_warren: 1,
    thornwick_ruins: 2,
    sunken_mines: 3,
    mirefen_catacombs: 4,
    dragons_lair: 5,
  };
  return tierMap[dungeonId] ?? 1;
}

// ─── Boss Drop Tables ──────────────────────────────────────────────────────────

const BOSS_DROP_TABLES: Record<string, BossDropTable> = {
  goblin_chieftain: {
    bossId: 'goblin_chieftain',
    guaranteed: [
      { itemId: 'goblin_fang', chance: 1.0, qtyMin: 3, qtyMax: 6, luckScaling: false },
      { itemId: 'goblin_claw', chance: 1.0, qtyMin: 2, qtyMax: 5, luckScaling: false },
    ],
    exclusive: [
      { itemId: 'warlords_cracked_helm', chance: 0.25, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'goblin_kings_fang', chance: 0.15, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'crude_command_scroll', chance: 0.10, qtyMin: 1, qtyMax: 1, luckScaling: true },
    ],
    commonPool: [
      { itemId: 'iron_ore', chance: 0.40, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'copper_ore', chance: 0.30, qtyMin: 1, qtyMax: 2, luckScaling: true },
      { itemId: 'health_potion_1', chance: 0.50, qtyMin: 1, qtyMax: 3, luckScaling: false },
      { itemId: 'gold', chance: 1.0, qtyMin: 30, qtyMax: 80, luckScaling: false },
    ],
  },
  treant_ancient: {
    bossId: 'treant_ancient',
    guaranteed: [
      { itemId: 'ancient_bark', chance: 1.0, qtyMin: 2, qtyMax: 5, luckScaling: false },
      { itemId: 'sylvan_herb', chance: 1.0, qtyMin: 2, qtyMax: 4, luckScaling: false },
    ],
    exclusive: [
      { itemId: 'treant_heartwood', chance: 0.20, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'living_branch', chance: 0.15, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'moon_blossom', chance: 0.30, qtyMin: 2, qtyMax: 4, luckScaling: true },
    ],
    commonPool: [
      { itemId: 'sylvan_herb', chance: 0.50, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'moon_blossom', chance: 0.30, qtyMin: 1, qtyMax: 2, luckScaling: true },
      { itemId: 'health_potion_2', chance: 0.40, qtyMin: 1, qtyMax: 2, luckScaling: false },
      { itemId: 'gold', chance: 1.0, qtyMin: 60, qtyMax: 150, luckScaling: false },
    ],
  },
  mine_wyrm: {
    bossId: 'mine_wyrm',
    guaranteed: [
      { itemId: 'iron_ore', chance: 1.0, qtyMin: 4, qtyMax: 8, luckScaling: false },
      { itemId: 'coal', chance: 1.0, qtyMin: 3, qtyMax: 6, luckScaling: false },
    ],
    exclusive: [
      { itemId: 'wyrm_scale_shard', chance: 0.25, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'mine_wyrm_fang', chance: 0.15, qtyMin: 1, qtyMax: 2, luckScaling: true },
      { itemId: 'steel_ingot', chance: 0.20, qtyMin: 1, qtyMax: 3, luckScaling: true },
    ],
    commonPool: [
      { itemId: 'silver_ore', chance: 0.40, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'copper_ore', chance: 0.30, qtyMin: 2, qtyMax: 4, luckScaling: true },
      { itemId: 'cave_mushroom', chance: 0.40, qtyMin: 1, qtyMax: 3, luckScaling: false },
      { itemId: 'gold', chance: 1.0, qtyMin: 80, qtyMax: 200, luckScaling: false },
    ],
  },
  lich_lord: {
    bossId: 'lich_lord',
    guaranteed: [
      { itemId: 'wraith_essence', chance: 1.0, qtyMin: 2, qtyMax: 4, luckScaling: false },
      { itemId: 'bone_shard', chance: 1.0, qtyMin: 3, qtyMax: 6, luckScaling: false },
    ],
    exclusive: [
      { itemId: 'lich_phylactery_shard', chance: 0.10, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'soul_harvest_scythe', chance: 0.05, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'undying_curse_scroll', chance: 0.03, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'full_restore_scroll', chance: 0.04, qtyMin: 1, qtyMax: 1, luckScaling: true },
    ],
    commonPool: [
      { itemId: 'dark_crystal', chance: 0.40, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'shadow_silk_raw', chance: 0.30, qtyMin: 1, qtyMax: 2, luckScaling: true },
      { itemId: 'ancient_bone', chance: 0.35, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'gold', chance: 1.0, qtyMin: 150, qtyMax: 400, luckScaling: false },
    ],
  },
  ancient_dragon: {
    bossId: 'ancient_dragon',
    guaranteed: [
      { itemId: 'dragon_scale_shed', chance: 1.0, qtyMin: 3, qtyMax: 6, luckScaling: false },
      { itemId: 'dragon_bone_fragment', chance: 1.0, qtyMin: 2, qtyMax: 4, luckScaling: false },
    ],
    exclusive: [
      { itemId: 'ancient_dragon_heart', chance: 0.08, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'dragonkings_crown', chance: 0.03, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'flame_blade', chance: 0.05, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'dragon_scale_armor', chance: 0.04, qtyMin: 1, qtyMax: 1, luckScaling: true },
      { itemId: 'resurrection_scroll', chance: 0.08, qtyMin: 1, qtyMax: 1, luckScaling: true },
    ],
    commonPool: [
      { itemId: 'void_core_shard', chance: 0.25, qtyMin: 1, qtyMax: 2, luckScaling: true },
      { itemId: 'void_essence', chance: 0.35, qtyMin: 1, qtyMax: 3, luckScaling: true },
      { itemId: 'gold', chance: 1.0, qtyMin: 300, qtyMax: 800, luckScaling: false },
      { itemId: 'health_potion_3', chance: 0.60, qtyMin: 2, qtyMax: 4, luckScaling: false },
    ],
  },
};

// ─── Loot Rolling ─────────────────────────────────────────────────────────────

function rollLootEntry(entry: LootEntry, playerLuck: number): LootDrop | null {
  let chance = entry.chance;
  if (entry.luckScaling) {
    chance = Math.min(1.0, chance + (playerLuck / 10) * 0.005);
  }
  if (Math.random() > chance) return null;

  const qty = entry.qtyMin + Math.floor(Math.random() * (entry.qtyMax - entry.qtyMin + 1));
  const item = getItem(entry.itemId);
  if (!item) return null;

  return { itemId: entry.itemId, name: item.name, rarity: item.rarity, quantity: qty };
}

export function rollBossLoot(bossId: string, playerLuck: number, defeatedBosses: string[]): LootDrop[] {
  const table = BOSS_DROP_TABLES[bossId];
  if (!table) return [];

  const drops: LootDrop[] = [];
  let maxDrops = 5;

  // Guaranteed drops (always included)
  for (const entry of table.guaranteed) {
    const drop = rollLootEntry(entry, playerLuck);
    if (drop) drops.push(drop);
  }

  // Exclusive drops (one roll each)
  for (const entry of table.exclusive) {
    const alreadyHas = defeatedBosses.includes(bossId) && entry.chance < 0.15;
    if (!alreadyHas || Math.random() < entry.chance) {
      const drop = rollLootEntry(entry, playerLuck);
      if (drop) {
        drops.push(drop);
        maxDrops--;
      }
    }
  }

  // Common pool (roll up to remaining slots)
  const commonRolls = Math.min(maxDrops, 3);
  for (let i = 0; i < commonRolls; i++) {
    for (const entry of table.commonPool) {
      const drop = rollLootEntry(entry, playerLuck);
      if (drop && drops.length < 5) {
        drops.push(drop);
        break;
      }
    }
  }

  return drops;
}

export function rollScrollDrops(dungeonTier: number, playerLuck: number): LootDrop[] {
  const scrollIds = getScrollDropsForTier(dungeonTier);
  const drops: LootDrop[] = [];
  const baseChance = 0.15;
  const luckBonus = Math.min(0.08, (playerLuck / 10) * 0.005);
  const chance = baseChance + luckBonus;

  if (Math.random() > chance) return drops;

  const count = Math.random() < 0.2 ? 2 : 1;
  const rolled: Set<string> = new Set();

  for (let i = 0; i < count && i < scrollIds.length; i++) {
    const idx = Math.floor(Math.random() * scrollIds.length);
    const itemId = scrollIds[idx];
    if (rolled.has(itemId)) continue;
    rolled.add(itemId);
    const item = getItem(itemId);
    if (item) {
      drops.push({ itemId, name: item.name, rarity: item.rarity, quantity: 1 });
    }
  }

  return drops;
}

export function rollRegularLoot(playerLuck: number, enemyLevel: number): LootDrop[] {
  const drops: LootDrop[] = [];

  // Small gold drop
  if (Math.random() < 0.60) {
    const goldAmt = Math.floor((5 + enemyLevel * 3) * (0.5 + Math.random()));
    drops.push({ itemId: 'gold', name: 'Gold', rarity: 'common', quantity: goldAmt });
  }

  // Material drop chance based on luck
  const matChance = 0.10 + Math.min(0.08, (playerLuck / 10) * 0.005);
  if (Math.random() < matChance) {
    const matId = getRandomMaterialForLevel(enemyLevel);
    const mat = getItem(matId);
    if (mat) {
      drops.push({ itemId: matId, name: mat.name, rarity: mat.rarity, quantity: 1 });
    }
  }

  return drops;
}

function getRandomMaterialForLevel(level: number): string {
  const commonMats = ['iron_ore', 'coal', 'red_herb', 'blue_herb', 'wild_mushroom', 'pine_sap'];
  const uncommonMats = ['sylvan_herb', 'moon_blossom', 'cave_mushroom', 'spider_silk', 'silver_ore', 'bog_ore', 'quartz'];
  const rareMats = ['dark_crystal', 'magma_ore', 'stormstone', 'shadow_silk_raw', 'bone_shard', 'river_pearl'];

  if (level >= 40) {
    const pool = [...commonMats, ...uncommonMats, ...rareMats];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (level >= 20) {
    const pool = [...commonMats, ...uncommonMats];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return commonMats[Math.floor(Math.random() * commonMats.length)];
}

// ─── Dungeon Chest ────────────────────────────────────────────────────────────

interface ChestItemDef {
  itemId: string;
  chance: number;
  qty: number;
}

const DUNGEON_CHESTS: Record<string, ChestItemDef[]> = {
  goblin_warren: [
    { itemId: 'iron_sword', chance: 0.30, qty: 1 },
    { itemId: 'health_potion_1', chance: 0.60, qty: 3 },
    { itemId: 'goblin_fang', chance: 0.50, qty: 2 },
    { itemId: 'gold', chance: 0.80, qty: 40 },
    { itemId: 'copper_ore', chance: 0.40, qty: 2 },
  ],
  thornwick_ruins: [
    { itemId: 'oak_staff', chance: 0.30, qty: 1 },
    { itemId: 'sylvan_herb', chance: 0.60, qty: 3 },
    { itemId: 'moon_blossom', chance: 0.40, qty: 2 },
    { itemId: 'gold', chance: 0.80, qty: 80 },
    { itemId: 'ancient_bark', chance: 0.40, qty: 2 },
  ],
  sunken_mines: [
    { itemId: 'steel_sword', chance: 0.25, qty: 1 },
    { itemId: 'steel_ingot', chance: 0.40, qty: 2 },
    { itemId: 'silver_ring', chance: 0.20, qty: 1 },
    { itemId: 'gold', chance: 0.80, qty: 120 },
    { itemId: 'cave_mushroom', chance: 0.50, qty: 3 },
  ],
  mirefen_catacombs: [
    { itemId: 'shadow_silk', chance: 0.25, qty: 1 },
    { itemId: 'dark_crystal', chance: 0.40, qty: 2 },
    { itemId: 'wraith_essence', chance: 0.30, qty: 2 },
    { itemId: 'gold', chance: 0.80, qty: 200 },
    { itemId: 'ancient_bone', chance: 0.40, qty: 2 },
  ],
  dragons_lair: [
    { itemId: 'flame_blade', chance: 0.20, qty: 1 },
    { itemId: 'void_dagger', chance: 0.10, qty: 1 },
    { itemId: 'dragon_scale_armor', chance: 0.15, qty: 1 },
    { itemId: 'storm_staff', chance: 0.15, qty: 1 },
    { itemId: 'void_core_shard', chance: 0.30, qty: 1 },
    { itemId: 'gold', chance: 0.90, qty: 500 },
    { itemId: 'resurrection_scroll', chance: 0.20, qty: 1 },
  ],
};

export function getDungeonChestLoot(dungeonId: string): LootDrop[] {
  const chestTable = DUNGEON_CHESTS[dungeonId];
  if (!chestTable) return [];

  const drops: LootDrop[] = [];
  for (const entry of chestTable) {
    if (Math.random() < entry.chance) {
      const item = getItem(entry.itemId);
      if (item) {
        drops.push({ itemId: entry.itemId, name: item.name, rarity: item.rarity, quantity: entry.qty });
      }
    }
  }

  if (drops.length === 0) {
    // Fallback: always drop some gold
    const goldAmt = 50 + Math.floor(Math.random() * 100);
    drops.push({ itemId: 'gold', name: 'Gold', rarity: 'common', quantity: goldAmt });
  }

  return drops;
}

// ─── Loot Formatting ───────────────────────────────────────────────────────────

export function formatLootDrop(drop: LootDrop): string {
  const item = getItem(drop.itemId);
  if (drop.itemId === 'gold') {
    return `  + ${drop.quantity}g`;
  }
  if (!item) return '';
  const qty = drop.quantity > 1 ? ` x${drop.quantity}` : '';
  return `  + ${item.name}${qty}`;
}

export function formatLootDrops(drops: LootDrop[]): string {
  if (drops.length === 0) return '';
  const lines = ['\n  ╔═══════════════ LOOT ═══════════════╗'];
  for (const drop of drops) {
    lines.push('  ║ ' + formatLootDrop(drop).trim().padEnd(35) + ' ║');
  }
  lines.push('  ╚══════════════════════════════════╝');
  return lines.join('\n');
}

// ─── Pending Loot Buffer ──────────────────────────────────────────────────────

export function addLootToPending(current: LootDrop[], newDrops: LootDrop[]): LootDrop[] {
  const merged: Record<string, LootDrop> = {};

  for (const drop of current) {
    merged[drop.itemId] = { ...drop };
  }

  for (const drop of newDrops) {
    if (merged[drop.itemId]) {
      merged[drop.itemId].quantity += drop.quantity;
    } else {
      merged[drop.itemId] = { ...drop };
    }
  }

  return Object.values(merged);
}

// ─── Update resolveVictory with scroll drops ────────────────────────────────────

export function resolveVictoryWithLoot(
  save: SaveFile,
  dungeonId: string,
  isBossKill: boolean,
): SaveFile {
  const dungeonTier = getDungeonTier(dungeonId);
  const drops: LootDrop[] = [];

  if (isBossKill) {
    // Roll boss drops + scroll drops
    const bossDrops = rollBossLoot(dungeonId, save.stats.luck, save.worldState.defeatedBosses);
    drops.push(...bossDrops);

    const scrollDrops = rollScrollDrops(dungeonTier, save.stats.luck);
    drops.push(...scrollDrops);
  } else {
    // Regular enemy: small material chance + scroll chance
    const regDrops = rollRegularLoot(save.stats.luck, save.stats.level);
    drops.push(...regDrops);

    // Small scroll drop chance on regular kills
    if (Math.random() < 0.05) {
      const scrolls = rollScrollDrops(dungeonTier, save.stats.luck);
      drops.push(...scrolls);
    }
  }

  const newPendingLoot = addLootToPending(save.pendingLoot, drops);

  return {
    ...save,
    pendingLoot: newPendingLoot,
  };
}
