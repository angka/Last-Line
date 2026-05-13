import type { ShopCatalog } from '../types';

// Shop tiers map to city tiers. Only items that exist in ITEMS are listed.
// Missing items should be added to items.ts and referenced here.

export const SHOP_CATALOGS: Record<string, ShopCatalog> = {
  // ── Tier 1: Ashford, Irongate ─────────────────────────────────────
  ashford_village_square: {
    cityId: 'ashford_village_square',
    items: [
      'iron_sword', 'leather_armor', 'copper_ring',
      'health_potion_1', 'mana_potion_1',
    ],
  },
  iron_gate_town_square: {
    cityId: 'iron_gate_town_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_1', 'health_potion_2',
      'mana_potion_1', 'mana_potion_2',
      'antidote',
    ],
  },

  // ── Tier 2: Thornwick, Millhaven ───────────────────────────────────
  thornwick_square: {
    cityId: 'thornwick_square',
    items: [
      'oak_staff', 'leather_armor', 'silver_ring',
      'health_potion_2', 'mana_potion_2',
      'antidote', 'health_potion_3',
    ],
  },
  millhaven_square: {
    cityId: 'millhaven_square',
    items: [
      'oak_staff', 'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_2', 'health_potion_3',
      'mana_potion_2', 'antidote',
    ],
  },

  // ── Tier 3: Crystalmere, Emberveil ─────────────────────────────────
  crystalmere_city_square: {
    cityId: 'crystalmere_city_square',
    items: [
      'oak_staff', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  emberveil_square: {
    cityId: 'emberveil_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },

  // ── Tier 4: Duskhollow, Stormspire ─────────────────────────────────
  duskhollow_square: {
    cityId: 'duskhollow_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  stormspire_citadel_square: {
    cityId: 'stormspire_citadel_square',
    items: [
      'oak_staff', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },

  // ── Tier 5: Veilreach, Cinderpeak, Ashenmoor ───────────────────────
  veilreach_square: {
    cityId: 'veilreach_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  cinderpeak_square: {
    cityId: 'cinderpeak_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  ashenmoor_square: {
    cityId: 'ashenmoor_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },

  // ── Tier 6: Wraithgate, Obsidian Keep, Sanctum ─────────────────────
  wraithgate_square: {
    cityId: 'wraithgate_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  obsidian_keep_square: {
    cityId: 'obsidian_keep_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
  the_sanctum_square: {
    cityId: 'the_sanctum_square',
    items: [
      'steel_sword', 'chainmail', 'silver_ring',
      'health_potion_3', 'mana_potion_2',
      'antidote',
    ],
  },
};

export function getShopCatalog(cityId: string): ShopCatalog | undefined {
  return SHOP_CATALOGS[cityId];
}
