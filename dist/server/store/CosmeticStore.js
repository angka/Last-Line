"use strict";
/**
 * Phase 11 — Cosmetic Store Service
 * Handles store operations, DLC checks, reward grants.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreSync = getStoreSync;
exports.purchaseCosmetic = purchaseCosmetic;
exports.equipCosmetic = equipCosmetic;
exports.checkDlcAccess = checkDlcAccess;
exports.claimPlayerReward = claimPlayerReward;
const CosmeticDbManager_1 = require("../persistence/CosmeticDbManager");
async function getStoreSync(playerId) {
    const [cosmetics, owned, equipped, entitlements, slots, rewards, claimed] = await Promise.all([
        (0, CosmeticDbManager_1.getAllCosmetics)(),
        (0, CosmeticDbManager_1.getPlayerOwnedCosmeticIds)(playerId),
        (0, CosmeticDbManager_1.getPlayerEquippedCosmetics)(playerId),
        (0, CosmeticDbManager_1.getPlayerEntitlements)(playerId),
        (0, CosmeticDbManager_1.getInventorySlots)(playerId),
        (0, CosmeticDbManager_1.getAvailableRewards)(playerId),
        (0, CosmeticDbManager_1.getClaimedRewardIds)(playerId),
    ]);
    return {
        cosmetics,
        ownedCosmetics: owned,
        equippedCosmetics: equipped,
        entitlements,
        inventorySlots: slots,
        availableRewards: rewards,
        claimedRewards: claimed,
    };
}
async function purchaseCosmetic(playerId, cosmeticId) {
    const cosmetic = await (0, CosmeticDbManager_1.getCosmeticById)(cosmeticId);
    if (!cosmetic) {
        return { success: false, error: 'Item not found.' };
    }
    // Check if already owned
    const owned = await (0, CosmeticDbManager_1.getPlayerOwnedCosmeticIds)(playerId);
    if (owned.includes(cosmeticId)) {
        return { success: false, error: 'You already own this item.' };
    }
    // Check DLC requirement
    if (cosmetic.dlcRequired) {
        const has = await (0, CosmeticDbManager_1.hasDlcEntitlement)(playerId, cosmetic.dlcRequired);
        if (!has) {
            return { success: false, error: `This requires ${cosmetic.dlcRequired}. Purchase from the store first.` };
        }
    }
    // Grant the cosmetic item
    await (0, CosmeticDbManager_1.addCosmeticToPlayer)(playerId, cosmeticId, 'purchase');
    // Handle inventory expansion
    if (cosmetic.subcategory === 'inventory') {
        const slots = cosmeticId === 'inv_100' ? 50 : cosmeticId === 'inv_200' ? 150 : 0;
        const { addInventorySlots } = await Promise.resolve().then(() => __importStar(require('../persistence/CosmeticDbManager')));
        await addInventorySlots(playerId, slots);
    }
    return { success: true };
}
async function equipCosmetic(playerId, cosmeticId) {
    const cosmetic = await (0, CosmeticDbManager_1.getCosmeticById)(cosmeticId);
    if (!cosmetic) {
        return { success: false, error: 'Item not found.' };
    }
    const owned = await (0, CosmeticDbManager_1.getPlayerOwnedCosmeticIds)(playerId);
    if (!owned.includes(cosmeticId)) {
        return { success: false, error: 'You do not own this item.' };
    }
    // Unequip any other item in the same category
    const equipped = await (0, CosmeticDbManager_1.getPlayerEquippedCosmetics)(playerId);
    const currentInCategory = equipped[cosmetic.category];
    if (currentInCategory && currentInCategory !== cosmeticId) {
        await (0, CosmeticDbManager_1.setCosmeticEquipped)(playerId, currentInCategory, false);
    }
    await (0, CosmeticDbManager_1.setCosmeticEquipped)(playerId, cosmeticId, true);
    return { success: true };
}
async function checkDlcAccess(playerId, dlcId) {
    const has = await (0, CosmeticDbManager_1.hasDlcEntitlement)(playerId, dlcId);
    if (has) {
        return { hasAccess: true };
    }
    return { hasAccess: false, missingDlc: dlcId };
}
async function claimPlayerReward(playerId, rewardId) {
    const result = await (0, CosmeticDbManager_1.claimReward)(playerId, rewardId);
    if (!result) {
        return { success: false, error: 'Already claimed or reward not found.' };
    }
    return { success: true, cosmeticId: result };
}
//# sourceMappingURL=CosmeticStore.js.map