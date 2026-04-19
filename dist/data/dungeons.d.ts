import type { DungeonDef } from '../types';
export declare const DUNGEONS: Record<string, DungeonDef>;
export declare function getDungeon(id: string): DungeonDef | undefined;
export declare function getDungeonForArea(areaId: string): DungeonDef | undefined;
export declare function getDungeonFloor(areaId: string): {
    dungeon: DungeonDef;
    floor: number;
} | null;
export declare function getNextFloorArea(areaId: string): string | null;
export declare function getPrevFloorArea(areaId: string): string | null;
//# sourceMappingURL=dungeons.d.ts.map