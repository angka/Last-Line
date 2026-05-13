/**
 * Phase 7 — Achievement System
 * Defines achievements, unlock logic, and `achievements` command formatting.
 */
import type { AchievementDef, SaveFile, Rarity } from '../../types';
export declare const ACHIEVEMENTS: Record<string, AchievementDef>;
export interface AchievementStats {
    totalKills: number;
    bossKills: number;
    tradesCompleted: number;
    itemsCrafted: number;
    resourcesGathered: number;
    pvpKills: number;
    worldBossKills: number;
    dungeonsCleared: Set<string>;
    deepestFloors: Record<string, number>;
    visitedAreas: Set<string>;
}
export declare function createDefaultAchievementStats(): AchievementStats;
export declare function isAchievementUnlocked(save: SaveFile, achievementId: string): boolean;
export declare function checkAchievementTrigger(def: AchievementDef, stats: AchievementStats, currentLevel: number): boolean;
export interface AchievementUnlockResult {
    newlyUnlocked: AchievementDef[];
    totalPoints: number;
}
export declare function checkAndUnlockAchievements(save: SaveFile, stats: AchievementStats): AchievementUnlockResult;
export declare function applyAchievementReward(save: SaveFile, def: AchievementDef): SaveFile;
export declare function formatAchievements(save: SaveFile, stats: AchievementStats): string;
export declare function formatAchievementUnlock(def: AchievementDef): string;
export interface AchievementStatUpdate {
    totalKills?: number;
    bossKills?: number;
    tradesCompleted?: number;
    itemsCrafted?: number;
    resourcesGathered?: number;
    pvpKills?: number;
    worldBossKills?: number;
    dungeonClear?: string;
    dungeonFloorReached?: {
        dungeonId: string;
        floor: number;
    };
    areaVisited?: string;
    itemEquippedRarity?: Rarity;
}
export declare function processAchievementStats(save: SaveFile, updates: AchievementStatUpdate): {
    save: SaveFile;
    newlyUnlocked: AchievementDef[];
};
export declare function formatAchievementUnlockBatch(unlocked: AchievementDef[]): string;
export declare function serializeAchievementSets(stats: AchievementStats): {
    dungeonsCleared: string[];
    deepestFloors: Record<string, number>;
    visitedAreas: string[];
};
export declare function deserializeAchievementSets(data: {
    dungeonsCleared?: string[];
    deepestFloors?: Record<string, number>;
    visitedAreas?: string[];
}): Pick<AchievementStats, 'dungeonsCleared' | 'deepestFloors' | 'visitedAreas'>;
//# sourceMappingURL=AchievementEngine.d.ts.map