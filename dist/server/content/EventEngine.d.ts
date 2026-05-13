import type { GameEvent, ActiveEvent } from '../../types_event';
export declare function loadEvents(): void;
export declare function reloadEvents(): void;
export declare function checkActiveEvents(): ActiveEvent[];
export declare function getActiveEvents(): ActiveEvent[];
export declare function getExpMultiplier(): number;
export declare function getGoldMultiplier(): number;
export declare function getDropMultiplier(enemyId?: string, itemId?: string): number;
export declare function getSpawnedEnemies(): {
    enemyId: string;
    areaId: string;
}[];
export declare function getTreasureAreas(): string[];
export declare function getLastCheck(): number;
export declare function getAllEvents(): Record<string, GameEvent>;
//# sourceMappingURL=EventEngine.d.ts.map