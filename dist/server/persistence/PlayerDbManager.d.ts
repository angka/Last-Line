/**
 * Phase 10 — Player Database Manager
 * Manages player accounts, auth tokens, friends, and blocks.
 * Uses a separate SQLite file: saves/player.db
 */
import type { PlayerAccount, FriendEntry } from '../../types_player';
export declare function issuePlayerJwt(playerId: string): string;
export declare function verifyPlayerJwt(token: string): {
    playerId: string;
} | null;
export declare function getPlayerByUsername(username: string): Promise<PlayerAccount | null>;
export declare function getPlayerById(playerId: string): Promise<PlayerAccount | null>;
export declare function getPlayerByEmail(email: string): Promise<PlayerAccount | null>;
export declare function createPlayerAccount(playerId: string, username: string, email: string, passwordHash: string): Promise<PlayerAccount>;
export declare function updateLastLogin(playerId: string): Promise<void>;
export declare function changePlayerPassword(playerId: string, newPasswordHash: string): Promise<void>;
export declare function storePlayerToken(token: string, playerId: string): Promise<void>;
export declare function deletePlayerToken(token: string): Promise<void>;
export declare function deleteAllPlayerTokens(playerId: string): Promise<void>;
export declare function getFriendEntry(playerId: string, friendId: string): Promise<FriendEntry | null>;
export declare function getFriendStatus(playerId: string, friendId: string): Promise<string | null>;
export declare function addFriendRequest(playerId: string, friendId: string): Promise<void>;
export declare function acceptFriendRequest(playerId: string, friendId: string): Promise<void>;
export declare function declineFriendRequest(playerId: string, friendId: string): Promise<void>;
export declare function removeFriend(playerId: string, friendId: string): Promise<void>;
export declare function getFriends(playerId: string): Promise<FriendEntry[]>;
export declare function getPendingRequests(playerId: string): Promise<FriendEntry[]>;
export declare function getSentRequests(playerId: string): Promise<FriendEntry[]>;
export declare function blockPlayer(playerId: string, blockedId: string): Promise<void>;
export declare function unblockPlayer(playerId: string, blockedId: string): Promise<void>;
export declare function isPlayerBlocked(blockerId: string, blockedId: string): Promise<boolean>;
export declare function getBlockedPlayers(playerId: string): Promise<string[]>;
export declare function getPlayerIdByUsername(username: string): Promise<string | null>;
export declare function usernameExists(username: string): Promise<boolean>;
export declare function emailExists(email: string): Promise<boolean>;
export declare function getPlayerLevel(playerId: string): Promise<number>;
export declare function getPlayerBySteamId(steamId: string): Promise<PlayerAccount | null>;
export declare function linkSteamToPlayer(playerId: string, steamId: string): Promise<void>;
export declare function unlinkSteamFromPlayer(playerId: string): Promise<void>;
export declare function getPlayerSteamId(playerId: string): Promise<string | null>;
//# sourceMappingURL=PlayerDbManager.d.ts.map