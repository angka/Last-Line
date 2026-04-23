/**
 * Phase 8 — PvP Leaderboard Manager
 * Tracks online players' PvP stats and provides ranking/leaderboard data.
 */

import type { SaveFile } from '../../types';
import { presenceManager } from './PresenceManager';

// ─── Leaderboard Entry ─────────────────────────────────────────────────────────

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

// ─── Leaderboard Manager ──────────────────────────────────────────────────────

class LeaderboardManager {
  // Refresh leaderboard from all online sessions
  getLeaderboard(limit = 10): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const [, session] of presenceManager.getAllSessions()) {
      const save = session.currentState;
      const pvp = save.pvpStats ?? { kills: 0, deaths: 0, winStreak: 0, bestStreak: 0, seasonWins: 0, seasonPoints: 1000 };
      const kd = pvp.deaths > 0 ? pvp.kills / pvp.deaths : pvp.kills;
      entries.push({
        playerId: save.playerId,
        playerName: save.stats.name,
        kills: pvp.kills,
        deaths: pvp.deaths,
        winStreak: pvp.winStreak,
        bestStreak: pvp.bestStreak,
        seasonWins: pvp.seasonWins,
        seasonPoints: pvp.seasonPoints,
        kdRatio: Math.round(kd * 100) / 100,
      });
    }

    // Sort by season points descending
    entries.sort((a, b) => b.seasonPoints - a.seasonPoints);
    return entries.slice(0, limit);
  }

  // Get a player's rank (1-indexed)
  getPlayerRank(playerId: string): number {
    const lb = this.getLeaderboard(999);
    const idx = lb.findIndex(e => e.playerId === playerId);
    return idx >= 0 ? idx + 1 : -1;
  }

  // Get a specific player's entry
  getPlayerEntry(playerId: string): LeaderboardEntry | null {
    const pSession = presenceManager.getSession(playerId);
    if (!pSession) return null;

    const save = pSession.currentState;
    const pvp = save.pvpStats ?? { kills: 0, deaths: 0, winStreak: 0, bestStreak: 0, seasonWins: 0, seasonPoints: 1000 };
    const kd = pvp.deaths > 0 ? pvp.kills / pvp.deaths : pvp.kills;
    return {
      playerId: save.playerId,
      playerName: save.stats.name,
      kills: pvp.kills,
      deaths: pvp.deaths,
      winStreak: pvp.winStreak,
      bestStreak: pvp.bestStreak,
      seasonWins: pvp.seasonWins,
      seasonPoints: pvp.seasonPoints,
      kdRatio: Math.round(kd * 100) / 100,
    };
  }

  // Format leaderboard display
  formatLeaderboard(limit = 10): string {
    const entries = this.getLeaderboard(limit);
    if (entries.length === 0) {
      return `  🏆 No PvP data yet. Enable PvP and fight other players!`;
    }

    const lines: string[] = [];
    lines.push(`\n  ╔══════════════════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  🏆 PvP LEADERBOARD                                         Top ${String(Math.min(limit, entries.length)).padStart(2)} Players   ║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
    lines.push(`  ║  Rank  Player              Points  Wins  K/D   Best  Current        ║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);

    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const medal = medals[i] ?? `  #${String(i + 1).padStart(2)}`;
      const rankStr = i < 3 ? '    ' : `  #${String(i + 1).padStart(2)}`;
      const pts = String(e.seasonPoints).padStart(6);
      const wins = String(e.seasonWins).padStart(4);
      const kd = String(e.kdRatio).padStart(4);
      const best = String(e.bestStreak).padStart(4);
      const streak = e.winStreak > 0 ? `🔥${String(e.winStreak)}` : '--';
      const name = e.playerName.substring(0, 18).padEnd(18);
      lines.push(`  ║${medal} ${rankStr}  ${name} ${pts}  ${wins}  ${kd}   ${best}    ${streak.padStart(6)}  ║`);
    }

    lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
    lines.push(`  ║  Points = ELO rating  |  Wins = seasonal victories  |  K/D = ratio   ║`);
    lines.push(`  ╚══════════════════════════════════════════════════════════════════════╝`);
    lines.push(`\n  Use "rank" to see your personal PvP stats and rank.`);

    return lines.join('\n');
  }

  // Format personal rank display
  formatRank(playerId: string): string {
    const entry = this.getPlayerEntry(playerId);
    if (!entry) {
      return `  No PvP data found. Enable PvP and fight other players!`;
    }

    const rank = this.getPlayerRank(playerId);
    const total = this.getLeaderboard(999).length;
    const tier = getPvPTier(entry.seasonPoints);

    const lines: string[] = [];
    lines.push(`\n  ╔══════════════════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  ⚔ YOUR PvP RECORD — ${entry.playerName.padEnd(38)}║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════════════════╣`);
    lines.push(`  ║  Rank: ${rank > 0 ? `#${rank}` : 'Unranked'}/${total} players online                          ║`);
    lines.push(`  ║  Tier: ${tier.padEnd(56)}║`);
    lines.push(`  ║  ────────────────────────────────────────────────────────────────── ║`);
    lines.push(`  ║  Season Points: ${String(entry.seasonPoints).padStart(5)}  |  Season Wins: ${String(entry.seasonWins).padStart(3)}                    ║`);
    lines.push(`  ║  Total Kills:   ${String(entry.kills).padStart(5)}  |  Total Deaths: ${String(entry.deaths).padStart(4)}                     ║`);
    lines.push(`  ║  K/D Ratio:     ${String(entry.kdRatio).padStart(5)}  |  Win Rate: ${entry.kills + entry.deaths > 0 ? String(Math.round(entry.kills / (entry.kills + entry.deaths) * 100)).padStart(3) + '%' : 'N/A'.padStart(5)}                     ║`);
    lines.push(`  ║  Current Streak: ${String(entry.winStreak).padStart(3)}  |  Best Streak: ${String(entry.bestStreak).padStart(4)}                       ║`);
    lines.push(`  ╚══════════════════════════════════════════════════════════════════════╝`);

    return lines.join('\n');
  }
}

function getPvPTier(points: number): string {
  if (points >= 2400) return '🏆 Champion (2400+)';
  if (points >= 2100) return '⚔️  Diamond (2100+)';
  if (points >= 1800) return '🛡️  Platinum (1800+)';
  if (points >= 1500) return '⬜ Gold (1500+)';
  if (points >= 1200) return '🥉 Silver (1200+)';
  return '⬛ Bronze (<1200)';
}

export const leaderboardManager = new LeaderboardManager();
