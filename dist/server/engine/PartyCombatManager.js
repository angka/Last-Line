"use strict";
/**
 * Phase 5 — Party Combat Manager
 * Coordinates shared combat sessions for party members.
 * Manages the combat lifecycle: start, turns, timer, resolution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activePartyCombats = void 0;
exports.startPartyCombat = startPartyCombat;
exports.getPartyCombat = getPartyCombat;
exports.getPlayerPartyCombat = getPlayerPartyCombat;
exports.isInPartyCombat = isInPartyCombat;
exports.getPartyCombatForArea = getPartyCombatForArea;
exports.executePartyAction = executePartyAction;
exports.broadcastTurnStart = broadcastTurnStart;
const PresenceManager_1 = require("../social/PresenceManager");
const PartyManager_1 = require("../social/PartyManager");
const CombatTimerEngine_1 = require("./CombatTimerEngine");
const CombatEngine_1 = require("./CombatEngine");
const PlayerEngine_1 = require("./PlayerEngine");
const areas_1 = require("../../data/areas");
const LootEngine_1 = require("./LootEngine");
exports.activePartyCombats = new Map();
// ─── Start Party Combat ────────────────────────────────────────────────────────
function startPartyCombat(partyId, areaId, preGenEnemies) {
    const party = PartyManager_1.partyManager.getParty(partyId);
    if (!party)
        return null;
    const partyMemberData = party.members
        .filter(m => m.hp > 0)
        .map(m => {
        const session = PresenceManager_1.presenceManager.getSession(m.playerId);
        const save = session?.currentState;
        return {
            playerId: m.playerId,
            name: m.playerName,
            hp: m.hp,
            maxHp: m.maxHp,
            mana: m.mana,
            maxMana: m.maxMana,
            attack: save ? (0, PlayerEngine_1.computeAttack)(save.stats) : 10,
            strength: save?.stats.strength ?? 10,
            agility: save?.stats.agility ?? 10,
            critRate: save?.stats.critRate ?? 0.05,
            critDamage: save?.stats.critDamage ?? 1.5,
        };
    });
    if (partyMemberData.length === 0)
        return null;
    const enemies = preGenEnemies ?? (() => {
        const scaledCount = Math.min(2 + Math.floor(partyMemberData.length / 2), 4);
        return generatePartyEncounter(areaId, scaledCount);
    })();
    if (enemies.length === 0)
        return null;
    const session = (0, CombatTimerEngine_1.createPartyCombatSession)(partyId, partyMemberData, enemies, areaId);
    PartyManager_1.partyManager.notifyAllMembers(partyId, `⚔ PARTY COMBAT started! ${enemies.length} enemies appear!`);
    const handle = (0, CombatTimerEngine_1.startPartyTurnTimer)(session, onPartyTimeout);
    exports.activePartyCombats.set(partyId, { session, timerHandle: handle });
    for (const m of party.members) {
        PartyManager_1.partyManager.updateActivity(m.playerId, 'In Combat');
    }
    return session;
}
function generatePartyEncounter(areaId, partySize) {
    const area = (0, areas_1.getArea)(areaId);
    if (!area)
        return [];
    const avgLevel = getAveragePartyLevel();
    const enemies = (0, CombatEngine_1.generateEncounter)(area.levelRange, avgLevel, partySize, partySize + 1, 0.10);
    if (enemies.length === 0)
        return [];
    const tempSession = (0, CombatEngine_1.createCombatSession)(createMinimalSave(), enemies, areaId);
    return tempSession.participants.filter(p => p.type === 'enemy');
}
function getAveragePartyLevel() {
    const allPlayers = [...PresenceManager_1.presenceManager.getAllPlayers()];
    if (allPlayers.length === 0)
        return 20;
    const levels = allPlayers
        .filter(p => PartyManager_1.partyManager.isInParty(p.playerId))
        .map(p => p.level);
    return levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 20;
}
function createMinimalSave() {
    return {
        saveId: 'temp',
        playerId: 'temp',
        playerName: 'temp',
        savedAt: new Date().toISOString(),
        playtime: 0,
        stats: {
            name: 'temp',
            level: 20,
            exp: 0,
            expToNext: 1000,
            hp: 500, maxHp: 500,
            mana: 100, maxMana: 100,
            gold: 0,
            strength: 20, agility: 20, defense: 20, luck: 10,
            attack: 20, critRate: 0.05, critDamage: 1.5,
            freeStatPoints: 0, perkSlots: 0,
        },
        inventory: [],
        equipped: { weapon: null, armor: null, accessory1: null, accessory2: null },
        skills: { physical: [], magic: [], support: [] },
        worldState: {
            currentArea: '', currentCity: '',
            unlockedCities: [], unlockedDungeons: [],
            defeatedBosses: [], dungeonProgress: [], dungeonChests: [],
        },
        pendingLoot: [],
        socialPrefs: { chatVisible: true, nearbyVisible: true, chatArea: true, chatParty: true, chatShout: true },
        pvp: { enabled: false, safeZone: false },
        regenState: 'combat',
    };
}
// ─── Get active combat ────────────────────────────────────────────────────────
function getPartyCombat(partyId) {
    return exports.activePartyCombats.get(partyId)?.session ?? null;
}
function getPlayerPartyCombat(playerId) {
    const party = PartyManager_1.partyManager.getPartyOf(playerId);
    if (!party)
        return null;
    const handle = exports.activePartyCombats.get(party.partyId);
    if (!handle)
        return null;
    return { partyId: party.partyId, session: handle.session };
}
function isInPartyCombat(playerId) {
    return getPlayerPartyCombat(playerId) !== null;
}
function getPartyCombatForArea(areaId) {
    const result = [];
    for (const [partyId, handle] of exports.activePartyCombats) {
        if (handle.session.areaId === areaId) {
            result.push({ partyId, session: handle.session });
        }
    }
    return result;
}
// ─── Timer callback ───────────────────────────────────────────────────────────
function onPartyTimeout(updatedSession, timedOutPlayerId, timedOutCount) {
    const handle = exports.activePartyCombats.get(updatedSession.partyId);
    if (!handle)
        return;
    const result = (0, CombatTimerEngine_1.handlePartyTimeout)(updatedSession, timedOutPlayerId, timedOutCount);
    const finalSession = (0, CombatTimerEngine_1.checkPartyVictory)(result);
    handle.session = finalSession;
    const name = result.participants.find(p => p.playerId === timedOutPlayerId)?.name ?? 'Player';
    if (timedOutCount >= 3) {
        PartyManager_1.partyManager.notifyMember(timedOutPlayerId, `☠ You have been knocked unconscious! Wait for revival or battle to end.`);
        PartyManager_1.partyManager.setDowned(timedOutPlayerId, true);
    }
    else {
        PartyManager_1.partyManager.notifyMember(timedOutPlayerId, `⏰ Turn timed out (${timedOutCount}/3). Skipping...`);
        PartyManager_1.partyManager.incrementTimedOut(timedOutPlayerId);
    }
    if (!finalSession.winner) {
        handle.timerHandle.clear();
        handle.timerHandle = (0, CombatTimerEngine_1.startPartyTurnTimer)(finalSession, onPartyTimeout);
    }
}
// ─── Execute player action ─────────────────────────────────────────────────────
function executePartyAction(playerId, action, args = {}) {
    const result = getPlayerPartyCombat(playerId);
    if (!result)
        return null;
    const { partyId, session } = result;
    const current = (0, CombatTimerEngine_1.getCurrentTurnParticipant)(session);
    if (!current || current.type !== 'player' || current.playerId !== playerId) {
        return { session, text: 'It is not your turn.' };
    }
    const playerSession = PresenceManager_1.presenceManager.getSession(playerId);
    const playerSave = playerSession?.currentState;
    let updated = session;
    let manaUsed = 0;
    if (action === 'attack') {
        updated = (0, CombatTimerEngine_1.partyPlayerAttack)(session, playerId, args.targetIdx ?? 0);
        updated = (0, CombatTimerEngine_1.partyEnemyTurn)(updated);
        updated = (0, CombatTimerEngine_1.checkPartyVictory)(updated);
    }
    else if (action === 'skill' || action === 'magic') {
        if (!playerSave)
            return null;
        const skillType = args.skillType ?? 'physical';
        let skill;
        if (skillType === 'physical') {
            skill = playerSave.skills.physical[args.skillIdx ?? 0];
        }
        else {
            skill = playerSave.skills.magic[args.skillIdx ?? 0];
        }
        if (!skill)
            return { session, text: 'Skill not found.' };
        updated = (0, CombatTimerEngine_1.partyPlayerSkill)(session, playerId, skill, args.targetIdx ?? 0, playerSave);
        manaUsed = Math.max(Math.floor(skill.manaCost * (1 - (skill.level - 1) * 0.05)), Math.floor(skill.manaCost * 0.30));
        updated = (0, CombatTimerEngine_1.partyEnemyTurn)(updated);
        updated = (0, CombatTimerEngine_1.checkPartyVictory)(updated);
    }
    else if (action === 'support') {
        if (!playerSave)
            return null;
        if (!args.targetPlayerId)
            return { session, text: 'Specify target: heal <ally> / buff <ally> / revive <ally>' };
        const skill = playerSave.skills.support[args.skillIdx ?? 0];
        if (!skill)
            return { session, text: 'No support skill in that slot.' };
        const res = (0, CombatTimerEngine_1.partyPlayerSupport)(session, playerId, skill, args.targetPlayerId, playerSave);
        if (!res)
            return { session, text: 'Not enough mana or invalid target.' };
        updated = res.session;
        manaUsed = res.manaUsed;
        updated = (0, CombatTimerEngine_1.partyEnemyTurn)(updated);
        updated = (0, CombatTimerEngine_1.checkPartyVictory)(updated);
    }
    else if (action === 'flee') {
        const { fled, log } = (0, CombatTimerEngine_1.rollPartyFlee)(updated);
        updated = { ...updated, log };
        if (fled) {
            cleanupPartyCombat(partyId);
            PartyManager_1.partyManager.notifyAllMembers(partyId, `🏃 The party fled from combat! No rewards gained.`);
            return { session: updated, text: 'The party fled from combat! No rewards gained.' };
        }
        updated = (0, CombatTimerEngine_1.partyEnemyTurn)(updated);
        updated = (0, CombatTimerEngine_1.checkPartyVictory)(updated);
    }
    else if (action === 'heal' || action === 'buff') {
        if (!playerSave)
            return null;
        if (!args.targetPlayerId) {
            // Show party members HP when no target given
            return { session, text: formatPartyHpList(session, partyId) };
        }
        // Use best available support skill (healing_touch or healing_light for heal, first buff skill for buff)
        const supportIdx = args.skillIdx ?? playerSave.skills.support.findIndex((s) => action === 'heal' ? s.effectType === 'heal' : s.effectType === 'buff_stat');
        if (supportIdx < 0) {
            return { session, text: action === 'heal'
                    ? 'No healing skills learned. Use "skill support <n> <ally>" when you have a healing scroll.'
                    : 'No buff skills learned. Use "skill support <n> <ally>" when you have a buff scroll.' };
        }
        const skill = playerSave.skills.support[supportIdx];
        const res = (0, CombatTimerEngine_1.partyPlayerSupport)(session, playerId, skill, args.targetPlayerId, playerSave);
        if (!res)
            return { session, text: 'Not enough mana or invalid target.' };
        updated = res.session;
        manaUsed = res.manaUsed;
        updated = (0, CombatTimerEngine_1.partyEnemyTurn)(updated);
        updated = (0, CombatTimerEngine_1.checkPartyVictory)(updated);
    }
    // Apply mana cost to session
    if (manaUsed > 0 && playerSession) {
        playerSession.currentState = {
            ...playerSession.currentState,
            stats: { ...playerSession.currentState.stats, mana: playerSession.currentState.stats.mana - manaUsed },
        };
    }
    if (updated.winner === 'player') {
        const lootResults = resolvePartyLoot(updated, partyId);
        updated = (0, CombatTimerEngine_1.resolvePartyVictory)(updated, lootResults);
        const handle = exports.activePartyCombats.get(partyId);
        if (handle)
            handle.session = updated;
        const enemies = updated.participants.filter((p) => p.type === 'enemy');
        if (enemies.length === 0) {
            autoUnlockDungeonChest(updated.areaId, partyId);
        }
        const output = (0, CombatTimerEngine_1.formatPartyCombatState)(updated) + '\n  🎉 VICTORY! Party wins!';
        cleanupPartyCombat(partyId);
        return { session: updated, text: output };
    }
    if (updated.winner === 'enemy') {
        const saveUpdates = applyPartyDefeat(updated, partyId);
        updated = (0, CombatTimerEngine_1.resolvePartyDefeat)(updated, saveUpdates);
        const handle = exports.activePartyCombats.get(partyId);
        if (handle)
            handle.session = updated;
        const output = (0, CombatTimerEngine_1.formatPartyCombatState)(updated) + '\n  ☠ DEFEAT... The party falls...';
        cleanupPartyCombat(partyId);
        return { session: updated, text: output };
    }
    updated = (0, CombatTimerEngine_1.advancePartyTurn)(updated);
    const handle = exports.activePartyCombats.get(partyId);
    if (handle) {
        handle.timerHandle.clear();
        handle.timerHandle = (0, CombatTimerEngine_1.startPartyTurnTimer)(updated, onPartyTimeout);
        handle.session = updated;
    }
    return {
        session: updated,
        text: (0, CombatTimerEngine_1.formatPartyCombatState)(updated) + '\n' + (0, CombatTimerEngine_1.formatPartyCombatPrompt)(updated, playerId),
    };
}
// ─── Format party HP list ─────────────────────────────────────────────────────
function formatPartyHpList(session, partyId) {
    const lines = ['  ══════════ PARTY HP ══════════'];
    const players = session.participants.filter((p) => p.type === 'player' && p.isPlayer);
    for (const p of players) {
        const hpPct = Math.round((p.hp / p.maxHp) * 100);
        const bar = '[' + '█'.repeat(Math.round(hpPct / 10)) + '░'.repeat(10 - Math.round(hpPct / 10)) + ']';
        const tag = p.hp <= 0 ? ' [UNCONSCIOUS]' : '';
        lines.push(`  ${p.name.padEnd(14)} HP: ${String(p.hp).padStart(4)}/${p.maxHp} ${bar}${tag}`);
    }
    lines.push('  ─────────────────────────────────────');
    lines.push('  Use: heal <ally> / buff <ally> / revive <ally>');
    return lines.join('\n');
}
// ─── Resolve loot for all party members ───────────────────────────────────────
function resolvePartyLoot(session, partyId) {
    const results = new Map();
    const party = PartyManager_1.partyManager.getParty(partyId);
    if (!party)
        return results;
    const enemies = session.participants.filter(p => p.type === 'enemy');
    for (const m of party.members) {
        const mSession = PresenceManager_1.presenceManager.getSession(m.playerId);
        if (!mSession)
            continue;
        const fakeSession = (0, CombatEngine_1.createCombatSession)(mSession.currentState, enemies, session.areaId);
        const updatedSave = (0, CombatEngine_1.resolveVictory)(mSession.currentState, fakeSession);
        mSession.currentState = updatedSave;
        results.set(m.playerId, updatedSave);
    }
    return results;
}
// ─── Apply defeat to all party members ────────────────────────────────────────
function applyPartyDefeat(session, partyId) {
    const results = new Map();
    const party = PartyManager_1.partyManager.getParty(partyId);
    if (!party)
        return results;
    for (const m of party.members) {
        const mSession = PresenceManager_1.presenceManager.getSession(m.playerId);
        if (!mSession)
            continue;
        const updatedSave = (0, CombatEngine_1.resolveDefeat)(mSession.currentState);
        mSession.currentState = updatedSave;
        results.set(m.playerId, updatedSave);
    }
    return results;
}
// ─── Cleanup ─────────────────────────────────────────────────────────────────
function cleanupPartyCombat(partyId) {
    const handle = exports.activePartyCombats.get(partyId);
    if (handle) {
        handle.timerHandle.clear();
        exports.activePartyCombats.delete(partyId);
    }
    const party = PartyManager_1.partyManager.getParty(partyId);
    if (party) {
        for (const m of party.members) {
            PartyManager_1.partyManager.updateActivity(m.playerId, 'Exploring');
            PartyManager_1.partyManager.setDowned(m.playerId, false);
        }
    }
}
// ─── Auto-unlock dungeon chest on boss kill ─────────────────────────────────
function autoUnlockDungeonChest(areaId, partyId) {
    const { getDungeonForArea } = require('../../data/dungeons');
    const dungeon = getDungeonForArea(areaId);
    if (!dungeon)
        return;
    const chestLoot = (0, LootEngine_1.getDungeonChestLoot)(dungeon.id);
    const party = PartyManager_1.partyManager.getParty(partyId);
    if (!party)
        return;
    for (const m of party.members) {
        const mSession = PresenceManager_1.presenceManager.getSession(m.playerId);
        if (!mSession)
            continue;
        const current = mSession.currentState;
        const newChests = [...(current.worldState.dungeonChests ?? [])];
        const existing = newChests.find(c => c.areaId === areaId);
        if (!existing) {
            newChests.push({ areaId, items: chestLoot, opened: true });
        }
        mSession.currentState = {
            ...current,
            pendingLoot: [...current.pendingLoot, ...chestLoot],
            worldState: { ...current.worldState, dungeonChests: newChests },
        };
    }
    PartyManager_1.partyManager.notifyAllMembers(partyId, `📦 Dungeon chest auto-unlocked! Loot added to pending loot for all members.`);
}
// ─── Broadcast turn start ─────────────────────────────────────────────────────
function broadcastTurnStart(partyId, session, newPlayerId) {
    const next = (0, CombatTimerEngine_1.getCurrentTurnParticipant)(session);
    if (!next)
        return;
    PartyManager_1.partyManager.notifyMember(newPlayerId, `[⚔ YOUR TURN! 15s]`);
    PartyManager_1.partyManager.notifyAllMembers(partyId, `[Party] Waiting for ${next.name}...`, newPlayerId);
}
//# sourceMappingURL=PartyCombatManager.js.map