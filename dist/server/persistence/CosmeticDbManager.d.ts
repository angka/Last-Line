/**
 * Phase 11 — Cosmetic Database Manager
 * Manages cosmetics catalog, player owned items, DLC entitlements, rewards.
 */
import type { CosmeticItem, PlayerCosmetic, CosmeticReward } from '../../types_cosmetics';
export declare function getAllCosmetics(): Promise<CosmeticItem[]>;
export declare function getCosmeticById(id: string): Promise<CosmeticItem | null>;
export declare function getCosmeticsByCategory(category: string): Promise<CosmeticItem[]>;
export declare function getPlayerCosmetics(playerId: string): Promise<PlayerCosmetic[]>;
export declare function getPlayerOwnedCosmeticIds(playerId: string): Promise<string[]>;
export declare function addCosmeticToPlayer(playerId: string, cosmeticId: string, source: string): Promise<void>;
export declare function setCosmeticEquipped(playerId: string, cosmeticId: string, equipped: boolean): Promise<void>;
export declare function getPlayerEquippedCosmetics(playerId: string): Promise<Record<string, string>>;
export declare function grantDlcEntitlement(playerId: string, dlcId: string, source?: string): Promise<void>;
export declare function getPlayerEntitlements(playerId: string): Promise<string[]>;
export declare function hasDlcEntitlement(playerId: string, dlcId: string): Promise<boolean>;
export declare function getInventorySlots(playerId: string): Promise<number>;
export declare function addInventorySlots(playerId: string, additional: number): Promise<number>;
export declare function getAvailableRewards(playerId: string): Promise<CosmeticReward[]>;
export declare function claimReward(playerId: string, rewardId: string): Promise<string | null>;
export declare function getClaimedRewardIds(playerId: string): Promise<string[]>;
export declare function checkAndGrantLevelRewards(playerId: string, newLevel: number): Promise<CosmeticReward[]>;
//# sourceMappingURL=CosmeticDbManager.d.ts.map