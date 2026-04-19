import type { Material, CraftingRecipe, GatheringNode } from '../types';
export declare const MATERIALS: Record<string, Material>;
export declare function getMaterial(id: string): Material | undefined;
export declare const GATHERING_NODES: Record<string, GatheringNode[]>;
export declare function getGatheringNodesForArea(areaId: string): GatheringNode[];
export declare const CRAFTING_RECIPES: CraftingRecipe[];
export declare function getToolRequirementLabel(verb: string): string;
export declare function countMaterialsInInventory(inventory: Array<{
    itemId: string;
    quantity: number;
}>, itemId: string): number;
export declare function canCraftRecipe(recipe: CraftingRecipe, inventory: Array<{
    itemId: string;
    quantity: number;
}>): boolean;
export { countMaterialsInInventory as countMat };
//# sourceMappingURL=crafting.d.ts.map