/**
 * Phase 7 — World Boss Engine
 * Global world boss spawn events that notify all online players.
 */
import type { WorldBossDef, WorldBossEvent } from '../../types';
export declare const WORLD_BOSS_DEFS: Record<string, WorldBossDef>;
export declare const WORLD_BOSS_SPAWNS: Record<string, string>;
declare class WorldBossEngine {
    private activeEvents;
    private spawnTimers;
    private bossRotation;
    private rotationIndex;
    spawnWorldBoss(bossId?: string): WorldBossEvent | null;
    registerPlayerDamage(playerId: string, bossId: string, damage: number): void;
    applyBossDamageToPlayer(bossId: string, playerHp: number, playerDefense: number, playerAgility: number): {
        damage: number;
        isDead: boolean;
    };
    killWorldBoss(bossId: string): {
        participants: string[];
        damageDealt: Map<string, number>;
        expReward: number;
        goldReward: number;
        dropTableId: string;
    } | null;
    getActiveEvent(bossId?: string): WorldBossEvent | null;
    getAllActiveEvents(): WorldBossEvent[];
    getActiveBossIds(): string[];
    private scheduleAutoDespawn;
    startRotationScheduler(): void;
    private scheduleNextRotation;
    private broadcastWorldBossSpawn;
    broadcastServerMessage(text: string): void;
    private getNextBossFromRotation;
    formatWorldBossStatus(): string;
}
export declare const worldBossEngine: WorldBossEngine;
export {};
//# sourceMappingURL=WorldBossEngine.d.ts.map