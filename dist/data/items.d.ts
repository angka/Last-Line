import type { Item, EquipSlot, Rarity } from '../types';
export declare const RARITY_COLORS: Record<Rarity, string>;
export declare const RARITY_RESET = "\u001B[0m";
export declare function rarityColor(rarity: Rarity): string;
export declare function rarityName(rarity: Rarity): string;
export declare function formatItem(item: Item, qty?: number): string;
export declare const ITEMS: Record<string, Item>;
export declare function getItem(itemId: string): Item | undefined;
export declare function getDefaultEquipment(): Record<EquipSlot, string | null>;
//# sourceMappingURL=items.d.ts.map