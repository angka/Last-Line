/**
 * Phase 9 — Admin Database Manager
 * Manages admin accounts, sessions, audit log, PvP settings, and player bans.
 * Uses a separate SQLite file: saves/admin.db
 */
import type { AdminAccount, AdminSession, AuditLogEntry, PvpSetting, PlayerBan } from '../../types_admin';
export declare function issueJwt(adminId: string, sessionId: string): string;
export declare function verifyJwt(token: string): {
    adminId: string;
    sessionId: string;
} | null;
export declare function verifyAdminPassword(username: string, password: string): Promise<AdminAccount | null>;
export declare function createAdminSession(adminId: string, ipAddress: string): Promise<AdminSession>;
export declare function deleteAdminSession(sessionId: string): Promise<void>;
export declare function getAdminById(adminId: string): Promise<AdminAccount | null>;
export declare function changePassword(adminId: string, newPassword: string): Promise<void>;
export declare function createAdminAccount(username: string, password: string, role: 'admin' | 'superadmin', createdByAdminId: string): Promise<{
    id: string;
}>;
export declare function deactivateAdmin(adminId: string): Promise<void>;
export declare function writeAuditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<void>;
export declare function getAuditLog(limit?: number, offset?: number): Promise<AuditLogEntry[]>;
export declare function getPvPSettings(scope: string): Promise<PvpSetting>;
export declare function setPvPSetting(scope: string, enabled: boolean, adminId: string): Promise<void>;
export declare function getAllPvPSettings(): Promise<PvpSetting[]>;
export declare function banPlayer(playerId: string, playerName: string, adminId: string, adminName: string, reason: string | null, expiresAt: string | null): Promise<void>;
export declare function unbanPlayer(playerId: string): Promise<void>;
export declare function isPlayerBanned(playerId: string): Promise<boolean>;
export declare function getActiveBans(): Promise<PlayerBan[]>;
export declare function getAllAdmins(): Promise<Pick<AdminAccount, 'id' | 'username' | 'role' | 'createdAt' | 'lastLogin' | 'isActive'>[]>;
//# sourceMappingURL=AdminDbManager.d.ts.map