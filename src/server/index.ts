import { WebSocketServer, WebSocket } from 'ws';
import type { SaveFile, CombatSession } from '../types';
import { createDefaultSave } from './engine/PlayerEngine';
import { saveSave, loadSave, registerPlayer } from './persistence/SaveManager';
import { parseCommand } from './parser/CommandParser';
import { calcRegenTick, getTickMs } from './engine/RegenEngine';
import { inventoryAdd } from './items/InventoryManager';
import { v4 as uuid } from 'uuid';

const PORT = 8080;

interface Session {
  sessionId: string;
  socket: WebSocket;
  playerId: string;
  saveSlot: number;
  currentState: SaveFile;
  combatState?: CombatSession;
  regenInterval?: NodeJS.Timeout;
  connectedAt: Date;
}

const sessions = new Map<string, Session>();

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });
console.log(`[Server] WebSocket listening on ws://localhost:${PORT}`);

wss.on('connection', (socket, _req) => {
  const sessionId = uuid();

  socket.on('message', async (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    const session = sessions.get(sessionId);

    if (msg.type === 'register') {
      const { playerId: pid, name, slot } = msg;
      let newSave = createDefaultSave(name);
      newSave = inventoryAdd(newSave, 'wooden_sword', 1).save;
      newSave = inventoryAdd(newSave, 'tattered_cloth', 1).save;
      newSave = inventoryAdd(newSave, 'health_potion_1', 3).save;
      await registerPlayer(pid, name);
      await saveSave(pid, slot ?? 1, newSave, 0);
      sessions.set(sessionId, {
        sessionId, socket, playerId: pid, saveSlot: slot ?? 1,
        currentState: newSave, connectedAt: new Date(),
      });
      socket.send(JSON.stringify({ type: 'connected', sessionId, save: newSave }));
      startRegen(sessions.get(sessionId)!);
      return;
    }

    if (msg.type === 'load') {
      const { playerId: pid, slot } = msg;
      const save = await loadSave(pid, slot ?? 1);
      if (!save) {
        socket.send(JSON.stringify({ type: 'error', text: 'No save found in that slot.' }));
        return;
      }
      sessions.set(sessionId, {
        sessionId, socket, playerId: pid, saveSlot: slot ?? 1,
        currentState: save, connectedAt: new Date(),
      });
      socket.send(JSON.stringify({ type: 'loaded', save }));
      startRegen(sessions.get(sessionId)!);
      return;
    }

    if (!session) {
      socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
      return;
    }

    if (msg.type === 'command') {
      const result = parseCommand(msg.cmd, session.currentState, session.combatState);
      const newSave = result.newSave ?? session.currentState;
      session.currentState = newSave;
      session.combatState = result.combatState;

      if (result.action === 'save') {
        await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
        socket.send(JSON.stringify({ type: 'output', text: result.text + '\n  (Game saved!)' }));
      } else if (result.action === 'quit') {
        await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
        socket.send(JSON.stringify({ type: 'quit' }));
        sessions.delete(sessionId);
        socket.close();
      } else {
        socket.send(JSON.stringify({ type: 'output', text: result.text }));
      }
    }
  });

  socket.on('close', async () => {
    const session = sessions.get(sessionId);
    if (session) {
      await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
      stopRegen(session);
      sessions.delete(sessionId);
    }
  });

  socket.on('error', (err) => {
    console.error('[Socket error]', err);
  });
});

// ─── Regen Tick ──────────────────────────────────────────────────────────────

function startRegen(session: Session): void {
  if (session.regenInterval) clearInterval(session.regenInterval);
  session.regenInterval = setInterval(() => {
    if (session.currentState.regenState === 'combat') return;
    const result = calcRegenTick(session.currentState, session.currentState.regenState);
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
  }, getTickMs());
}

function stopRegen(session: Session): void {
  if (session.regenInterval) {
    clearInterval(session.regenInterval);
    session.regenInterval = undefined;
  }
}

console.log(`[Server] Started. Phase 1: Core engine ready.`);
