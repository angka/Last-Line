// ─── Player Auth Types (Phase 10) ───────────────────────────────────────────────

export interface PlayerAccount {
  playerId: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
  steamId?: string;        // Phase 11: Steam account linked
  steamLinkedAt?: string; // Phase 11: when Steam was linked
}

export interface PlayerAuthToken {
  token: string;
  playerId: string;
  expiresAt: number;
  createdAt: string;
}

// ─── Friend Types ───────────────────────────────────────────────────────────────

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

// ─── Block Types ────────────────────────────────────────────────────────────────

export interface BlockEntry {
  playerId: string;
  blockedId: string;
  createdAt: string;
}

// ─── Player JWT Payload ────────────────────────────────────────────────────────

export interface PlayerJWTPayload {
  playerId: string;
  username: string;
  steamId?: string; // Phase 11: Steam ID if linked
  iat: number;
  exp: number;
}

// ─── Player Auth Session (on the server) ───────────────────────────────────────

export interface PlayerAuthSession {
  playerId: string;
  username: string;
  token: string;
  expiresAt: number;
}