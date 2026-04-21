import type { ChatMessage } from '../../types';
import { presenceManager } from './PresenceManager';

const MAX_HISTORY = 50;
const SHOUT_COOLDOWN_MS = 60_000;

class ChatRouter {
  private shoutCooldowns = new Map<string, number>(); // playerId → lastShoutAt

  /** Route a chat message to the correct recipients */
  route(msg: ChatMessage): void {
    switch (msg.channel) {
      case 'area':   return this.routeArea(msg);
      case 'party':  return this.routePartyChatMsg(msg);
      case 'whisper': return this.routeWhisper(msg);
      case 'shout':  return this.routeShout(msg);
      case 'system': return; // already sent directly
    }
  }

  // ─── Area chat ────────────────────────────────────────────────────────────

  private routeArea(msg: ChatMessage): void {
    const area = presenceManager.getAreaOf(presenceManager.getPlayer(msg.from)?.playerId ?? '');
    if (!area) return;
    // Build a full presence entry for the sender
    const senderEntry = presenceManager.getPlayer(msg.from);
    if (!senderEntry) return;

    const players = presenceManager.getPlayersInArea(senderEntry.areaId);
    const formatted = `[Area] ${senderEntry.playerName}: ${msg.text}`;
    for (const p of players) {
      const session = presenceManager.getSession(p.playerId);
      if (session) trySend(session.socket, { type: 'push', channel: 'area', text: formatted });
    }
  }

  // ─── Party chat ───────────────────────────────────────────────────────────

  routePartyChatMsg(msg: ChatMessage): void {
    const senderEntry = presenceManager.getPlayer(msg.from);
    if (!senderEntry) return;
    const partyId = presenceManager.getSession(msg.from)?.currentState.partyId;
    if (!partyId) return;

    const { partyManager } = require('./PartyManager');
    const party = partyManager.getParty(partyId);
    if (!party) return;

    const formatted = `[Party] ${senderEntry.playerName}: ${msg.text}`;
    for (const member of party.members) {
      const ms = presenceManager.getSession(member.playerId);
      if (ms) trySend(ms.socket, { type: 'push', channel: 'party', text: formatted });
    }
  }

  // ─── Whisper ──────────────────────────────────────────────────────────────

  private routeWhisper(msg: ChatMessage): void {
    if (!msg.to) return;
    const targetSession = presenceManager.getSessionByPlayerName(msg.to);
    if (!targetSession) return;

    const senderEntry = presenceManager.getPlayer(msg.from);
    const senderName = senderEntry?.playerName ?? msg.from;

    // Confirm delivery to sender
    const senderSession = presenceManager.getSession(msg.from);
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

  private routeShout(msg: ChatMessage): void {
    const lastShout = this.shoutCooldowns.get(msg.from) ?? 0;
    const now = Date.now();

    if (now - lastShout < SHOUT_COOLDOWN_MS) {
      const remaining = Math.ceil((SHOUT_COOLDOWN_MS - (now - lastShout)) / 1000);
      const session = presenceManager.getSession(msg.from);
      if (session) {
        trySend(session.socket, {
          type: 'push', channel: 'system',
          text: `[Shout] You must wait ${remaining}s before shouting again.`,
        });
      }
      return;
    }

    this.shoutCooldowns.set(msg.from, now);

    const senderEntry = presenceManager.getPlayer(msg.from);
    const senderName = senderEntry?.playerName ?? msg.from;
    const formatted = `[Shout] ${senderName}: ${msg.text}`;

    for (const [, session] of (presenceManager as any).sessions ?? new Map()) {
      trySend((session as any).socket, { type: 'push', channel: 'shout', text: formatted });
    }
  }
}

function trySend(socket: import('ws').WebSocket, data: object): void {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(data));
  } catch { /* closed */ }
}

export const chatRouter = new ChatRouter();
