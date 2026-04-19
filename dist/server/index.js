"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const PlayerEngine_1 = require("./engine/PlayerEngine");
const SaveManager_1 = require("./persistence/SaveManager");
const CommandParser_1 = require("./parser/CommandParser");
const RegenEngine_1 = require("./engine/RegenEngine");
const InventoryManager_1 = require("./items/InventoryManager");
const uuid_1 = require("uuid");
const PORT = 8080;
const sessions = new Map();
// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`[Server] WebSocket listening on ws://localhost:${PORT}`);
wss.on('connection', (socket, _req) => {
    const sessionId = (0, uuid_1.v4)();
    socket.on('message', async (data) => {
        const msg = JSON.parse(data.toString());
        const session = sessions.get(sessionId);
        if (msg.type === 'register') {
            const { playerId: pid, name, slot } = msg;
            let newSave = (0, PlayerEngine_1.createDefaultSave)(name);
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'wooden_sword', 1).save;
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'tattered_cloth', 1).save;
            newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'health_potion_1', 3).save;
            await (0, SaveManager_1.registerPlayer)(pid, name);
            await (0, SaveManager_1.saveSave)(pid, slot ?? 1, newSave, 0);
            sessions.set(sessionId, {
                sessionId, socket, playerId: pid, saveSlot: slot ?? 1,
                currentState: newSave, connectedAt: new Date(),
            });
            socket.send(JSON.stringify({ type: 'connected', sessionId, save: newSave }));
            startRegen(sessions.get(sessionId));
            return;
        }
        if (msg.type === 'load') {
            const { playerId: pid, slot } = msg;
            const save = await (0, SaveManager_1.loadSave)(pid, slot ?? 1);
            if (!save) {
                socket.send(JSON.stringify({ type: 'error', text: 'No save found in that slot.' }));
                return;
            }
            sessions.set(sessionId, {
                sessionId, socket, playerId: pid, saveSlot: slot ?? 1,
                currentState: save, connectedAt: new Date(),
            });
            socket.send(JSON.stringify({ type: 'loaded', save }));
            startRegen(sessions.get(sessionId));
            return;
        }
        if (!session) {
            socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
            return;
        }
        if (msg.type === 'command') {
            const result = (0, CommandParser_1.parseCommand)(msg.cmd, session.currentState, session.combatState);
            const newSave = result.newSave ?? session.currentState;
            session.currentState = newSave;
            session.combatState = result.combatState;
            if (result.action === 'save') {
                await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
                socket.send(JSON.stringify({ type: 'output', text: result.text + '\n  (Game saved!)' }));
            }
            else if (result.action === 'quit') {
                await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
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
        if (session.currentState.regenState === 'combat')
            return;
        const result = (0, RegenEngine_1.calcRegenTick)(session.currentState, session.currentState.regenState);
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
console.log(`[Server] Started. Phase 1: Core engine ready.`);
//# sourceMappingURL=index.js.map