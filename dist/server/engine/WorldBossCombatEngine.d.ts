/**
 * Phase 8 — World Boss Combat Engine
 * Handles live combat against world bosses: player attacks, boss auto-attacks,
 * HP bar broadcasts to all players in the area, and reward distribution.
 */
import type { CombatLogEntry } from '../../types';
export interface WorldBossAttackSession {
    bossId: string;
    areaId: string;
    currentHp: number;
    maxHp: number;
    participants: WorldBossFighter[];
    round: number;
    log: CombatLogEntry[];
    autoAttackTimer?: NodeJS.Timeout;
    startedAt: number;
}
export interface WorldBossFighter {
    playerId: string;
    playerName: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    strength: number;
    agility: number;
    defense: number;
    critRate: number;
    critDamage: number;
    damageDealt: number;
    isActive: boolean;
}
declare class WorldBossCombatEngine {
    private sessions;
    startCombat(playerId: string, playerName: string, playerSave: any): {
        text: string;
        session: WorldBossAttackSession;
    } | null;
    playerAttack(playerId: string, playerSave: any): {
        text: string;
        newSave?: any;
        isOver?: boolean;
    } | null;
    playerFlee(playerId: string): {
        text: string;
        success: boolean;
    } | null;
    private startBossAutoAttack;
    private executeBossAutoAttack;
    private bossAutoAttack;
    private bossSingleAttack;
    private onBossDefeated;
    private onAllPlayersDead;
    isInBossCombat(playerId: string): boolean;
    getSessionForArea(areaId: string): WorldBossAttackSession | undefined;
    broadcastBossHp(session: WorldBossAttackSession): void;
    formatSession(session: WorldBossAttackSession): string;
}
export declare const worldBossCombatEngine: WorldBossCombatEngine;
export {};
//# sourceMappingURL=WorldBossCombatEngine.d.ts.map