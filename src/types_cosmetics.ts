// Phase 11 — Cosmetic & Steam Types

export type CosmeticCategory = 'skin' | 'chat' | 'title' | 'effect' | 'housing';
export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CosmeticSource = 'purchase' | 'reward' | 'dlc';
export type RewardTriggerType = 'level' | 'achievement' | 'action' | 'login';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  subcategory?: string;
  rarity: CosmeticRarity;
  description: string;
  priceUsd: number | null; // null = free/reward only
  steamProductId?: string;
  effectData?: CosmeticEffectData;
  equipSlot?: 'weapon' | 'armor' | 'accessory';
  isDlc: boolean;
  dlcRequired?: string;
  requiresLevel?: number;
  createdAt: string;
}

export interface CosmeticEffectData {
  color?: string;
  particle?: string;
  animation?: string;
  prefix?: string;
  suffix?: string;
  bubbleStyle?: string;
}

export interface PlayerCosmetic {
  playerId: string;
  cosmeticId: string;
  equipped: boolean;
  acquiredAt: string;
  source: CosmeticSource;
}

export interface DlcEntitlement {
  playerId: string;
  dlcId: string;
  purchasedAt: string;
  source: 'steam' | 'manual' | 'promo';
}

export interface InventoryExpansion {
  playerId: string;
  baseSlots: number; // default: 50
  purchasedSlots: number; // extra slots purchased
}

export interface CosmeticReward {
  rewardId: string;
  cosmeticId: string;
  triggerType: RewardTriggerType;
  triggerValue?: string; // JSON: { level: 10 } or { achievement: 'kill_100' }
  title: string;
  description: string;
  createdAt: string;
}

export interface PlayerRewardClaim {
  playerId: string;
  rewardId: string;
  claimedAt: string;
}

// ─── Steam Types ────────────────────────────────────────────────────────────────

export interface SteamTicketPayload {
  steamId: string;
  ticket: string;
  timestamp: number;
}

export interface SteamOwnership {
  steamId: string;
  ownedProducts: string[]; // cosmetic IDs or DLC IDs
  lastChecked: string;
}

// ─── Store Sync Response ────────────────────────────────────────────────────────

export interface StoreSyncResponse {
  cosmetics: CosmeticItem[];
  ownedCosmetics: string[]; // cosmetic IDs this player owns
  equippedCosmetics: Record<string, string>; // category → cosmeticId
  entitlements: string[]; // DLC IDs this player owns
  inventorySlots: number;
  availableRewards: CosmeticReward[];
  claimedRewards: string[]; // rewardIds already claimed
}