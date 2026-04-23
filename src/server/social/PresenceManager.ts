import type { GameSession, PresenceEntry, PlayerActivity } from '../../types';

class PresenceManager {
  /** playerId → presence data */
  private players = new Map<string, PresenceEntry>();

  /** areaId → Set of playerIds in that area */
  private channels = new Map<string, Set<string>>();

  /** sessionId → playerId (for socket→player lookup) */
  private socketToPlayer = new Map<string, string>();

  /** playerId → session */
  private sessions = new Map<string, GameSession>();

  // ─── Session registration ──────────────────────────────────────────────────

  registerSession(sessionId: string, playerId: string, session: GameSession): void {
    this.socketToPlayer.set(sessionId, playerId);
    this.sessions.set(playerId, session);
  }

  unregisterSession(sessionId: string, playerId: string): void {
    this.socketToPlayer.delete(sessionId);
    const session = this.sessions.get(playerId);
    if (session) {
      this.leave(playerId);
      this.sessions.delete(playerId);
    }
  }

  getSession(playerId: string): GameSession | undefined {
    return this.sessions.get(playerId);
  }

  /** Phase 8: iterate all sessions (for leaderboard) */
  getAllSessions(): Map<string, GameSession> {
    return this.sessions;
  }

  getSessionBySocket(sessionId: string): GameSession | undefined {
    const pid = this.socketToPlayer.get(sessionId);
    return pid ? this.sessions.get(pid) : undefined;
  }

  // ─── Area tracking ─────────────────────────────────────────────────────────

  enter(playerId: string, areaId: string, activity: PlayerActivity = 'Exploring'): PresenceEntry | null {
    const session = this.sessions.get(playerId);
    if (!session) return null;

    // Leave previous area
    this.leave(playerId);

    const entry: PresenceEntry = {
      playerId,
      playerName: session.currentState.stats.name,
      areaId,
      activity,
      level: session.currentState.stats.level,
    };

    this.players.set(playerId, entry);

    if (!this.channels.has(areaId)) {
      this.channels.set(areaId, new Set());
    }
    this.channels.get(areaId)!.add(playerId);

    return entry;
  }

  leave(playerId: string): void {
    const entry = this.players.get(playerId);
    if (!entry) return;

    const channel = this.channels.get(entry.areaId);
    if (channel) {
      channel.delete(playerId);
      if (channel.size === 0) this.channels.delete(entry.areaId);
    }

    this.players.delete(playerId);
  }

  updateActivity(playerId: string, activity: PlayerActivity): void {
    const entry = this.players.get(playerId);
    if (entry) entry.activity = activity;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getPlayersInArea(areaId: string): PresenceEntry[] {
    const channel = this.channels.get(areaId);
    if (!channel) return [];
    return [...channel]
      .map(pid => this.players.get(pid))
      .filter((e): e is PresenceEntry => e !== undefined);
  }

  getAreaOf(playerId: string): string | null {
    return this.players.get(playerId)?.areaId ?? null;
  }

  getOnlineCount(): number {
    return this.players.size;
  }

  getAllPlayers(): PresenceEntry[] {
    return [...this.players.values()];
  }

  getPlayer(playerId: string): PresenceEntry | undefined {
    return this.players.get(playerId);
  }

  isPlayerOnline(playerId: string): boolean {
    return this.players.has(playerId);
  }

  getSessionByPlayerName(playerName: string): GameSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.currentState.stats.name.toLowerCase() === playerName.toLowerCase()) {
        return session;
      }
    }
    return undefined;
  }

  getPlayerIdByName(playerName: string): string | undefined {
    const session = this.getSessionByPlayerName(playerName);
    return session?.playerId;
  }

  // ─── Broadcast ───────────────────────────────────────────────────────────

  broadcastToArea(areaId: string, message: string, excludePlayerId?: string): void {
    const players = this.getPlayersInArea(areaId);
    for (const entry of players) {
      if (entry.playerId === excludePlayerId) continue;
      const session = this.sessions.get(entry.playerId);
      if (session) {
        trySend(session.socket, { type: 'push', channel: 'area', text: message });
      }
    }
  }

  broadcastToPlayer(playerId: string, message: string): void {
    const session = this.sessions.get(playerId);
    if (session) {
      trySend(session.socket, { type: 'push', channel: 'system', text: message });
    }
  }

  broadcastToAll(message: string, excludePlayerId?: string): void {
    for (const [pid, session] of this.sessions) {
      if (pid === excludePlayerId) continue;
      trySend(session.socket, { type: 'push', channel: 'shout', text: message });
    }
  }

  broadcastToParty(partyMembers: { playerId: string; socket: import('ws').WebSocket }[], message: string, excludePlayerId?: string): void {
    for (const member of partyMembers) {
      if (member.playerId === excludePlayerId) continue;
      trySend(member.socket, { type: 'push', channel: 'party', text: message });
    }
  }
}

function trySend(socket: import('ws').WebSocket, data: object): void {
  try {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(data));
    }
  } catch {
    // socket may have closed
  }
}

export const presenceManager = new PresenceManager();
