import { WebSocketServer, WebSocket } from 'ws';
import type { SaveFile, CombatSession, GameSession, RegenState, CombatParticipant, PartyCombatSession } from '../types';
import { loadAllCatalogs, loadGatheringNodes } from './content/ContentManager';
import { startWatcher } from './content/HotReloadWatcher';
import { createDefaultSave } from './engine/PlayerEngine';
import { computeAttack } from './engine/PlayerEngine';
import { saveSave, loadSave, registerPlayer } from './persistence/SaveManager';
import { parseCommand } from './parser/CommandParser';
import { calcRegenTick, getTickMs } from './engine/RegenEngine';
import { inventoryAdd } from './items/InventoryManager';
import { presenceManager } from './social/PresenceManager';
import { partyManager } from './social/PartyManager';
import { startSoloTurnTimer, handleSoloTimeout, createPartyCombatSession, checkPartyVictory, handlePartyTimeout } from './engine/CombatTimerEngine';
import { startPartyTurnTimer as startPartyTimer2 } from './engine/CombatTimerEngine';
import { getPartyCombat, isInPartyCombat, executePartyAction, startPartyCombat, getPartyCombatForArea, broadcastTurnStart, activePartyCombats } from './engine/PartyCombatManager';
import { checkVictory, advanceTurn, formatCombatState, formatCombatPrompt, resolveVictory, resolveDefeat, createCombatSession } from './engine/CombatEngine';
import { worldBossEngine } from './engine/WorldBossEngine';
import { worldBossCombatEngine } from './engine/WorldBossCombatEngine';
import { pvpManager, applyPvPDeathPenalty, applyPvPVictoryReward } from './social/PvPManager';
import { startAdminApi } from './api/AdminApi';
import { isPlayerBanned } from './persistence/AdminDbManager';
import { loadEvents, checkActiveEvents } from './content/EventEngine';
import { v4 as uuid } from 'uuid';

const PORT = 8080;

// ─── PvP Sessions (Phase 7) ──────────────────────────────────────────────────

const pvpSessions = new Map<string, string>(); // playerId → sessionId

// ─── Session Map ──────────────────────────────────────────────────────────────

const sessions = new Map<string, GameSession>();

function trySend(socket: WebSocket, data: object): void {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(data));
  } catch { /* closed */ }
}

function broadcastPush(session: GameSession, channel: string, text: string): void {
  trySend(session.socket, { type: 'push', channel, text });
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });
console.log(`[Server] WebSocket listening on ws://localhost:${PORT}`);

// Load game content catalogs
loadAllCatalogs();
loadGatheringNodes();

// Load and check game events
loadEvents();
checkActiveEvents();

// Set up periodic event check (every 60 seconds)
setInterval(() => {
  checkActiveEvents();
}, 60000);

// Start content hot-reload watcher (dev mode only)
startWatcher(process.env.NODE_ENV !== 'production');

wss.on('connection', async (socket, _req) => {
  const sessionId = uuid();

  socket.on('message', async (data: Buffer) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      socket.send(JSON.stringify({ type: 'error', text: 'Invalid message format.' }));
      return;
    }

    // Basic message type validation - reject messages without a type
    if (typeof msg.type !== 'string') {
      socket.send(JSON.stringify({ type: 'error', text: 'Missing message type.' }));
      return;
    }

    const session = sessions.get(sessionId);

    // ── Player Auth: Login ──────────────────────────────────────────────────
    if (msg.type === 'auth_login') {
      const username = String(msg.username ?? '');
      const password = String(msg.password ?? '');
      const { loginPlayer } = await import('./auth/PlayerAuthService');
      const result = await loginPlayer(username, password);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'auth_error', text: result.error ?? 'Login failed.' }));
        return;
      }
      socket.send(JSON.stringify({
        type: 'auth_success',
        playerId: result.playerId,
        username: result.username,
        token: result.token,
      }));
      return;
    }

    // ── Player Auth: Register ───────────────────────────────────────────────
    if (msg.type === 'auth_register') {
      const username = String(msg.username ?? '');
      const email = String(msg.email ?? '');
      const password = String(msg.password ?? '');
      const { registerPlayer } = await import('./auth/PlayerAuthService');
      const result = await registerPlayer(username, email, password);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'auth_error', text: result.error ?? 'Registration failed.' }));
        return;
      }
      socket.send(JSON.stringify({
        type: 'auth_success',
        playerId: result.playerId,
        username: username,
        token: result.token,
      }));
      return;
    }

    // ── Player Auth: Logout ─────────────────────────────────────────────────
    if (msg.type === 'logout') {
      const token = String(msg.token ?? '');
      if (token) {
        const { logoutPlayer } = await import('./auth/PlayerAuthService');
        await logoutPlayer(token).catch(() => {});
      }
      socket.send(JSON.stringify({ type: 'logged_out' }));
      return;
    }

    // ── Steam Auth (Phase 11) ───────────────────────────────────────────────
    if (msg.type === 'steam_auth') {
      const { steamAuth } = await import('./auth/PlayerAuthService');
      const result = await steamAuth(String(msg.ticket ?? ''));
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'steam_error', text: result.error ?? 'Steam auth failed.' }));
        return;
      }
      if (result.needsLinking) {
        socket.send(JSON.stringify({ type: 'steam_link_prompt', steamId: result.steamId }));
        return;
      }
      socket.send(JSON.stringify({
        type: 'steam_success',
        playerId: result.playerId,
        steamId: result.steamId,
        token: result.token,
      }));
      return;
    }

    // ── Token Validation for connect/load_save ────────────────────────────
    let validatedPlayerId: string | null = null;
    let validatedUsername: string | null = null;
    if (msg.token) {
      const { validateToken } = await import('./auth/PlayerAuthService');
      const auth = await validateToken(String(msg.token));
      if (auth) {
        validatedPlayerId = auth.playerId;
        validatedUsername = auth.username;
      }
    }

    // ── Steam Link (Phase 11 - after token validation) ────────────────────
    if (msg.type === 'steam_link') {
      if (!validatedPlayerId) {
        socket.send(JSON.stringify({ type: 'error', text: 'Please login first.' }));
        return;
      }
      const { linkSteamAccount } = await import('./auth/PlayerAuthService');
      const result = await linkSteamAccount(validatedPlayerId, String(msg.ticket ?? ''));
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'error', text: result.error ?? 'Link failed.' }));
        return;
      }
      socket.send(JSON.stringify({ type: 'steam_linked', steamId: result.steamId }));
      return;
    }

    // ── Steam Unlink ────────────────────────────────────────────────────────
    if (msg.type === 'steam_unlink') {
      if (!validatedPlayerId) {
        socket.send(JSON.stringify({ type: 'error', text: 'Please login first.' }));
        return;
      }
      const { unlinkSteamAccount } = await import('./auth/PlayerAuthService');
      const result = await unlinkSteamAccount(validatedPlayerId);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'error', text: result.error ?? 'Unlink failed.' }));
        return;
      }
      socket.send(JSON.stringify({ type: 'steam_unlinked' }));
      return;
    }

    // ── Store Sync ──────────────────────────────────────────────────────────
    if (msg.type === 'store_sync') {
      if (!session) {
        socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
        return;
      }
      const { getStoreSync } = await import('./store/CosmeticStore');
      const storeData = await getStoreSync(session.playerId);
      socket.send(JSON.stringify({ type: 'store_data', ...storeData }));
      return;
    }

    // ── Purchase Cosmetic ───────────────────────────────────────────────────
    if (msg.type === 'purchase_cosmetic') {
      if (!session) {
        socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
        return;
      }
      const cosmeticId = String(msg.cosmeticId ?? '');
      const { purchaseCosmetic } = await import('./store/CosmeticStore');
      const result = await purchaseCosmetic(session.playerId, cosmeticId);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'purchase_error', text: result.error }));
        return;
      }
      socket.send(JSON.stringify({ type: 'purchase_success', cosmeticId }));
      return;
    }

    // ── Equip Cosmetic ──────────────────────────────────────────────────────
    if (msg.type === 'equip_cosmetic') {
      if (!session) {
        socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
        return;
      }
      const cosmeticId = String(msg.cosmeticId ?? '');
      const { equipCosmetic } = await import('./store/CosmeticStore');
      const result = await equipCosmetic(session.playerId, cosmeticId);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'error', text: result.error }));
        return;
      }
      socket.send(JSON.stringify({ type: 'cosmetic_equipped', cosmeticId }));
      return;
    }

    // ── Claim Reward ────────────────────────────────────────────────────────
    if (msg.type === 'claim_reward') {
      if (!session) {
        socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
        return;
      }
      const rewardId = String(msg.rewardId ?? '');
      const { claimPlayerReward } = await import('./store/CosmeticStore');
      const result = await claimPlayerReward(session.playerId, rewardId);
      if (!result.success) {
        socket.send(JSON.stringify({ type: 'error', text: result.error }));
        return;
      }
      socket.send(JSON.stringify({ type: 'reward_claimed', rewardId, cosmeticId: result.cosmeticId }));
      return;
    }

    // ── Shop (open browser) ─────────────────────────────────────────────────
    if (msg.type === 'shop') {
      if (!session) {
        socket.send(JSON.stringify({ type: 'error', text: 'No active session.' }));
        return;
      }
      const storeUrl = `file://${__dirname}/../../store/index.html`;
      socket.send(JSON.stringify({ type: 'store_url', url: storeUrl }));
      try {
        const { exec } = require('child_process');
        if (process.platform === 'win32') {
          exec(`start "" "${storeUrl}"`);
        } else if (process.platform === 'darwin') {
          exec(`open "${storeUrl}"`);
        } else {
          exec(`xdg-open "${storeUrl}"`);
        }
      } catch { /* ignore */ }
      return;
    }

    // ── Registration (after auth) ─────────────────────────────────────────
    if (msg.type === 'register') {
      const pid = validatedPlayerId ?? String(msg.playerId ?? '');
      if (!pid) {
        socket.send(JSON.stringify({ type: 'auth_required', text: 'Please login or register first.' }));
        return;
      }

      // Phase 10: Check if player is banned
      const banned = await isPlayerBanned(pid);
      if (banned) {
        socket.send(JSON.stringify({
          type: 'auth_error',
          text: '⚠ Your account has been suspended. Contact an administrator.',
        }));
        socket.close();
        return;
      }

      const name = validatedUsername ?? String(msg.name ?? 'Unknown');
      let newSave = createDefaultSave(name);
      newSave.playerId = pid;
      newSave.playerName = name;

      // Only add starter items on first connect (new character)
      const slot = Number(msg.slot ?? 1);
      const existingSave = await loadSave(pid, slot);
      if (!existingSave) {
        newSave = inventoryAdd(newSave, 'wooden_sword', 1).save;
        newSave = inventoryAdd(newSave, 'tattered_cloth', 1).save;
        newSave = inventoryAdd(newSave, 'health_potion_1', 3).save;
      }

      await registerPlayer(pid, name);
      await saveSave(pid, slot, newSave, 0);

      const newSession: GameSession = {
        sessionId,
        socket,
        playerId: pid,
        saveSlot: slot,
        currentState: newSave,
        connectedAt: new Date(),
        lastActivity: new Date(),
        regenState: newSave.regenState,
      };

      sessions.set(sessionId, newSession);
      presenceManager.registerSession(sessionId, pid, newSession);

      // Enter starting area
      presenceManager.enter(pid, newSave.worldState.currentArea, 'Exploring');

      // Notify nearby players
      presenceManager.broadcastToArea(
        newSave.worldState.currentArea,
        `[Nearby] ${name} has entered the area.`,
        pid,
      );

      socket.send(JSON.stringify({ type: 'connected', sessionId, save: newSave }));

      // Send story intro for new characters (level 1)
      if (newSave.stats.level === 1) {
        const storyIntro = `
═══════════════════════════════════════════════════════════════
                  THE WORLD IS DYING

  Reality frays at the edges. The Void bleeds through cracks in
  the fabric of existence. In villages like Ashford, people
  speak of shadows that move wrong, of dreams that bleed into
  waking hours.

  You have arrived at the edge of the known world. Beyond these
  cobblestones, darkness waits — ancient, hungry, patient.

  But also: treasure, glory, and answers to questions you
  haven't learned to ask yet.

═══════════════════════════════════════════════════════════════
`;
        socket.send(JSON.stringify({ type: 'push', text: storyIntro }));

        // Send first-steps commands card
        const commandsCard = `
═══════════════════════════════════════════════════════════════
                    FIRST STEPS
═══════════════════════════════════════════════════════════════

  NAVIGATION
    look (l)     — see area description
    go north     — move north (or: n/s/e/w)
    map          — view world map
    travel       — fast travel to unlocked cities

  COMBAT (when you encounter enemies)
    attack (a)   — attack enemy
    skill phys 1 — use physical skill
    flee         — try to escape

  SURVIVAL
    stats        — view your stats
    inv          — check inventory
    use <n>      — use item from inventory
    shop         — buy gear in cities
    inn          — rest and save game

  SOCIAL
    who          — see nearby players
    say <text>   — chat with area
    msg <name>   — whisper a player

  QUICK HELP
    help         — show all commands
    ?            — show this tips card

═══════════════════════════════════════════════════════════════

  Type 'look' to see Ashford Village Square.
═══════════════════════════════════════════════════════════════
`;
        setTimeout(() => {
          socket.send(JSON.stringify({ type: 'push', text: commandsCard }));
        }, 100);
      }

      startRegen(newSession);
      return;
    }

    // ── Load ─────────────────────────────────────────────────────────────
    if (msg.type === 'load') {
      const pid = validatedPlayerId ?? String(msg.playerId ?? '');
      if (!pid) {
        socket.send(JSON.stringify({ type: 'auth_required', text: 'Please login or register first.' }));
        return;
      }

      // Phase 10: Check if player is banned
      const banned = await isPlayerBanned(pid);
      if (banned) {
        socket.send(JSON.stringify({
          type: 'auth_error',
          text: '⚠ Your account has been suspended. Contact an administrator.',
        }));
        socket.close();
        return;
      }

      const slot = Number(msg.slot ?? 1);
      const save = await loadSave(pid, slot);
      if (!save) {
        socket.send(JSON.stringify({ type: 'error', text: 'No save found in that slot.' }));
        return;
      }

      const newSession: GameSession = {
        sessionId,
        socket,
        playerId: pid,
        saveSlot: slot,
        currentState: save,
        connectedAt: new Date(),
        lastActivity: new Date(),
        regenState: save.regenState,
      };

      sessions.set(sessionId, newSession);
      presenceManager.registerSession(sessionId, pid, newSession);
      presenceManager.enter(pid, save.worldState.currentArea, 'Exploring');

      presenceManager.broadcastToArea(
        save.worldState.currentArea,
        `[Nearby] ${save.stats.name} has entered the area.`,
        pid,
      );

      socket.send(JSON.stringify({ type: 'loaded', save }));
      startRegen(newSession);
      return;
    }

    // ── Chat-only message (can be sent without full session) ─────────────
    if (msg.type === 'chat') {
      if (!session) return;
      // Sanitize all user input to prevent injection attacks
      const channel = String(msg.channel ?? '').replace(/[^\w]/g, '').substring(0, 20);
      const text = String(msg.text ?? '').replace(/[\x00-\x1F\x7F]/g, '').substring(0, 300);
      const to = String(msg.to ?? '').replace(/[^\w]/g, '').substring(0, 50);
      const playerName = String(session.currentState.stats.name ?? 'Unknown').substring(0, 30);

      if (!text) return; // Silently ignore empty messages

      switch (channel) {
        case 'area': {
          presenceManager.broadcastToArea(session.currentState.worldState.currentArea,
            `[Area] ${playerName}: ${text}`, session.playerId);
          break;
        }
        case 'party': {
          const { partyManager } = require('./social/PartyManager');
          partyManager.syncMember(session.playerId);
          partyManager.notifyAllMembers(
            session.currentState.partyId ?? '',
            `[Party] ${playerName}: ${text}`,
            session.playerId,
          );
          break;
        }
        case 'whisper': {
          if (!to) break;
          const target = presenceManager.getSessionByPlayerName(to);
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
      // Sanitize command input
      const cmd = String(msg.cmd ?? '').replace(/[\x00-\x1F\x7F]/g, '').substring(0, 500);

      // Check if player is in party combat — delegate if so
      const partyCombat = getPartyCombat(session.currentState.partyId ?? '');
      if (partyCombat) {
        // Handle party combat commands
        if (cmd.startsWith('attack ') || cmd === 'attack') {
          const targetIdx = parseInt(cmd.split(' ')[1] ?? '1', 10) - 1;
          const result = executePartyAction(session.playerId, 'attack', { targetIdx });
          if (!result) {
            socket.send(JSON.stringify({ type: 'output', text: 'Party combat error.' }));
            return;
          }
          const you = result.session.participants.find(p => p.playerId === session.playerId);
          const state = formatPartyCombatStateDisplay(result.session, session.playerId);
          socket.send(JSON.stringify({ type: 'output', text: result.text }));
          return;
        }
        if (cmd.startsWith('flee')) {
          const result = executePartyAction(session.playerId, 'flee');
          socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot flee.' }));
          return;
        }
        if (cmd.startsWith('heal ')) {
          const targetName = cmd.split(' ').slice(1).join(' ').replace(/[^\w\s]/g, '').substring(0, 50);
          const targetSession = presenceManager.getSessionByPlayerName(targetName);
          const result = executePartyAction(session.playerId, 'heal', { targetPlayerId: targetSession?.playerId });
          socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot heal.' }));
          return;
        }
        if (cmd.startsWith('buff ')) {
          const targetName = cmd.split(' ').slice(1).join(' ').replace(/[^\w\s]/g, '').substring(0, 50);
          const targetSession = presenceManager.getSessionByPlayerName(targetName);
          const result = executePartyAction(session.playerId, 'buff', { targetPlayerId: targetSession?.playerId });
          socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot buff.' }));
          return;
        }
        if (cmd.startsWith('skill ') || cmd.startsWith('magic ')) {
          // skill physical/magic/support <n> [target]
          const parts = cmd.split(' ');
          const skillType = parts[1] === 'magic' ? 'magic' : parts[1] === 'support' ? 'support' : 'physical';
          const skillIdx = parseInt(parts[2] ?? '1', 10) - 1;
          const targetName = (parts[3] ?? '').replace(/[^\w]/g, '').substring(0, 50);
          const targetSession = targetName ? presenceManager.getSessionByPlayerName(targetName) : null;
          if (skillType === 'support' && targetSession) {
            const result = executePartyAction(session.playerId, 'support', {
              skillType: 'support' as any,
              skillIdx,
              targetPlayerId: targetSession.playerId,
            });
            socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot use support skill.' }));
          } else {
            const targetIdx = targetName ? parseInt(targetName, 10) - 1 : 0;
            const result = executePartyAction(session.playerId, skillType as any, {
              skillType: skillType as any,
              skillIdx,
              targetIdx,
            });
            socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot use skill.' }));
          }
          return;
        }
        if (cmd === 'log') {
          const pc = getPartyCombat(session.currentState.partyId ?? '');
          socket.send(JSON.stringify({ type: 'output', text: formatPartyCombatStateDisplay(pc ?? partyCombat, session.playerId) }));
          return;
        }
        // Allow non-combat commands through during party combat
        if (!isCombatCommand(cmd)) {
          const result = await parseCommand(cmd, session.currentState, undefined, session.sessionId, session.playerId);
          session.currentState = result.newSave ?? session.currentState;
          if (result.action === 'save') await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
          socket.send(JSON.stringify({ type: 'output', text: result.text }));
          return;
        }
        socket.send(JSON.stringify({ type: 'output', text: 'You are in party combat. Use: attack / skill / magic / support / heal / buff / flee / log.' }));
        return;
      }

      // ── Phase 7: PvP Combat ─────────────────────────────────────────────
      const pvpSession = pvpManager.getSessionForPlayer(session.playerId);
      if (pvpSession) {
        // PvP attack
        if (cmd === 'attack' || cmd.startsWith('attack ')) {
          const result = pvpManager.pvpAttack(pvpSession.sessionId, session.playerId);
          if (!result) {
            socket.send(JSON.stringify({ type: 'output', text: 'PvP error.' }));
            return;
          }
          socket.send(JSON.stringify({ type: 'output', text: result.text }));

          // Resolve PvP victory/defeat
          if (!result.session.isActive && result.session.winner) {
            const winnerId = result.session.winner === 'attacker' ? result.session.attackerId : result.session.defenderId;
            const loserId = winnerId === result.session.attackerId ? result.session.defenderId : result.session.attackerId;

            const winnerSession = sessions.get([...sessions.entries()].find(([, s]) => s.playerId === winnerId)?.[0] ?? '');
            const loserSession = sessions.get([...sessions.entries()].find(([, s]) => s.playerId === loserId)?.[0] ?? '');

            if (winnerSession) {
              const loserSave = loserSession?.currentState;
              const rewardSave = loserSave ? applyPvPVictoryReward(winnerSession.currentState, loserSave) : winnerSession.currentState;
              winnerSession.currentState = rewardSave;
              const loserMsg = loserId === session.playerId
                ? `\n  🏆 YOU WON THE PvP!`
                : `\n  You defeated ${loserSave?.stats.name ?? 'your opponent'}!`;
              trySend(winnerSession.socket, { type: 'output', text: result.text + loserMsg });
            }
            if (loserSession && loserId === session.playerId) {
              const penaltySave = applyPvPDeathPenalty(loserSession.currentState);
              loserSession.currentState = penaltySave;
              trySend(loserSession.socket, { type: 'output', text: result.text + '\n  ☠ You were defeated in PvP! (5% gold lost)' });
            }

            pvpManager.endSession(pvpSession.sessionId);
          }
          return;
        }

        // PvP flee
        if (cmd === 'flee') {
          const result = pvpManager.pvpFlee(pvpSession.sessionId, session.playerId);
          if (!result) {
            socket.send(JSON.stringify({ type: 'output', text: 'Cannot flee.' }));
            return;
          }
          pvpSessions.delete(session.playerId);
          if (result.session.defenderId !== session.playerId) {
            const otherId = result.session.defenderId;
            const otherEntry = [...sessions.entries()].find(([, s]) => s.playerId === otherId);
            if (otherEntry) {
              pvpSessions.delete(otherId);
              trySend(otherEntry[1].socket, { type: 'output', text: `\n  🏃 Your opponent fled! You win by default.` });
            }
          }
          socket.send(JSON.stringify({ type: 'output', text: result.fled ? 'You fled from PvP!' : result.text }));
          return;
        }

        // PvP log
        if (cmd === 'log') {
          const s = pvpManager.getSessionForPlayer(session.playerId);
          socket.send(JSON.stringify({ type: 'output', text: s ? pvpManager.getSessionForPlayer(session.playerId)?.isActive ? pvpManager.getSessionForPlayer(session.playerId)?.participants ? pvpManager.getSessionForPlayer(session.playerId)?.round?.toString() ?? '' : '' : '' : 'No PvP combat.' }));
          return;
        }

        // Allow other commands during PvP (not in direct combat)
        socket.send(JSON.stringify({ type: 'output', text: 'PvP combat in progress. Use: attack / flee / log.' }));
        return;
      }

      // ── Check PvP initiation: attack <playername> ───────────────────────
      const attackParts = cmd.trim().split(/\s+/);
      if ((attackParts[0] === 'attack' || attackParts[0] === 'a') && attackParts.length >= 2) {
        const targetName = attackParts.slice(1).join(' ');
        const targetEntry = presenceManager.getSessionByPlayerName(targetName);
        if (targetEntry) {
          const targetSave = targetEntry.currentState;
          if (pvpManager.canPvP(session.currentState, targetSave)) {
            // Can't attack party members
            if (session.currentState.partyId && session.currentState.partyId === targetSave.partyId) {
              socket.send(JSON.stringify({ type: 'output', text: 'You cannot attack party members.' }));
              return;
            }
            const pvpResult = await pvpManager.startPvPCombat(
              session.playerId, session.currentState,
              targetEntry.playerId, targetSave,
              session.currentState.worldState.currentArea,
            );
            if (pvpResult) {
              pvpSessions.set(session.playerId, pvpResult.session.sessionId);
              pvpSessions.set(targetEntry.playerId, pvpResult.session.sessionId);
              const notifyText = `\n  ⚔ PvP CHALLENGE: ${session.currentState.stats.name} has challenged you to PvP combat!`;
              trySend(targetEntry.socket, { type: 'output', text: pvpResult.attackerText + notifyText });
              socket.send(JSON.stringify({ type: 'output', text: pvpResult.attackerText }));
              presenceManager.broadcastToArea(
                session.currentState.worldState.currentArea,
                `⚔ PvP: ${session.currentState.stats.name} vs ${targetSave.stats.name}!`,
                session.playerId,
              );
              return;
            }
          } else {
            socket.send(JSON.stringify({ type: 'output', text: `Cannot attack ${targetName}: both players must have PvP enabled and be outside safe zones.` }));
            return;
          }
        }
      }

      // ── Phase 8: World Boss Combat ───────────────────────────────────────
      const cmdLower = cmd.trim().toLowerCase();
      if (cmdLower === 'worldboss attack' || cmdLower.startsWith('worldboss attack ')) {
        const attackResult = worldBossCombatEngine.playerAttack(session.playerId, session.currentState);
        if (!attackResult) {
          socket.send(JSON.stringify({ type: 'output', text: 'No active world boss here. Use "worldboss join" to travel to the boss location.' }));
          return;
        }
        if (attackResult.newSave) session.currentState = attackResult.newSave;
        socket.send(JSON.stringify({ type: 'output', text: attackResult.text }));
        return;
      }
      if (cmdLower === 'worldboss flee' || cmdLower.startsWith('worldboss flee ')) {
        const fleeResult = worldBossCombatEngine.playerFlee(session.playerId);
        if (!fleeResult) {
          socket.send(JSON.stringify({ type: 'output', text: 'You are not in a world boss fight.' }));
          return;
        }
        socket.send(JSON.stringify({ type: 'output', text: fleeResult.text }));
        return;
      }

      const result = await parseCommand(cmd, session.currentState, session.combatState, session.sessionId, session.playerId);

      const newSave = result.newSave ?? session.currentState;
      session.currentState = newSave;

      // Combat timer management
      const hadCombat = !!session.combatState;
      const nowHasCombat = !!result.combatState;

      if (hadCombat && !nowHasCombat) {
        // Combat ended — clear timer
        clearCombatTimer(session);

        // Phase 11: Check for level-up rewards after combat
        const { checkAndGrantLevelRewards } = await import('./persistence/CosmeticDbManager');
        const levelRewards = await checkAndGrantLevelRewards(session.playerId, newSave.stats.level);
        if (levelRewards.length > 0) {
          const rewardText = levelRewards.map(r => `  🎁 Reward unlocked: ${r.title}!`).join('\n');
          socket.send(JSON.stringify({ type: 'output', text: result.text + '\n' + rewardText }));
          return;
        }
      } else if (!hadCombat && nowHasCombat) {
        // Combat started — wire 15s timer
        startCombatTimer(session, result.combatState);
      } else if (nowHasCombat) {
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
          presenceManager.broadcastToArea(areaId, push.text, excludeId);
        }
      }

      // Handle party encounter auto-trigger
      if (result.action === 'party_encounter' && result.partyEncounter) {
        const { partyId, areaId, enemies } = result.partyEncounter;
        const pcSession = startPartyCombat(partyId, areaId, enemies as any);
        if (pcSession) {
          socket.send(JSON.stringify({ type: 'output', text: result.text }));
        } else {
          // Fallback to solo combat
          const soloSession = createCombatSession(session.currentState, enemies as any, areaId);
          startCombatTimer(session, soloSession);
          session.combatState = soloSession;
          socket.send(JSON.stringify({ type: 'output', text: result.text }));
        }
        return;
      }

      if (result.action === 'save') {
        await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
        socket.send(JSON.stringify({ type: 'output', text: result.text + '\n  (Game saved!)' }));
      } else if (result.action === 'quit') {
        await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
        presenceManager.broadcastToArea(
          session.currentState.worldState.currentArea,
          `[Nearby] ${session.currentState.stats.name} has left.`,
          session.playerId,
        );
        socket.send(JSON.stringify({ type: 'quit' }));
        sessions.delete(sessionId);
        socket.close();
      } else {
        // Phase 8: send achievement unlock notifications alongside output
        const outputText = result.achievementUnlocks?.length
          ? result.text + '\n' + (result.achievementUnlocks.join('\n'))
          : result.text;
        socket.send(JSON.stringify({ type: 'output', text: outputText }));
      }
    }
  });

  socket.on('close', async () => {
    const session = sessions.get(sessionId);
    if (session) {
      await saveSave(session.playerId, session.saveSlot, session.currentState, 0);
      stopRegen(session);

      presenceManager.broadcastToArea(
        session.currentState.worldState.currentArea,
        `[Nearby] ${session.currentState.stats.name} has left.`,
        session.playerId,
      );

      presenceManager.unregisterSession(sessionId, session.playerId);
      sessions.delete(sessionId);
    }
  });

  socket.on('error', (err) => {
    console.error('[Socket error]', err);
  });
});

// ─── Regen Tick ──────────────────────────────────────────────────────────────

function startRegen(session: GameSession): void {
  if (session.regenInterval) clearInterval(session.regenInterval);
  session.regenInterval = setInterval(() => {
    if (session.regenState === 'combat') return;
    const result = calcRegenTick(session.currentState, session.regenState);
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

function stopRegen(session: GameSession): void {
  if (session.regenInterval) {
    clearInterval(session.regenInterval);
    session.regenInterval = undefined;
  }
}

// ─── Combat Timer ────────────────────────────────────────────────────────────────

function startCombatTimer(session: GameSession, combatState: CombatSession): void {
  if (session.combatTimerHandle) clearCombatTimer(session);

  session.combatTimerHandle = startSoloTurnTimer(combatState, (updatedSession, timedOutId) => {
    const hadVictory = !!updatedSession.winner;

    if (updatedSession.winner === 'player') {
      session.combatState = updatedSession;
      session.currentState = resolveVictory(session.currentState, updatedSession);
      session.combatState = undefined;
    } else if (updatedSession.winner === 'enemy') {
      session.combatState = updatedSession;
      session.currentState = resolveDefeat(session.currentState);
      session.combatState = undefined;
    } else {
      // Timeout: forfeit turn, advance
      const withLog = handleSoloTimeout(updatedSession, timedOutId);
      session.combatState = advanceTurn(withLog);
    }

    if (!hadVictory && !session.combatState) {
      clearCombatTimer(session);
    }
  });
}

function clearCombatTimer(session: GameSession): void {
  session.combatTimerHandle?.clear();
  session.combatTimerHandle = undefined;
}

// ─── Solo combat commands ────────────────────────────────────────────────────

function isCombatCommand(cmd: string): boolean {
  const verb = cmd.trim().split(/\s+/)[0]?.toLowerCase();
  return ['attack', 'a', 'flee', 'f', 'item', 'i', 'skill', 'magic', 'log'].includes(verb);
}

// ─── Party combat display ────────────────────────────────────────────────────

function formatPartyCombatStateDisplay(session: any, playerId: string): string {
  if (!session) return 'No party combat active.';

  const lines: string[] = [];
  lines.push(`\n  ╔══════════════════════════════════════════════════════════════╗`);
  lines.push(`  ║  PARTY COMBAT — Round ${session.round}                              ║`);
  lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);

  const players = (session.participants ?? []).filter((p: any) => p.type === 'player' && p.isPlayer);
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

  const enemies = (session.participants ?? []).filter((p: any) => p.type === 'enemy' && p.hp > 0);
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
  const you = players.find((p: any) => p.playerId === playerId);
  lines.push(`\n  [${isYourTurn ? '**YOUR TURN** 15s!' : `Waiting for ${current?.name}...`}]`);
  if (you) {
    lines.push(`  HP: ${you.hp}/${you.maxHp}  |  MP: ${you.mana}/${you.maxMana}`);
  }
  if (isYourTurn) {
    lines.push(`  Choose: attack <n> / skill <type> <n> / heal <name> / buff <name> / flee / log`);
  }

  return lines.join('\n');
}

console.log(`[Server] Phase 7: Achievements, World Bosses & PvP Combat ready.`);

// ─── Phase 7: World Boss Rotation & Admin API ────────────────────────────────

worldBossEngine.startRotationScheduler();
console.log('[Server] World Boss rotation scheduler started.');

// Admin API (optional — starts on port 3001 by default)
try {
  startAdminApi();
} catch (err) {
  console.warn('[AdminAPI] Failed to start admin API (Express may not be installed):', err instanceof Error ? err.message : err);
}

// ─── Export sessions for Admin API ────────────────────────────────────────────
export { sessions };

// ─── Party combat timer callback ───────────────────────────────────────────────

function onPartyTimeout(
  updatedSession: PartyCombatSession,
  timedOutPlayerId: string,
  timedOutCount: number,
): void {
  const handle = activePartyCombats.get(updatedSession.partyId);
  if (!handle) return;

  const result = handlePartyTimeout(updatedSession, timedOutPlayerId, timedOutCount);
  const finalSession = checkPartyVictory(result);
  handle.session = finalSession;

  const name = result.participants.find(p => p.playerId === timedOutPlayerId)?.name ?? 'Player';
  if (timedOutCount >= 3) {
    partyManager.notifyMember(timedOutPlayerId, `☠ You have been knocked unconscious! Wait for revival or battle to end.`);
    partyManager.setDowned(timedOutPlayerId, true);
  } else {
    partyManager.notifyMember(timedOutPlayerId, `⏰ Turn timed out (${timedOutCount}/3). Skipping...`);
    partyManager.incrementTimedOut(timedOutPlayerId);
  }

  if (!finalSession.winner) {
    handle.timerHandle.clear();
    handle.timerHandle = startPartyTimer2(finalSession, onPartyTimeout);
  }
}

// ─── Party encounter helpers ────────────────────────────────────────────────────

function startPartyCombatWithEnemies(
  partyId: string,
  areaId: string,
  enemies: CombatParticipant[],
): PartyCombatSession | null {
  const party = partyManager.getParty(partyId);
  if (!party) return null;

  const partyMemberData = party.members
    .filter(m => m.hp > 0)
    .map(m => {
      const session = presenceManager.getSession(m.playerId);
      const save = session?.currentState;
      return {
        playerId: m.playerId,
        name: m.playerName,
        hp: m.hp,
        maxHp: m.maxHp,
        mana: m.mana,
        maxMana: m.maxMana,
        attack: save ? computeAttack(save.stats) : 10,
        strength: save?.stats.strength ?? 10,
        agility: save?.stats.agility ?? 10,
        critRate: save?.stats.critRate ?? 0.05,
        critDamage: save?.stats.critDamage ?? 1.5,
      };
    });

  if (partyMemberData.length === 0) return null;

  const session = createPartyCombatSession(partyId, partyMemberData, enemies, areaId);
  partyManager.notifyAllMembers(partyId, `⚔ PARTY COMBAT started! ${enemies.length} enemies appear!`);

  const handle = startPartyTimer2(session, onPartyTimeout);
  activePartyCombats.set(partyId, { session, timerHandle: handle });

  for (const m of party.members) {
    partyManager.updateActivity(m.playerId, 'In Combat');
  }

  return session;
}
