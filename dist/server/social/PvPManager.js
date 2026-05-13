"use strict";
/**
 * Phase 7 — PvP Combat Manager
 * Handles player-vs-player combat in PvP zones.
 * PvP is enabled when both players are in a non-safe-zone and both have `pvp.enabled = true`.
 * Phase 9: PvP can also be globally or per-city toggled by admin via PvP settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pvpManager = void 0;
exports.applyPvPDeathPenalty = applyPvPDeathPenalty;
exports.applyPvPVictoryReward = applyPvPVictoryReward;
const AdminDbManager_1 = require("../persistence/AdminDbManager");
const uuid_1 = require("uuid");
class PvPManager {
    activeSessions = new Map();
    // ─── Check if PvP is allowed in an area (admin toggle + safe zone) ───────────
    async isPvPAllowedInArea(areaId) {
        // Check global admin PvP setting
        const global = await (0, AdminDbManager_1.getPvPSettings)('global');
        if (!global.enabled)
            return false;
        // Check per-city override
        const citySetting = await (0, AdminDbManager_1.getPvPSettings)(areaId);
        if (!citySetting.enabled)
            return false;
        return true;
    }
    // ─── Start PvP combat ────────────────────────────────────────────────────
    async startPvPCombat(attackerId, attackerSave, defenderId, defenderSave, areaId) {
        // Both must have PvP enabled and be in a non-safe zone
        if (attackerSave.pvp.safeZone || !attackerSave.pvp.enabled)
            return null;
        if (defenderSave.pvp.safeZone || !defenderSave.pvp.enabled)
            return null;
        // Can't fight yourself
        if (attackerId === defenderId)
            return null;
        // Phase 9: Check admin PvP setting for this area
        const allowed = await this.isPvPAllowedInArea(areaId);
        if (!allowed)
            return null;
        const participants = [
            {
                playerId: attackerId,
                playerName: attackerSave.stats.name,
                hp: attackerSave.stats.hp,
                maxHp: attackerSave.stats.maxHp,
                mana: attackerSave.stats.mana,
                maxMana: attackerSave.stats.maxMana,
                attack: attackerSave.stats.attack,
                strength: attackerSave.stats.strength,
                agility: attackerSave.stats.agility,
                critRate: attackerSave.stats.critRate,
                critDamage: attackerSave.stats.critDamage,
                defense: attackerSave.stats.defense,
                statusEffects: [],
                isPlayer: true,
            },
            {
                playerId: defenderId,
                playerName: defenderSave.stats.name,
                hp: defenderSave.stats.hp,
                maxHp: defenderSave.stats.maxHp,
                mana: defenderSave.stats.mana,
                maxMana: defenderSave.stats.maxMana,
                attack: defenderSave.stats.attack,
                strength: defenderSave.stats.strength,
                agility: defenderSave.stats.agility,
                critRate: defenderSave.stats.critRate,
                critDamage: defenderSave.stats.critDamage,
                defense: defenderSave.stats.defense,
                statusEffects: [],
                isPlayer: true,
            },
        ];
        // Agility-based turn order
        participants.sort((a, b) => b.agility - a.agility);
        const sessionId = `pvp-${(0, uuid_1.v4)()}`;
        const session = {
            sessionId,
            attackerId,
            defenderId,
            areaId,
            participants,
            turnIndex: 0,
            round: 1,
            log: [],
            turnStartedAt: Date.now(),
            turnTimeoutMs: 15_000,
            isActive: true,
        };
        // Log entry
        session.log.push({
            round: 1,
            text: `⚔ PvP COMBAT STARTED: ${attackerSave.stats.name} vs ${defenderSave.stats.name}!`,
        });
        this.activeSessions.set(sessionId, session);
        const display = formatPvPSession(session);
        return {
            session,
            attackerText: display,
            defenderText: display,
        };
    }
    // ─── Player attacks in PvP ────────────────────────────────────────────────
    pvpAttack(sessionId, attackerId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive)
            return null;
        const attacker = session.participants[session.turnIndex];
        if (!attacker || attacker.playerId !== attackerId) {
            return { session, text: 'It\'s not your turn.' };
        }
        const defenderIdx = session.turnIndex === 0 ? 1 : 0;
        const defender = session.participants[defenderIdx];
        if (!defender || defender.hp <= 0) {
            return { session, text: 'Target is already down.' };
        }
        // Damage calculation
        const raw = attacker.attack * (1 + attacker.strength / 100);
        const mitigated = raw * (1 - defender.defense / (defender.defense + 200));
        const crit = Math.random() < attacker.critRate;
        const final = crit ? mitigated * attacker.critDamage : mitigated;
        const dodge = Math.random() < (defender.agility / (defender.agility + 150));
        const damage = dodge ? 0 : Math.max(1, Math.floor(final));
        defender.hp = Math.max(0, defender.hp - damage);
        const critTag = crit ? ' CRITICAL!' : '';
        const dodgeTag = dodge ? ' MISS!' : '';
        session.log.push({
            round: session.round,
            text: `⚔ ${attacker.playerName} attacks ${defender.playerName} → ${damage} damage!${critTag}${dodgeTag}`,
        });
        // Check victory
        if (defender.hp <= 0) {
            session.winner = attacker.playerId === session.attackerId ? 'attacker' : 'defender';
            session.isActive = false;
            session.log.push({
                round: session.round,
                text: `🏆 ${attacker.playerName} WINS! ${defender.playerName} has been defeated!`,
            });
            return { session, text: formatPvPSession(session) };
        }
        // Advance turn
        session.turnIndex = defenderIdx;
        session.round++;
        return { session, text: formatPvPSession(session) };
    }
    // ─── Player flees from PvP ────────────────────────────────────────────────
    pvpFlee(sessionId, playerId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive)
            return null;
        const attacker = session.participants[session.turnIndex];
        if (!attacker || attacker.playerId !== playerId) {
            return { session, text: 'It\'s not your turn.', fled: false };
        }
        // Agility check to flee (50% base)
        const canFlee = Math.random() < 0.50;
        if (canFlee) {
            session.isActive = false;
            session.log.push({
                round: session.round,
                text: `🏃 ${attacker.playerName} fled from PvP combat!`,
            });
            return { session, text: formatPvPSession(session), fled: true };
        }
        else {
            session.log.push({
                round: session.round,
                text: `🏃 ${attacker.playerName} failed to flee!`,
            });
            // Defender gets free attack
            const defenderIdx = session.turnIndex === 0 ? 1 : 0;
            const defender = session.participants[defenderIdx];
            if (defender && defender.hp > 0) {
                const raw = defender.attack * (1 + defender.strength / 100);
                const mitigated = raw * (1 - attacker.defense / (attacker.defense + 200));
                const dodge = Math.random() < (attacker.agility / (attacker.agility + 150));
                const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));
                attacker.hp = Math.max(0, attacker.hp - damage);
                session.log.push({
                    round: session.round,
                    text: `⚔ ${defender.playerName} counter-attacks → ${damage} damage!${dodge ? ' MISS!' : ''}`,
                });
                if (attacker.hp <= 0) {
                    session.winner = defender.playerId === session.attackerId ? 'attacker' : 'defender';
                    session.isActive = false;
                    session.log.push({ round: session.round, text: `🏆 ${defender.playerName} WINS!` });
                }
            }
            // Advance turn anyway
            session.turnIndex = session.turnIndex === 0 ? 1 : 0;
            session.round++;
            return { session, text: formatPvPSession(session), fled: false };
        }
    }
    // ─── Get active session for player ────────────────────────────────────────
    getSessionForPlayer(playerId) {
        for (const session of this.activeSessions.values()) {
            if (session.isActive && (session.attackerId === playerId || session.defenderId === playerId)) {
                return session;
            }
        }
        return null;
    }
    // ─── End session (called after resolution) ────────────────────────────────
    endSession(sessionId) {
        this.activeSessions.delete(sessionId);
    }
    // ─── Get all active sessions ──────────────────────────────────────────────
    getActiveSessions() {
        return [...this.activeSessions.values()].filter(s => s.isActive);
    }
    // ─── Check if two players can PvP ─────────────────────────────────────────
    canPvP(attacker, defender) {
        return (!attacker.pvp.safeZone &&
            !defender.pvp.safeZone &&
            attacker.pvp.enabled &&
            defender.pvp.enabled);
    }
}
// ─── Format PvP session display ───────────────────────────────────────────────
function formatPvPSession(session) {
    const lines = [];
    lines.push(`\n  ╔═══════════════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  ⚔ PvP COMBAT — Round ${session.round}                                          ║`);
    lines.push(`  ╠═══════════════════════════════════════════════════════════════════╣`);
    for (const p of session.participants) {
        const hpPct = Math.round((p.hp / p.maxHp) * 100);
        const total = 16;
        const filled = Math.round((p.hp / p.maxHp) * total);
        const bar = '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
        const tag = p.hp <= 0 ? ' [DOWN]' : '';
        lines.push(`  ║  ${p.playerName.padEnd(18)} ${bar} ${String(p.hp).padStart(4)}/${p.maxHp}${tag}  ║`);
    }
    lines.push(`  ╠═══════════════════════════════════════════════════════════════════╣`);
    const recentLog = session.log.slice(-4);
    for (const entry of recentLog) {
        const text = entry.text.substring(0, 48).padEnd(48);
        lines.push(`  ║  ${text} ║`);
    }
    lines.push(`  ╚═══════════════════════════════════════════════════════════════════╝`);
    const current = session.participants[session.turnIndex];
    const isActive = session.isActive && current;
    const next = isActive ? `⚔ ${current.playerName}'s turn` : 'Combat ended';
    lines.push(`\n  [${next}]`);
    if (isActive) {
        lines.push(`  Choose: attack <n> / flee`);
    }
    if (session.winner) {
        const winnerName = session.participants.find(p => (session.winner === 'attacker' ? p.playerId === session.attackerId : p.playerId === session.defenderId))?.playerName ?? 'Unknown';
        lines.push(`\n  🏆 ${winnerName} wins!`);
    }
    return lines.join('\n');
}
// ─── Apply PvP death penalty ─────────────────────────────────────────────────
function applyPvPDeathPenalty(save) {
    const goldLoss = Math.floor(save.stats.gold * 0.05); // 5% gold loss
    const newStats = {
        ...save.stats,
        gold: Math.max(0, save.stats.gold - goldLoss),
        hp: save.stats.maxHp,
        mana: Math.floor(save.stats.maxMana * 0.5),
    };
    const pvpStats = save.pvpStats ?? { kills: 0, deaths: 0, winStreak: 0, bestStreak: 0, seasonWins: 0, seasonPoints: 1000 };
    return {
        ...save,
        stats: newStats,
        pvpStats: { ...pvpStats, deaths: pvpStats.deaths + 1, winStreak: 0 },
    };
}
// ─── Apply PvP victory reward ─────────────────────────────────────────────────
function applyPvPVictoryReward(save, defeatedSave) {
    const goldPlunder = Math.floor(defeatedSave.stats.gold * 0.10); // 10% of defender's gold
    const expGain = Math.floor(defeatedSave.stats.level * 20);
    const newStats = {
        ...save.stats,
        gold: save.stats.gold + goldPlunder,
        exp: save.stats.exp + expGain,
    };
    // ELO-like point gain: winner gains 20 pts, loser loses 15
    const winnerPts = save.pvpStats?.seasonPoints ?? 1000;
    const loserPts = defeatedSave.pvpStats?.seasonPoints ?? 1000;
    const winnerBest = Math.max(save.pvpStats?.bestStreak ?? 0, (save.pvpStats?.winStreak ?? 0) + 1);
    const pvpStats = save.pvpStats ?? { kills: 0, deaths: 0, winStreak: 0, bestStreak: 0, seasonWins: 0, seasonPoints: 1000 };
    let newSave = {
        ...save,
        stats: newStats,
        pvpStats: {
            ...pvpStats,
            kills: pvpStats.kills + 1,
            winStreak: pvpStats.winStreak + 1,
            bestStreak: winnerBest,
            seasonWins: pvpStats.seasonWins + 1,
            seasonPoints: Math.max(100, winnerPts + 20),
        },
    };
    // Check level up
    const { checkLevelUp, applyLevelUp } = require('../engine/PlayerEngine');
    const { leveledUp, updatedSave } = checkLevelUp(newSave);
    return leveledUp ? applyLevelUp(updatedSave) : updatedSave;
}
exports.pvpManager = new PvPManager();
//# sourceMappingURL=PvPManager.js.map