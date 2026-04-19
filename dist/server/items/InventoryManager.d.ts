import type { SaveFile, EquipSlot } from '../../types';
export declare function inventoryAdd(save: SaveFile, itemId: string, qty?: number): {
    save: SaveFile;
    added: number;
};
export declare function inventoryRemove(save: SaveFile, slotId: string, qty?: number): SaveFile;
export declare function inventoryUse(save: SaveFile, slotId: string): SaveFile;
export declare function inventoryEquip(save: SaveFile, slotId: string): SaveFile;
export declare function inventoryUnequip(save: SaveFile, equipSlot: EquipSlot): SaveFile;
export declare function formatInventoryPage(save: SaveFile, page: number): string;
export declare function formatEquipment(save: SaveFile): string;
//# sourceMappingURL=InventoryManager.d.ts.map