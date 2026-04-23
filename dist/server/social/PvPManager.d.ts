/**
 * Phase 7 — PvP Combat Manager
 * Handles player-vs-player combat in PvP zones.
 * PvP is enabled when both players are in a non-safe-zone and both have `pvp.enabled = true`.
 */
import type { PvPCombatSession, SaveFile } from '../../types';
declare class PvPManager {
    private activeSessions;
    startPvPCombat(attackerId: string, attackerSave: SaveFile, defenderId: string, defenderSave: SaveFile, areaId: string): {
        session: PvPCombatSession;
        attackerText: string;
        defenderText: string;
    } | null;
    pvpAttack(sessionId: string, attackerId: string): {
        session: PvPCombatSession;
        text: string;
    } | null;
    pvpFlee(sessionId: string, playerId: string): {
        session: PvPCombatSession;
        text: string;
        fled: boolean;
    } | null;
    getSessionForPlayer(playerId: string): PvPCombatSession | null;
    endSession(sessionId: string): void;
    getActiveSessions(): PvPCombatSession[];
    canPvP(attacker: SaveFile, defender: SaveFile): boolean;
}
export declare function applyPvPDeathPenalty(save: SaveFile): SaveFile;
export declare function applyPvPVictoryReward(save: SaveFile, defeatedSave: SaveFile): SaveFile;
export declare const pvpManager: PvPManager;
export {};
//# sourceMappingURL=PvPManager.d.ts.map