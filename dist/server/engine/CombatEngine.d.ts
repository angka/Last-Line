import type { SaveFile, CombatSession, CombatParticipant, Enemy } from '../../types';
export declare function generateEncounter(areaLevelRange: [number, number], playerLevel: number, groupSizeMin?: number, groupSizeMax?: number, eliteChance?: number): Enemy[];
export declare function createCombatSession(save: SaveFile, enemies: Enemy[], areaId: string): CombatSession;
export declare function playerAttack(session: CombatSession, targetIdx: number): CombatSession;
export declare function playerFlee(session: CombatSession, playerLevel: number, enemyAgility: number): {
    session: CombatSession;
    fled: boolean;
};
export declare function enemyTurn(session: CombatSession): CombatSession;
export declare function applyStatusEffects(participant: CombatParticipant): CombatParticipant;
export declare function tickStatusEffects(session: CombatSession): CombatSession;
export declare function checkVictory(session: CombatSession): CombatSession;
export declare function advanceTurn(session: CombatSession): CombatSession;
export declare function resolveVictory(save: SaveFile, session: CombatSession): SaveFile;
export declare function resolveDefeat(save: SaveFile): SaveFile;
export declare function formatCombatState(session: CombatSession): string;
export declare function formatCombatPrompt(session: CombatSession, playerHp: number, playerMaxHp: number, playerMana: number, playerMaxMana: number): string;
//# sourceMappingURL=CombatEngine.d.ts.map