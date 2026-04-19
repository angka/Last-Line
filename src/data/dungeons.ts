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
