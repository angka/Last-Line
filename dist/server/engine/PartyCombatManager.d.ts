/**
 * Phase 5 — Party Combat Manager
 * Coordinates shared combat sessions for party members.
 * Manages the combat lifecycle: start, turns, timer, resolution.
 */
import type { CombatParticipant } from '../../types';
import { type PartyCombatSession } from './CombatTimerEngine';
interface PartyCombatHandle {
    session: PartyCombatSession;
    timerHandle: {
        clear(): void;
    };
}
export declare const activePartyCombats: Map<string, PartyCombatHandle>;
export declare function startPartyCombat(partyId: string, areaId: string, preGenEnemies?: CombatParticipant[]): PartyCombatSession | null;
export declare function getPartyCombat(partyId: string): PartyCombatSession | null;
export declare function getPlayerPartyCombat(playerId: string): {
    partyId: string;
    session: PartyCombatSession;
} | null;
export declare function isInPartyCombat(playerId: string): boolean;
export declare function getPartyCombatForArea(areaId: string): {
    partyId: string;
    session: PartyCombatSession;
}[];
export declare function executePartyAction(playerId: string, action: 'attack' | 'flee' | 'heal' | 'buff' | 'skill' | 'magic' | 'support', args?: {
    targetIdx?: number;
    targetPlayerId?: string;
    skillType?: 'physical' | 'magic' | 'support';
    skillIdx?: number;
}): {
    session: PartyCombatSession;
    text: string;
} | null;
export declare function broadcastTurnStart(partyId: string, session: PartyCombatSession, newPlayerId: string): void;
export {};
//# sourceMappingURL=PartyCombatManager.d.ts.map