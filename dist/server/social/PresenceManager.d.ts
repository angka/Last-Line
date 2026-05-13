import type { GameSession, PresenceEntry, PlayerActivity } from '../../types';
declare class PresenceManager {
    /** playerId → presence data */
    private players;
    /** areaId → Set of playerIds in that area */
    private channels;
    /** sessionId → playerId (for socket→player lookup) */
    private socketToPlayer;
    /** playerId → session */
    private sessions;
    registerSession(sessionId: string, playerId: string, session: GameSession): void;
    unregisterSession(sessionId: string, playerId: string): void;
    getSession(playerId: string): GameSession | undefined;
    /** Phase 8: iterate all sessions (for leaderboard) */
    getAllSessions(): Map<string, GameSession>;
    getSessionBySocket(sessionId: string): GameSession | undefined;
    enter(playerId: string, areaId: string, activity?: PlayerActivity): PresenceEntry | null;
    leave(playerId: string): void;
    updateActivity(playerId: string, activity: PlayerActivity): void;
    getPlayersInArea(areaId: string): PresenceEntry[];
    getAreaOf(playerId: string): string | null;
    getOnlineCount(): number;
    getAllPlayers(): PresenceEntry[];
    getPlayer(playerId: string): PresenceEntry | undefined;
    isPlayerOnline(playerId: string): boolean;
    getSessionByPlayerName(playerName: string): GameSession | undefined;
    getPlayerIdByName(playerName: string): string | undefined;
    broadcastToArea(areaId: string, message: string, excludePlayerId?: string): void;
    broadcastToPlayer(playerId: string, message: string): void;
    broadcastToAll(message: string, excludePlayerId?: string): void;
    broadcastToParty(partyMembers: {
        playerId: string;
        socket: import('ws').WebSocket;
    }[], message: string, excludePlayerId?: string): void;
}
export declare const presenceManager: PresenceManager;
export {};
//# sourceMappingURL=PresenceManager.d.ts.map