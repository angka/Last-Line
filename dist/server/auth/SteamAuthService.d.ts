/**
 * Phase 11 — Steam Auth Service
 * Validates Steam tickets and polls ownership.
 */
export interface SteamAuthResult {
    success: boolean;
    steamId?: string;
    error?: string;
}
/**
 * Validate a Steam session ticket via Steam Web API.
 */
export declare function validateSteamTicket(ticket: string): Promise<SteamAuthResult>;
/**
 * Get Steam ID from ticket without full validation (for link flow).
 */
export declare function getSteamIdFromTicket(ticket: string): Promise<string | null>;
/**
 * Poll Steam for owned products (cosmetic/DLC ownership).
 */
export declare function getOwnedProducts(steamId: string): Promise<string[]>;
/**
 * Check if player owns a specific DLC.
 */
export declare function checkDlcOwnership(steamId: string, dlcId: string): Promise<boolean>;
//# sourceMappingURL=SteamAuthService.d.ts.map