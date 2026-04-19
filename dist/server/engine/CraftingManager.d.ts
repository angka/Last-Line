import type { SaveFile, CraftingRecipe, LootDrop } from '../../types';
export interface CraftableItem {
    index: number;
    recipe: CraftingRecipe;
    hasMaterials: boolean;
}
export interface CraftResult {
    text: string;
    newSave?: SaveFile;
    action?: 'none';
}
export declare function listCraftableItems(save: SaveFile): CraftableItem[];
export declare function craftItem(save: SaveFile, recipeIndex: number): CraftResult;
export declare function formatCraftingMenu(save: SaveFile): string;
export interface GatherResult {
    text: string;
    newSave?: SaveFile;
    gathered?: LootDrop[];
    nodeDepleted?: boolean;
}
export declare function gatherFromNode(save: SaveFile, areaId: string, verb: 'gather' | 'mine' | 'chop' | 'pick' | 'fill' | 'sift' | 'attune'): GatherResult;
export declare function formatAreaNodes(areaId: string): string;
//# sourceMappingURL=CraftingManager.d.ts.map