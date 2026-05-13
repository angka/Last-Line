/**
 * Phase 9 — Admin Panel Types
 * Types for admin auth, audit log, PvP settings, and bans.
 */

export interface AdminAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export interface AdminSession {
  sessionId: string;
  adminId: string;
  token: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLogEntry {
  id: number;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'player' | 'city' | 'server';
  targetId: string | null;
  payload: string; // JSON string
  ipAddress: string | null;
  performedAt: string;
}

export interface PvpSetting {
  scope: string;       // 'global' | cityId
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface PlayerBan {
  id: number;
  playerId: string;
  playerName: string;
  bannedBy: string;
  reason: string | null;
  bannedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AdminPlayerSummary {
  playerId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  exp: number;
  area: string;
  city: string | null;
  partyId: string | null;
  pvpEnabled: boolean;
  achievementsUnlocked: number;
  itemsOwned: number;
  skillsTotal: number;
  connectedAt: string;
  lastActivity: string;
  isBanned: boolean;
}

export interface AdminServerStats {
  onlinePlayers: number;
  uptimeSeconds: number;
  memoryHeapMb: number;
  memoryRssMb: number;
  activePartyCombats: number;
  activePvPSessions: number;
  activeWorldBossEvents: number;
  parties: number;
  version: string;
  totalAdmins: number;
  totalBans: number;
}
