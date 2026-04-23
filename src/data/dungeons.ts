import type { DungeonDef } from '../types';

export const DUNGEONS: Record<string, DungeonDef> = {
  goblin_warren: {
    id: 'goblin_warren',
    name: 'Goblin Warren',
    entrance: 'goblin_warren_entrance',
    unlockArea: 'whispering_plains',
    bossId: 'goblin_chieftain',
    floors: [
      { floor: 1, areaId: 'goblin_warren_entrance', enemyCount: [1, 2], eliteChance: 0.05, bossFloor: false },
      { floor: 2, areaId: 'goblin_warren_f2',       enemyCount: [1, 3], eliteChance: 0.08, bossFloor: false },
      { floor: 3, areaId: 'goblin_warren_f3',       enemyCount: [1, 3], eliteChance: 0.12, bossFloor: true  },
    ],
  },
  thornwick_ruins: {
    id: 'thornwick_ruins',
    name: 'Thornwick Ruins',
    entrance: 'thornwick_ruins_entrance',
    unlockArea: 'thornwick_square',
    bossId: 'treant_ancient',
    floors: [
      { floor: 1, areaId: 'thornwick_ruins_entrance', enemyCount: [1, 3], eliteChance: 0.10, bossFloor: false },
      { floor: 2, areaId: 'thornwick_ruins_f2',        enemyCount: [2, 3], eliteChance: 0.15, bossFloor: false },
      { floor: 3, areaId: 'thornwick_ruins_f3',        enemyCount: [2, 4], eliteChance: 0.20, bossFloor: true  },
    ],
  },
  sunken_mines: {
    id: 'sunken_mines',
    name: 'Sunken Mines',
    entrance: 'sunken_mines_entrance',
    unlockArea: 'iron_gate_town_square',
    bossId: 'mine_wyrm',
    floors: [
      { floor: 1, areaId: 'sunken_mines_entrance', enemyCount: [1, 3], eliteChance: 0.12, bossFloor: false },
      { floor: 2, areaId: 'sunken_mines_f2',        enemyCount: [2, 3], eliteChance: 0.15, bossFloor: false },
      { floor: 3, areaId: 'sunken_mines_f3',        enemyCount: [1, 3], eliteChance: 0.18, bossFloor: false },
      { floor: 4, areaId: 'sunken_mines_f4',        enemyCount: [2, 4], eliteChance: 0.22, bossFloor: false },
      { floor: 5, areaId: 'sunken_mines_f5',        enemyCount: [2, 4], eliteChance: 0.28, bossFloor: true  },
    ],
  },
  mirefen_catacombs: {
    id: 'mirefen_catacombs',
    name: 'Mirefen Catacombs',
    entrance: 'mirefen_catacombs_entrance',
    unlockArea: 'mirefen_swamp',
    bossId: 'lich_lord',
    floors: [
      { floor: 1, areaId: 'mirefen_catacombs_entrance', enemyCount: [2, 3], eliteChance: 0.15, bossFloor: false },
      { floor: 2, areaId: 'mirefen_catacombs_f2',        enemyCount: [2, 4], eliteChance: 0.20, bossFloor: false },
      { floor: 3, areaId: 'mirefen_catacombs_f3',        enemyCount: [2, 4], eliteChance: 0.25, bossFloor: true  },
    ],
  },
  dragons_lair: {
    id: 'dragons_lair',
    name: "Dragon's Lair",
    entrance: 'dragons_lair_entrance',
    unlockArea: 'cinderpeak_square',
    bossId: 'ancient_dragon',
    floors: [
      { floor: 1, areaId: 'dragons_lair_entrance', enemyCount: [2, 3], eliteChance: 0.25, bossFloor: false },
      { floor: 2, areaId: 'dragons_lair_f2',        enemyCount: [2, 4], eliteChance: 0.30, bossFloor: false },
      { floor: 3, areaId: 'dragons_lair_f3',        enemyCount: [3, 4], eliteChance: 0.35, bossFloor: false },
      { floor: 4, areaId: 'dragons_lair_f4',        enemyCount: [3, 4], eliteChance: 0.40, bossFloor: false },
      { floor: 5, areaId: 'dragons_lair_boss',       enemyCount: [1, 1], eliteChance: 1.0,  bossFloor: true  },
    ],
  },
};

export function getDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS[id];
}

export function getDungeonForArea(areaId: string): DungeonDef | undefined {
  return Object.values(DUNGEONS).find(d => d.entrance === areaId || d.floors.some(f => f.areaId === areaId));
}

export function getDungeonFloor(areaId: string): { dungeon: DungeonDef; floor: number } | null {
  for (const dungeon of Object.values(DUNGEONS)) {
    const idx = dungeon.floors.findIndex(f => f.areaId === areaId);
    if (idx !== -1) return { dungeon, floor: idx + 1 };
  }
  return null;
}

export function getNextFloorArea(areaId: string): string | null {
  const info = getDungeonFloor(areaId);
  if (!info) return null;
  const nextIdx = info.floor; // 1-indexed, so this is the next one
  const dungeon = info.dungeon;
  if (nextIdx >= dungeon.floors.length) return null; // at last floor
  return dungeon.floors[nextIdx].areaId;
}

export function getPrevFloorArea(areaId: string): string | null {
  const info = getDungeonFloor(areaId);
  if (!info || info.floor <= 1) return null; // already at entrance floor
  return info.dungeon.floors[info.floor - 2].areaId; // floor is 1-indexed, arrays are 0-indexed
}

// ─── Infinite Dungeon Floors (Phase 8) ────────────────────────────────────────
// After defeating the boss on the final floor, players can continue deeper.
// Infinite floors are pseudo-areas: __inf__<dungeonId>__<floor>

export const INFINITE_FLOOR_PREFIX = '__inf__';

export function isInfiniteFloor(areaId: string): boolean {
  return areaId.startsWith(INFINITE_FLOOR_PREFIX);
}

export function getInfiniteFloorInfo(areaId: string): { dungeon: DungeonDef; infiniteFloor: number } | null {
  if (!isInfiniteFloor(areaId)) return null;
  // format: __inf__<dungeonId>__<floor>
  const parts = areaId.split('__');
  if (parts.length < 4) return null;
  const dungeonId = parts[2];
  const infiniteFloor = parseInt(parts[3]);
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return null;
  return { dungeon, infiniteFloor };
}

export function getNextInfiniteFloorArea(areaId: string): string | null {
  const info = getInfiniteFloorInfo(areaId);
  if (!info) return null;
  // Max infinite depth of 50
  if (info.infiniteFloor >= 50) return null;
  return `${INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor + 1}`;
}

export function getPrevInfiniteFloorArea(areaId: string): string | null {
  const info = getInfiniteFloorInfo(areaId);
  if (!info) return null;
  if (info.infiniteFloor <= 1) return null;
  return `${INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor - 1}`;
}

// Get the previous area (handles both normal and infinite floors)
export function getPrevFloorArea2(areaId: string): string | null {
  // First check if it's an infinite floor
  const info = getInfiniteFloorInfo(areaId);
  if (info) {
    // If at infinite floor 1, go back to the dungeon last floor
    if (info.infiniteFloor === 1) {
      const lastFloorIdx = info.dungeon.floors.length - 1;
      return info.dungeon.floors[lastFloorIdx].areaId;
    }
    return getPrevInfiniteFloorArea(areaId);
  }
  // Normal floor
  return getPrevFloorArea(areaId);
}

// Get the next area (handles both normal and infinite floors)
export function getNextFloorArea2(areaId: string): string | null {
  // First check normal next floor
  const normalNext = getNextFloorArea(areaId);
  if (normalNext) return normalNext;

  // Check if at a normal last floor — transition to infinite
  const floorInfo = getDungeonFloor(areaId);
  if (floorInfo) {
    const dungeon = floorInfo.dungeon;
    const lastFloorIdx = dungeon.floors.length - 1;
    // Are we at the last floor?
    if (floorInfo.floor === dungeon.floors.length) {
      // Transition to infinite floor 1
      return `${INFINITE_FLOOR_PREFIX}${dungeon.id}__1`;
    }
  }
  return null;
}

export function describeInfiniteFloor(dungeon: DungeonDef, infiniteFloor: number): string {
  const depth = infiniteFloor - dungeon.floors.length;
  const tier = depth <= 2 ? 'Challenging' : depth <= 5 ? 'Perilous' : depth <= 10 ? 'Nightmarish' : 'Abyssal';
  const baseLevel = dungeon.floors[dungeon.floors.length - 1].areaId;
  const dungeonDef = dungeon;
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
