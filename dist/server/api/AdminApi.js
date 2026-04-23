"use strict";
/**
 * Phase 7 — REST Admin API
 * Basic Express server for game administration and monitoring.
 * Run separately: `node dist/server/api/AdminApi.js`
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAdminApi = startAdminApi;
exports.stopAdminApi = stopAdminApi;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const WorldBossEngine_1 = require("../engine/WorldBossEngine");
const PvPManager_1 = require("../social/PvPManager");
const WorldBossEngine_2 = require("../engine/WorldBossEngine");
const PartyManager_1 = require("../social/PartyManager");
const PartyCombatManager_1 = require("../engine/PartyCombatManager");
const ADMIN_PORT = process.env.ADMIN_PORT ? parseInt(process.env.ADMIN_PORT) : 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'changeme';
// ─── Auth middleware ──────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || token !== ADMIN_TOKEN) {
        res.status(401).json({ error: 'Unauthorized — set X-Admin-Token header' });
        return;
    }
    next();
}
// ─── Express App ─────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
app.use(express_1.default.json());
// ─── Public Routes ───────────────────────────────────────────────────────────
// GET /api/status — server status (no auth)
app.get('/api/status', (_req, res) => {
    const memUsage = process.memoryUsage();
    const activeBossEvents = WorldBossEngine_1.worldBossEngine.getAllActiveEvents();
    const activePvPSessions = PvPManager_1.pvpManager.getActiveSessions().length;
    const partyCombatCount = PartyCombatManager_1.activePartyCombats.size;
    const playerSessions = [...index_1.sessions.values()];
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
    const areaMap = new Map();
    for (const [, session] of index_1.sessions) {
        const areaId = session.currentState.worldState.currentArea;
        if (!areaMap.has(areaId))
            areaMap.set(areaId, { count: 0, players: [] });
        const entry = areaMap.get(areaId);
        entry.count++;
        entry.players.push(session.currentState.stats.name);
    }
    res.json({ areas: Object.fromEntries(areaMap), total: index_1.sessions.size });
});
// ─── Admin Routes (require auth) ─────────────────────────────────────────────
// GET /admin/stats — full server stats
app.get('/admin/stats', adminAuth, (_req, res) => {
    const memUsage = process.memoryUsage();
    const partyList = PartyManager_1.partyManager.getAllParties();
    res.json({
        onlinePlayers: index_1.sessions.size,
        uptimeSeconds: Math.round(process.uptime()),
        memoryHeapMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
        activePartyCombats: PartyCombatManager_1.activePartyCombats.size,
        activePvPSessions: PvPManager_1.pvpManager.getActiveSessions().length,
        activeWorldBossEvents: WorldBossEngine_1.worldBossEngine.getAllActiveEvents().length,
        parties: partyList.length,
        version: 'Phase 7',
    });
});
// GET /admin/players — all online players with full save state summary
app.get('/admin/players', adminAuth, (_req, res) => {
    const players = [...index_1.sessions.values()].map(s => ({
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
    const { message } = req.body;
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
    WorldBossEngine_1.worldBossEngine.broadcastServerMessage(formatted);
    res.json({ success: true, recipients: index_1.sessions.size, message });
});
// POST /admin/worldboss/spawn — spawn a world boss
app.post('/admin/worldboss/spawn', adminAuth, (req, res) => {
    const { bossId } = req.body;
    const available = Object.keys(WorldBossEngine_2.WORLD_BOSS_DEFS);
    if (bossId && !WorldBossEngine_2.WORLD_BOSS_DEFS[bossId]) {
        res.status(400).json({ error: `Unknown bossId. Available: ${available.join(', ')}` });
        return;
    }
    const event = WorldBossEngine_1.worldBossEngine.spawnWorldBoss(bossId);
    if (!event) {
        res.status(409).json({ error: 'A world boss is already active.' });
        return;
    }
    const def = WorldBossEngine_2.WORLD_BOSS_DEFS[event.bossId];
    res.json({ success: true, bossId: event.bossId, bossName: def?.name, areaId: event.areaId });
});
// GET /admin/worldboss — list world boss definitions and active events
app.get('/admin/worldboss', adminAuth, (_req, res) => {
    const defs = Object.values(WorldBossEngine_2.WORLD_BOSS_DEFS).map(d => ({
        id: d.id,
        name: d.name,
        level: d.level,
        maxHp: d.maxHp,
        spawnIntervalMinutes: d.spawnIntervalMinutes,
        minPlayersRequired: d.minPlayersRequired,
    }));
    const active = WorldBossEngine_1.worldBossEngine.getAllActiveEvents().map(e => ({
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
    const { bossId } = req.query;
    const event = WorldBossEngine_1.worldBossEngine.getActiveEvent(bossId);
    if (!event) {
        res.status(404).json({ error: 'No active world boss found.' });
        return;
    }
    const result = WorldBossEngine_1.worldBossEngine.killWorldBoss(event.bossId);
    res.json({ success: true, bossId: event.bossId, result: result ? 'killed' : 'despawned' });
});
// GET /admin/pvp — list active PvP sessions
app.get('/admin/pvp', adminAuth, (_req, res) => {
    const sessions2 = PvPManager_1.pvpManager.getActiveSessions().map(s => ({
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
    const parties = PartyManager_1.partyManager.getAllParties?.() ?? [];
    res.json({ parties, count: parties.length });
});
// GET /admin/dungeons — dungeon progress for all online players
app.get('/admin/dungeons', adminAuth, (_req, res) => {
    const dungeonProgress = [...index_1.sessions.values()].map(s => ({
        playerId: s.playerId,
        name: s.currentState.stats.name,
        dungeonProgress: s.currentState.worldState.dungeonProgress,
        defeatedBosses: s.currentState.worldState.defeatedBosses,
    }));
    res.json({ dungeonProgress });
});
// ─── Start Server ────────────────────────────────────────────────────────────
let server = null;
function startAdminApi() {
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
function stopAdminApi() {
    server?.close();
    server = null;
}
// Auto-start if run directly
if (require.main === module) {
    startAdminApi();
}
//# sourceMappingURL=AdminApi.js.map