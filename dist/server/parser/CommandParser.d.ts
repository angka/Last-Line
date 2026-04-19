import type { SaveFile } from '../../types';
export interface ParseResult {
    text: string;
    newSave?: SaveFile;
    combatState?: any;
    menuState?: any;
    action?: 'quit' | 'save' | 'none' | 'levelup';
    levelUps?: string[];
}
export declare function parseCommand(cmd: string, save: SaveFile, combatState?: any): ParseResult;
//# sourceMappingURL=CommandParser.d.ts.map