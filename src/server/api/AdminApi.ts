/**
 * Phase 7 — REST Admin API
 * Basic Express server for game administration and monitoring.
 * Run separately: `node dist/server/api/AdminApi.js`
 */

import express from 'express';
import type { Server as HttpServer } from 'http';
import { sessions } from '../index';
import { worldBossEngine } from '../engine/WorldBossEngine';
import { pvpManager } from '../social/PvPManager';
import { WORLD_BOSS_DEFS } from '../engine/WorldBossEngine';
import { presenceManager } from '../social/PresenceManager';
import { partyManager } from '../social/PartyManager';
import { activePartyCombats } from '../engine/PartyCombatManager';

const ADMIN_PORT = process.env.ADMIN_PORT ? parseInt(process.env.ADMIN_PORT) : 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'changeme';

// ─── Auth middleware ──────────────────────────────────────────────────────────

function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = req.headers['x-admin-token'] as string;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized — set X-Admin-Token header' });
    return;
  }
  next();
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ─── Public Routes ───────────────────────────────────────────────────────────

// GET /api/status — server status (no auth)
app.get('/api/status', (_req, res) => {
  const memUsage = process.memoryUsage();
  const activeBossEvents = worldBossEngine.getAllActiveEvents();
  const activePvPSessions = pvpManager.getActiveSessions().length;
  const partyCombatCount = activePartyCombats.size;

  const playerSessions = [...sessions.values()];
  const onlinePlayers = playerSessions.length;

  const onlineList = playerSessions.map(s => ({
    playerId: s.playerId,
    name: s.currentState.stats.name,
    level: s.currentState.stats.level,
    area: s.currentState.worldState.currentArea,
  }));

  res.json({
    status: 'online',
    version: 'Phase 7',
    onlinePlayers,
    activePartyCombats: partyCombatCount,
    activePvPSessions,
    activeBossEvents: activeBossEvents.length,
    uptime: process.uptime(),
    memoryUsageMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    players: onlineList,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/areas — area population
app.get('/api/areas', (_req, res) => {
  const areaMap = new Map<string, { count: number; players: string[] }>();

  for (const [, session] of sessions) {
    const areaId = session.currentState.worldState.currentArea;
    if (!areaMap.has(areaId)) areaMap.set(areaId, { count: 0, players: [] });
    const entry = areaMap.get(areaId)!;
    entry.count++;
    entry.players.push(session.currentState.stats.name);
  }

  res.json({ areas: Object.fromEntries(areaMap), total: sessions.size });
});

// ─── Admin Routes (require auth) ─────────────────────────────────────────────

// GET /admin/stats — full server stats
app.get('/admin/stats', adminAuth, (_req, res) => {
  const memUsage = process.memoryUsage();
  const partyList = partyManager.getAllParties();

  res.json({
    onlinePlayers: sessions.size,
    uptimeSeconds: Math.round(process.uptime()),
    memoryHeapMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
    activePartyCombats: activePartyCombats.size,
    activePvPSessions: pvpManager.getActiveSessions().length,
    activeWorldBossEvents: worldBossEngine.getAllActiveEvents().length,
    parties: partyList.length,
    version: 'Phase 7',
  });
});

// GET /admin/players — all online players with full save state summary
app.get('/admin/players', adminAuth, (_req, res) => {
  const players = [...sessions.values()].map(s => ({
    playerId: s.playerId,
    name: s.currentState.stats.name,
    level: s.currentState.stats.level,
    hp: s.currentState.stats.hp,
    maxHp: s.currentState.stats.maxHp,
    mana: s.currentState.stats.mana,
    maxMana: s.currentState.stats.mana,
    gold: s.currentState.stats.gold,
    exp: s.currentState.stats.exp,
    area: s.currentState.worldState.currentArea,
    city: s.currentState.worldState.currentCity,
    partyId: s.currentState.partyId,
    pvpEnabled: s.currentState.pvp.enabled,
    achievementsUnlocked: s.currentState.achievements?.length ?? 0,
    itemsOwned: s.currentState.inventory.length,
    skillsTotal: s.currentState.skills.physical.length +
                 s.currentState.skills.magic.length +
                 s.currentState.skills.support.length,
    connectedAt: s.connectedAt,
    lastActivity: s.lastActivity,
  }));

  res.json({ players, count: players.length });
});

// POST /admin/broadcast — send message to all online players
app.post('/admin/broadcast', adminAuth, (req, res) => {
  const { message } = req.body as { message?: string };
  if (!message) {
    res.status(400).json({ error: 'Missing "message" field' });
    return;
  }

  const formatted = [
    '',
    '╔═══════════════════════════════════════════════════════════════╗',
    `║  📢 SERVER ANNOUNCEMENT                                       ║`,
    `║  ${message.substring(0, 54).padEnd(54)}║`,
    '╚═══════════════════════════════════════════════════════════════╝',
  ].join('\n');

  worldBossEngine.broadcastServerMessage(formatted);
  res.json({ success: true, recipients: sessions.size, message });
});

// POST /admin/worldboss/spawn — spawn a world boss
app.post('/admin/worldboss/spawn', adminAuth, (req, res) => {
  const { bossId } = req.body as { bossId?: string };
  const available = Object.keys(WORLD_BOSS_DEFS);

  if (bossId && !WORLD_BOSS_DEFS[bossId]) {
    res.status(400).json({ error: `Unknown bossId. Available: ${available.join(', ')}` });
    return;
  }

  const event = worldBossEngine.spawnWorldBoss(bossId);
  if (!event) {
    res.status(409).json({ error: 'A world boss is already active.' });
    return;
  }

  const def = WORLD_BOSS_DEFS[event.bossId];
  res.json({ success: true, bossId: event.bossId, bossName: def?.name, areaId: event.areaId });
});

// GET /admin/worldboss — list world boss definitions and active events
app.get('/admin/worldboss', adminAuth, (_req, res) => {
  const defs = Object.values(WORLD_BOSS_DEFS).map(d => ({
    id: d.id,
    name: d.name,
    level: d.level,
    maxHp: d.maxHp,
    spawnIntervalMinutes: d.spawnIntervalMinutes,
    minPlayersRequired: d.minPlayersRequired,
  }));
  const active = worldBossEngine.getAllActiveEvents().map(e => ({
    bossId: e.bossId,
    areaId: e.areaId,
    currentHp: e.currentHp,
    maxHp: e.maxHp,
    participants: e.participants.length,
    expiresAt: new Date(e.expiresAt).toISOString(),
  }));
  res.json({ definitions: defs, active });
});

// DELETE /admin/worldboss — despawn active world boss
app.delete('/admin/worldboss', adminAuth, (req, res) => {
  const { bossId } = req.query as { bossId?: string };
  const event = worldBossEngine.getActiveEvent(bossId);
  if (!event) {
    res.status(404).json({ error: 'No active world boss found.' });
    return;
  }

  const result = worldBossEngine.killWorldBoss(event.bossId);
  res.json({ success: true, bossId: event.bossId, result: result ? 'killed' : 'despawned' });
});

// GET /admin/pvp — list active PvP sessions
app.get('/admin/pvp', adminAuth, (_req, res) => {
  const sessions2 = pvpManager.getActiveSessions().map(s => ({
    sessionId: s.sessionId,
    attackerId: s.attackerId,
    defenderId: s.defenderId,
    areaId: s.areaId,
    round: s.round,
    winner: s.winner,
    isActive: s.isActive,
  }));
  res.json({ sessions: sessions2, count: sessions2.length });
});

// GET /admin/parties — list active parties
app.get('/admin/parties', adminAuth, (_req, res) => {
  const parties = partyManager.getAllParties?.() ?? [];
  res.json({ parties, count: parties.length });
});

// GET /admin/dungeons — dungeon progress for all online players
app.get('/admin/dungeons', adminAuth, (_req, res) => {
  const dungeonProgress = [...sessions.values()].map(s => ({
    playerId: s.playerId,
    name: s.currentState.stats.name,
    dungeonProgress: s.currentState.worldState.dungeonProgress,
    defeatedBosses: s.currentState.worldState.defeatedBosses,
  }));
  res.json({ dungeonProgress });
});

// ─── Start Server ────────────────────────────────────────────────────────────

let server: HttpServer | null = null;

export function startAdminApi(): void {
  server = app.listen(ADMIN_PORT, () => {
    console.log(`[AdminAPI] REST server listening on http://localhost:${ADMIN_PORT}`);
    console.log(`[AdminAPI] Auth: set X-Admin-Token: ${ADMIN_TOKEN}`);
    console.log(`[AdminAPI] Endpoints:`);
    console.log(`  GET  /api/status          — public server status`);
    console.log(`  GET  /api/areas           — area population`);
    console.log(`  GET  /admin/stats         — admin stats`);
    console.log(`  GET  /admin/players       — all online players`);
    console.log(`  POST /admin/broadcast     — broadcast message`);
    console.log(`  POST /admin/worldboss/spawn — spawn world boss`);
    console.log(`  GET  /admin/worldboss     — world boss info`);
    console.log(`  DEL  /admin/worldboss     — despawn world boss`);
    console.log(`  GET  /admin/pvp           — active PvP sessions`);
    console.log(`  GET  /admin/parties       — active parties`);
  });
}

export function stopAdminApi(): void {
  server?.close();
  server = null;
}

// Auto-start if run directly
if (require.main === module) {
  startAdminApi();
}
