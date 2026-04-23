"use strict";
/**
 * Phase 7 — World Boss Engine
 * Global world boss spawn events that notify all online players.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.worldBossEngine = exports.WORLD_BOSS_SPAWNS = exports.WORLD_BOSS_DEFS = void 0;
const index_1 = require("../index");
// ─── World Boss Definitions ───────────────────────────────────────────────────
exports.WORLD_BOSS_DEFS = {
    // ── T1: Whispering Plains (Lv 10+) ─────────────────────────────────────
    shadow_wolf_alpha: {
        id: 'shadow_wolf_alpha',
        name: 'Shadow Wolf Alpha',
        level: 10,
        maxHp: 2000,
        attack: 45,
        strength: 30,
        agility: 25,
        defense: 15,
        expReward: 800,
        goldReward: 300,
        dropTableId: 'world_boss_t1',
        spawnIntervalMinutes: 45,
        minPlayersRequired: 1,
        broadcastRadius: 'server',
    },
    // ── T2: Irongate Region (Lv 20+) ───────────────────────────────────────
    iron_goliath: {
        id: 'iron_goliath',
        name: 'Iron Goliath',
        level: 20,
        maxHp: 5000,
        attack: 80,
        strength: 50,
        agility: 20,
        defense: 40,
        expReward: 2000,
        goldReward: 800,
        dropTableId: 'world_boss_t2',
        spawnIntervalMinutes: 60,
        minPlayersRequired: 2,
        broadcastRadius: 'server',
    },
    // ── T3: Thornwick / Mirefen (Lv 35+) ───────────────────────────────────
    thornweaver: {
        id: 'thornweaver',
        name: 'Thornweaver',
        level: 35,
        maxHp: 12000,
        attack: 150,
        strength: 80,
        agility: 35,
        defense: 60,
        expReward: 5000,
        goldReward: 2000,
        dropTableId: 'world_boss_t3',
        spawnIntervalMinutes: 90,
        minPlayersRequired: 3,
        broadcastRadius: 'server',
    },
    // ── T4: Veilreach / Abyss (Lv 50+) ─────────────────────────────────────
    void_revenant: {
        id: 'void_revenant',
        name: 'Void Revenant',
        level: 50,
        maxHp: 25000,
        attack: 250,
        strength: 120,
        agility: 50,
        defense: 90,
        expReward: 12000,
        goldReward: 5000,
        dropTableId: 'world_boss_t4',
        spawnIntervalMinutes: 120,
        minPlayersRequired: 4,
        broadcastRadius: 'server',
    },
    // ── T5: Dragon's Lair (Lv 70+) ─────────────────────────────────────────
    ancient_dragon_lord: {
        id: 'ancient_dragon_lord',
        name: 'Ancient Dragon Lord',
        level: 70,
        maxHp: 60000,
        attack: 400,
        strength: 200,
        agility: 80,
        defense: 150,
        expReward: 30000,
        goldReward: 15000,
        dropTableId: 'world_boss_t5',
        spawnIntervalMinutes: 180,
        minPlayersRequired: 5,
        broadcastRadius: 'server',
    },
};
// ─── World Boss Spawn Locations ─────────────────────────────────────────────
exports.WORLD_BOSS_SPAWNS = {
    shadow_wolf_alpha: 'whispering_plains',
    iron_goliath: 'iron_gate_outskirts',
    thornweaver: 'thornwick_square',
    void_revenant: 'abyssal_approach',
    ancient_dragon_lord: 'dragons_lair_entrance',
};
// ─── World Boss Event Manager ────────────────────────────────────────────────
class WorldBossEngine {
    activeEvents = new Map();
    spawnTimers = new Map();
    bossRotation = Object.keys(exports.WORLD_BOSS_DEFS);
    rotationIndex = 0;
    // ─── Spawn a world boss ──────────────────────────────────────────────────
    spawnWorldBoss(bossId) {
        const def = bossId ? exports.WORLD_BOSS_DEFS[bossId] : this.getNextBossFromRotation();
        if (!def)
            return null;
        // Don't spawn if one is already active
        const existing = [...this.activeEvents.values()].find(e => e.isActive && e.bossId === def.id);
        if (existing)
            return null;
        const areaId = exports.WORLD_BOSS_SPAWNS[def.id] ?? 'ashford_village_square';
        const durationMs = 30 * 60 * 1000; // 30 minutes to kill
        const event = {
            bossId: def.id,
            areaId,
            startedAt: Date.now(),
            expiresAt: Date.now() + durationMs,
            participants: [],
            damageDealt: new Map(),
            currentHp: def.maxHp,
            maxHp: def.maxHp,
            isActive: true,
        };
        this.activeEvents.set(def.id, event);
        this.broadcastWorldBossSpawn(def, areaId, durationMs);
        this.scheduleAutoDespawn(def.id, durationMs);
        return event;
    }
    // ─── Register player damage ──────────────────────────────────────────────
    registerPlayerDamage(playerId, bossId, damage) {
        const event = this.activeEvents.get(bossId);
        if (!event || !event.isActive)
            return;
        event.participants.push(playerId);
        const current = event.damageDealt.get(playerId) ?? 0;
        event.damageDealt.set(playerId, current + damage);
        event.currentHp = Math.max(0, event.currentHp - damage);
    }
    // ─── Apply boss damage to player ─────────────────────────────────────────
    applyBossDamageToPlayer(bossId, playerHp, playerDefense, playerAgility) {
        const def = exports.WORLD_BOSS_DEFS[bossId];
        const event = this.activeEvents.get(bossId);
        if (!def || !event)
            return { damage: 0, isDead: playerHp <= 0 };
        const raw = def.attack * (1 + def.strength / 100);
        const mitigated = raw * (1 - playerDefense / (playerDefense + 200));
        const dodge = Math.random() < (playerAgility / (playerAgility + 150));
        const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));
        return { damage, isDead: playerHp - damage <= 0 };
    }
    // ─── Kill world boss ─────────────────────────────────────────────────────
    killWorldBoss(bossId) {
        const event = this.activeEvents.get(bossId);
        const def = exports.WORLD_BOSS_DEFS[bossId];
        if (!event || !def)
            return null;
        event.isActive = false;
        this.activeEvents.delete(bossId);
        this.broadcastServerMessage(`🐉 WORLD BOSS DEFEATED: ${def.name} has been slain! Reward: ${def.expReward} EXP, ${def.goldReward}g`);
        return {
            participants: event.participants,
            damageDealt: event.damageDealt,
            expReward: def.expReward,
            goldReward: def.goldReward,
            dropTableId: def.dropTableId,
        };
    }
    // ─── Get active event ────────────────────────────────────────────────────
    getActiveEvent(bossId) {
        if (bossId)
            return this.activeEvents.get(bossId) ?? null;
        return [...this.activeEvents.values()].find(e => e.isActive) ?? null;
    }
    getAllActiveEvents() {
        return [...this.activeEvents.values()].filter(e => e.isActive);
    }
    getActiveBossIds() {
        return [...this.activeEvents.values()].filter(e => e.isActive).map(e => e.bossId);
    }
    // ─── Auto-despawn ────────────────────────────────────────────────────────
    scheduleAutoDespawn(bossId, delayMs) {
        const timer = setTimeout(() => {
            const event = this.activeEvents.get(bossId);
            if (event && event.isActive) {
                event.isActive = false;
                this.activeEvents.delete(bossId);
                const def = exports.WORLD_BOSS_DEFS[bossId];
                this.broadcastServerMessage(`🐉 WORLD BOSS FLED: ${def?.name ?? bossId} escaped! Try again next spawn.`);
            }
        }, delayMs);
        this.spawnTimers.set(bossId, timer);
    }
    // ─── Rotation scheduling ────────────────────────────────────────────────
    startRotationScheduler() {
        // Schedule the first boss spawn in 10 minutes after server start
        this.scheduleNextRotation(10 * 60 * 1000);
    }
    scheduleNextRotation(delayMs) {
        const timer = setTimeout(() => {
            if (this.getAllActiveEvents().length === 0) {
                const bossId = this.bossRotation[this.rotationIndex % this.bossRotation.length];
                this.rotationIndex++;
                const event = this.spawnWorldBoss(bossId);
                if (!event) {
                    // Skip if failed, try next in 5 minutes
                    this.scheduleNextRotation(5 * 60 * 1000);
                    return;
                }
                const def = exports.WORLD_BOSS_DEFS[bossId];
                this.scheduleNextRotation((def?.spawnIntervalMinutes ?? 60) * 60 * 1000);
            }
            else {
                // Check again in 10 minutes
                this.scheduleNextRotation(10 * 60 * 1000);
            }
        }, delayMs);
        this.spawnTimers.set('__rotation__', timer);
    }
    // ─── Broadcast ───────────────────────────────────────────────────────────
    broadcastWorldBossSpawn(def, areaId, durationMs) {
        const minutes = Math.round(durationMs / 60000);
        const areaName = areaId.replace(/_/g, ' ');
        const msg = [
            ``,
            `╔═══════════════════════════════════════════════════════════════╗`,
            `║  🐉⚠️  WORLD BOSS ALERT ⚠️🐉                                   ║`,
            `║  ${def.name.padEnd(58)}║`,
            `║  Level: ${String(def.level).padStart(3)}  |  HP: ${String(def.maxHp).padStart(6)}  |  Reward: ${String(def.expReward).padStart(6)} EXP  ║`,
            `║  Location: ${areaName.padEnd(47)}  ║`,
            `║  Time Limit: ${String(minutes).padStart(2)} minutes                                  ║`,
            `║  ─────────────────────────────────────────────────────────── ║`,
            `║  Type "worldboss" to travel to the boss location!            ║`,
            `╚═══════════════════════════════════════════════════════════════╝`,
            ``,
        ].join('\n');
        this.broadcastServerMessage(msg);
    }
    broadcastServerMessage(text) {
        for (const [, session] of index_1.sessions) {
            try {
                session.socket.send(JSON.stringify({ type: 'push', channel: 'system', text }));
            }
            catch { /* closed */ }
        }
    }
    // ─── Rotation helper ─────────────────────────────────────────────────────
    getNextBossFromRotation() {
        const id = this.bossRotation[this.rotationIndex % this.bossRotation.length];
        this.rotationIndex++;
        return exports.WORLD_BOSS_DEFS[id];
    }
    // ─── Format world boss status ─────────────────────────────────────────────
    formatWorldBossStatus() {
        const active = this.getAllActiveEvents();
        if (active.length === 0) {
            return `  🐉 No world boss is currently active.\n  Use "worldboss spawn" (admin) to trigger one manually.\n  Bosses spawn automatically every 45–180 minutes.`;
        }
        const lines = [];
        lines.push(`  ╔═════════════════════════════════════════════════════════════════════╗`);
        lines.push(`  ║  🐉 ACTIVE WORLD BOSSES                                              ║`);
        lines.push(`  ╠═════════════════════════════════════════════════════════════════════╣`);
        for (const event of active) {
            const def = exports.WORLD_BOSS_DEFS[event.bossId];
            if (!def)
                continue;
            const hpPct = Math.round((event.currentHp / event.maxHp) * 100);
            const bar = renderBossHpBar(event.currentHp, event.maxHp);
            const timeLeft = Math.max(0, Math.round((event.expiresAt - Date.now()) / 60000));
            const participants = event.participants.length;
            lines.push(`  ║  🐉 ${def.name.padEnd(20)} Level ${String(def.level).padStart(2)}                          ║`);
            lines.push(`  ║     ${bar} ${String(hpPct).padStart(3)}% HP                         ║`);
            lines.push(`  ║     Time: ${String(timeLeft).padStart(2)}m left  |  Fighters: ${String(participants).padStart(2)}                       ║`);
            lines.push(`  ║     Reward: ${String(def.expReward).padStart(5)} EXP  |  ${String(def.goldReward).padStart(5)}g                       ║`);
            lines.push(`  ║     Location: ${(event.areaId).replace(/_/g, ' ').padEnd(40)} ║`);
            lines.push(`  ╠═════════════════════════════════════════════════════════════════════╣`);
        }
        lines.push(`  ║  Use "worldboss" to travel to the boss location!                   ║`);
        lines.push(`  ╚═════════════════════════════════════════════════════════════════════╝`);
        return lines.join('\n');
    }
}
function renderBossHpBar(hp, maxHp) {
    const total = 20;
    const filled = maxHp > 0 ? Math.round((hp / maxHp) * total) : 0;
    return '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
}
exports.worldBossEngine = new WorldBossEngine();
//# sourceMappingURL=WorldBossEngine.js.map