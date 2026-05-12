/**
 * Phase 11 — Cosmetic Store Service
 * Handles store operations, DLC checks, reward grants.
 */

import {
  getAllCosmetics,
  getCosmeticById,
  getPlayerOwnedCosmeticIds,
  getPlayerEquippedCosmetics,
  addCosmeticToPlayer,
  setCosmeticEquipped,
  getPlayerEntitlements,
  hasDlcEntitlement,
  getInventorySlots,
  getAvailableRewards,
  claimReward,
  getClaimedRewardIds,
} from '../persistence/CosmeticDbManager';
import type { StoreSyncResponse } from '../../types_cosmetics';

export async function getStoreSync(playerId: string): Promise<StoreSyncResponse> {
  const [cosmetics, owned, equipped, entitlements, slots, rewards, claimed] = await Promise.all([
    getAllCosmetics(),
    getPlayerOwnedCosmeticIds(playerId),
    getPlayerEquippedCosmetics(playerId),
    getPlayerEntitlements(playerId),
    getInventorySlots(playerId),
    getAvailableRewards(playerId),
    getClaimedRewardIds(playerId),
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

export async function purchaseCosmetic(
  playerId: string,
  cosmeticId: string,
): Promise<{ success: boolean; error?: string }> {
  const cosmetic = await getCosmeticById(cosmeticId);
  if (!cosmetic) {
    return { success: false, error: 'Item not found.' };
  }

  // Check if already owned
  const owned = await getPlayerOwnedCosmeticIds(playerId);
  if (owned.includes(cosmeticId)) {
    return { success: false, error: 'You already own this item.' };
  }

  // Check DLC requirement
  if (cosmetic.dlcRequired) {
    const has = await hasDlcEntitlement(playerId, cosmetic.dlcRequired);
    if (!has) {
      return { success: false, error: `This requires ${cosmetic.dlcRequired}. Purchase from the store first.` };
    }
  }

  // Grant the cosmetic item
  await addCosmeticToPlayer(playerId, cosmeticId, 'purchase');

  // Handle inventory expansion
  if (cosmetic.subcategory === 'inventory') {
    const slots = cosmeticId === 'inv_100' ? 50 : cosmeticId === 'inv_200' ? 150 : 0;
    const { addInventorySlots } = await import('../persistence/CosmeticDbManager');
    await addInventorySlots(playerId, slots);
  }

  return { success: true };
}

export async function equipCosmetic(
  playerId: string,
  cosmeticId: string,
): Promise<{ success: boolean; error?: string }> {
  const cosmetic = await getCosmeticById(cosmeticId);
  if (!cosmetic) {
    return { success: false, error: 'Item not found.' };
  }

  const owned = await getPlayerOwnedCosmeticIds(playerId);
  if (!owned.includes(cosmeticId)) {
    return { success: false, error: 'You do not own this item.' };
  }

  // Unequip any other item in the same category
  const equipped = await getPlayerEquippedCosmetics(playerId);
  const currentInCategory = equipped[cosmetic.category];
  if (currentInCategory && currentInCategory !== cosmeticId) {
    await setCosmeticEquipped(playerId, currentInCategory, false);
  }

  await setCosmeticEquipped(playerId, cosmeticId, true);
  return { success: true };
}

export async function checkDlcAccess(
  playerId: string,
  dlcId: string,
): Promise<{ hasAccess: boolean; missingDlc?: string }> {
  const has = await hasDlcEntitlement(playerId, dlcId);
  if (has) {
    return { hasAccess: true };
  }
  return { hasAccess: false, missingDlc: dlcId };
}

export async function claimPlayerReward(
  playerId: string,
  rewardId: string,
): Promise<{ success: boolean; cosmeticId?: string; error?: string }> {
  const result = await claimReward(playerId, rewardId);
  if (!result) {
    return { success: false, error: 'Already claimed or reward not found.' };
  }
  return { success: true, cosmeticId: result };
}