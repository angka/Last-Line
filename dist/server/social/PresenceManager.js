"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceManager = void 0;
class PresenceManager {
    /** playerId → presence data */
    players = new Map();
    /** areaId → Set of playerIds in that area */
    channels = new Map();
    /** sessionId → playerId (for socket→player lookup) */
    socketToPlayer = new Map();
    /** playerId → session */
    sessions = new Map();
    // ─── Session registration ──────────────────────────────────────────────────
    registerSession(sessionId, playerId, session) {
        this.socketToPlayer.set(sessionId, playerId);
        this.sessions.set(playerId, session);
    }
    unregisterSession(sessionId, playerId) {
        this.socketToPlayer.delete(sessionId);
        const session = this.sessions.get(playerId);
        if (session) {
            this.leave(playerId);
            this.sessions.delete(playerId);
        }
    }
    getSession(playerId) {
        return this.sessions.get(playerId);
    }
    /** Phase 8: iterate all sessions (for leaderboard) */
    getAllSessions() {
        return this.sessions;
    }
    getSessionBySocket(sessionId) {
        const pid = this.socketToPlayer.get(sessionId);
        return pid ? this.sessions.get(pid) : undefined;
    }
    // ─── Area tracking ─────────────────────────────────────────────────────────
    enter(playerId, areaId, activity = 'Exploring') {
        const session = this.sessions.get(playerId);
        if (!session)
            return null;
        // Leave previous area
        this.leave(playerId);
        const entry = {
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
        this.channels.get(areaId).add(playerId);
        return entry;
    }
    leave(playerId) {
        const entry = this.players.get(playerId);
        if (!entry)
            return;
        const channel = this.channels.get(entry.areaId);
        if (channel) {
            channel.delete(playerId);
            if (channel.size === 0)
                this.channels.delete(entry.areaId);
        }
        this.players.delete(playerId);
    }
    updateActivity(playerId, activity) {
        const entry = this.players.get(playerId);
        if (entry)
            entry.activity = activity;
    }
    // ─── Queries ───────────────────────────────────────────────────────────────
    getPlayersInArea(areaId) {
        const channel = this.channels.get(areaId);
        if (!channel)
            return [];
        return [...channel]
            .map(pid => this.players.get(pid))
            .filter((e) => e !== undefined);
    }
    getAreaOf(playerId) {
        return this.players.get(playerId)?.areaId ?? null;
    }
    getOnlineCount() {
        return this.players.size;
    }
    getAllPlayers() {
        return [...this.players.values()];
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    isPlayerOnline(playerId) {
        return this.players.has(playerId);
    }
    getSessionByPlayerName(playerName) {
        for (const session of this.sessions.values()) {
            if (session.currentState.stats.name.toLowerCase() === playerName.toLowerCase()) {
                return session;
            }
        }
        return undefined;
    }
    getPlayerIdByName(playerName) {
        const session = this.getSessionByPlayerName(playerName);
        return session?.playerId;
    }
    // ─── Broadcast ───────────────────────────────────────────────────────────
    broadcastToArea(areaId, message, excludePlayerId) {
        const players = this.getPlayersInArea(areaId);
        for (const entry of players) {
            if (entry.playerId === excludePlayerId)
                continue;
            const session = this.sessions.get(entry.playerId);
            if (session) {
                trySend(session.socket, { type: 'push', channel: 'area', text: message });
            }
        }
    }
    broadcastToPlayer(playerId, message) {
        const session = this.sessions.get(playerId);
        if (session) {
            trySend(session.socket, { type: 'push', channel: 'system', text: message });
        }
    }
    broadcastToAll(message, excludePlayerId) {
        for (const [pid, session] of this.sessions) {
            if (pid === excludePlayerId)
                continue;
            trySend(session.socket, { type: 'push', channel: 'shout', text: message });
        }
    }
    broadcastToParty(partyMembers, message, excludePlayerId) {
        for (const member of partyMembers) {
            if (member.playerId === excludePlayerId)
                continue;
            trySend(member.socket, { type: 'push', channel: 'party', text: message });
        }
    }
}
function trySend(socket, data) {
    try {
        if (socket.readyState === 1) {
            socket.send(JSON.stringify(data));
        }
    }
    catch {
        // socket may have closed
    }
}
exports.presenceManager = new PresenceManager();
//# sourceMappingURL=PresenceManager.js.map