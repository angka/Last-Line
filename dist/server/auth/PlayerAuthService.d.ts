/**
 * Phase 10 — Player Auth Service
 * Handles player registration, login, logout, and session management.
 */
export interface RegisterResult {
    success: boolean;
    error?: string;
    playerId?: string;
    token?: string;
}
export declare function registerPlayer(username: string, email: string, password: string): Promise<RegisterResult>;
export interface LoginResult {
    success: boolean;
    error?: string;
    playerId?: string;
    username?: string;
    token?: string;
}
export declare function loginPlayer(usernameOrEmail: string, password: string): Promise<LoginResult>;
export declare function logoutPlayer(token: string): Promise<void>;
export interface ChangePasswordResult {
    success: boolean;
    error?: string;
}
export declare function changePassword(playerId: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult>;
export declare function validateToken(token: string): Promise<{
    playerId: string;
    username: string;
} | null>;
export declare function markTokenActive(token: string): void;
export declare function markTokenInactive(token: string): void;
export declare function isTokenActive(token: string): boolean;
export interface SteamAuthResult {
    success: boolean;
    playerId?: string;
    steamId?: string;
    token?: string;
    error?: string;
    needsLinking?: boolean;
    linkedPlayerId?: string;
}
export declare function steamAuth(ticket: string): Promise<SteamAuthResult>;
export declare function linkSteamAccount(playerId: string, ticket: string): Promise<{
    success: boolean;
    steamId?: string;
    error?: string;
}>;
export declare function unlinkSteamAccount(playerId: string): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=PlayerAuthService.d.ts.map