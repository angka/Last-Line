import type { SaveFile } from '../../types';
export interface PushMessage {
    channel: string;
    text: string;
    /** If set, broadcast to this area instead of the sender's current area */
    areaId?: string;
    /** Exclude the sender from the broadcast */
    excludeSelf?: boolean;
}
export interface ParseResult {
    text: string;
    newSave?: SaveFile;
    combatState?: any;
    menuState?: any;
    action?: 'quit' | 'save' | 'none' | 'levelup' | 'party_encounter';
    levelUps?: string[];
    pushMessages?: PushMessage[];
    partyEncounter?: {
        partyId: string;
        areaId: string;
        enemies: any[];
    };
}
export declare function parseCommand(cmd: string, save: SaveFile, combatState?: any, _sessionId?: string, playerId?: string): ParseResult;
//# sourceMappingURL=CommandParser.d.ts.map