import type { SaveFile, LootDrop } from '../../types';
export declare function getDungeonTier(dungeonId: string): number;
export declare function rollBossLoot(bossId: string, playerLuck: number, defeatedBosses: string[]): LootDrop[];
export declare function rollScrollDrops(dungeonTier: number, playerLuck: number): LootDrop[];
export declare function rollRegularLoot(playerLuck: number, enemyLevel: number): LootDrop[];
export declare function getDungeonChestLoot(dungeonId: string): LootDrop[];
export declare function formatLootDrop(drop: LootDrop): string;
export declare function formatLootDrops(drops: LootDrop[]): string;
export declare function addLootToPending(current: LootDrop[], newDrops: LootDrop[]): LootDrop[];
export declare function resolveVictoryWithLoot(save: SaveFile, dungeonId: string, isBossKill: boolean): SaveFile;
//# sourceMappingURL=LootEngine.d.ts.map