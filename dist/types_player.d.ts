export interface PlayerAccount {
    playerId: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    lastLogin: string;
    steamId?: string;
    steamLinkedAt?: string;
}
export interface PlayerAuthToken {
    token: string;
    playerId: string;
    expiresAt: number;
    createdAt: string;
}
export type FriendStatus = 'pending' | 'accepted' | 'declined';
export interface FriendEntry {
    playerId: string;
    friendId: string;
    status: FriendStatus;
    since: number;
    /** Populated when status=accepted */
    friendName?: string;
    friendLevel?: number;
    friendOnline?: boolean;
}
export interface FriendRequest {
    fromPlayerId: string;
    fromPlayerName: string;
    fromLevel: number;
    toPlayerId: string;
    receivedAt: number;
}
export interface BlockEntry {
    playerId: string;
    blockedId: string;
    createdAt: string;
}
export interface PlayerJWTPayload {
    playerId: string;
    username: string;
    steamId?: string;
    iat: number;
    exp: number;
}
export interface PlayerAuthSession {
    playerId: string;
    username: string;
    token: string;
    expiresAt: number;
}
//# sourceMappingURL=types_player.d.ts.map