import type { Item, EquipSlot, Rarity } from '../types';

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '\x1b[37m',
  uncommon:  '\x1b[32m',
  rare:      '\x1b[36m',
  epic:      '\x1b[35m',
  legendary: '\x1b[33m',
  mythic:    '\x1b[31m',
};

export const RARITY_RESET = '\x1b[0m';

export function rarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity] ?? RARITY_RESET;
}

export function rarityName(rarity: Rarity): string {
  return `[${rarity.charAt(0).toUpperCase() + rarity.slice(1)}]`;
}

export function formatItem(item: Item, qty = 1): string {
  const col = rarityColor(item.rarity);
  const r    = RARITY_RESET;
  const tag  = `${col}${rarityName(item.rarity)}${r}`;
  const qstr = item.stackable && qty > 1 ? ` x${qty}` : '';
  return `${col}${item.name}${r} ${tag}${qstr}`;
}

// ─── Items Data ───────────────────────────────────────────────────────────

export const ITEMS: Record<string, Item> = {
  // ── Weapons ──────────────────────────────────────────────────────────
  rusty_sword: {
    id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', rarity: 'common',
    description: 'A dull blade with rust along the edge.',
    damage: 5, accuracy: 70, strengthBonus: 1, stackable: false,
    buyPrice: 0, sellPrice: 5, tradelock: false, equipSlot: 'weapon',
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'weapon', rarity: 'common',
    description: 'A basic iron blade.',
    damage: 10, accuracy: 75, strengthBonus: 2, stackable: false,
    buyPrice: 50, sellPrice: 25, tradelock: false, equipSlot: 'weapon',
  },
  steel_sword: {
    id: 'steel_sword', name: 'Steel Sword', type: 'weapon', rarity: 'uncommon',
    description: 'A well-forged steel blade.',
    damage: 18, accuracy: 80, strengthBonus: 4, stackable: false,
    buyPrice: 200, sellPrice: 100, tradelock: false, equipSlot: 'weapon',
  },
  wooden_staff: {
    id: 'wooden_staff', name: 'Wooden Staff', type: 'weapon', rarity: 'common',
    description: 'A simple wooden staff.',
    damage: 3, accuracy: 65, manaBonus: 10, stackable: false,
    buyPrice: 30, sellPrice: 15, tradelock: false, equipSlot: 'weapon',
  },
  oak_staff: {
    id: 'oak_staff', name: 'Oak Staff', type: 'weapon', rarity: 'uncommon',
    description: 'A sturdy oak staff imbued with minor mana.',
    damage: 6, accuracy: 70, manaBonus: 25, stackable: false,
    buyPrice: 180, sellPrice: 90, tradelock: false, equipSlot: 'weapon',
  },

  // ── Armor ──────────────────────────────────────────────────────────
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', type: 'armor', rarity: 'common',
    description: 'Simple protective gear.',
    defense: 5, agilityBonus: 1, stackable: false,
    buyPrice: 60, sellPrice: 30, tradelock: false, equipSlot: 'armor',
  },
  chainmail: {
    id: 'chainmail', name: 'Chainmail', type: 'armor', rarity: 'uncommon',
    description: 'Metal rings linked together.',
    defense: 12, strengthBonus: 1, stackable: false,
    buyPrice: 220, sellPrice: 110, tradelock: false, equipSlot: 'armor',
  },

  // ── Accessories ─────────────────────────────────────────────────────
  copper_ring: {
    id: 'copper_ring', name: 'Copper Ring', type: 'accessory', rarity: 'common',
    description: 'A plain copper ring.',
    luckBonus: 1, stackable: false,
    buyPrice: 25, sellPrice: 12, tradelock: false, equipSlot: 'accessory1',
  },
  silver_ring: {
    id: 'silver_ring', name: 'Silver Ring', type: 'accessory', rarity: 'uncommon',
    description: 'A silver ring with minor enchantment.',
    luckBonus: 3, critRateBonus: 0.02, stackable: false,
    buyPrice: 150, sellPrice: 75, tradelock: false, equipSlot: 'accessory1',
  },

  // ── Consumables ─────────────────────────────────────────────────────
  health_potion_1: {
    id: 'health_potion_1', name: 'Health Potion I', type: 'consumable', rarity: 'common',
    description: 'Restores 50 HP.',
    consumable: true, healAmount: 50, stackable: true,
    buyPrice: 15, sellPrice: 7, tradelock: false,
  },
  health_potion_2: {
    id: 'health_potion_2', name: 'Health Potion II', type: 'consumable', rarity: 'common',
    description: 'Restores 100 HP.',
    consumable: true, healAmount: 100, stackable: true,
    buyPrice: 30, sellPrice: 15, tradelock: false,
  },
  health_potion_3: {
    id: 'health_potion_3', name: 'Health Potion III', type: 'consumable', rarity: 'uncommon',
    description: 'Restores 200 HP.',
    consumable: true, healAmount: 200, stackable: true,
    buyPrice: 60, sellPrice: 30, tradelock: false,
  },
  mana_potion_1: {
    id: 'mana_potion_1', name: 'Mana Potion I', type: 'consumable', rarity: 'common',
    description: 'Restores 30 MP.',
    consumable: true, manaRestore: 30, stackable: true,
    buyPrice: 20, sellPrice: 10, tradelock: false,
  },
  mana_potion_2: {
    id: 'mana_potion_2', name: 'Mana Potion II', type: 'consumable', rarity: 'common',
    description: 'Restores 80 MP.',
    consumable: true, manaRestore: 80, stackable: true,
    buyPrice: 45, sellPrice: 22, tradelock: false,
  },
  antidote: {
    id: 'antidote', name: 'Antidote', type: 'consumable', rarity: 'common',
    description: 'Cures Poison and Curse.',
    consumable: true, effect: 'cleanse', stackable: true,
    buyPrice: 25, sellPrice: 12, tradelock: false,
  },

  // ── Starting Items ──────────────────────────────────────────────────
  wooden_sword: {
    id: 'wooden_sword', name: 'Wooden Sword', type: 'weapon', rarity: 'common',
    description: 'A practice sword. Better than nothing.',
    damage: 3, accuracy: 65, strengthBonus: 0, stackable: false,
    buyPrice: 0, sellPrice: 3, tradelock: false, equipSlot: 'weapon',
  },
  tattered_cloth: {
    id: 'tattered_cloth', name: 'Tattered Cloth', type: 'armor', rarity: 'common',
    description: 'Threadbare cloth. Offers minimal protection.',
    defense: 1, stackable: false,
    buyPrice: 0, sellPrice: 1, tradelock: false, equipSlot: 'armor',
  },
  health_potion_1x3: {
    id: 'health_potion_1x3', name: 'Health Potion I', type: 'consumable', rarity: 'common',
    description: 'Restores 50 HP.',
    consumable: true, healAmount: 50, stackable: true,
    buyPrice: 0, sellPrice: 7, tradelock: false,
  },
};

export function getItem(itemId: string): Item | undefined {
  return ITEMS[itemId];
}

export function getDefaultEquipment(): Record<EquipSlot, string | null> {
  return {
    weapon: 'wooden_sword',
    armor: 'tattered_cloth',
    accessory1: null,
    accessory2: null,
  };
}
