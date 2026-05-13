"use strict";
/**
 * Phase 10 — Friend Manager
 * Manages friend requests, friends list, and block list.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendManager = void 0;
exports.sendFriendRequest = sendFriendRequest;
exports.acceptFriend = acceptFriend;
exports.declineFriend = declineFriend;
exports.removeFriendRequest = removeFriendRequest;
exports.getFriendsList = getFriendsList;
exports.getPendingRequestsList = getPendingRequestsList;
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.getBlockedList = getBlockedList;
exports.formatFriendsList = formatFriendsList;
exports.formatPendingRequests = formatPendingRequests;
exports.formatBlockedList = formatBlockedList;
const PlayerDbManager_1 = require("../persistence/PlayerDbManager");
const PresenceManager_1 = require("../social/PresenceManager");
// ─── Singleton API object ──────────────────────────────────────────────────────
exports.friendManager = {
    sendFriendRequest,
    acceptFriend,
    declineFriend,
    removeFriendRequest,
    getFriendsList,
    getPendingRequestsList,
    blockUser,
    unblockUser,
    getBlockedList,
};
async function sendFriendRequest(fromPlayerId, fromPlayerName, toPlayerName) {
    if (fromPlayerName.toLowerCase() === toPlayerName.toLowerCase()) {
        return { success: false, error: 'You cannot add yourself as a friend.' };
    }
    // Find target player
    const toPlayerId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(toPlayerName);
    if (!toPlayerId) {
        return { success: false, error: `Player "${toPlayerName}" not found.` };
    }
    if (fromPlayerId === toPlayerId) {
        return { success: false, error: 'You cannot add yourself as a friend.' };
    }
    // Check if blocked
    if (await (0, PlayerDbManager_1.isPlayerBlocked)(toPlayerId, fromPlayerId)) {
        return { success: false, error: `Cannot send friend request to ${toPlayerName}.` };
    }
    if (await (0, PlayerDbManager_1.isPlayerBlocked)(fromPlayerId, toPlayerId)) {
        return { success: false, error: `You have blocked ${toPlayerName}. Unblock them first.` };
    }
    // Check if already friends
    const existing = await (0, PlayerDbManager_1.getFriends)(fromPlayerId);
    if (existing.some(f => f.friendId === toPlayerId)) {
        return { success: false, error: `${toPlayerName} is already your friend.` };
    }
    await (0, PlayerDbManager_1.addFriendRequest)(fromPlayerId, toPlayerId);
    // Notify target player if online
    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(toPlayerName);
    if (targetSession?.socket && targetSession.socket.readyState === 1) {
        targetSession.socket.send(JSON.stringify({
            type: 'push',
            channel: 'friend_request',
            text: `[Friend] ${fromPlayerName} sent you a friend request. Type 'friend accept ${fromPlayerName}' to accept or 'friend decline ${fromPlayerName}' to decline.`,
        }));
    }
    return { success: true };
}
async function acceptFriend(toPlayerId, toPlayerName, fromPlayerName) {
    const fromPlayerId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(fromPlayerName);
    if (!fromPlayerId) {
        return { success: false, error: `Player "${fromPlayerName}" not found.` };
    }
    await (0, PlayerDbManager_1.acceptFriendRequest)(toPlayerId, fromPlayerId);
    // Notify sender
    const senderSession = PresenceManager_1.presenceManager.getSessionByPlayerName(fromPlayerName);
    if (senderSession?.socket && senderSession.socket.readyState === 1) {
        senderSession.socket.send(JSON.stringify({
            type: 'push',
            channel: 'friend_accepted',
            text: `[Friend] ${toPlayerName} accepted your friend request! You are now friends.`,
        }));
    }
    return { success: true };
}
async function declineFriend(toPlayerId, fromPlayerName) {
    const fromPlayerId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(fromPlayerName);
    if (!fromPlayerId) {
        return { success: false, error: `Player "${fromPlayerName}" not found.` };
    }
    await (0, PlayerDbManager_1.declineFriendRequest)(toPlayerId, fromPlayerId);
    return { success: true };
}
// ─── Remove Friend ────────────────────────────────────────────────────────────
async function removeFriendRequest(playerId, friendName) {
    const friendId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(friendName);
    if (!friendId) {
        return { success: false, error: `Player "${friendName}" not found.` };
    }
    await (0, PlayerDbManager_1.removeFriend)(playerId, friendId);
    return { success: true };
}
// ─── List Friends ─────────────────────────────────────────────────────────────
async function getFriendsList(playerId) {
    const friends = await (0, PlayerDbManager_1.getFriends)(playerId);
    // Enrich with online status
    return friends.map(f => {
        const session = PresenceManager_1.presenceManager.getSessionByPlayerName(f.friendName ?? '');
        return {
            ...f,
            friendOnline: !!session,
            friendLevel: session?.currentState?.stats?.level ?? 0,
        };
    });
}
async function getPendingRequestsList(playerId) {
    return (0, PlayerDbManager_1.getPendingRequests)(playerId);
}
// ─── Block/Unblock ────────────────────────────────────────────────────────────
async function blockUser(playerId, playerName, targetName) {
    const targetId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(targetName);
    if (!targetId) {
        return { success: false, error: `Player "${targetName}" not found.` };
    }
    if (playerId === targetId) {
        return { success: false, error: 'You cannot block yourself.' };
    }
    await (0, PlayerDbManager_1.blockPlayer)(playerId, targetId);
    return { success: true };
}
async function unblockUser(playerId, targetName) {
    const targetId = await (0, PlayerDbManager_1.getPlayerIdByUsername)(targetName);
    if (!targetId) {
        return { success: false, error: `Player "${targetName}" not found.` };
    }
    await (0, PlayerDbManager_1.unblockPlayer)(playerId, targetId);
    return { success: true };
}
async function getBlockedList(playerId) {
    return (0, PlayerDbManager_1.getBlockedPlayers)(playerId);
}
// ─── Formatting ───────────────────────────────────────────────────────────────
function formatFriendsList(friends) {
    if (friends.length === 0) {
        return 'You have no friends yet. Use "friend add <name>" to make new friends!';
    }
    let output = '═══════════ FRIENDS LIST ═══════════\n';
    output += `  ${friends.length} friend${friends.length !== 1 ? 's' : ''}\n`;
    output += '─────────────────────────────────────\n';
    for (const friend of friends) {
        const status = friend.friendOnline
            ? '[ONLINE]'
            : '[offline]';
        const name = friend.friendName ?? friend.friendId;
        const level = friend.friendLevel ?? 0;
        output += `  ${status.padEnd(10)} ${name.padEnd(16)} Lv ${level}\n`;
    }
    output += '─────────────────────────────────────\n';
    output += '  Type "friend add <name>" to add more.';
    return output;
}
function formatPendingRequests(requests) {
    if (requests.length === 0) {
        return 'No pending friend requests.';
    }
    let output = '═══════════ FRIEND REQUESTS ═══════════\n';
    output += `  ${requests.length} pending request${requests.length !== 1 ? 's' : ''}\n`;
    output += '─────────────────────────────────────\n';
    for (const req of requests) {
        const name = req.friendName ?? req.playerId;
        output += `  ${name.padEnd(20)} [pending]\n`;
    }
    output += '─────────────────────────────────────\n';
    output += '  Type "friend accept <name>" or "friend decline <name>"';
    return output;
}
function formatBlockedList(blocked) {
    if (blocked.length === 0) {
        return 'You have no blocked players.';
    }
    let output = '═══════════ BLOCKED LIST ═══════════\n';
    output += `  ${blocked.length} blocked player${blocked.length !== 1 ? 's' : ''}\n`;
    output += '─────────────────────────────────────\n';
    for (const name of blocked) {
        output += `  ${name.padEnd(20)}\n`;
    }
    return output;
}
//# sourceMappingURL=FriendManager.js.map