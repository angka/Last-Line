"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const PresenceManager_1 = require("./PresenceManager");
const MAX_HISTORY = 50;
const SHOUT_COOLDOWN_MS = 60_000;
class ChatRouter {
    shoutCooldowns = new Map(); // playerId → lastShoutAt
    /** Route a chat message to the correct recipients */
    route(msg) {
        switch (msg.channel) {
            case 'area': return this.routeArea(msg);
            case 'party': return this.routePartyChatMsg(msg);
            case 'whisper': return this.routeWhisper(msg);
            case 'shout': return this.routeShout(msg);
            case 'system': return; // already sent directly
        }
    }
    // ─── Area chat ────────────────────────────────────────────────────────────
    routeArea(msg) {
        const area = PresenceManager_1.presenceManager.getAreaOf(PresenceManager_1.presenceManager.getPlayer(msg.from)?.playerId ?? '');
        if (!area)
            return;
        // Build a full presence entry for the sender
        const senderEntry = PresenceManager_1.presenceManager.getPlayer(msg.from);
        if (!senderEntry)
            return;
        const players = PresenceManager_1.presenceManager.getPlayersInArea(senderEntry.areaId);
        const formatted = `[Area] ${senderEntry.playerName}: ${msg.text}`;
        for (const p of players) {
            const session = PresenceManager_1.presenceManager.getSession(p.playerId);
            if (session)
                trySend(session.socket, { type: 'push', channel: 'area', text: formatted });
        }
    }
    // ─── Party chat ───────────────────────────────────────────────────────────
    routePartyChatMsg(msg) {
        const senderEntry = PresenceManager_1.presenceManager.getPlayer(msg.from);
        if (!senderEntry)
            return;
        const partyId = PresenceManager_1.presenceManager.getSession(msg.from)?.currentState.partyId;
        if (!partyId)
            return;
        const { partyManager } = require('./PartyManager');
        const party = partyManager.getParty(partyId);
        if (!party)
            return;
        const formatted = `[Party] ${senderEntry.playerName}: ${msg.text}`;
        for (const member of party.members) {
            const ms = PresenceManager_1.presenceManager.getSession(member.playerId);
            if (ms)
                trySend(ms.socket, { type: 'push', channel: 'party', text: formatted });
        }
    }
    // ─── Whisper ──────────────────────────────────────────────────────────────
    routeWhisper(msg) {
        if (!msg.to)
            return;
        const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(msg.to);
        if (!targetSession)
            return;
        const senderEntry = PresenceManager_1.presenceManager.getPlayer(msg.from);
        const senderName = senderEntry?.playerName ?? msg.from;
        // Confirm delivery to sender
        const senderSession = PresenceManager_1.presenceManager.getSession(msg.from);
        if (senderSession) {
            trySend(senderSession.socket, {
                type: 'push', channel: 'whisper',
                text: `[Whisper to ${msg.to}]: ${msg.text}`,
            });
        }
        // Deliver to recipient
        trySend(targetSession.socket, {
            type: 'push', channel: 'whisper',
            text: `[Whisper from ${senderName}]: ${msg.text}`,
        });
    }
    // ─── Shout ───────────────────────────────────────────────────────────────
    routeShout(msg) {
        const lastShout = this.shoutCooldowns.get(msg.from) ?? 0;
        const now = Date.now();
        if (now - lastShout < SHOUT_COOLDOWN_MS) {
            const remaining = Math.ceil((SHOUT_COOLDOWN_MS - (now - lastShout)) / 1000);
            const session = PresenceManager_1.presenceManager.getSession(msg.from);
            if (session) {
                trySend(session.socket, {
                    type: 'push', channel: 'system',
                    text: `[Shout] You must wait ${remaining}s before shouting again.`,
                });
            }
            return;
        }
        this.shoutCooldowns.set(msg.from, now);
        const senderEntry = PresenceManager_1.presenceManager.getPlayer(msg.from);
        const senderName = senderEntry?.playerName ?? msg.from;
        const formatted = `[Shout] ${senderName}: ${msg.text}`;
        for (const [, session] of PresenceManager_1.presenceManager.sessions ?? new Map()) {
            trySend(session.socket, { type: 'push', channel: 'shout', text: formatted });
        }
    }
}
function trySend(socket, data) {
    try {
        if (socket.readyState === 1)
            socket.send(JSON.stringify(data));
    }
    catch { /* closed */ }
}
exports.chatRouter = new ChatRouter();
//# sourceMappingURL=ChatRouter.js.map