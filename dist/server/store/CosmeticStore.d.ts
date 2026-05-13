/**
 * Phase 11 — Cosmetic Store Service
 * Handles store operations, DLC checks, reward grants.
 */
import type { StoreSyncResponse } from '../../types_cosmetics';
export declare function getStoreSync(playerId: string): Promise<StoreSyncResponse>;
export declare function purchaseCosmetic(playerId: string, cosmeticId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function equipCosmetic(playerId: string, cosmeticId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function checkDlcAccess(playerId: string, dlcId: string): Promise<{
    hasAccess: boolean;
    missingDlc?: string;
}>;
export declare function claimPlayerReward(playerId: string, rewardId: string): Promise<{
    success: boolean;
    cosmeticId?: string;
    error?: string;
}>;
//# sourceMappingURL=CosmeticStore.d.ts.map