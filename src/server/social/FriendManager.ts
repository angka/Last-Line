/**
 * Phase 10 — Friend Manager
 * Manages friend requests, friends list, and block list.
 */

import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  addFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  blockPlayer,
  unblockPlayer,
  isPlayerBlocked,
  getBlockedPlayers,
  getPlayerIdByUsername,
  getPlayerByUsername,
} from '../persistence/PlayerDbManager';
import { presenceManager } from '../social/PresenceManager';
import type { FriendEntry } from '../../types_player';

// ─── Singleton API object ──────────────────────────────────────────────────────

export const friendManager = {
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

// ─── Friend Requests ──────────────────────────────────────────────────────────

export interface FriendRequestResult {
  success: boolean;
  error?: string;
}

export async function sendFriendRequest(
  fromPlayerId: string,
  fromPlayerName: string,
  toPlayerName: string,
): Promise<FriendRequestResult> {
  if (fromPlayerName.toLowerCase() === toPlayerName.toLowerCase()) {
    return { success: false, error: 'You cannot add yourself as a friend.' };
  }

  // Find target player
  const toPlayerId = await getPlayerIdByUsername(toPlayerName);
  if (!toPlayerId) {
    return { success: false, error: `Player "${toPlayerName}" not found.` };
  }

  if (fromPlayerId === toPlayerId) {
    return { success: false, error: 'You cannot add yourself as a friend.' };
  }

  // Check if blocked
  if (await isPlayerBlocked(toPlayerId, fromPlayerId)) {
    return { success: false, error: `Cannot send friend request to ${toPlayerName}.` };
  }
  if (await isPlayerBlocked(fromPlayerId, toPlayerId)) {
    return { success: false, error: `You have blocked ${toPlayerName}. Unblock them first.` };
  }

  // Check if already friends
  const existing = await getFriends(fromPlayerId);
  if (existing.some(f => f.friendId === toPlayerId)) {
    return { success: false, error: `${toPlayerName} is already your friend.` };
  }

  await addFriendRequest(fromPlayerId, toPlayerId);

  // Notify target player if online
  const targetSession = presenceManager.getSessionByPlayerName(toPlayerName);
  if (targetSession?.socket && targetSession.socket.readyState === 1) {
    targetSession.socket.send(JSON.stringify({
      type: 'push',
      channel: 'friend_request',
      text: `[Friend] ${fromPlayerName} sent you a friend request. Type 'friend accept ${fromPlayerName}' to accept or 'friend decline ${fromPlayerName}' to decline.`,
    }));
  }

  return { success: true };
}

export async function acceptFriend(
  toPlayerId: string,
  toPlayerName: string,
  fromPlayerName: string,
): Promise<FriendRequestResult> {
  const fromPlayerId = await getPlayerIdByUsername(fromPlayerName);
  if (!fromPlayerId) {
    return { success: false, error: `Player "${fromPlayerName}" not found.` };
  }

  await acceptFriendRequest(toPlayerId, fromPlayerId);

  // Notify sender
  const senderSession = presenceManager.getSessionByPlayerName(fromPlayerName);
  if (senderSession?.socket && senderSession.socket.readyState === 1) {
    senderSession.socket.send(JSON.stringify({
      type: 'push',
      channel: 'friend_accepted',
      text: `[Friend] ${toPlayerName} accepted your friend request! You are now friends.`,
    }));
  }

  return { success: true };
}

export async function declineFriend(
  toPlayerId: string,
  fromPlayerName: string,
): Promise<FriendRequestResult> {
  const fromPlayerId = await getPlayerIdByUsername(fromPlayerName);
  if (!fromPlayerId) {
    return { success: false, error: `Player "${fromPlayerName}" not found.` };
  }

  await declineFriendRequest(toPlayerId, fromPlayerId);
  return { success: true };
}

// ─── Remove Friend ────────────────────────────────────────────────────────────

export async function removeFriendRequest(
  playerId: string,
  friendName: string,
): Promise<FriendRequestResult> {
  const friendId = await getPlayerIdByUsername(friendName);
  if (!friendId) {
    return { success: false, error: `Player "${friendName}" not found.` };
  }

  await removeFriend(playerId, friendId);
  return { success: true };
}

// ─── List Friends ─────────────────────────────────────────────────────────────

export async function getFriendsList(playerId: string): Promise<FriendEntry[]> {
  const friends = await getFriends(playerId);

  // Enrich with online status
  return friends.map(f => {
    const session = presenceManager.getSessionByPlayerName(f.friendName ?? '');
    return {
      ...f,
      friendOnline: !!session,
      friendLevel: session?.currentState?.stats?.level ?? 0,
    };
  });
}

export async function getPendingRequestsList(playerId: string): Promise<FriendEntry[]> {
  return getPendingRequests(playerId);
}

// ─── Block/Unblock ────────────────────────────────────────────────────────────

export async function blockUser(
  playerId: string,
  playerName: string,
  targetName: string,
): Promise<FriendRequestResult> {
  const targetId = await getPlayerIdByUsername(targetName);
  if (!targetId) {
    return { success: false, error: `Player "${targetName}" not found.` };
  }

  if (playerId === targetId) {
    return { success: false, error: 'You cannot block yourself.' };
  }

  await blockPlayer(playerId, targetId);
  return { success: true };
}

export async function unblockUser(
  playerId: string,
  targetName: string,
): Promise<FriendRequestResult> {
  const targetId = await getPlayerIdByUsername(targetName);
  if (!targetId) {
    return { success: false, error: `Player "${targetName}" not found.` };
  }

  await unblockPlayer(playerId, targetId);
  return { success: true };
}

export async function getBlockedList(playerId: string): Promise<string[]> {
  return getBlockedPlayers(playerId);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatFriendsList(friends: FriendEntry[]): string {
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

export function formatPendingRequests(requests: FriendEntry[]): string {
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

export function formatBlockedList(blocked: string[]): string {
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