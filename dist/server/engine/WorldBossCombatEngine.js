"use strict";
/**
 * Phase 8 — World Boss Combat Engine
 * Handles live combat against world bosses: player attacks, boss auto-attacks,
 * HP bar broadcasts to all players in the area, and reward distribution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.worldBossCombatEngine = void 0;
const WorldBossEngine_1 = require("./WorldBossEngine");
const WorldBossEngine_2 = require("./WorldBossEngine");
const PresenceManager_1 = require("../social/PresenceManager");
const AchievementEngine_1 = require("./AchievementEngine");
// ─── World Boss Combat Engine ─────────────────────────────────────────────────
class WorldBossCombatEngine {
    sessions = new Map(); // areaId → session
    // ─── Start combat ──────────────────────────────────────────────────────────
    startCombat(playerId, playerName, playerSave) {
        const areaId = playerSave.worldState.currentArea;
        const activeEvent = WorldBossEngine_2.worldBossEngine.getActiveEvent();
        if (!activeEvent || activeEvent.areaId !== areaId)
            return null;
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[activeEvent.bossId];
        if (!def)
            return null;
        let session = this.sessions.get(areaId);
        if (!session) {
            session = {
                bossId: activeEvent.bossId,
                areaId,
                currentHp: activeEvent.currentHp,
                maxHp: def.maxHp,
                participants: [],
                round: 1,
                log: [{ round: 1, text: `🐉 WORLD BOSS COMBAT: ${def.name}! HP: ${def.maxHp}` }],
                startedAt: Date.now(),
            };
            this.sessions.set(areaId, session);
            PresenceManager_1.presenceManager.broadcastToArea(areaId, `🐉 A World Boss has appeared: ${def.name}! Fighters, use "worldboss attack" to join!`, playerId);
            this.startBossAutoAttack(areaId);
        }
        if (!session.participants.find(p => p.playerId === playerId)) {
            session.participants.push({
                playerId,
                playerName,
                hp: playerSave.stats.hp,
                maxHp: playerSave.stats.maxHp,
                mana: playerSave.stats.mana,
                maxMana: playerSave.stats.maxMana,
                attack: playerSave.stats.attack,
                strength: playerSave.stats.strength,
                agility: playerSave.stats.agility,
                defense: playerSave.stats.defense,
                critRate: playerSave.stats.critRate,
                critDamage: playerSave.stats.critDamage,
                damageDealt: 0,
                isActive: true,
            });
        }
        return { text: this.formatSession(session), session };
    }
    // ─── Player attacks boss ──────────────────────────────────────────────────
    playerAttack(playerId, playerSave) {
        const areaId = playerSave.worldState.currentArea;
        const session = this.sessions.get(areaId);
        if (!session)
            return null;
        const fighter = session.participants.find(p => p.playerId === playerId && p.isActive);
        if (!fighter)
            return null;
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        if (!def)
            return null;
        // Damage to boss
        const raw = fighter.attack * (1 + fighter.strength / 100);
        const crit = Math.random() < fighter.critRate;
        const final = crit ? raw * fighter.critDamage : raw;
        const dodge = Math.random() < 0.05;
        const damage = dodge ? 0 : Math.max(1, Math.floor(final));
        const critTag = crit ? ' 💥 CRITICAL!' : '';
        const dodgeTag = dodge ? ' ⚡ MISS!' : '';
        session.currentHp = Math.max(0, session.currentHp - damage);
        fighter.damageDealt += damage;
        session.log.push({ round: session.round, text: `${fighter.playerName} attacks ${def.name} → ${damage} damage!${critTag}${dodgeTag}` });
        // Register damage with world boss event (for reward tracking)
        WorldBossEngine_2.worldBossEngine.registerPlayerDamage(playerId, session.bossId, damage);
        this.broadcastBossHp(session);
        // Check if boss dead
        if (session.currentHp <= 0) {
            this.onBossDefeated(session);
            return { text: this.formatSession(session), isOver: true };
        }
        // Boss auto-attacks all active players
        const attackResults = this.bossAutoAttack(session);
        const deadPlayers = session.participants.filter(p => p.isActive && p.hp <= 0);
        for (const dead of deadPlayers) {
            dead.isActive = false;
            session.log.push({ round: session.round, text: `☠ ${dead.playerName} has fallen!` });
        }
        session.round++;
        return {
            text: this.formatSession(session) + '\n' + attackResults.logText,
            newSave: attackResults.newSave,
            isOver: false,
        };
    }
    // ─── Player flees ─────────────────────────────────────────────────────────
    playerFlee(playerId) {
        for (const [areaId, session] of this.sessions) {
            const fighter = session.participants.find(p => p.playerId === playerId && p.isActive);
            if (!fighter)
                continue;
            const canFlee = Math.random() < 0.60;
            if (canFlee) {
                fighter.isActive = false;
                session.log.push({ round: session.round, text: `🏃 ${fighter.playerName} fled from the battle!` });
                return { text: `You fled from the World Boss!`, success: true };
            }
            else {
                session.log.push({ round: session.round, text: `🏃 ${fighter.playerName} failed to flee!` });
                const result = this.bossSingleAttack(session, fighter);
                if (fighter.hp <= 0) {
                    fighter.isActive = false;
                    session.log.push({ round: session.round, text: `☠ ${fighter.playerName} was struck down while fleeing!` });
                }
                return { text: this.formatSession(session) + '\n' + result.log, success: false };
            }
        }
        return null;
    }
    // ─── Boss auto-attack ─────────────────────────────────────────────────────
    startBossAutoAttack(areaId) {
        const session = this.sessions.get(areaId);
        if (!session)
            return;
        if (session.autoAttackTimer)
            clearTimeout(session.autoAttackTimer);
        session.autoAttackTimer = setTimeout(() => this.executeBossAutoAttack(areaId), 20_000);
    }
    executeBossAutoAttack(areaId) {
        const session = this.sessions.get(areaId);
        if (!session)
            return;
        const activePlayers = session.participants.filter(p => p.isActive);
        if (activePlayers.length === 0)
            return;
        const results = this.bossAutoAttack(session);
        session.round++;
        const summary = results.logText;
        for (const p of activePlayers) {
            const pSession = PresenceManager_1.presenceManager.getSession(p.playerId);
            if (pSession) {
                pSession.socket.send(JSON.stringify({
                    type: 'output',
                    text: `🐉 World Boss attacks!\n${summary}`,
                }));
            }
        }
        if (!activePlayers.some(p => p.isActive)) {
            this.onAllPlayersDead(session);
            return;
        }
        this.startBossAutoAttack(areaId);
    }
    bossAutoAttack(session) {
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        if (!def)
            return { logText: '' };
        const activePlayers = session.participants.filter(p => p.isActive);
        const logLines = [];
        let latestSave = undefined;
        for (const fighter of activePlayers) {
            const result = this.bossSingleAttack(session, fighter);
            fighter.hp = Math.max(0, fighter.hp - result.damage);
            session.log.push({ round: session.round, text: result.log });
            logLines.push(result.log);
            if (fighter.hp <= 0) {
                fighter.isActive = false;
                session.log.push({ round: session.round, text: `☠ ${fighter.playerName} has fallen!` });
            }
            // Sync HP to player session
            const pSession = PresenceManager_1.presenceManager.getSession(fighter.playerId);
            if (pSession) {
                pSession.currentState = {
                    ...pSession.currentState,
                    stats: { ...pSession.currentState.stats, hp: fighter.hp, mana: fighter.mana },
                };
                latestSave = pSession.currentState;
            }
        }
        return { logText: logLines.join('\n'), newSave: latestSave };
    }
    bossSingleAttack(_session, fighter) {
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[_session.bossId];
        if (!def)
            return { damage: 0, log: '' };
        const raw = def.attack * (1 + def.strength / 100);
        const mitigated = raw * (1 - fighter.defense / (fighter.defense + 200));
        const dodge = Math.random() < (fighter.agility / (fighter.agility + 150));
        const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));
        return {
            damage,
            log: `${def.name} attacks ${fighter.playerName} → ${damage} damage!${dodge ? ' ⚡ DODGED!' : ''}`,
        };
    }
    // ─── Boss defeated ───────────────────────────────────────────────────────
    onBossDefeated(session) {
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        if (!def)
            return;
        if (session.autoAttackTimer)
            clearTimeout(session.autoAttackTimer);
        this.sessions.delete(session.areaId);
        WorldBossEngine_2.worldBossEngine.killWorldBoss(session.bossId);
        const totalDamage = session.participants.reduce((sum, p) => sum + p.damageDealt, 0);
        for (const fighter of session.participants.filter(p => p.isActive)) {
            const share = totalDamage > 0 ? fighter.damageDealt / totalDamage : 0;
            const expShare = Math.floor(def.expReward * share);
            const goldShare = Math.floor(def.goldReward * share);
            const pSession = PresenceManager_1.presenceManager.getSession(fighter.playerId);
            if (pSession) {
                let newSave = {
                    ...pSession.currentState,
                    stats: {
                        ...pSession.currentState.stats,
                        exp: pSession.currentState.stats.exp + expShare,
                        gold: pSession.currentState.stats.gold + goldShare,
                    },
                };
                const { save: achSave } = (0, AchievementEngine_1.processAchievementStats)(newSave, { worldBossKills: 1 });
                newSave = achSave;
                const { checkLevelUp, applyLevelUp } = require('./PlayerEngine');
                const { leveledUp, updatedSave } = checkLevelUp(newSave);
                newSave = leveledUp ? applyLevelUp(updatedSave) : newSave;
                pSession.currentState = newSave;
                pSession.socket.send(JSON.stringify({
                    type: 'output',
                    text: `\n  ╔══════════════════════════════════════════════════╗\n` +
                        `  ║  🐉 WORLD BOSS DEFEATED: ${def.name.padEnd(26)}║\n` +
                        `  ║  You dealt ${String(fighter.damageDealt).padStart(6)} damage!                      ║\n` +
                        `  ║  Reward: +${String(expShare).padStart(6)} EXP  +${String(goldShare).padStart(5)} Gold         ║\n` +
                        `  ╚══════════════════════════════════════════════════╝`,
                }));
            }
        }
        PresenceManager_1.presenceManager.broadcastToArea(session.areaId, `🐉 The World Boss ${def.name} has been slain! All fighters share the glory.`);
    }
    // ─── All players dead ────────────────────────────────────────────────────
    onAllPlayersDead(session) {
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        if (!def)
            return;
        if (session.autoAttackTimer)
            clearTimeout(session.autoAttackTimer);
        this.sessions.delete(session.areaId);
        PresenceManager_1.presenceManager.broadcastToArea(session.areaId, `☠ All fighters have fallen against ${def.name}. The World Boss remains...`);
        for (const fighter of session.participants) {
            const pSession = PresenceManager_1.presenceManager.getSession(fighter.playerId);
            if (pSession) {
                pSession.currentState = {
                    ...pSession.currentState,
                    stats: {
                        ...pSession.currentState.stats,
                        hp: Math.floor(pSession.currentState.stats.maxHp * 0.25),
                        mana: Math.floor(pSession.currentState.stats.maxMana * 0.25),
                    },
                };
                pSession.socket.send(JSON.stringify({
                    type: 'output',
                    text: `☠ You were defeated by the World Boss. Respawning...`,
                }));
            }
        }
    }
    // ─── Check if player is in boss combat ─────────────────────────────────
    isInBossCombat(playerId) {
        for (const session of this.sessions.values()) {
            if (session.participants.some(p => p.playerId === playerId && p.isActive)) {
                return true;
            }
        }
        return false;
    }
    getSessionForArea(areaId) {
        return this.sessions.get(areaId);
    }
    // ─── Broadcast boss HP to all in area ──────────────────────────────────
    broadcastBossHp(session) {
        const hpPct = Math.round((session.currentHp / session.maxHp) * 100);
        const total = 20;
        const filled = Math.round((hpPct / 100) * total);
        const bar = '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        const name = def?.name ?? session.bossId;
        PresenceManager_1.presenceManager.broadcastToArea(session.areaId, `🐉 ${name} HP: ${bar} ${hpPct}% (${session.currentHp}/${session.maxHp})`);
    }
    // ─── Format session display ─────────────────────────────────────────────
    formatSession(session) {
        const def = WorldBossEngine_1.WORLD_BOSS_DEFS[session.bossId];
        if (!def)
            return 'Unknown boss.';
        const hpPct = Math.round((session.currentHp / session.maxHp) * 100);
        const total = 20;
        const filled = Math.round((hpPct / 100) * total);
        const bar = '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
        const lines = [];
        lines.push(`\n  ╔══════════════════════════════════════════════════════════════════════╗`);
        lines.push(`  ║  🐉 WORLD BOSS: ${def.name.padEnd(48)}║`);
        lines.push(`  ║  Level ${String(def.level).padStart(3)}  |  HP: ${bar} ${String(hpPct).padStart(3)}%        ║`);
        lines.push(`  ║  Reward: ${String(def.expReward).padStart(5)} EXP  |  ${String(def.goldReward).padStart(5)} Gold                          ║`);
        lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
        lines.push(`  ║  Fighters (${session.participants.filter(p => p.isActive).length} active):                                         ║`);
        for (const p of session.participants) {
            const hpPct2 = Math.round((p.hp / p.maxHp) * 100);
            const filled2 = Math.round((hpPct2 / 100) * 12);
            const bar2 = '[' + '█'.repeat(filled2) + '░'.repeat(12 - filled2) + ']';
            const status = p.isActive ? '' : ' [DEAD]';
            lines.push(`  ║  ${p.playerName.padEnd(14)} ${bar2} ${String(p.hp).padStart(4)}/${p.maxHp}${status.padEnd(7)} DMG:${String(p.damageDealt).padStart(5)}    ║`);
        }
        lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
        for (const entry of session.log.slice(-4)) {
            const text = (entry.text ?? '').substring(0, 52).padEnd(52);
            lines.push(`  ║  ${text} ║`);
        }
        lines.push(`  ╚══════════════════════════════════════════════════════════════════════╝`);
        lines.push(`\n  Use "worldboss attack" to deal damage to the boss!`);
        lines.push(`  Use "worldboss flee" to attempt to escape.`);
        return lines.join('\n');
    }
}
exports.worldBossCombatEngine = new WorldBossCombatEngine();
//# sourceMappingURL=WorldBossCombatEngine.js.map