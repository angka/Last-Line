"use strict";
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
exports.INFINITE_FLOOR_PREFIX = exports.RARITY_RESET = void 0;
exports.loadAllCatalogs = loadAllCatalogs;
exports.reloadCatalog = reloadCatalog;
exports.reloadAll = reloadAll;
exports.getArea = getArea;
exports.getEnemy = getEnemy;
exports.getItem = getItem;
exports.getSkill = getSkill;
exports.getMaterial = getMaterial;
exports.getRecipe = getRecipe;
exports.getDungeon = getDungeon;
exports.getShop = getShop;
exports.getAllAreas = getAllAreas;
exports.getAllEnemies = getAllEnemies;
exports.getAllItems = getAllItems;
exports.getAllMaterials = getAllMaterials;
exports.getAllRecipes = getAllRecipes;
exports.isLoaded = isLoaded;
exports.getLoadedAt = getLoadedAt;
exports.getAllCities = getAllCities;
exports.getCityById = getCityById;
exports.isDungeonArea = isDungeonArea;
exports.describeArea = describeArea;
exports.rarityColor = rarityColor;
exports.rarityName = rarityName;
exports.getShopCatalog = getShopCatalog;
exports.scaleEnemy = scaleEnemy;
exports.getDungeonForArea = getDungeonForArea;
exports.getDungeonFloor = getDungeonFloor;
exports.getNextFloorArea = getNextFloorArea;
exports.getPrevFloorArea = getPrevFloorArea;
exports.getNextFloorArea2 = getNextFloorArea2;
exports.getPrevFloorArea2 = getPrevFloorArea2;
exports.isInfiniteFloor = isInfiniteFloor;
exports.getInfiniteFloorInfo = getInfiniteFloorInfo;
exports.describeInfiniteFloor = describeInfiniteFloor;
exports.getScrollDropsForTier = getScrollDropsForTier;
exports.getSkillManaCost = getSkillManaCost;
exports.getSkillLevelMultiplier = getSkillLevelMultiplier;
exports.getSkillByItemId = getSkillByItemId;
exports.getToolRequirementLabel = getToolRequirementLabel;
exports.countMaterialsInInventory = countMaterialsInInventory;
exports.canCraftRecipe = canCraftRecipe;
exports.getDefaultEquipment = getDefaultEquipment;
exports.loadGatheringNodes = loadGatheringNodes;
exports.getGatheringNodesForArea = getGatheringNodesForArea;
exports.getAreaNodes = getAreaNodes;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');
const cache = {
    areas: {},
    enemies: {},
    items: {},
    skills: {},
    materials: {},
    recipes: {},
    dungeons: {},
    shops: {},
    loaded: false,
    loadedAt: 0,
};
function loadJson(filename) {
    const filePath = path.join(CONTENT_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`[ContentManager] File not found: ${filePath}`);
        return {};
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (err) {
        console.error(`[ContentManager] Failed to parse ${filename}: ${err}`);
        return {};
    }
}
function loadAllCatalogs() {
    cache.areas = loadJson('areas.json');
    cache.enemies = loadJson('enemies.json');
    cache.items = loadJson('items.json');
    cache.skills = loadJson('skills.json');
    const craftingData = loadJson('crafting.json');
    cache.materials = craftingData.materials || {};
    cache.recipes = craftingData.recipes || {};
    cache.dungeons = loadJson('dungeons.json');
    cache.shops = loadJson('shops.json');
    cache.loaded = true;
    cache.loadedAt = Date.now();
    console.log(`[ContentManager] Loaded catalogs at ${new Date().toISOString()}`);
}
function reloadCatalog(name) {
    const mapping = {
        areas: 'areas.json',
        enemies: 'enemies.json',
        items: 'items.json',
        skills: 'skills.json',
        dungeons: 'dungeons.json',
        shops: 'shops.json',
    };
    if (name === 'materials' || name === 'recipes') {
        const data = loadJson('crafting.json');
        if (name === 'materials')
            cache.materials = data.materials || {};
        else
            cache.recipes = data.recipes || {};
        console.log(`[ContentManager] Reloaded ${name} from crafting.json`);
        return true;
    }
    const file = mapping[name];
    if (!file)
        return false;
    if (name === 'areas')
        cache.areas = loadJson(file);
    else if (name === 'enemies')
        cache.enemies = loadJson(file);
    else if (name === 'items')
        cache.items = loadJson(file);
    else if (name === 'skills')
        cache.skills = loadJson(file);
    else if (name === 'dungeons')
        cache.dungeons = loadJson(file);
    else if (name === 'shops')
        cache.shops = loadJson(file);
    console.log(`[ContentManager] Reloaded ${name} from ${file}`);
    return true;
}
function reloadAll() {
    loadAllCatalogs();
}
function getArea(id) {
    return cache.areas[id];
}
function getEnemy(id) {
    return cache.enemies[id];
}
function getItem(id) {
    return cache.items[id];
}
function getSkill(id) {
    return cache.skills[id];
}
function getMaterial(id) {
    return cache.materials[id];
}
function getRecipe(id) {
    return cache.recipes[id];
}
function getDungeon(id) {
    return cache.dungeons[id];
}
function getShop(cityId) {
    return cache.shops[cityId];
}
function getAllAreas() {
    return cache.areas;
}
function getAllEnemies() {
    return cache.enemies;
}
function getAllItems() {
    return cache.items;
}
function getAllMaterials() {
    return cache.materials;
}
function getAllRecipes() {
    return cache.recipes;
}
function isLoaded() {
    return cache.loaded;
}
function getLoadedAt() {
    return cache.loadedAt;
}
// ─── Utility Functions (ported from data/*.ts) ─────────────────────────────────
function getAllCities() {
    // Cities are extracted from areas that are safeZone + city regenState
    return Object.values(cache.areas)
        .filter(a => a.safeZone && a.regenState === 'city')
        .map(a => ({ id: a.id, name: a.name, tier: 1 }))
        .sort((a, b) => {
        // Known city order by tier
        const order = [
            'ashford_village_square', 'iron_gate_town_square',
            'thornwick_square', 'millhaven_square',
            'crystalmere_city_square', 'emberveil_square',
            'duskhollow_square', 'stormspire_citadel_square',
            'veilreach_square', 'cinderpeak_square', 'ashenmoor_square',
            'wraithgate_square', 'obsidian_keep_square', 'the_sanctum_square',
        ];
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}
function getCityById(id) {
    const cities = getAllCities();
    return cities.find(c => c.id === id);
}
function isDungeonArea(areaId) {
    const area = cache.areas[areaId];
    return area?.biome === 'dungeon';
}
function describeArea(areaId) {
    const area = cache.areas[areaId];
    if (!area)
        return 'Unknown area.';
    const isDungeon = area.biome === 'dungeon';
    const isBossFloor = area.name.toLowerCase().includes('boss') || area.name.toLowerCase().includes('ancient wyrm');
    let out = `\n  ${area.name}  [Lv ${area.levelRange[0]}–${area.levelRange[1]}, ${area.biome}]`;
    if (isBossFloor)
        out += '  ⚔ BOSS FLOOR';
    out += '\n  ──────────────────────────────────────────────────────────';
    out += '\n  ' + area.description;
    out += '\n  ──────────────────────────────────────────────────────────';
    out += '\n  Exits:';
    for (const [dir, target] of Object.entries(area.exits)) {
        const targetArea = cache.areas[target];
        out += `\n    [${dir}] ${targetArea?.name ?? target}`;
    }
    if (isDungeon) {
        out += '\n  [DUNGEON] Use "enter" to explore this floor for encounters.';
        out += '\n            Use "up" to go to previous floor, "down" to go deeper.';
    }
    if (area.baseEncounterChance > 0) {
        const pct = Math.round(area.baseEncounterChance * 100);
        out += `\n  Enemies patrol this area. [encounter chance: ${pct}%]`;
    }
    else {
        out += '\n  This is a safe area. No enemies will spawn here.';
    }
    return out;
}
function rarityColor(rarity) {
    const RARITY_COLORS = {
        common: '\x1b[37m', uncommon: '\x1b[32m', rare: '\x1b[36m',
        epic: '\x1b[35m', legendary: '\x1b[33m', mythic: '\x1b[31m',
    };
    return RARITY_COLORS[rarity] ?? '\x1b[0m';
}
exports.RARITY_RESET = '\x1b[0m';
function rarityName(rarity) {
    return `[${rarity.charAt(0).toUpperCase() + rarity.slice(1)}]`;
}
function getShopCatalog(cityId) {
    return cache.shops[cityId];
}
function scaleEnemy(enemy, isElite = false) {
    if (!isElite)
        return enemy;
    return {
        ...enemy,
        id: `${enemy.id}_elite`,
        name: `Elite ${enemy.name}`,
        maxHp: Math.floor(enemy.maxHp * 1.5),
        attack: Math.floor(enemy.attack * 1.5),
        strength: Math.floor(enemy.strength * 1.5),
        agility: Math.floor(enemy.agility * 1.5),
        defense: Math.floor(enemy.defense * 1.5),
        expReward: Math.floor(enemy.expReward * 2),
        goldReward: Math.floor(enemy.goldReward * 2),
        isElite: true,
    };
}
function getDungeonForArea(areaId) {
    return Object.values(cache.dungeons).find(d => d.entrance === areaId || d.floors.some(f => f.areaId === areaId));
}
function getDungeonFloor(areaId) {
    for (const dungeon of Object.values(cache.dungeons)) {
        const idx = dungeon.floors.findIndex(f => f.areaId === areaId);
        if (idx !== -1)
            return { dungeon, floor: idx + 1 };
    }
    return null;
}
function getNextFloorArea(areaId) {
    const info = getDungeonFloor(areaId);
    if (!info)
        return null;
    const nextIdx = info.floor;
    const dungeon = info.dungeon;
    if (nextIdx >= dungeon.floors.length)
        return null;
    return dungeon.floors[nextIdx].areaId;
}
function getPrevFloorArea(areaId) {
    const info = getDungeonFloor(areaId);
    if (!info || info.floor <= 1)
        return null;
    return info.dungeon.floors[info.floor - 2].areaId;
}
function getNextFloorArea2(areaId) {
    // Check normal next floor
    const normalNext = getNextFloorArea(areaId);
    if (normalNext)
        return normalNext;
    // Check if at a normal last floor — transition to infinite
    const floorInfo = getDungeonFloor(areaId);
    if (floorInfo) {
        const dungeon = floorInfo.dungeon;
        const lastFloorIdx = dungeon.floors.length - 1;
        if (floorInfo.floor === dungeon.floors.length) {
            return `${exports.INFINITE_FLOOR_PREFIX}${dungeon.id}__1`;
        }
    }
    return null;
}
function getPrevFloorArea2(areaId) {
    const info = getInfiniteFloorInfo(areaId);
    if (info) {
        if (info.infiniteFloor === 1) {
            const lastFloorIdx = info.dungeon.floors.length - 1;
            return info.dungeon.floors[lastFloorIdx].areaId;
        }
        return getPrevInfiniteFloorArea(areaId);
    }
    return getPrevFloorArea(areaId);
}
exports.INFINITE_FLOOR_PREFIX = '__inf__';
function isInfiniteFloor(areaId) {
    return areaId.startsWith(exports.INFINITE_FLOOR_PREFIX);
}
function getInfiniteFloorInfo(areaId) {
    if (!isInfiniteFloor(areaId))
        return null;
    const parts = areaId.split('__');
    if (parts.length < 4)
        return null;
    const dungeonId = parts[2];
    const infiniteFloor = parseInt(parts[3]);
    const dungeon = cache.dungeons[dungeonId];
    if (!dungeon)
        return null;
    return { dungeon, infiniteFloor };
}
function getPrevInfiniteFloorArea(areaId) {
    const info = getInfiniteFloorInfo(areaId);
    if (!info)
        return null;
    if (info.infiniteFloor <= 1)
        return null;
    return `${exports.INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor - 1}`;
}
function getNextInfiniteFloorArea(areaId) {
    const info = getInfiniteFloorInfo(areaId);
    if (!info)
        return null;
    if (info.infiniteFloor >= 50)
        return null;
    return `${exports.INFINITE_FLOOR_PREFIX}${info.dungeon.id}__${info.infiniteFloor + 1}`;
}
function describeInfiniteFloor(dungeon, infiniteFloor) {
    const depth = infiniteFloor - dungeon.floors.length;
    const tier = depth <= 2 ? 'Challenging' : depth <= 5 ? 'Perilous' : depth <= 10 ? 'Nightmarish' : 'Abyssal';
    const level = Math.min(99, 30 + depth * 3);
    return [
        `  ╔═══════════════════════════════════════════════════════╗`,
        `  ║  ${dungeon.name.toUpperCase()} — INFINITE DEPTH                      ║`,
        `  ╠═══════════════════════════════════════════════════════╣`,
        `  ║  Deep Floor ${String(infiniteFloor).padStart(2)} / ???    [${tier.padEnd(12)}]        ║`,
        `  ║  ──────────────────────────────────────────────────   ║`,
        `  ║  The air grows cold. Shadows move in the depths.     ║`,
        `  ║  Enemies here are level ${String(level).padStart(2)}+ — deadly.         ║`,
        `  ║  Boss has been vanquished. Deeper floors yield riches. ║`,
        `  ╠═══════════════════════════════════════════════════════╣`,
        `  ║  Exits: south (back up)                               ║`,
        `  ╚═══════════════════════════════════════════════════════╝`,
    ].join('\n');
}
function getScrollDropsForTier(tier) {
    const allSkills = Object.values(cache.skills);
    if (tier === 1) {
        return [
            'power_strike_scroll', 'quick_slash_scroll', 'bash_scroll',
            'fireball_scroll', 'ice_shard_scroll',
            'healing_touch_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 2) {
        return [
            'power_strike_scroll', 'quick_slash_scroll', 'cleave_scroll', 'bash_scroll',
            'thunder_bolt_scroll', 'ice_shard_scroll', 'frost_nova_scroll',
            'healing_touch_scroll', 'healing_light_scroll', 'haste_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 3) {
        return [
            'cleave_scroll', 'bash_scroll', 'execute_scroll', 'bleed_blade_scroll',
            'shadow_strike_scroll', 'thunder_bolt_scroll', 'chain_lightning_scroll',
            'holy_light_scroll', 'iron_guard_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 4) {
        return [
            'execute_scroll', 'bleed_blade_scroll', 'iron_swing_scroll',
            'soul_drain_scroll', 'void_blast_scroll', 'chain_lightning_scroll',
            'divine_smite_scroll', 'arcane_surge_scroll',
            'healing_light_scroll', 'empower_scroll', 'iron_guard_scroll', 'barrier_scroll',
        ];
    }
    return [
        'iron_swing_scroll', 'whirlwind_scroll', 'crushing_blow_scroll',
        'blaze_storm_scroll', 'glacial_spike_scroll', 'storm_urge_scroll',
        'void_blast_scroll', 'divine_smite_scroll', 'arcane_surge_scroll',
        'greater_heal_scroll', 'full_restore_scroll', 'empower_scroll',
        'arcane_infuse_scroll', 'barrier_scroll', 'resurrection_scroll', 'rally_scroll',
        'null_zone_scroll', 'void_collapse_scroll',
    ];
}
function getSkillManaCost(skillLevel, baseCost) {
    return Math.max(Math.floor(baseCost * Math.max(0.30, 1 - (skillLevel - 1) * 0.05)), 1);
}
function getSkillLevelMultiplier(skillLevel) {
    return 1 + (skillLevel - 1) * 0.10;
}
function getSkillByItemId(itemId) {
    const skill = cache.skills[itemId];
    if (!skill)
        return undefined;
    // Use type discriminator to determine skill type
    const s = skill;
    if (s.element)
        return { type: 'magic', skill };
    if (s.targetType === 'ally' || s.targetType === 'self' || s.targetType === 'all_allies')
        return { type: 'support', skill };
    return { type: 'physical', skill };
}
function getToolRequirementLabel(verb) {
    switch (verb) {
        case 'mine': return 'requires Pickaxe';
        case 'chop': return 'requires Wood Axe';
        case 'fill': return 'consumes empty Water Flask';
        case 'sift': return 'no tool required';
        case 'attune': return 'requires attunement (void zones only)';
        default: return '';
    }
}
function countMaterialsInInventory(inventory, itemId) {
    const slot = inventory.find(s => s.itemId === itemId);
    return slot?.quantity ?? 0;
}
function canCraftRecipe(recipe, inventory) {
    return recipe.materials.every(mat => {
        const have = countMaterialsInInventory(inventory, mat.itemId);
        return have >= mat.qty;
    });
}
function getDefaultEquipment() {
    return {
        weapon: 'wooden_sword',
        armor: 'tattered_cloth',
        accessory1: null,
        accessory2: null,
    };
}
let gatheringNodesCache = {};
function loadGatheringNodes() {
    const data = loadJson('crafting.json');
    gatheringNodesCache = data.gatheringNodes ?? {};
}
function getGatheringNodesForArea(areaId) {
    return gatheringNodesCache[areaId] ?? [];
}
function getAreaNodes(areaId) {
    return getGatheringNodesForArea(areaId);
}
//# sourceMappingURL=ContentManager.js.map