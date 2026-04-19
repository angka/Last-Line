import type { Material, CraftingRecipe, GatheringNode, LootDrop, Rarity } from '../types';

// ─── Materials Catalog ────────────────────────────────────────────────────────

export const MATERIALS: Record<string, Material> = {
  red_herb: { id: 'red_herb', name: 'Red Herb', type: 'herb', biome: ['grassland'], rarity: 'common', description: 'A common medicinal herb.', stackable: true },
  blue_herb: { id: 'blue_herb', name: 'Blue Herb', type: 'herb', biome: ['grassland', 'swamp', 'forest'], rarity: 'common', description: 'Used for mana concoctions.', stackable: true },
  sylvan_herb: { id: 'sylvan_herb', name: 'Sylvan Herb', type: 'herb', biome: ['forest', 'deep_forest', 'bamboo'], rarity: 'uncommon', description: 'A potent forest herb.', stackable: true },
  moon_blossom: { id: 'moon_blossom', name: 'Moon Blossom', type: 'herb', biome: ['forest', 'deep_forest'], rarity: 'uncommon', description: 'Glows faintly under moonlight.', stackable: true },
  swamp_herb: { id: 'swamp_herb', name: 'Swamp Herb', type: 'herb', biome: ['swamp'], rarity: 'common', description: 'A bitter herb found in bogs.', stackable: true },
  cursed_herb: { id: 'cursed_herb', name: 'Cursed Herb', type: 'herb', biome: ['dark_forest', 'moor', 'haunted'], rarity: 'rare', description: 'A wilted herb imbued with dark energy.', stackable: true },
  void_herb: { id: 'void_herb', name: 'Void Herb', type: 'herb', biome: ['void'], rarity: 'epic', description: 'Grows only in void-rift zones.', stackable: true },
  swamp_reed: { id: 'swamp_reed', name: 'Swamp Reed', type: 'herb', biome: ['swamp'], rarity: 'common', description: 'A tall reed found near water.', stackable: true },
  wild_mushroom: { id: 'wild_mushroom', name: 'Wild Mushroom', type: 'herb', biome: ['forest', 'cave'], rarity: 'common', description: 'A common forest mushroom.', stackable: true },
  cave_mushroom: { id: 'cave_mushroom', name: 'Cave Mushroom', type: 'herb', biome: ['cave'], rarity: 'uncommon', description: 'Found only underground.', stackable: true },
  poison_mushroom: { id: 'poison_mushroom', name: 'Poison Mushroom', type: 'herb', biome: ['swamp', 'cave', 'dark_forest'], rarity: 'uncommon', description: 'Toxic.', stackable: true },
  spirit_dew: { id: 'spirit_dew', name: 'Spirit Dew', type: 'herb', biome: ['bamboo'], rarity: 'rare', description: 'Rare dew with spiritual properties.', stackable: true },
  bamboo_mushroom: { id: 'bamboo_mushroom', name: 'Bamboo Mushroom', type: 'herb', biome: ['bamboo'], rarity: 'uncommon', description: 'A delicate bamboo grove mushroom.', stackable: true },

  iron_ore: { id: 'iron_ore', name: 'Iron Ore', type: 'ore', biome: ['cave', 'mountain'], rarity: 'common', description: 'Basic forging ore.', stackable: true },
  copper_ore: { id: 'copper_ore', name: 'Copper Ore', type: 'ore', biome: ['cave'], rarity: 'common', description: 'A soft reddish metal ore.', stackable: true },
  coal: { id: 'coal', name: 'Coal', type: 'ore', biome: ['cave'], rarity: 'common', description: 'Forge fuel.', stackable: true },
  steel_ingot: { id: 'steel_ingot', name: 'Steel Ingot', type: 'ore', biome: ['cave', 'mountain'], rarity: 'uncommon', description: 'Refined iron.', stackable: true },
  mana_crystal_raw: { id: 'mana_crystal_raw', name: 'Mana Crystal (Raw)', type: 'crystal', biome: ['savanna', 'coast'], rarity: 'rare', description: 'A raw mana crystal.', stackable: true },
  mana_crystal_pure: { id: 'mana_crystal_pure', name: 'Mana Crystal (Pure)', type: 'crystal', biome: ['savanna', 'coast'], rarity: 'epic', description: 'A pure mana crystal.', stackable: true },
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', type: 'crystal', biome: ['savanna', 'mountain'], rarity: 'uncommon', description: 'A shard of crystal.', stackable: true },
  magma_ore: { id: 'magma_ore', name: 'Magma Ore', type: 'ore', biome: ['volcanic'], rarity: 'rare', description: 'Molten ore from volcanic areas.', stackable: true },
  stormstone: { id: 'stormstone', name: 'Stormstone', type: 'ore', biome: ['mountain'], rarity: 'rare', description: 'Stone crackling with electricity.', stackable: true },
  stormcore_ore_raw: { id: 'stormcore_ore_raw', name: 'Stormcore Ore (Raw)', type: 'ore', biome: ['mountain'], rarity: 'epic', description: 'Raw stormcore ore.', stackable: true },
  bog_ore: { id: 'bog_ore', name: 'Bog Ore', type: 'ore', biome: ['swamp'], rarity: 'uncommon', description: 'Iron ore from boglands.', stackable: true },
  dark_crystal: { id: 'dark_crystal', name: 'Dark Crystal', type: 'crystal', biome: ['swamp', 'dark_forest', 'void'], rarity: 'rare', description: 'A crystal suffused with darkness.', stackable: true },
  void_core_shard: { id: 'void_core_shard', name: 'Void Core Shard', type: 'crystal', biome: ['void'], rarity: 'legendary', description: 'A fragment of void energy.', stackable: true },
  wraith_essence_raw: { id: 'wraith_essence_raw', name: 'Wraith Essence (Raw)', type: 'essence', biome: ['haunted', 'void'], rarity: 'epic', description: 'Raw spectral essence.', stackable: true },

  pine_sap: { id: 'pine_sap', name: 'Pine Sap', type: 'wood', biome: ['forest', 'mountain'], rarity: 'common', description: 'Sticky sap from pine trees.', stackable: true },
  ancient_bark: { id: 'ancient_bark', name: 'Ancient Bark', type: 'wood', biome: ['deep_forest'], rarity: 'uncommon', description: 'Bark from an ancient tree.', stackable: true },
  darkwood_branch: { id: 'darkwood_branch', name: 'Darkwood Branch', type: 'wood', biome: ['dark_forest'], rarity: 'rare', description: 'A branch from a darkwood tree.', stackable: true },
  ghost_wood: { id: 'ghost_wood', name: 'Ghost Wood', type: 'wood', biome: ['haunted'], rarity: 'epic', description: 'Wood from haunted groves.', stackable: true },
  bamboo_stalk: { id: 'bamboo_stalk', name: 'Bamboo Stalk', type: 'wood', biome: ['bamboo'], rarity: 'uncommon', description: 'Light and flexible bamboo.', stackable: true },
  bamboo_fiber: { id: 'bamboo_fiber', name: 'Bamboo Fiber', type: 'cloth', biome: ['bamboo'], rarity: 'common', description: 'Woven from bamboo stalks.', stackable: true },

  goblin_fang: { id: 'goblin_fang', name: 'Goblin Fang', type: 'monster_drop', biome: [], rarity: 'common', description: 'A sharp goblin tooth.', stackable: true },
  goblin_claw: { id: 'goblin_claw', name: 'Goblin Claw', type: 'monster_drop', biome: [], rarity: 'common', description: 'A curved goblin claw.', stackable: true },
  wolf_pelt: { id: 'wolf_pelt', name: 'Wolf Pelt', type: 'monster_drop', biome: ['forest', 'deep_forest', 'grassland'], rarity: 'common', description: 'A coarse animal pelt.', stackable: true },
  spider_silk: { id: 'spider_silk', name: 'Spider Silk', type: 'monster_drop', biome: ['forest', 'deep_forest', 'cave'], rarity: 'common', description: 'Strong silk from giant spiders.', stackable: true },
  venom_fang: { id: 'venom_fang', name: 'Venom Fang', type: 'monster_drop', biome: ['swamp'], rarity: 'uncommon', description: 'A dripping venomous fang.', stackable: true },
  dragon_scale_shed: { id: 'dragon_scale_shed', name: 'Dragon Scale (Shed)', type: 'monster_drop', biome: ['mountain', 'volcanic'], rarity: 'epic', description: 'A shed scale from a dragon.', stackable: true },
  void_essence: { id: 'void_essence', name: 'Void Essence', type: 'essence', biome: ['void'], rarity: 'legendary', description: 'Pure essence of the void.', stackable: true },
  wraith_essence: { id: 'wraith_essence', name: 'Wraith Essence', type: 'essence', biome: ['haunted'], rarity: 'epic', description: 'Essence from a wraith.', stackable: true },
  cursed_essence_raw: { id: 'cursed_essence_raw', name: 'Cursed Essence (Raw)', type: 'essence', biome: ['moor', 'haunted'], rarity: 'rare', description: 'Raw cursed essence.', stackable: true },
  bone_shard: { id: 'bone_shard', name: 'Bone Shard', type: 'bone', biome: ['moor', 'haunted', 'cave'], rarity: 'uncommon', description: 'A fragment of bone.', stackable: true },
  ancient_bone: { id: 'ancient_bone', name: 'Ancient Bone', type: 'bone', biome: ['moor', 'haunted'], rarity: 'rare', description: 'Bone from an ancient creature.', stackable: true },
  river_pearl: { id: 'river_pearl', name: 'River Pearl', type: 'monster_drop', biome: ['swamp'], rarity: 'uncommon', description: 'A lustrous pearl.', stackable: true },
  shadow_silk_raw: { id: 'shadow_silk_raw', name: 'Shadow Silk (Raw)', type: 'cloth', biome: ['dark_forest'], rarity: 'rare', description: 'Raw silk from shadow spiders.', stackable: true },
  shadow_silk: { id: 'shadow_silk', name: 'Shadow Silk', type: 'cloth', biome: ['dark_forest'], rarity: 'epic', description: 'Refined shadow silk.', stackable: true },

  quartz: { id: 'quartz', name: 'Quartz', type: 'crystal', biome: ['savanna', 'cave'], rarity: 'common', description: 'A common crystalline gem.', stackable: true },
  green_crystal_shard: { id: 'green_crystal_shard', name: 'Green Crystal Shard', type: 'crystal', biome: ['bamboo'], rarity: 'uncommon', description: 'A shard of green crystal.', stackable: true },
  windweave_fiber_raw: { id: 'windweave_fiber_raw', name: 'Windweave Fiber (Raw)', type: 'cloth', biome: ['mountain'], rarity: 'rare', description: 'Raw windweave fiber.', stackable: true },
  silver_ore: { id: 'silver_ore', name: 'Silver Ore', type: 'ore', biome: ['cave', 'mountain'], rarity: 'uncommon', description: 'A precious silver ore.', stackable: true },
  holy_relic_fragment: { id: 'holy_relic_fragment', name: 'Holy Relic Fragment', type: 'bone', biome: ['mountain', 'void'], rarity: 'legendary', description: 'A fragment of a holy relic.', stackable: true },
  dragon_bone_fragment: { id: 'dragon_bone_fragment', name: 'Dragon Bone Fragment', type: 'bone', biome: ['mountain', 'volcanic'], rarity: 'epic', description: 'A fragment of dragon bone.', stackable: true },
  windweave_cloth: { id: 'windweave_cloth', name: 'Windweave Cloth', type: 'cloth', biome: ['mountain'], rarity: 'epic', description: 'Cloth that resists wind.', stackable: true },
  phoenix_bloom: { id: 'phoenix_bloom', name: 'Phoenix Bloom', type: 'herb', biome: ['volcanic', 'savanna'], rarity: 'rare', description: 'A rare flower that blooms in fire.', stackable: true },
  ember_shard: { id: 'ember_shard', name: 'Ember Shard', type: 'ore', biome: ['volcanic'], rarity: 'uncommon', description: 'A shard of cooled magma.', stackable: true },
  flame_cloth: { id: 'flame_cloth', name: 'Flame Cloth', type: 'cloth', biome: ['volcanic'], rarity: 'rare', description: 'Fire-resistant cloth.', stackable: true },
  ice_crystal: { id: 'ice_crystal', name: 'Ice Crystal', type: 'crystal', biome: ['mountain', 'coast'], rarity: 'rare', description: 'A crystal of pure ice.', stackable: true },
  deep_sea_crystal: { id: 'deep_sea_crystal', name: 'Deep Sea Crystal', type: 'crystal', biome: ['coast'], rarity: 'rare', description: 'A crystal from deep ocean shores.', stackable: true },
};

export function getMaterial(id: string): Material | undefined {
  return MATERIALS[id];
}

// ─── Gathering Nodes ──────────────────────────────────────────────────────────

export const GATHERING_NODES: Record<string, GatheringNode[]> = {
  whispering_plains: [
    { nodeId: 'wp_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Wild Herb Patch', position: 'by the tall grass', maxUses: 3, respawnMinutes: 30, lootTable: [{ itemId: 'red_herb', chance: 0.80, qtyMin: 1, qtyMax: 3 }, { itemId: 'blue_herb', chance: 0.25, qtyMin: 1, qtyMax: 1 }, { itemId: 'wild_mushroom', chance: 0.20, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 1 },
    { nodeId: 'wp_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Iron Seam', position: 'in the rocky outcrop', maxUses: 2, respawnMinutes: 60, lootTable: [{ itemId: 'iron_ore', chance: 0.85, qtyMin: 1, qtyMax: 3 }, { itemId: 'coal', chance: 0.30, qtyMin: 1, qtyMax: 2 }], requiresTool: 'pickaxe', minPlayerLevel: 1 },
  ],
  goblin_ravine_road: [
    { nodeId: 'gr_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Ravine Iron Vein', position: 'among the rocks', maxUses: 3, respawnMinutes: 60, lootTable: [{ itemId: 'iron_ore', chance: 0.80, qtyMin: 1, qtyMax: 2 }, { itemId: 'copper_ore', chance: 0.35, qtyMin: 1, qtyMax: 2 }, { itemId: 'coal', chance: 0.20, qtyMin: 1, qtyMax: 1 }], requiresTool: 'pickaxe', minPlayerLevel: 3 },
    { nodeId: 'gr_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Ravine Herb Cluster', position: 'near the ravine edge', maxUses: 2, respawnMinutes: 30, lootTable: [{ itemId: 'red_herb', chance: 0.70, qtyMin: 1, qtyMax: 2 }, { itemId: 'wild_mushroom', chance: 0.30, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 3 },
  ],
  thornwood_edge: [
    { nodeId: 'te_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Sylvan Herb Patch', position: 'in the dense undergrowth', maxUses: 3, respawnMinutes: 30, lootTable: [{ itemId: 'sylvan_herb', chance: 0.60, qtyMin: 1, qtyMax: 2 }, { itemId: 'moon_blossom', chance: 0.30, qtyMin: 1, qtyMax: 1 }, { itemId: 'blue_herb', chance: 0.25, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 5 },
    { nodeId: 'te_wood_01', nodeType: 'lumber_spot', verb: 'chop', name: 'Ancient Bark Log', position: 'near a fallen ancient tree', maxUses: 2, respawnMinutes: 45, lootTable: [{ itemId: 'ancient_bark', chance: 0.70, qtyMin: 1, qtyMax: 2 }, { itemId: 'pine_sap', chance: 0.40, qtyMin: 1, qtyMax: 1 }], requiresTool: 'wood_axe', minPlayerLevel: 5 },
  ],
  coal_hollow_mines: [
    { nodeId: 'ch_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Coal Vein', position: 'deep in the tunnel', maxUses: 4, respawnMinutes: 60, lootTable: [{ itemId: 'coal', chance: 0.80, qtyMin: 2, qtyMax: 5 }, { itemId: 'iron_ore', chance: 0.50, qtyMin: 1, qtyMax: 3 }, { itemId: 'copper_ore', chance: 0.35, qtyMin: 1, qtyMax: 2 }, { itemId: 'cave_mushroom', chance: 0.20, qtyMin: 1, qtyMax: 2 }], requiresTool: 'pickaxe', minPlayerLevel: 6 },
    { nodeId: 'ch_fungus_01', nodeType: 'fungal_cluster', verb: 'pick', name: 'Cave Fungal Cluster', position: 'on the damp cave wall', maxUses: 3, respawnMinutes: 30, lootTable: [{ itemId: 'cave_mushroom', chance: 0.80, qtyMin: 1, qtyMax: 3 }, { itemId: 'poison_mushroom', chance: 0.20, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 6 },
  ],
  river_delta_marshland: [
    { nodeId: 'rd_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Marsh Herb Cluster', position: 'at the water edge', maxUses: 3, respawnMinutes: 30, lootTable: [{ itemId: 'swamp_herb', chance: 0.70, qtyMin: 1, qtyMax: 3 }, { itemId: 'blue_herb', chance: 0.30, qtyMin: 1, qtyMax: 2 }, { itemId: 'swamp_reed', chance: 0.40, qtyMin: 1, qtyMax: 2 }], requiresTool: null, minPlayerLevel: 10 },
    { nodeId: 'rd_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Bog Ore Deposit', position: 'in riverbank mud', maxUses: 2, respawnMinutes: 60, lootTable: [{ itemId: 'bog_ore', chance: 0.80, qtyMin: 1, qtyMax: 3 }, { itemId: 'iron_ore', chance: 0.30, qtyMin: 1, qtyMax: 2 }], requiresTool: 'pickaxe', minPlayerLevel: 10 },
  ],
  crystal_badlands: [
    { nodeId: 'cb_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Crystal Deposit', position: 'among crystalline rocks', maxUses: 3, respawnMinutes: 60, lootTable: [{ itemId: 'crystal_shard', chance: 0.60, qtyMin: 1, qtyMax: 3 }, { itemId: 'mana_crystal_raw', chance: 0.20, qtyMin: 1, qtyMax: 1 }, { itemId: 'quartz', chance: 0.40, qtyMin: 1, qtyMax: 2 }], requiresTool: 'pickaxe', minPlayerLevel: 20 },
  ],
  emberveil_volcanic_road: [
    { nodeId: 'ev_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Magma Ore Vein', position: 'near volcanic vents', maxUses: 3, respawnMinutes: 60, lootTable: [{ itemId: 'magma_ore', chance: 0.50, qtyMin: 1, qtyMax: 2 }, { itemId: 'ember_shard', chance: 0.60, qtyMin: 1, qtyMax: 3 }, { itemId: 'coal', chance: 0.30, qtyMin: 1, qtyMax: 2 }], requiresTool: 'pickaxe', minPlayerLevel: 28 },
    { nodeId: 'ev_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Phoenix Bloom Patch', position: 'near volcanic vents', maxUses: 2, respawnMinutes: 60, lootTable: [{ itemId: 'phoenix_bloom', chance: 0.40, qtyMin: 1, qtyMax: 1 }, { itemId: 'ember_shard', chance: 0.30, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 28 },
  ],
  mirefen_swamp: [
    { nodeId: 'ms_herb_01', nodeType: 'herb_patch', verb: 'gather', name: 'Swamp Herb Cluster', position: 'near the mossy log', maxUses: 3, respawnMinutes: 30, lootTable: [{ itemId: 'swamp_herb', chance: 0.80, qtyMin: 1, qtyMax: 3 }, { itemId: 'poison_mushroom', chance: 0.40, qtyMin: 1, qtyMax: 2 }, { itemId: 'blue_herb', chance: 0.25, qtyMin: 1, qtyMax: 1 }, { itemId: 'swamp_reed', chance: 0.50, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 28 },
    { nodeId: 'ms_ore_01', nodeType: 'mining_vein', verb: 'mine', name: 'Bog Ore Vein', position: 'jutting from submerged rocks', maxUses: 2, respawnMinutes: 60, lootTable: [{ itemId: 'bog_ore', chance: 0.85, qtyMin: 1, qtyMax: 3 }, { itemId: 'iron_ore', chance: 0.35, qtyMin: 1, qtyMax: 2 }, { itemId: 'dark_crystal', chance: 0.10, qtyMin: 1, qtyMax: 1 }], requiresTool: 'pickaxe', minPlayerLevel: 28 },
  ],
  void_frontier: [
    { nodeId: 'vf_void_01', nodeType: 'herb_patch', verb: 'attune', name: 'Void Rift', position: 'tearing reality at void edge', maxUses: 2, respawnMinutes: 120, lootTable: [{ itemId: 'void_core_shard', chance: 0.40, qtyMin: 1, qtyMax: 1 }, { itemId: 'void_essence', chance: 0.50, qtyMin: 1, qtyMax: 2 }, { itemId: 'void_herb', chance: 0.30, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 92 },
  ],
  abyssal_approach: [
    { nodeId: 'aa_void_01', nodeType: 'herb_patch', verb: 'attune', name: 'Abyssal Rift', position: 'the dark edge of the abyss', maxUses: 2, respawnMinutes: 120, lootTable: [{ itemId: 'void_core_shard', chance: 0.50, qtyMin: 1, qtyMax: 2 }, { itemId: 'void_essence', chance: 0.60, qtyMin: 1, qtyMax: 3 }, { itemId: 'void_herb', chance: 0.40, qtyMin: 1, qtyMax: 1 }], requiresTool: null, minPlayerLevel: 95 },
  ],
};

export function getGatheringNodesForArea(areaId: string): GatheringNode[] {
  return GATHERING_NODES[areaId] ?? [];
}

// ─── Crafting Recipes ─────────────────────────────────────────────────────────

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  { id: 'health_potion_1_craft', name: 'Health Potion I', outputItemId: 'health_potion_1', outputQty: 2, skillLevelRequired: 1, materials: [{ itemId: 'red_herb', qty: 2 }], description: 'Brew 2 Health Potions from Red Herbs.' },
  { id: 'mana_potion_1_craft', name: 'Mana Potion I', outputItemId: 'mana_potion_1', outputQty: 2, skillLevelRequired: 1, materials: [{ itemId: 'blue_herb', qty: 2 }], description: 'Brew 2 Mana Potions from Blue Herbs.' },
  { id: 'antidote_craft', name: 'Antidote', outputItemId: 'antidote', outputQty: 1, skillLevelRequired: 1, materials: [{ itemId: 'swamp_herb', qty: 2 }, { itemId: 'poison_mushroom', qty: 1 }], description: 'Brew an Antidote.' },
  { id: 'health_potion_2_craft', name: 'Health Potion II', outputItemId: 'health_potion_2', outputQty: 1, skillLevelRequired: 2, materials: [{ itemId: 'sylvan_herb', qty: 3 }, { itemId: 'red_herb', qty: 2 }], description: 'Brew Health Potion II.' },
  { id: 'health_potion_3_craft', name: 'Health Potion III', outputItemId: 'health_potion_3', outputQty: 1, skillLevelRequired: 3, materials: [{ itemId: 'sylvan_herb', qty: 5 }, { itemId: 'moon_blossom', qty: 2 }], description: 'Brew Health Potion III.' },
  { id: 'mana_potion_2_craft', name: 'Mana Potion II', outputItemId: 'mana_potion_2', outputQty: 1, skillLevelRequired: 2, materials: [{ itemId: 'blue_herb', qty: 3 }, { itemId: 'mana_crystal_raw', qty: 1 }], description: 'Brew Mana Potion II.' },
  { id: 'iron_sword_craft', name: 'Iron Sword', outputItemId: 'iron_sword', outputQty: 1, skillLevelRequired: 2, materials: [{ itemId: 'iron_ore', qty: 5 }, { itemId: 'coal', qty: 2 }, { itemId: 'pine_sap', qty: 1 }], description: 'Forge an Iron Sword.' },
  { id: 'steel_sword_craft', name: 'Steel Sword', outputItemId: 'steel_sword', outputQty: 1, skillLevelRequired: 4, materials: [{ itemId: 'steel_ingot', qty: 4 }, { itemId: 'coal', qty: 3 }, { itemId: 'ancient_bark', qty: 2 }], description: 'Forge a Steel Sword.' },
  { id: 'chainmail_craft', name: 'Chainmail', outputItemId: 'chainmail', outputQty: 1, skillLevelRequired: 3, materials: [{ itemId: 'iron_ore', qty: 6 }, { itemId: 'copper_ore', qty: 2 }], description: 'Forge Chainmail armor.' },
  { id: 'oak_staff_craft', name: 'Oak Staff', outputItemId: 'oak_staff', outputQty: 1, skillLevelRequired: 2, materials: [{ itemId: 'ancient_bark', qty: 3 }, { itemId: 'cave_mushroom', qty: 2 }, { itemId: 'mana_crystal_raw', qty: 1 }], description: 'Craft an Oak Staff.' },
  { id: 'silver_ring_craft', name: 'Silver Ring', outputItemId: 'silver_ring', outputQty: 1, skillLevelRequired: 3, materials: [{ itemId: 'silver_ore', qty: 4 }, { itemId: 'quartz', qty: 2 }], description: 'Forge a Silver Ring.' },
  { id: 'shadow_silk_craft', name: 'Shadow Silk', outputItemId: 'shadow_silk', outputQty: 1, skillLevelRequired: 4, materials: [{ itemId: 'shadow_silk_raw', qty: 5 }], description: 'Refine raw shadow silk.' },
  { id: 'flame_blade_craft', name: 'Flame Blade', outputItemId: 'flame_blade', outputQty: 1, skillLevelRequired: 7, materials: [{ itemId: 'magma_ore', qty: 5 }, { itemId: 'phoenix_bloom', qty: 3 }, { itemId: 'ember_shard', qty: 4 }, { itemId: 'steel_ingot', qty: 3 }], description: 'Forge the Flame Blade.' },
  { id: 'void_dagger_craft', name: 'Void Dagger', outputItemId: 'void_dagger', outputQty: 1, skillLevelRequired: 8, materials: [{ itemId: 'void_core_shard', qty: 2 }, { itemId: 'void_essence', qty: 4 }, { itemId: 'dark_crystal', qty: 5 }, { itemId: 'steel_ingot', qty: 3 }], description: 'Forge the Void Dagger.' },
  { id: 'storm_staff_craft', name: 'Storm Staff', outputItemId: 'storm_staff', outputQty: 1, skillLevelRequired: 7, materials: [{ itemId: 'stormcore_ore_raw', qty: 4 }, { itemId: 'stormstone', qty: 6 }, { itemId: 'ancient_bark', qty: 5 }, { itemId: 'mana_crystal_pure', qty: 3 }], description: 'Craft the Storm Staff.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getToolRequirementLabel(verb: string): string {
  switch (verb) {
    case 'mine': return 'requires Pickaxe';
    case 'chop': return 'requires Wood Axe';
    case 'fill': return 'consumes empty Water Flask';
    case 'sift': return 'no tool required';
    case 'attune': return 'requires attunement (void zones only)';
    default: return '';
  }
}

export function countMaterialsInInventory(inventory: Array<{ itemId: string; quantity: number }>, itemId: string): number {
  const slot = inventory.find(s => s.itemId === itemId);
  return slot?.quantity ?? 0;
}

export function canCraftRecipe(recipe: CraftingRecipe, inventory: Array<{ itemId: string; quantity: number }>): boolean {
  return recipe.materials.every(mat => {
    const have = countMaterialsInInventory(inventory, mat.itemId);
    return have >= mat.qty;
  });
}

export { countMaterialsInInventory as countMat };
