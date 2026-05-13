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

  // ── Materials (crafting) ─────────────────────────────────────────────
  pickaxe: {
    id: 'pickaxe', name: 'Pickaxe', type: 'weapon', rarity: 'common',
    description: 'Required to mine ore veins. Equippable weapon.',
    damage: 4, accuracy: 60, stackable: false,
    buyPrice: 50, sellPrice: 25, tradelock: false, equipSlot: 'weapon',
  },
  wood_axe: {
    id: 'wood_axe', name: 'Wood Axe', type: 'weapon', rarity: 'common',
    description: 'Required to chop lumber spots. Equippable weapon.',
    damage: 4, accuracy: 60, stackable: false,
    buyPrice: 45, sellPrice: 22, tradelock: false, equipSlot: 'weapon',
  },
  water_flask: {
    id: 'water_flask', name: 'Empty Water Flask', type: 'consumable', rarity: 'common',
    description: 'An empty flask. Use "fill" at a water source to fill it.',
    consumable: false, stackable: true,
    buyPrice: 10, sellPrice: 5, tradelock: false,
  },

  // ── Craftable Equipment ─────────────────────────────────────────────
  flame_blade: {
    id: 'flame_blade', name: 'Flame Blade', type: 'weapon', rarity: 'epic',
    description: 'A blade wreathed in eternal flame.',
    damage: 35, accuracy: 85, strengthBonus: 8, critRateBonus: 0.05, stackable: false,
    buyPrice: 0, sellPrice: 400, tradelock: false, equipSlot: 'weapon',
  },
  void_dagger: {
    id: 'void_dagger', name: 'Void Dagger', type: 'weapon', rarity: 'legendary',
    description: 'A dagger forged from void essence.',
    damage: 28, accuracy: 90, agilityBonus: 15, critRateBonus: 0.10, critDamageBonus: 0.20, stackable: false,
    buyPrice: 0, sellPrice: 800, tradelock: false, equipSlot: 'weapon',
  },
  storm_staff: {
    id: 'storm_staff', name: 'Storm Staff', type: 'weapon', rarity: 'epic',
    description: 'Crackling with lightning, this staff amplifies mana.',
    damage: 15, accuracy: 80, manaBonus: 80, critRateBonus: 0.05, stackable: false,
    buyPrice: 0, sellPrice: 500, tradelock: false, equipSlot: 'weapon',
  },
  mage_robe: {
    id: 'mage_robe', name: 'Mage Robe', type: 'armor', rarity: 'rare',
    description: 'A silk robe woven with mana crystals.',
    defense: 15, manaBonus: 40, agilityBonus: 5, stackable: false,
    buyPrice: 0, sellPrice: 200, tradelock: false, equipSlot: 'armor',
  },
  shadow_cloak: {
    id: 'shadow_cloak', name: 'Shadow Cloak', type: 'armor', rarity: 'rare',
    description: 'A cloak of shadow silk that bends light.',
    defense: 10, agilityBonus: 12, luckBonus: 5, stackable: false,
    buyPrice: 0, sellPrice: 180, tradelock: false, equipSlot: 'armor',
  },
  dragon_scale_armor: {
    id: 'dragon_scale_armor', name: 'Dragon Scale Armor', type: 'armor', rarity: 'epic',
    description: 'Armor forged from dragon scales and bone.',
    defense: 30, strengthBonus: 10, hpBonus: 100, stackable: false,
    buyPrice: 0, sellPrice: 600, tradelock: false, equipSlot: 'armor',
  },
  // ── Scroll Items (skill learning) ─────────────────────────────────
  power_strike_scroll: {
    id: 'power_strike_scroll', name: 'Power Strike Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Power Strike. Use "learn" to learn this skill.',
    consumable: true, stackable: true,
    buyPrice: 80, sellPrice: 40, tradelock: false,
  },
  quick_slash_scroll: {
    id: 'quick_slash_scroll', name: 'Quick Slash Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Quick Slash.',
    consumable: true, stackable: true,
    buyPrice: 60, sellPrice: 30, tradelock: false,
  },
  cleave_scroll: {
    id: 'cleave_scroll', name: 'Cleave Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Cleave.',
    consumable: true, stackable: true,
    buyPrice: 150, sellPrice: 75, tradelock: false,
  },
  bash_scroll: {
    id: 'bash_scroll', name: 'Bash Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Bash.',
    consumable: true, stackable: true,
    buyPrice: 100, sellPrice: 50, tradelock: false,
  },
  execute_scroll: {
    id: 'execute_scroll', name: 'Execute Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Execute.',
    consumable: true, stackable: true,
    buyPrice: 200, sellPrice: 100, tradelock: false,
  },
  iron_swing_scroll: {
    id: 'iron_swing_scroll', name: 'Iron Swing Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Iron Swing.',
    consumable: true, stackable: true,
    buyPrice: 250, sellPrice: 125, tradelock: false,
  },
  whirlwind_scroll: {
    id: 'whirlwind_scroll', name: 'Whirlwind Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Whirlwind.',
    consumable: true, stackable: true,
    buyPrice: 400, sellPrice: 200, tradelock: false,
  },
  crushing_blow_scroll: {
    id: 'crushing_blow_scroll', name: 'Crushing Blow Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Crushing Blow.',
    consumable: true, stackable: true,
    buyPrice: 500, sellPrice: 250, tradelock: false,
  },
  fireball_scroll: {
    id: 'fireball_scroll', name: 'Fireball Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Fireball (Fire magic).',
    consumable: true, stackable: true,
    buyPrice: 100, sellPrice: 50, tradelock: false,
  },
  inferno_scroll: {
    id: 'inferno_scroll', name: 'Inferno Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Inferno (Fire magic).',
    consumable: true, stackable: true,
    buyPrice: 200, sellPrice: 100, tradelock: false,
  },
  blaze_storm_scroll: {
    id: 'blaze_storm_scroll', name: 'Blaze Storm Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Blaze Storm (Fire magic).',
    consumable: true, stackable: true,
    buyPrice: 500, sellPrice: 250, tradelock: false,
  },
  ice_shard_scroll: {
    id: 'ice_shard_scroll', name: 'Ice Shard Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Ice Shard (Ice magic).',
    consumable: true, stackable: true,
    buyPrice: 80, sellPrice: 40, tradelock: false,
  },
  frost_nova_scroll: {
    id: 'frost_nova_scroll', name: 'Frost Nova Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Frost Nova (Ice magic).',
    consumable: true, stackable: true,
    buyPrice: 180, sellPrice: 90, tradelock: false,
  },
  glacial_spike_scroll: {
    id: 'glacial_spike_scroll', name: 'Glacial Spike Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Glacial Spike (Ice magic).',
    consumable: true, stackable: true,
    buyPrice: 400, sellPrice: 200, tradelock: false,
  },
  thunder_bolt_scroll: {
    id: 'thunder_bolt_scroll', name: 'Thunder Bolt Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Thunder Bolt (Thunder magic).',
    consumable: true, stackable: true,
    buyPrice: 100, sellPrice: 50, tradelock: false,
  },
  chain_lightning_scroll: {
    id: 'chain_lightning_scroll', name: 'Chain Lightning Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Chain Lightning (Thunder magic).',
    consumable: true, stackable: true,
    buyPrice: 220, sellPrice: 110, tradelock: false,
  },
  storm_urge_scroll: {
    id: 'storm_urge_scroll', name: 'Storm Urge Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Storm Urge (Thunder magic).',
    consumable: true, stackable: true,
    buyPrice: 550, sellPrice: 275, tradelock: false,
  },
  shadow_strike_scroll: {
    id: 'shadow_strike_scroll', name: 'Shadow Strike Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Shadow Strike (Shadow magic).',
    consumable: true, stackable: true,
    buyPrice: 180, sellPrice: 90, tradelock: false,
  },
  soul_drain_scroll: {
    id: 'soul_drain_scroll', name: 'Soul Drain Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Soul Drain (Shadow magic).',
    consumable: true, stackable: true,
    buyPrice: 250, sellPrice: 125, tradelock: false,
  },
  void_blast_scroll: {
    id: 'void_blast_scroll', name: 'Void Blast Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Void Blast (Shadow magic).',
    consumable: true, stackable: true,
    buyPrice: 480, sellPrice: 240, tradelock: false,
  },
  holy_light_scroll: {
    id: 'holy_light_scroll', name: 'Holy Light Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Holy Light (Light magic).',
    consumable: true, stackable: true,
    buyPrice: 100, sellPrice: 50, tradelock: false,
  },
  divine_smite_scroll: {
    id: 'divine_smite_scroll', name: 'Divine Smite Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Divine Smite (Light magic).',
    consumable: true, stackable: true,
    buyPrice: 250, sellPrice: 125, tradelock: false,
  },
  arcane_surge_scroll: {
    id: 'arcane_surge_scroll', name: 'Arcane Surge Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Arcane Surge (Arcane magic).',
    consumable: true, stackable: true,
    buyPrice: 500, sellPrice: 250, tradelock: false,
  },
  void_collapse_scroll: {
    id: 'void_collapse_scroll', name: 'Void Collapse Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Void Collapse (Void magic).',
    consumable: true, stackable: true,
    buyPrice: 600, sellPrice: 300, tradelock: false,
  },
  null_zone_scroll: {
    id: 'null_zone_scroll', name: 'Null Zone Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Null Zone (Void magic).',
    consumable: true, stackable: true,
    buyPrice: 550, sellPrice: 275, tradelock: false,
  },
  wind_blade_scroll: {
    id: 'wind_blade_scroll', name: 'Wind Blade Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Wind Blade (Wind magic).',
    consumable: true, stackable: true,
    buyPrice: 100, sellPrice: 50, tradelock: false,
  },
  gale_force_scroll: {
    id: 'gale_force_scroll', name: 'Gale Force Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Gale Force (Wind magic).',
    consumable: true, stackable: true,
    buyPrice: 220, sellPrice: 110, tradelock: false,
  },
  earthquake_scroll: {
    id: 'earthquake_scroll', name: 'Earthquake Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Earthquake (Earth magic).',
    consumable: true, stackable: true,
    buyPrice: 220, sellPrice: 110, tradelock: false,
  },
  stone_shatter_scroll: {
    id: 'stone_shatter_scroll', name: 'Stone Shatter Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Stone Shatter (Earth magic).',
    consumable: true, stackable: true,
    buyPrice: 450, sellPrice: 225, tradelock: false,
  },
  healing_touch_scroll: {
    id: 'healing_touch_scroll', name: 'Healing Touch Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Healing Touch (Support — heals ally).',
    consumable: true, stackable: true,
    buyPrice: 120, sellPrice: 60, tradelock: false,
  },
  healing_light_scroll: {
    id: 'healing_light_scroll', name: 'Healing Light Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Healing Light (Support).',
    consumable: true, stackable: true,
    buyPrice: 250, sellPrice: 125, tradelock: false,
  },
  greater_heal_scroll: {
    id: 'greater_heal_scroll', name: 'Greater Heal Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Greater Heal (Support).',
    consumable: true, stackable: true,
    buyPrice: 500, sellPrice: 250, tradelock: false,
  },
  full_restore_scroll: {
    id: 'full_restore_scroll', name: 'Full Restore Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Full Restore (Support — full heal + cleanse).',
    consumable: true, stackable: true,
    buyPrice: 600, sellPrice: 300, tradelock: false,
  },
  haste_scroll: {
    id: 'haste_scroll', name: 'Haste Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Haste (Support — +20 agility ally).',
    consumable: true, stackable: true,
    buyPrice: 150, sellPrice: 75, tradelock: false,
  },
  iron_guard_scroll: {
    id: 'iron_guard_scroll', name: 'Iron Guard Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Iron Guard (Support — +30 defense ally).',
    consumable: true, stackable: true,
    buyPrice: 150, sellPrice: 75, tradelock: false,
  },
  empower_scroll: {
    id: 'empower_scroll', name: 'Empower Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Empower (Support — +25% attack ally).',
    consumable: true, stackable: true,
    buyPrice: 200, sellPrice: 100, tradelock: false,
  },
  arcane_infuse_scroll: {
    id: 'arcane_infuse_scroll', name: 'Arcane Infuse Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Arcane Infuse (Support — +30% magic ally).',
    consumable: true, stackable: true,
    buyPrice: 220, sellPrice: 110, tradelock: false,
  },
  cleanse_scroll: {
    id: 'cleanse_scroll', name: 'Cleanse Scroll', type: 'scroll', rarity: 'uncommon',
    description: 'Teaches: Cleanse (Support — removes debuffs).',
    consumable: true, stackable: true,
    buyPrice: 120, sellPrice: 60, tradelock: false,
  },
  barrier_scroll: {
    id: 'barrier_scroll', name: 'Barrier Scroll', type: 'scroll', rarity: 'rare',
    description: 'Teaches: Barrier (Support — damage shield).',
    consumable: true, stackable: true,
    buyPrice: 220, sellPrice: 110, tradelock: false,
  },
  resurrection_scroll: {
    id: 'resurrection_scroll', name: 'Resurrection Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Resurrection (Support — revive ally at 30% HP).',
    consumable: true, stackable: true,
    buyPrice: 700, sellPrice: 350, tradelock: false,
  },
  rally_scroll: {
    id: 'rally_scroll', name: 'Rally Scroll', type: 'scroll', rarity: 'epic',
    description: 'Teaches: Rally (Support — +10% all stats ALL allies).',
    consumable: true, stackable: true,
    buyPrice: 600, sellPrice: 300, tradelock: false,
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
