"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const PlayerEngine_1 = require("./engine/PlayerEngine");
const PlayerEngine_2 = require("./engine/PlayerEngine");
const SaveManager_1 = require("./persistence/SaveManager");
const CommandParser_1 = require("./parser/CommandParser");
const RegenEngine_1 = require("./engine/RegenEngine");
const InventoryManager_1 = require("./items/InventoryManager");
const PresenceManager_1 = require("./social/PresenceManager");
const PartyManager_1 = require("./social/PartyManager");
const CombatTimerEngine_1 = require("./engine/CombatTimerEngine");
const CombatTimerEngine_2 = require("./engine/CombatTimerEngine");
const PartyCombatManager_1 = require("./engine/PartyCombatManager");
const CombatEngine_1 = require("./engine/CombatEngine");
const uuid_1 = require("uuid");
const PORT = 8080;
// ─── Session Map ──────────────────────────────────────────────────────────────
const sessions = new Map();
function trySend(socket, data) {
    try {
        if (socket.readyState === 1)
            socket.send(JSON.stringify(data));
    }
    catch { /* closed */ }
}
function broadcastPush(session, channel, text) {
    trySend(session.socket, { type: 'push', channel, text });
}
// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`[Server] WebSocket listening on ws://localhost:${PORT}`);
wss.on('connection', (socket, _req) => {
    const sessionId = (0, uuid_1.v4)();
    socket.on('message', async (data) => {
        const msg = JSON.parse(data.toString());
        const session = sessions.get(sessionId);
        // ── Registration ──────────────────────────────────────────────────────
        if (msg.type === 'register') {
            const { playerId: pid, name, slot } = msg;
            let newSave = (0, PlayerEngine_1.createDefaultSave)(name);
            newSave.playerId = pid; // wire playerId into save
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'wooden_sword', 1).save;
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'tattered_cloth', 1).save;
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'health_potion_1', 3).save;
            await (0, SaveManager_1.registerPlayer)(pid, name);
            await (0, SaveManager_1.saveSave)(pid, slot ?? 1, newSave, 0);
            const newSession = {
                sessionId,
                socket,
                playerId: pid,
                saveSlot: slot ?? 1,
                currentState: newSave,
                connectedAt: new Date(),
                lastActivity: new Date(),
                regenState: newSave.regenState,
            };
            sessions.set(sessionId, newSession);
            PresenceManager_1.presenceManager.registerSession(sessionId, pid, newSession);
            // Enter starting area
            PresenceManager_1.presenceManager.enter(pid, newSave.worldState.currentArea, 'Exploring');
            // Notify nearby players
            PresenceManager_1.presenceManager.broadcastToArea(newSave.worldState.currentArea, `[Nearby] ${name} has entered the area.`, pid);
            socket.send(JSON.stringify({ type: 'connected', sessionId, save: newSave }));
            startRegen(newSession);
            return;
        }
        // ── Load ─────────────────────────────────────────────────────────────
        if (msg.type === 'load') {
            const { playerId: pid, slot } = msg;
            const save = await (0, SaveManager_1.loadSave)(pid, slot ?? 1);
            if (!save) {
                socket.send(JSON.stringify({ type: 'error', text: 'No save found in that slot.' }));
                return;
            }
            const newSession = {
                sessionId,
                socket,
                playerId: pid,
                saveSlot: slot ?? 1,
                currentState: save,
                connectedAt: new Date(),
                lastActivity: new Date(),
                regenState: save.regenState,
            };
            sessions.set(sessionId, newSession);
            PresenceManager_1.presenceManager.registerSession(sessionId, pid, newSession);
            PresenceManager_1.presenceManager.enter(pid, save.worldState.currentArea, 'Exploring');
            PresenceManager_1.presenceManager.broadcastToArea(save.worldState.currentArea, `[Nearby] ${save.stats.name} has entered the area.`, pid);
            socket.send(JSON.stringify({ type: 'loaded', save }));
            startRegen(newSession);
            return;
        }
        // ── Chat-only message (can be sent without full session) ─────────────
        if (msg.type === 'chat') {
            if (!session)
                return;
            const { channel, text, to } = msg;
            const playerName = session.currentState.stats.name;
            switch (channel) {
                case 'area': {
                    PresenceManager_1.presenceManager.broadcastToArea(session.currentState.worldState.currentArea, `[Area] ${playerName}: ${text}`, session.playerId);
                    break;
                }
                case 'party': {
                    const { partyManager } = require('./social/PartyManager');
                    partyManager.syncMember(session.playerId);
                    partyManager.notifyAllMembers(session.currentState.partyId ?? '', `[Party] ${playerName}: ${text}`, session.playerId);
                    break;
                }
                case 'whisper': {
                    if (!to)
                        break;
                    const target = PresenceManager_1.presenceManager.getSessionByPlayerName(to);
                    if (!target) {
                        broadcastPush(session, 'system', `[Whisper] Player "${to}" is not online.`);
                        return;
                    }
                    broadcastPush(session, 'whisper', `[Whisper to ${to}]: ${text}`);
                    broadcastPush(target, 'whisper', `[Whisper from ${playerName}]: ${text}`);
                    break;
                }
                case 'shout': {
                    const { chatRouter } = require('./social/ChatRouter');
                    chatRouter.route({ channel: 'shout', from: session.playerId, text, timestamp: Date.now() });
                    break;
                }
            }
            return;
        }
        if (!session) {
            socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
            return;
        }
        // ── Command ──────────────────────────────────────────────────────────
        if (msg.type === 'command') {
            session.lastActivity = new Date();
            // Check if player is in party combat — delegate if so
            const partyCombat = (0, PartyCombatManager_1.getPartyCombat)(session.currentState.partyId ?? '');
            if (partyCombat) {
                // Handle party combat commands
                if (msg.cmd.startsWith('attack ') || msg.cmd === 'attack') {
                    const targetIdx = parseInt(msg.cmd.split(' ')[1] ?? '1') - 1;
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'attack', { targetIdx });
                    if (!result) {
                        socket.send(JSON.stringify({ type: 'output', text: 'Party combat error.' }));
                        return;
                    }
                    const you = result.session.participants.find(p => p.playerId === session.playerId);
                    const state = formatPartyCombatStateDisplay(result.session, session.playerId);
                    socket.send(JSON.stringify({ type: 'output', text: result.text }));
                    return;
                }
                if (msg.cmd.startsWith('flee')) {
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'flee');
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot flee.' }));
                    return;
                }
                if (msg.cmd.startsWith('heal ')) {
                    const targetName = msg.cmd.split(' ').slice(1).join(' ');
                    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'heal', { targetPlayerId: targetSession?.playerId });
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot heal.' }));
                    return;
                }
                if (msg.cmd.startsWith('buff ')) {
                    const targetName = msg.cmd.split(' ').slice(1).join(' ');
                    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'buff', { targetPlayerId: targetSession?.playerId });
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot buff.' }));
                    return;
                }
                if (msg.cmd.startsWith('skill ') || msg.cmd.startsWith('magic ')) {
                    // skill physical/magic/support <n> [target]
                    const parts = msg.cmd.split(' ');
                    const skillType = parts[1] === 'magic' ? 'magic' : parts[1] === 'support' ? 'support' : 'physical';
                    const skillIdx = parseInt(parts[2] ?? '1') - 1;
                    const targetName = parts[3];
                    const targetSession = targetName ? PresenceManager_1.presenceManager.getSessionByPlayerName(targetName) : null;
                    if (skillType === 'support' && targetSession) {
                        const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'support', {
                            skillType: 'support',
                            skillIdx,
                            targetPlayerId: targetSession.playerId,
                        });
                        socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot use support skill.' }));
                    }
                    else {
                        const targetIdx = targetName ? parseInt(targetName) - 1 : 0;
                        const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, skillType, {
                            skillType: skillType,
                            skillIdx,
                            targetIdx,
                        });
                        socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot use skill.' }));
                    }
                    return;
                }
                if (msg.cmd === 'log') {
                    const pc = (0, PartyCombatManager_1.getPartyCombat)(session.currentState.partyId ?? '');
                    socket.send(JSON.stringify({ type: 'output', text: formatPartyCombatStateDisplay(pc ?? partyCombat, session.playerId) }));
                    return;
                }
                // Allow non-combat commands through during party combat
                if (!isCombatCommand(msg.cmd)) {
                    const result = (0, CommandParser_1.parseCommand)(msg.cmd, session.currentState, undefined, session.sessionId, session.playerId);
                    session.currentState = result.newSave ?? session.currentState;
                    if (result.action === 'save')
                        await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
                    socket.send(JSON.stringify({ type: 'output', text: result.text }));
                    return;
                }
                socket.send(JSON.stringify({ type: 'output', text: 'You are in party combat. Use: attack / skill / magic / support / heal / buff / flee / log.' }));
                return;
            }
            const result = (0, CommandParser_1.parseCommand)(msg.cmd, session.currentState, session.combatState, session.sessionId, session.playerId);
            const newSave = result.newSave ?? session.currentState;
            session.currentState = newSave;
            // Combat timer management
            const hadCombat = !!session.combatState;
            const nowHasCombat = !!result.combatState;
            if (hadCombat && !nowHasCombat) {
                // Combat ended — clear timer
                clearCombatTimer(session);
            }
            else if (!hadCombat && nowHasCombat) {
                // Combat started — wire 15s timer
                startCombatTimer(session, result.combatState);
            }
            else if (nowHasCombat) {
                // Combat ongoing — restart timer for next turn
                clearCombatTimer(session);
                startCombatTimer(session, result.combatState);
            }
            session.combatState = result.combatState;
            // Broadcast push messages from the command result
            if (result.pushMessages) {
                for (const push of result.pushMessages) {
                    const areaId = push.areaId ?? session.currentState.worldState.currentArea;
                    const excludeId = push.excludeSelf ? session.playerId : undefined;
                    PresenceManager_1.presenceManager.broadcastToArea(areaId, push.text, excludeId);
                }
            }
            // Handle party encounter auto-trigger
            if (result.action === 'party_encounter' && result.partyEncounter) {
                const { partyId, areaId, enemies } = result.partyEncounter;
                const pcSession = (0, PartyCombatManager_1.startPartyCombat)(partyId, areaId, enemies);
                if (pcSession) {
                    socket.send(JSON.stringify({ type: 'output', text: result.text }));
                }
                else {
                    // Fallback to solo combat
                    const soloSession = (0, CombatEngine_1.createCombatSession)(session.currentState, enemies, areaId);
                    startCombatTimer(session, soloSession);
                    session.combatState = soloSession;
                    socket.send(JSON.stringify({ type: 'output', text: result.text }));
                }
                return;
            }
            if (result.action === 'save') {
                await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
                socket.send(JSON.stringify({ type: 'output', text: result.text + '\n  (Game saved!)' }));
            }
            else if (result.action === 'quit') {
                await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
                PresenceManager_1.presenceManager.broadcastToArea(session.currentState.worldState.currentArea, `[Nearby] ${session.currentState.stats.name} has left.`, session.playerId);
                socket.send(JSON.stringify({ type: 'quit' }));
                sessions.delete(sessionId);
                socket.close();
            }
            else {
                socket.send(JSON.stringify({ type: 'output', text: result.text }));
            }
        }
    });
    socket.on('close', async () => {
        const session = sessions.get(sessionId);
        if (session) {
            await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
            stopRegen(session);
            PresenceManager_1.presenceManager.broadcastToArea(session.currentState.worldState.currentArea, `[Nearby] ${session.currentState.stats.name} has left.`, session.playerId);
            PresenceManager_1.presenceManager.unregisterSession(sessionId, session.playerId);
            sessions.delete(sessionId);
        }
    });
    socket.on('error', (err) => {
        console.error('[Socket error]', err);
    });
});
// ─── Regen Tick ──────────────────────────────────────────────────────────────
function startRegen(session) {
    if (session.regenInterval)
        clearInterval(session.regenInterval);
    session.regenInterval = setInterval(() => {
        if (session.regenState === 'combat')
            return;
        const result = (0, RegenEngine_1.calcRegenTick)(session.currentState, session.regenState);
        if (result.hpGain > 0 || result.manaGain > 0) {
            session.currentState = {
                ...session.currentState,
                stats: {
                    ...session.currentState.stats,
                    hp: result.newHp,
                    mana: result.newMana,
                },
            };
        }
    }, (0, RegenEngine_1.getTickMs)());
}
function stopRegen(session) {
    if (session.regenInterval) {
        clearInterval(session.regenInterval);
        session.regenInterval = undefined;
    }
}
// ─── Combat Timer ────────────────────────────────────────────────────────────────
function startCombatTimer(session, combatState) {
    if (session.combatTimerHandle)
        clearCombatTimer(session);
    session.combatTimerHandle = (0, CombatTimerEngine_1.startSoloTurnTimer)(combatState, (updatedSession, timedOutId) => {
        const hadVictory = !!updatedSession.winner;
        if (updatedSession.winner === 'player') {
            session.combatState = updatedSession;
            session.currentState = (0, CombatEngine_1.resolveVictory)(session.currentState, updatedSession);
            session.combatState = undefined;
        }
        else if (updatedSession.winner === 'enemy') {
            session.combatState = updatedSession;
            session.currentState = (0, CombatEngine_1.resolveDefeat)(session.currentState);
            session.combatState = undefined;
        }
        else {
            // Timeout: forfeit turn, advance
            const withLog = (0, CombatTimerEngine_1.handleSoloTimeout)(updatedSession, timedOutId);
            session.combatState = (0, CombatEngine_1.advanceTurn)(withLog);
        }
        if (!hadVictory && !session.combatState) {
            clearCombatTimer(session);
        }
    });
}
function clearCombatTimer(session) {
    session.combatTimerHandle?.clear();
    session.combatTimerHandle = undefined;
}
// ─── Solo combat commands ────────────────────────────────────────────────────
function isCombatCommand(cmd) {
    const verb = cmd.trim().split(/\s+/)[0]?.toLowerCase();
    return ['attack', 'a', 'flee', 'f', 'item', 'i', 'skill', 'magic', 'log'].includes(verb);
}
// ─── Party combat display ────────────────────────────────────────────────────
function formatPartyCombatStateDisplay(session, playerId) {
    if (!session)
        return 'No party combat active.';
    const lines = [];
    lines.push(`\n  ╔══════════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  PARTY COMBAT — Round ${session.round}                              ║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);
    const players = (session.participants ?? []).filter((p) => p.type === 'player' && p.isPlayer);
    for (const p of players) {
        const hpPct = Math.round((p.hp / p.maxHp) * 100);
        const total = 12;
        const filled = Math.round((p.hp / p.maxHp) * total);
        const bar = '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']';
        const tag = p.hp <= 0 ? ' [UNCONSCIOUS]' : '';
        const isYou = p.playerId === playerId;
        const name = isYou ? p.name + ' (YOU)' : p.name;
        lines.push(`  ║  ${name.padEnd(20)} ${bar} ${String(p.hp).padStart(4)}/${p.maxHp}${tag}  ║`);
    }
    lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);
    const enemies = (session.participants ?? []).filter((p) => p.type === 'enemy' && p.hp > 0);
    let idx = 1;
    for (const e of enemies) {
        const eliteTag = e.isElite ? '[ELITE]' : '';
        lines.push(`  ║  [${idx}] ${(e.name + eliteTag).padEnd(22)} HP: ${String(e.hp).padStart(5)}/${e.maxHp}       ║`);
        idx++;
    }
    lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);
    const recentLog = (session.log ?? []).slice(-5);
    for (const entry of recentLog) {
        const text = (entry.text ?? '').substring(0, 42).padEnd(42);
        lines.push(`  ║  ${text} ║`);
    }
    lines.push(`  ╚══════════════════════════════════════════════════════════════╝`);
    const current = session.participants?.[session.turnIndex];
    const isYourTurn = current?.playerId === playerId;
    const you = players.find((p) => p.playerId === playerId);
    lines.push(`\n  [${isYourTurn ? '**YOUR TURN** 15s!' : `Waiting for ${current?.name}...`}]`);
    if (you) {
        lines.push(`  HP: ${you.hp}/${you.maxHp}  |  MP: ${you.mana}/${you.maxMana}`);
    }
    if (isYourTurn) {
        lines.push(`  Choose: attack <n> / skill <type> <n> / heal <name> / buff <name> / flee / log`);
    }
    return lines.join('\n');
}
console.log(`[Server] Phase 6: Skill Polish, Support Skills & Party Combat ready.`);
// ─── Party combat timer callback ───────────────────────────────────────────────
function onPartyTimeout(updatedSession, timedOutPlayerId, timedOutCount) {
    const handle = PartyCombatManager_1.activePartyCombats.get(updatedSession.partyId);
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
        handle.timerHandle = (0, CombatTimerEngine_2.startPartyTurnTimer)(finalSession, onPartyTimeout);
    }
}
// ─── Party encounter helpers ────────────────────────────────────────────────────
function startPartyCombatWithEnemies(partyId, areaId, enemies) {
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
            attack: save ? (0, PlayerEngine_2.computeAttack)(save.stats) : 10,
            strength: save?.stats.strength ?? 10,
            agility: save?.stats.agility ?? 10,
            critRate: save?.stats.critRate ?? 0.05,
            critDamage: save?.stats.critDamage ?? 1.5,
        };
    });
    if (partyMemberData.length === 0)
        return null;
    const session = (0, CombatTimerEngine_1.createPartyCombatSession)(partyId, partyMemberData, enemies, areaId);
    PartyManager_1.partyManager.notifyAllMembers(partyId, `⚔ PARTY COMBAT started! ${enemies.length} enemies appear!`);
    const handle = (0, CombatTimerEngine_2.startPartyTurnTimer)(session, onPartyTimeout);
    PartyCombatManager_1.activePartyCombats.set(partyId, { session, timerHandle: handle });
    for (const m of party.members) {
        PartyManager_1.partyManager.updateActivity(m.playerId, 'In Combat');
    }
    return session;
}
//# sourceMappingURL=index.js.map