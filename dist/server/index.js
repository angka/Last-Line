"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = void 0;
const ws_1 = require("ws");
const ContentManager_1 = require("./content/ContentManager");
const HotReloadWatcher_1 = require("./content/HotReloadWatcher");
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
const WorldBossEngine_1 = require("./engine/WorldBossEngine");
const WorldBossCombatEngine_1 = require("./engine/WorldBossCombatEngine");
const PvPManager_1 = require("./social/PvPManager");
const AdminApi_1 = require("./api/AdminApi");
const AdminDbManager_1 = require("./persistence/AdminDbManager");
const EventEngine_1 = require("./content/EventEngine");
const uuid_1 = require("uuid");
const PORT = 8080;
// ─── PvP Sessions (Phase 7) ──────────────────────────────────────────────────
const pvpSessions = new Map(); // playerId → sessionId
// ─── Session Map ──────────────────────────────────────────────────────────────
const sessions = new Map();
exports.sessions = sessions;
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
// Load game content catalogs
(0, ContentManager_1.loadAllCatalogs)();
(0, ContentManager_1.loadGatheringNodes)();
// Load and check game events
(0, EventEngine_1.loadEvents)();
(0, EventEngine_1.checkActiveEvents)();
// Set up periodic event check (every 60 seconds)
setInterval(() => {
    (0, EventEngine_1.checkActiveEvents)();
}, 60000);
// Start content hot-reload watcher (dev mode only)
(0, HotReloadWatcher_1.startWatcher)(process.env.NODE_ENV !== 'production');
wss.on('connection', async (socket, _req) => {
    const sessionId = (0, uuid_1.v4)();
    socket.on('message', async (data) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        }
        catch {
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
            const { loginPlayer } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
            const { registerPlayer } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
                const { logoutPlayer } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
                await logoutPlayer(token).catch(() => { });
            }
            socket.send(JSON.stringify({ type: 'logged_out' }));
            return;
        }
        // ── Steam Auth (Phase 11) ───────────────────────────────────────────────
        if (msg.type === 'steam_auth') {
            const { steamAuth } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
        let validatedPlayerId = null;
        let validatedUsername = null;
        if (msg.token) {
            const { validateToken } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
            const { linkSteamAccount } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
            const { unlinkSteamAccount } = await Promise.resolve().then(() => __importStar(require('./auth/PlayerAuthService')));
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
            const { getStoreSync } = await Promise.resolve().then(() => __importStar(require('./store/CosmeticStore')));
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
            const { purchaseCosmetic } = await Promise.resolve().then(() => __importStar(require('./store/CosmeticStore')));
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
            const { equipCosmetic } = await Promise.resolve().then(() => __importStar(require('./store/CosmeticStore')));
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
            const { claimPlayerReward } = await Promise.resolve().then(() => __importStar(require('./store/CosmeticStore')));
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
                }
                else if (process.platform === 'darwin') {
                    exec(`open "${storeUrl}"`);
                }
                else {
                    exec(`xdg-open "${storeUrl}"`);
                }
            }
            catch { /* ignore */ }
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
            const banned = await (0, AdminDbManager_1.isPlayerBanned)(pid);
            if (banned) {
                socket.send(JSON.stringify({
                    type: 'auth_error',
                    text: '⚠ Your account has been suspended. Contact an administrator.',
                }));
                socket.close();
                return;
            }
            const name = validatedUsername ?? String(msg.name ?? 'Unknown');
            let newSave = (0, PlayerEngine_1.createDefaultSave)(name);
            newSave.playerId = pid;
            newSave.playerName = name;
            // Only add starter items on first connect (new character)
            const slot = Number(msg.slot ?? 1);
            const existingSave = await (0, SaveManager_1.loadSave)(pid, slot);
            if (!existingSave) {
                newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'wooden_sword', 1).save;
                newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'tattered_cloth', 1).save;
                newSave = (0, InventoryManager_1.inventoryAdd)(newSave, 'health_potion_1', 3).save;
            }
            await (0, SaveManager_1.registerPlayer)(pid, name);
            await (0, SaveManager_1.saveSave)(pid, slot, newSave, 0);
            const newSession = {
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
            PresenceManager_1.presenceManager.registerSession(sessionId, pid, newSession);
            // Enter starting area
            PresenceManager_1.presenceManager.enter(pid, newSave.worldState.currentArea, 'Exploring');
            // Notify nearby players
            PresenceManager_1.presenceManager.broadcastToArea(newSave.worldState.currentArea, `[Nearby] ${name} has entered the area.`, pid);
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
            const banned = await (0, AdminDbManager_1.isPlayerBanned)(pid);
            if (banned) {
                socket.send(JSON.stringify({
                    type: 'auth_error',
                    text: '⚠ Your account has been suspended. Contact an administrator.',
                }));
                socket.close();
                return;
            }
            const slot = Number(msg.slot ?? 1);
            const save = await (0, SaveManager_1.loadSave)(pid, slot);
            if (!save) {
                socket.send(JSON.stringify({ type: 'error', text: 'No save found in that slot.' }));
                return;
            }
            const newSession = {
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
            // Sanitize all user input to prevent injection attacks
            const channel = String(msg.channel ?? '').replace(/[^\w]/g, '').substring(0, 20);
            const text = String(msg.text ?? '').replace(/[\x00-\x1F\x7F]/g, '').substring(0, 300);
            const to = String(msg.to ?? '').replace(/[^\w]/g, '').substring(0, 50);
            const playerName = String(session.currentState.stats.name ?? 'Unknown').substring(0, 30);
            if (!text)
                return; // Silently ignore empty messages
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
            // Sanitize command input
            const cmd = String(msg.cmd ?? '').replace(/[\x00-\x1F\x7F]/g, '').substring(0, 500);
            // Check if player is in party combat — delegate if so
            const partyCombat = (0, PartyCombatManager_1.getPartyCombat)(session.currentState.partyId ?? '');
            if (partyCombat) {
                // Handle party combat commands
                if (cmd.startsWith('attack ') || cmd === 'attack') {
                    const targetIdx = parseInt(cmd.split(' ')[1] ?? '1', 10) - 1;
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
                if (cmd.startsWith('flee')) {
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'flee');
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot flee.' }));
                    return;
                }
                if (cmd.startsWith('heal ')) {
                    const targetName = cmd.split(' ').slice(1).join(' ').replace(/[^\w\s]/g, '').substring(0, 50);
                    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'heal', { targetPlayerId: targetSession?.playerId });
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot heal.' }));
                    return;
                }
                if (cmd.startsWith('buff ')) {
                    const targetName = cmd.split(' ').slice(1).join(' ').replace(/[^\w\s]/g, '').substring(0, 50);
                    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
                    const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, 'buff', { targetPlayerId: targetSession?.playerId });
                    socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot buff.' }));
                    return;
                }
                if (cmd.startsWith('skill ') || cmd.startsWith('magic ')) {
                    // skill physical/magic/support <n> [target]
                    const parts = cmd.split(' ');
                    const skillType = parts[1] === 'magic' ? 'magic' : parts[1] === 'support' ? 'support' : 'physical';
                    const skillIdx = parseInt(parts[2] ?? '1', 10) - 1;
                    const targetName = (parts[3] ?? '').replace(/[^\w]/g, '').substring(0, 50);
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
                        const targetIdx = targetName ? parseInt(targetName, 10) - 1 : 0;
                        const result = (0, PartyCombatManager_1.executePartyAction)(session.playerId, skillType, {
                            skillType: skillType,
                            skillIdx,
                            targetIdx,
                        });
                        socket.send(JSON.stringify({ type: 'output', text: result?.text ?? 'Cannot use skill.' }));
                    }
                    return;
                }
                if (cmd === 'log') {
                    const pc = (0, PartyCombatManager_1.getPartyCombat)(session.currentState.partyId ?? '');
                    socket.send(JSON.stringify({ type: 'output', text: formatPartyCombatStateDisplay(pc ?? partyCombat, session.playerId) }));
                    return;
                }
                // Allow non-combat commands through during party combat
                if (!isCombatCommand(cmd)) {
                    const result = await (0, CommandParser_1.parseCommand)(cmd, session.currentState, undefined, session.sessionId, session.playerId);
                    session.currentState = result.newSave ?? session.currentState;
                    if (result.action === 'save')
                        await (0, SaveManager_1.saveSave)(session.playerId, session.saveSlot, session.currentState, 0);
                    socket.send(JSON.stringify({ type: 'output', text: result.text }));
                    return;
                }
                socket.send(JSON.stringify({ type: 'output', text: 'You are in party combat. Use: attack / skill / magic / support / heal / buff / flee / log.' }));
                return;
            }
            // ── Phase 7: PvP Combat ─────────────────────────────────────────────
            const pvpSession = PvPManager_1.pvpManager.getSessionForPlayer(session.playerId);
            if (pvpSession) {
                // PvP attack
                if (cmd === 'attack' || cmd.startsWith('attack ')) {
                    const result = PvPManager_1.pvpManager.pvpAttack(pvpSession.sessionId, session.playerId);
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
                            const rewardSave = loserSave ? (0, PvPManager_1.applyPvPVictoryReward)(winnerSession.currentState, loserSave) : winnerSession.currentState;
                            winnerSession.currentState = rewardSave;
                            const loserMsg = loserId === session.playerId
                                ? `\n  🏆 YOU WON THE PvP!`
                                : `\n  You defeated ${loserSave?.stats.name ?? 'your opponent'}!`;
                            trySend(winnerSession.socket, { type: 'output', text: result.text + loserMsg });
                        }
                        if (loserSession && loserId === session.playerId) {
                            const penaltySave = (0, PvPManager_1.applyPvPDeathPenalty)(loserSession.currentState);
                            loserSession.currentState = penaltySave;
                            trySend(loserSession.socket, { type: 'output', text: result.text + '\n  ☠ You were defeated in PvP! (5% gold lost)' });
                        }
                        PvPManager_1.pvpManager.endSession(pvpSession.sessionId);
                    }
                    return;
                }
                // PvP flee
                if (cmd === 'flee') {
                    const result = PvPManager_1.pvpManager.pvpFlee(pvpSession.sessionId, session.playerId);
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
                    const s = PvPManager_1.pvpManager.getSessionForPlayer(session.playerId);
                    socket.send(JSON.stringify({ type: 'output', text: s ? PvPManager_1.pvpManager.getSessionForPlayer(session.playerId)?.isActive ? PvPManager_1.pvpManager.getSessionForPlayer(session.playerId)?.participants ? PvPManager_1.pvpManager.getSessionForPlayer(session.playerId)?.round?.toString() ?? '' : '' : '' : 'No PvP combat.' }));
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
                const targetEntry = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
                if (targetEntry) {
                    const targetSave = targetEntry.currentState;
                    if (PvPManager_1.pvpManager.canPvP(session.currentState, targetSave)) {
                        // Can't attack party members
                        if (session.currentState.partyId && session.currentState.partyId === targetSave.partyId) {
                            socket.send(JSON.stringify({ type: 'output', text: 'You cannot attack party members.' }));
                            return;
                        }
                        const pvpResult = await PvPManager_1.pvpManager.startPvPCombat(session.playerId, session.currentState, targetEntry.playerId, targetSave, session.currentState.worldState.currentArea);
                        if (pvpResult) {
                            pvpSessions.set(session.playerId, pvpResult.session.sessionId);
                            pvpSessions.set(targetEntry.playerId, pvpResult.session.sessionId);
                            const notifyText = `\n  ⚔ PvP CHALLENGE: ${session.currentState.stats.name} has challenged you to PvP combat!`;
                            trySend(targetEntry.socket, { type: 'output', text: pvpResult.attackerText + notifyText });
                            socket.send(JSON.stringify({ type: 'output', text: pvpResult.attackerText }));
                            PresenceManager_1.presenceManager.broadcastToArea(session.currentState.worldState.currentArea, `⚔ PvP: ${session.currentState.stats.name} vs ${targetSave.stats.name}!`, session.playerId);
                            return;
                        }
                    }
                    else {
                        socket.send(JSON.stringify({ type: 'output', text: `Cannot attack ${targetName}: both players must have PvP enabled and be outside safe zones.` }));
                        return;
                    }
                }
            }
            // ── Phase 8: World Boss Combat ───────────────────────────────────────
            const cmdLower = cmd.trim().toLowerCase();
            if (cmdLower === 'worldboss attack' || cmdLower.startsWith('worldboss attack ')) {
                const attackResult = WorldBossCombatEngine_1.worldBossCombatEngine.playerAttack(session.playerId, session.currentState);
                if (!attackResult) {
                    socket.send(JSON.stringify({ type: 'output', text: 'No active world boss here. Use "worldboss join" to travel to the boss location.' }));
                    return;
                }
                if (attackResult.newSave)
                    session.currentState = attackResult.newSave;
                socket.send(JSON.stringify({ type: 'output', text: attackResult.text }));
                return;
            }
            if (cmdLower === 'worldboss flee' || cmdLower.startsWith('worldboss flee ')) {
                const fleeResult = WorldBossCombatEngine_1.worldBossCombatEngine.playerFlee(session.playerId);
                if (!fleeResult) {
                    socket.send(JSON.stringify({ type: 'output', text: 'You are not in a world boss fight.' }));
                    return;
                }
                socket.send(JSON.stringify({ type: 'output', text: fleeResult.text }));
                return;
            }
            const result = await (0, CommandParser_1.parseCommand)(cmd, session.currentState, session.combatState, session.sessionId, session.playerId);
            const newSave = result.newSave ?? session.currentState;
            session.currentState = newSave;
            // Combat timer management
            const hadCombat = !!session.combatState;
            const nowHasCombat = !!result.combatState;
            if (hadCombat && !nowHasCombat) {
                // Combat ended — clear timer
                clearCombatTimer(session);
                // Phase 11: Check for level-up rewards after combat
                const { checkAndGrantLevelRewards } = await Promise.resolve().then(() => __importStar(require('./persistence/CosmeticDbManager')));
                const levelRewards = await checkAndGrantLevelRewards(session.playerId, newSave.stats.level);
                if (levelRewards.length > 0) {
                    const rewardText = levelRewards.map(r => `  🎁 Reward unlocked: ${r.title}!`).join('\n');
                    socket.send(JSON.stringify({ type: 'output', text: result.text + '\n' + rewardText }));
                    return;
                }
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
console.log(`[Server] Phase 7: Achievements, World Bosses & PvP Combat ready.`);
// ─── Phase 7: World Boss Rotation & Admin API ────────────────────────────────
WorldBossEngine_1.worldBossEngine.startRotationScheduler();
console.log('[Server] World Boss rotation scheduler started.');
// Admin API (optional — starts on port 3001 by default)
try {
    (0, AdminApi_1.startAdminApi)();
}
catch (err) {
    console.warn('[AdminAPI] Failed to start admin API (Express may not be installed):', err instanceof Error ? err.message : err);
}
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