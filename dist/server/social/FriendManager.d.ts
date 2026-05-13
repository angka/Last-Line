/**
 * Phase 10 — Friend Manager
 * Manages friend requests, friends list, and block list.
 */
import type { FriendEntry } from '../../types_player';
export declare const friendManager: {
    sendFriendRequest: typeof sendFriendRequest;
    acceptFriend: typeof acceptFriend;
    declineFriend: typeof declineFriend;
    removeFriendRequest: typeof removeFriendRequest;
    getFriendsList: typeof getFriendsList;
    getPendingRequestsList: typeof getPendingRequestsList;
    blockUser: typeof blockUser;
    unblockUser: typeof unblockUser;
    getBlockedList: typeof getBlockedList;
};
export interface FriendRequestResult {
    success: boolean;
    error?: string;
}
export declare function sendFriendRequest(fromPlayerId: string, fromPlayerName: string, toPlayerName: string): Promise<FriendRequestResult>;
export declare function acceptFriend(toPlayerId: string, toPlayerName: string, fromPlayerName: string): Promise<FriendRequestResult>;
export declare function declineFriend(toPlayerId: string, fromPlayerName: string): Promise<FriendRequestResult>;
export declare function removeFriendRequest(playerId: string, friendName: string): Promise<FriendRequestResult>;
export declare function getFriendsList(playerId: string): Promise<FriendEntry[]>;
export declare function getPendingRequestsList(playerId: string): Promise<FriendEntry[]>;
export declare function blockUser(playerId: string, playerName: string, targetName: string): Promise<FriendRequestResult>;
export declare function unblockUser(playerId: string, targetName: string): Promise<FriendRequestResult>;
export declare function getBlockedList(playerId: string): Promise<string[]>;
export declare function formatFriendsList(friends: FriendEntry[]): string;
export declare function formatPendingRequests(requests: FriendEntry[]): string;
export declare function formatBlockedList(blocked: string[]): string;
//# sourceMappingURL=FriendManager.d.ts.map