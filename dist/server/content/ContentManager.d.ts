import type { Area } from '../../types_content';
import type { Enemy } from '../../types_content';
import type { Item } from '../../types_content';
import type { Skill } from '../../types_content';
import type { Material, CraftingRecipe } from '../../types_content';
import type { DungeonDef } from '../../types_content';
import type { ShopCatalog } from '../../types_content';
import type { EquipSlot } from '../../types';
interface CatalogCache {
    areas: Record<string, Area>;
    enemies: Record<string, Enemy>;
    items: Record<string, Item>;
    skills: Record<string, Skill>;
    materials: Record<string, Material>;
    recipes: Record<string, CraftingRecipe>;
    dungeons: Record<string, DungeonDef>;
    shops: Record<string, ShopCatalog>;
    loaded: boolean;
    loadedAt: number;
}
export declare function loadAllCatalogs(): void;
export declare function reloadCatalog(name: keyof Omit<CatalogCache, 'loaded' | 'loadedAt'>): boolean;
export declare function reloadAll(): void;
export declare function getArea(id: string): Area | undefined;
export declare function getEnemy(id: string): Enemy | undefined;
export declare function getItem(id: string): Item | undefined;
export declare function getSkill(id: string): Skill | undefined;
export declare function getMaterial(id: string): Material | undefined;
export declare function getRecipe(id: string): CraftingRecipe | undefined;
export declare function getDungeon(id: string): DungeonDef | undefined;
export declare function getShop(cityId: string): ShopCatalog | undefined;
export declare function getAllAreas(): Record<string, Area>;
export declare function getAllEnemies(): Record<string, Enemy>;
export declare function getAllItems(): Record<string, Item>;
export declare function getAllMaterials(): Record<string, Material>;
export declare function getAllRecipes(): Record<string, CraftingRecipe>;
export declare function isLoaded(): boolean;
export declare function getLoadedAt(): number;
export declare function getAllCities(): {
    id: string;
    name: string;
    minLevel?: number;
    tier: number;
}[];
export declare function getCityById(id: string): {
    id: string;
    name: string;
    minLevel?: number;
    tier: number;
} | undefined;
export declare function isDungeonArea(areaId: string): boolean;
export declare function describeArea(areaId: string): string;
export declare function rarityColor(rarity: string): string;
export declare const RARITY_RESET = "\u001B[0m";
export declare function rarityName(rarity: string): string;
export declare function getShopCatalog(cityId: string): ShopCatalog | undefined;
export declare function scaleEnemy(enemy: Enemy, isElite?: boolean): Enemy;
export declare function getDungeonForArea(areaId: string): DungeonDef | undefined;
export declare function getDungeonFloor(areaId: string): {
    dungeon: DungeonDef;
    floor: number;
} | null;
export declare function getNextFloorArea(areaId: string): string | null;
export declare function getPrevFloorArea(areaId: string): string | null;
export declare function getNextFloorArea2(areaId: string): string | null;
export declare function getPrevFloorArea2(areaId: string): string | null;
export declare const INFINITE_FLOOR_PREFIX = "__inf__";
export declare function isInfiniteFloor(areaId: string): boolean;
export declare function getInfiniteFloorInfo(areaId: string): {
    dungeon: DungeonDef;
    infiniteFloor: number;
} | null;
export declare function describeInfiniteFloor(dungeon: DungeonDef, infiniteFloor: number): string;
export declare function getScrollDropsForTier(tier: number): string[];
export declare function getSkillManaCost(skillLevel: number, baseCost: number): number;
export declare function getSkillLevelMultiplier(skillLevel: number): number;
export declare function getSkillByItemId(itemId: string): {
    type: 'physical' | 'magic' | 'support';
    skill: Skill;
} | undefined;
export declare function getToolRequirementLabel(verb: string): string;
export declare function countMaterialsInInventory(inventory: Array<{
    itemId: string;
    quantity: number;
}>, itemId: string): number;
export declare function canCraftRecipe(recipe: CraftingRecipe, inventory: Array<{
    itemId: string;
    quantity: number;
}>): boolean;
export declare function getDefaultEquipment(): Record<EquipSlot, string | null>;
interface GatheringNode {
    nodeId: string;
    nodeType: string;
    verb: string;
    name: string;
    position: string;
    maxUses: number;
    respawnMinutes: number;
    lootTable: Array<{
        itemId: string;
        chance: number;
        qtyMin: number;
        qtyMax: number;
    }>;
    requiresTool: string | null;
    minPlayerLevel: number;
}
export declare function loadGatheringNodes(): void;
export declare function getGatheringNodesForArea(areaId: string): GatheringNode[];
export declare function getAreaNodes(areaId: string): GatheringNode[];
export {};
//# sourceMappingURL=ContentManager.d.ts.map