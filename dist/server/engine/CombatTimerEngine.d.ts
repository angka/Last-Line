/**
 * Phase 5 — Combat Timer Engine
 * Wires 15-second turn timers for both solo and party combat.
 * Handles solo timeout → forfeit turn, party timeout → downed state.
 */
import type { CombatSession, CombatParticipant, SaveFile } from '../../types';
export type TurnTimerCallback = (session: CombatSession, timedOutPlayerId: string) => void;
interface TimerHandle {
    clear(): void;
}
export declare function startSoloTurnTimer(session: CombatSession, onTimeout: TurnTimerCallback): TimerHandle;
export interface PartyCombatSession {
    sessionId: string;
    participants: CombatParticipant[];
    turnIndex: number;
    round: number;
    areaId: string;
    log: CombatSession['log'];
    turnStartedAt: number;
    turnTimeoutMs: number;
    timedOutCount: Map<string, number>;
    winner?: 'player' | 'enemy';
    partyId: string;
}
export declare function createPartyCombatSession(partyId: string, partyMembers: Array<{
    playerId: string;
    name: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    strength: number;
    agility: number;
    critRate: number;
    critDamage: number;
}>, enemies: CombatParticipant[], areaId: string): PartyCombatSession;
export declare function getCurrentTurnParticipant(session: PartyCombatSession): CombatParticipant | null;
export declare function isPartyPlayerTurn(session: PartyCombatSession): boolean;
export declare function advancePartyTurn(session: PartyCombatSession): PartyCombatSession;
export declare function startPartyTurnTimer(session: PartyCombatSession, onTimeout: (session: PartyCombatSession, timedOutPlayerId: string, timedOutCount: number) => void): TimerHandle;
export declare function handleSoloTimeout(session: CombatSession, timedOutPlayerId: string): CombatSession;
export declare function handlePartyTimeout(session: PartyCombatSession, timedOutPlayerId: string, timedOutCount: number): PartyCombatSession;
export declare function formatPartyCombatState(session: PartyCombatSession): string;
export declare function formatPartyCombatPrompt(session: PartyCombatSession, playerId: string): string;
export declare function canReviveDownedPlayer(session: PartyCombatSession, playerId: string): boolean;
export declare function revivePlayer(session: PartyCombatSession, reviverPlayerId: string, targetPlayerId: string, reviveHpPercent?: number): PartyCombatSession;
export declare function partyFleeChance(avgPartyAgility: number, fastestEnemyAgility: number, memberCount: number): number;
export declare function rollPartyFlee(session: PartyCombatSession): {
    fled: boolean;
    log: PartyCombatSession['log'];
};
export declare function checkPartyVictory(session: PartyCombatSession): PartyCombatSession;
export declare function partyPlayerAttack(session: PartyCombatSession, playerId: string, targetIdx: number): PartyCombatSession;
export declare function partyPlayerSkill(session: PartyCombatSession, playerId: string, skill: {
    id: string;
    name: string;
    level: number;
    baseDamage: number;
    manaCost: number;
    scalingStat: 'strength' | 'mana';
    element?: string;
}, targetIdx: number, playerSave: {
    stats: {
        strength: number;
        mana: number;
        critRate: number;
        critDamage: number;
    };
}): PartyCombatSession;
export declare function partyPlayerSupport(session: PartyCombatSession, playerId: string, skill: {
    id: string;
    name: string;
    level: number;
    manaCost: number;
    effectType: string;
    effectValue: number;
    duration?: number;
    targetType: string;
}, targetPlayerId: string, playerSave: {
    stats: {
        mana: number;
        maxHp: number;
        maxMana: number;
    };
}): {
    session: PartyCombatSession;
    manaUsed: number;
} | null;
export declare function partyEnemyTurn(session: PartyCombatSession): PartyCombatSession;
export declare function resolvePartyVictory(session: PartyCombatSession, lootResults: Map<string, SaveFile>): PartyCombatSession;
export declare function resolvePartyDefeat(session: PartyCombatSession, saveUpdates: Map<string, SaveFile>): PartyCombatSession;
export {};
//# sourceMappingURL=CombatTimerEngine.d.ts.map