/**
 * Phase 10 — Player Auth Service
 * Handles player registration, login, logout, and session management.
 */

import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import {
  createPlayerAccount,
  getPlayerByUsername,
  getPlayerByEmail,
  getPlayerById,
  usernameExists,
  emailExists,
  storePlayerToken,
  deletePlayerToken,
  deleteAllPlayerTokens,
  updateLastLogin,
  changePlayerPassword,
  issuePlayerJwt,
} from '../persistence/PlayerDbManager';
import type { PlayerAccount, PlayerAuthToken } from '../../types_player';

// ─── Registration ──────────────────────────────────────────────────────────────

export interface RegisterResult {
  success: boolean;
  error?: string;
  playerId?: string;
  token?: string;
}

export async function registerPlayer(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  // Validate username
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: 'Username must be 3-20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Invalid email format.' };
  }

  // Validate password
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  // Check if username exists
  if (await usernameExists(username)) {
    return { success: false, error: 'Username already taken.' };
  }

  // Check if email exists
  if (await emailExists(email)) {
    return { success: false, error: 'Email already registered.' };
  }

  // Create account
  const playerId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  await createPlayerAccount(playerId, username, email, passwordHash);

  // Issue token
  const token = issuePlayerJwt(playerId);
  await storePlayerToken(token, playerId);

  return { success: true, playerId, token };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  error?: string;
  playerId?: string;
  username?: string;
  token?: string;
}

export async function loginPlayer(
  usernameOrEmail: string,
  password: string,
): Promise<LoginResult> {
  if (!usernameOrEmail || !password) {
    return { success: false, error: 'Username/email and password required.' };
  }

  // Find account by username or email
  let account: PlayerAccount | null;
  if (usernameOrEmail.includes('@')) {
    account = await getPlayerByEmail(usernameOrEmail);
  } else {
    account = await getPlayerByUsername(usernameOrEmail);
  }

  if (!account) {
    return { success: false, error: 'Invalid credentials.' };
  }

  // Verify password
  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    return { success: false, error: 'Invalid credentials.' };
  }

  // Update last login
  await updateLastLogin(account.playerId);

  // Issue token
  const token = issuePlayerJwt(account.playerId);
  await storePlayerToken(token, account.playerId);

  return {
    success: true,
    playerId: account.playerId,
    username: account.username,
    token,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutPlayer(token: string): Promise<void> {
  await deletePlayerToken(token);
}

// ─── Change Password ─────────────────────────────────────────────────────────

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

export async function changePassword(
  playerId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Current and new password required.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const account = await getPlayerById(playerId);
  if (!account) {
    return { success: false, error: 'Account not found.' };
  }

  const valid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!valid) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await changePlayerPassword(playerId, hash);

  // Invalidate all existing tokens (force re-login)
  await deleteAllPlayerTokens(playerId);

  return { success: true };
}

// ─── Token Validation ─────────────────────────────────────────────────────────

export async function validateToken(token: string): Promise<{ playerId: string; username: string } | null> {
  const { verifyPlayerJwt } = await import('../persistence/PlayerDbManager');
  const payload = verifyPlayerJwt(token);
  if (!payload) return null;

  const account = await getPlayerById(payload.playerId);
  if (!account) return null;

  return { playerId: account.playerId, username: account.username };
}

// ─── Session Cleanup ─────────────────────────────────────────────────────────

// Track tokens that were issued (in-memory for active sessions)
const activeTokens = new Set<string>();

export function markTokenActive(token: string): void {
  activeTokens.add(token);
}

export function markTokenInactive(token: string): void {
  activeTokens.delete(token);
}

export function isTokenActive(token: string): boolean {
  return activeTokens.has(token);
}

// ─── Steam Auth (Phase 11) ─────────────────────────────────────────────────────

import { validateSteamTicket, getOwnedProducts } from './SteamAuthService';
import { getPlayerBySteamId, linkSteamToPlayer, unlinkSteamFromPlayer, getPlayerSteamId } from '../persistence/PlayerDbManager';
import { grantDlcEntitlement, addInventorySlots } from '../persistence/CosmeticDbManager';
import { issuePlayerJwt as createJwt, storePlayerToken as saveToken } from '../persistence/PlayerDbManager';

export interface SteamAuthResult {
  success: boolean;
  playerId?: string;
  steamId?: string;
  token?: string;
  error?: string;
  needsLinking?: boolean;
  linkedPlayerId?: string;
}

export async function steamAuth(ticket: string): Promise<SteamAuthResult> {
  const result = await validateSteamTicket(ticket);
  if (!result.success || !result.steamId) {
    return { success: false, error: result.error ?? 'Steam auth failed.' };
  }

  const steamId = result.steamId;

  // Check if this Steam ID is already linked to a player
  const existingPlayer = await getPlayerBySteamId(steamId);
  if (existingPlayer) {
    // Login existing player
    const token = createJwt(existingPlayer.playerId);
    await saveToken(token, existingPlayer.playerId);

    // Sync Steam ownership
    await syncSteamOwnership(existingPlayer.playerId, steamId);

    return {
      success: true,
      playerId: existingPlayer.playerId,
      steamId,
      token,
    };
  }

  // Not linked — return needsLinking so client can prompt to link existing account
  return {
    success: false,
    steamId,
    needsLinking: true,
    error: 'Steam account not linked. Please login or register first, then link your Steam account.',
  };
}

export async function linkSteamAccount(playerId: string, ticket: string): Promise<{ success: boolean; steamId?: string; error?: string }> {
  const result = await validateSteamTicket(ticket);
  if (!result.success || !result.steamId) {
    return { success: false, error: result.error ?? 'Steam auth failed.' };
  }

  const steamId = result.steamId;

  // Check if already linked to another player
  const existingOwner = await getPlayerBySteamId(steamId);
  if (existingOwner && existingOwner.playerId !== playerId) {
    return { success: false, error: 'This Steam account is already linked to another player.' };
  }

  // Link the Steam account
  await linkSteamToPlayer(playerId, steamId);

  // Sync ownership
  await syncSteamOwnership(playerId, steamId);

  return { success: true, steamId };
}

export async function unlinkSteamAccount(playerId: string): Promise<{ success: boolean; error?: string }> {
  const steamId = await getPlayerSteamId(playerId);
  if (!steamId) {
    return { success: false, error: 'Steam account not linked.' };
  }
  await unlinkSteamFromPlayer(playerId);
  return { success: true };
}

async function syncSteamOwnership(playerId: string, steamId: string): Promise<void> {
  const ownedProducts = await getOwnedProducts(steamId);
  for (const product of ownedProducts) {
    await grantDlcEntitlement(playerId, product, 'steam');
  }

  // Handle inventory expansion purchases
  if (ownedProducts.includes('inv_100')) {
    await addInventorySlots(playerId, 50);
  }
  if (ownedProducts.includes('inv_200')) {
    await addInventorySlots(playerId, 150);
  }
}