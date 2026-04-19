import type { SaveFile } from '../../types';
export declare function listSaves(playerId: string): Promise<{
    slot: number;
    savedAt: string;
    playtime: number;
    level: number;
    area: string;
}[]>;
export declare function loadSave(playerId: string, slot: number): Promise<SaveFile | null>;
export declare function saveSave(playerId: string, slot: number, save: SaveFile, playtime: number): Promise<void>;
export declare function deleteSave(playerId: string, slot: number): Promise<void>;
export declare function registerPlayer(playerId: string, name: string): Promise<void>;
//# sourceMappingURL=SaveManager.d.ts.map