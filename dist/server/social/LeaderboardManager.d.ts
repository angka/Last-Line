/**
 * Phase 8 — PvP Leaderboard Manager
 * Tracks online players' PvP stats and provides ranking/leaderboard data.
 */
export interface LeaderboardEntry {
    playerId: string;
    playerName: string;
    kills: number;
    deaths: number;
    winStreak: number;
    bestStreak: number;
    seasonWins: number;
    seasonPoints: number;
    kdRatio: number;
}
declare class LeaderboardManager {
    getLeaderboard(limit?: number): LeaderboardEntry[];
    getPlayerRank(playerId: string): number;
    getPlayerEntry(playerId: string): LeaderboardEntry | null;
    formatLeaderboard(limit?: number): string;
    formatRank(playerId: string): string;
}
export declare const leaderboardManager: LeaderboardManager;
export {};
//# sourceMappingURL=LeaderboardManager.d.ts.map