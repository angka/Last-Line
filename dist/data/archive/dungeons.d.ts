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
export declare const INFINITE_FLOOR_PREFIX = "__inf__";
export declare function isInfiniteFloor(areaId: string): boolean;
export declare function getInfiniteFloorInfo(areaId: string): {
    dungeon: DungeonDef;
    infiniteFloor: number;
} | null;
export declare function getNextInfiniteFloorArea(areaId: string): string | null;
export declare function getPrevInfiniteFloorArea(areaId: string): string | null;
export declare function getPrevFloorArea2(areaId: string): string | null;
export declare function getNextFloorArea2(areaId: string): string | null;
export declare function describeInfiniteFloor(dungeon: DungeonDef, infiniteFloor: number): string;
//# sourceMappingURL=dungeons.d.ts.map