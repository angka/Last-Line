"use strict";
/**
 * Phase 11 — Steam Auth Service
 * Validates Steam tickets and polls ownership.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSteamTicket = validateSteamTicket;
exports.getSteamIdFromTicket = getSteamIdFromTicket;
exports.getOwnedProducts = getOwnedProducts;
exports.checkDlcOwnership = checkDlcOwnership;
const STEAM_API_KEY = process.env.STEAM_API_KEY ?? '';
const STEAM_APP_ID = process.env.STEAM_APP_ID ?? '';
const STEAM_WEB_API_URL = 'https://api.steampowered.com';
/**
 * Validate a Steam session ticket via Steam Web API.
 */
async function validateSteamTicket(ticket) {
    if (!STEAM_API_KEY || !STEAM_APP_ID) {
        return { success: false, error: 'Steam API not configured. Set STEAM_API_KEY and STEAM_APP_ID.' };
    }
    try {
        // Steam expects hex-encoded ticket
        const hexTicket = Buffer.from(ticket, 'base64').toString('hex');
        const url = `${STEAM_WEB_API_URL}/ISteamUserAuth/AuthenticateUserTicket/v0002/?key=${STEAM_API_KEY}&appid=${STEAM_APP_ID}&ticket=${hexTicket}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.response?.authenticateuserresult === 'OK') {
            const steamId = data.response.steamid;
            return { success: true, steamId };
        }
        return { success: false, error: 'Invalid Steam ticket.' };
    }
    catch (err) {
        return { success: false, error: `Steam auth failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
}
/**
 * Get Steam ID from ticket without full validation (for link flow).
 */
async function getSteamIdFromTicket(ticket) {
    const result = await validateSteamTicket(ticket);
    return result.success ? result.steamId ?? null : null;
}
/**
 * Poll Steam for owned products (cosmetic/DLC ownership).
 */
async function getOwnedProducts(steamId) {
    if (!STEAM_API_KEY)
        return [];
    try {
        const url = `${STEAM_WEB_API_URL}/IPlayerService/GetOwnedGames/v0002/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=0`;
        const response = await fetch(url);
        const data = await response.json();
        const games = data.response?.games ?? [];
        const ownedAppIds = games.map((g) => String(g.appid));
        // Check if owned app matches our app ID or any DLC app IDs
        const ownedProducts = [];
        if (ownedAppIds.includes(STEAM_APP_ID)) {
            ownedProducts.push('steam_app');
        }
        // Add DLC app IDs to check
        const dlcAppIds = getDlcAppIds();
        for (const dlcId of dlcAppIds) {
            if (ownedAppIds.includes(dlcId)) {
                ownedProducts.push(dlcId);
            }
        }
        return ownedProducts;
    }
    catch {
        return [];
    }
}
function getDlcAppIds() {
    // Define DLC app IDs — these come from Steam store
    return [
    // 'dlc_forest_appid',
    // 'dlc_cave_appid',
    // 'dlc_season1_appid',
    ];
}
/**
 * Check if player owns a specific DLC.
 */
async function checkDlcOwnership(steamId, dlcId) {
    const owned = await getOwnedProducts(steamId);
    return owned.includes(dlcId);
}
//# sourceMappingURL=SteamAuthService.js.map