"use strict";
/**
 * Phase 9 — REST Admin API
 * Express server with JWT auth, player CRUD, ban/unban, PvP toggle, audit log,
 * rate limiting, and static file serving for the admin browser UI.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAdminApi = startAdminApi;
exports.stopAdminApi = stopAdminApi;
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const index_1 = require("../index");
const WorldBossEngine_1 = require("../engine/WorldBossEngine");
const PvPManager_1 = require("../social/PvPManager");
const WorldBossEngine_2 = require("../engine/WorldBossEngine");
const PartyManager_1 = require("../social/PartyManager");
const PartyCombatManager_1 = require("../engine/PartyCombatManager");
const AdminDbManager_1 = require("../persistence/AdminDbManager");
const RateLimiter_1 = require("./RateLimiter");
const ADMIN_PORT = process.env.ADMIN_PORT ? parseInt(process.env.ADMIN_PORT) : 3001;
// ─── Auth middleware ────────────────────────────────────────────────────────────
async function adminAuth(req, res, next) {
    const raw = req.headers['authorization'];
    if (!raw?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    const token = raw.slice(7);
    const payload = (0, AdminDbManager_1.verifyJwt)(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const admin = await (0, AdminDbManager_1.getAdminById)(payload.adminId);
    if (!admin) {
        res.status(401).json({ error: 'Admin account not found' });
        return;
    }
    req.admin = admin;
    req.adminSessionId = payload.sessionId;
    next();
}
// ─── Helpers ────────────────────────────────────────────────────────────────────
function adminAudit(admin, action, targetType, targetId, payload, ip) {
    void (0, AdminDbManager_1.writeAuditLog)({
        adminId: admin.id,
        adminName: admin.username,
        action,
        targetType,
        targetId,
        payload: JSON.stringify(payload),
        ipAddress: ip,
        performedAt: new Date().toISOString(),
    });
}
function extractIp(req) {
    return (req.socket?.remoteAddress ?? req.ip ?? 'unknown');
}
function safeSessionPlayer(session) {
    return {
        playerId: session.playerId,
        name: session.currentState.stats.name,
        level: session.currentState.stats.level,
        hp: session.currentState.stats.hp,
        maxHp: session.currentState.stats.maxHp,
        mana: session.currentState.stats.mana,
        maxMana: session.currentState.stats.maxMana,
        gold: session.currentState.stats.gold,
        exp: session.currentState.stats.exp,
        area: session.currentState.worldState.currentArea,
        city: session.currentState.worldState.currentCity,
        partyId: session.currentState.partyId,
        pvpEnabled: session.currentState.pvp.enabled,
        achievementsUnlocked: session.currentState.achievements?.length ?? 0,
        itemsOwned: session.currentState.inventory.length,
        skillsTotal: (session.currentState.skills.physical?.length ?? 0) +
            (session.currentState.skills.magic?.length ?? 0) +
            (session.currentState.skills.support?.length ?? 0),
        connectedAt: session.connectedAt?.toISOString(),
        lastActivity: session.lastActivity?.toISOString(),
        regenState: session.regenState,
        dungeonProgress: session.currentState.worldState.dungeonProgress,
        defeatedBosses: session.currentState.worldState.defeatedBosses,
        pvpStats: session.currentState.pvpStats,
        achievements: session.currentState.achievements,
    };
}
// ─── Express App ───────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(RateLimiter_1.rateLimitMiddleware);
// ─── Login / Logout ───────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'username and password are required' });
        return;
    }
    const admin = await (0, AdminDbManager_1.verifyAdminPassword)(username, password);
    if (!admin) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const ip = extractIp(req);
    const session = await (0, AdminDbManager_1.createAdminSession)(admin.id, ip);
    adminAudit(admin, 'LOGIN', 'server', null, { username }, ip);
    res.json({
        token: session.token,
        admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            lastLogin: admin.lastLogin,
        },
    });
});
app.post('/api/admin/logout', adminAuth, async (req, res) => {
    const admin = req.admin;
    const sessionId = req.adminSessionId;
    await (0, AdminDbManager_1.deleteAdminSession)(sessionId);
    adminAudit(admin, 'LOGOUT', 'server', null, {}, extractIp(req));
    res.json({ success: true });
});
// ─── Self management ────────────────────────────────────────────────────────────
app.get('/api/admin/me', adminAuth, async (req, res) => {
    const admin = req.admin;
    res.json({ id: admin.id, username: admin.username, role: admin.role, lastLogin: admin.lastLogin });
});
app.post('/api/admin/password', adminAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const admin = req.admin;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'currentPassword and newPassword are required' });
        return;
    }
    if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
    }
    const verified = await (0, AdminDbManager_1.verifyAdminPassword)(admin.username, currentPassword);
    if (!verified) {
        res.status(403).json({ error: 'Current password is incorrect' });
        return;
    }
    await (0, AdminDbManager_1.changePassword)(admin.id, newPassword);
    adminAudit(admin, 'CHANGE_PASSWORD', 'server', null, {}, extractIp(req));
    res.json({ success: true });
});
// ─── Admin account management (superadmin only) ────────────────────────────────
app.get('/api/admin/admins', adminAuth, async (_req, res) => {
    const admins = await (0, AdminDbManager_1.getAllAdmins)();
    res.json({ admins });
});
app.post('/api/admin/admins', adminAuth, async (req, res) => {
    const admin = req.admin;
    if (admin.role !== 'superadmin') {
        res.status(403).json({ error: 'Only superadmins can create admin accounts' });
        return;
    }
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        res.status(400).json({ error: 'username, password, and role are required' });
        return;
    }
    if (role !== 'admin' && role !== 'superadmin') {
        res.status(400).json({ error: 'role must be "admin" or "superadmin"' });
        return;
    }
    const result = await (0, AdminDbManager_1.createAdminAccount)(username, password, role, admin.id);
    adminAudit(admin, 'CREATE_ADMIN', 'server', result.id, { username, role }, extractIp(req));
    res.json({ success: true, id: result.id });
});
app.delete('/api/admin/admins/:id', adminAuth, async (req, res) => {
    const admin = req.admin;
    if (admin.role !== 'superadmin') {
        res.status(403).json({ error: 'Only superadmins can deactivate admin accounts' });
        return;
    }
    if (admin.id === req.params.id) {
        res.status(400).json({ error: 'Cannot deactivate your own account' });
        return;
    }
    await (0, AdminDbManager_1.deactivateAdmin)(req.params.id);
    adminAudit(admin, 'DEACTIVATE_ADMIN', 'server', req.params.id, {}, extractIp(req));
    res.json({ success: true });
});
// ─── Audit Log ────────────────────────────────────────────────────────────────
app.get('/api/admin/audit', adminAuth, async (req, res) => {
    const rawLimit = parseInt(req.query['limit'] ?? '100', 10);
    const rawOffset = parseInt(req.query['offset'] ?? '0', 10);
    if (isNaN(rawLimit) || isNaN(rawOffset)) {
        res.status(400).json({ error: 'limit and offset must be valid integers' });
        return;
    }
    const limit = Math.min(Math.max(1, rawLimit), 500);
    const offset = Math.max(0, rawOffset);
    const logs = await (0, AdminDbManager_1.getAuditLog)(limit, offset);
    res.json({ logs, limit, offset });
});
// ─── Public Routes (no auth) ─────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
    const memUsage = process.memoryUsage();
    const activeBossEvents = WorldBossEngine_1.worldBossEngine.getAllActiveEvents();
    const activePvPSessions = PvPManager_1.pvpManager.getActiveSessions().length;
    const partyCombatCount = PartyCombatManager_1.activePartyCombats.size;
    const playerSessions = [...index_1.sessions.values()];
    res.json({
        status: 'online',
        version: 'Phase 9',
        onlinePlayers: playerSessions.length,
        activePartyCombats: partyCombatCount,
        activePvPSessions,
        activeBossEvents: activeBossEvents.length,
        uptime: process.uptime(),
        memoryUsageMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        timestamp: new Date().toISOString(),
    });
});
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
// ─── Admin Routes ──────────────────────────────────────────────────────────────
// GET /admin/stats
app.get('/admin/stats', adminAuth, (_req, res) => {
    const memUsage = process.memoryUsage();
    const partyList = PartyManager_1.partyManager.getAllParties?.() ?? [];
    res.json({
        onlinePlayers: index_1.sessions.size,
        uptimeSeconds: Math.round(process.uptime()),
        memoryHeapMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
        activePartyCombats: PartyCombatManager_1.activePartyCombats.size,
        activePvPSessions: PvPManager_1.pvpManager.getActiveSessions().length,
        activeWorldBossEvents: WorldBossEngine_1.worldBossEngine.getAllActiveEvents().length,
        parties: partyList.length,
        version: 'Phase 9',
    });
});
// GET /admin/players
app.get('/admin/players', adminAuth, (req, res) => {
    const search = req.query['search']?.toLowerCase();
    const players = [...index_1.sessions.values()].map(safeSessionPlayer);
    const filtered = search
        ? players.filter(p => p.name.toLowerCase().includes(search) || p.playerId.includes(search))
        : players;
    res.json({ players: filtered, count: filtered.length, totalOnline: index_1.sessions.size });
});
// GET /admin/players/:playerId
app.get('/admin/players/:playerId', adminAuth, (req, res) => {
    const { playerId } = req.params;
    for (const [, session] of index_1.sessions) {
        if (session.playerId === playerId) {
            res.json({ player: safeSessionPlayer(session), online: true });
            return;
        }
    }
    res.status(404).json({ error: 'Player not found or offline' });
});
// POST /admin/players/:playerId/stats
app.post('/admin/players/:playerId/stats', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { playerId } = req.params;
    const session = [...index_1.sessions.values()].find(s => s.playerId === playerId);
    if (!session) {
        res.status(404).json({ error: 'Player not online' });
        return;
    }
    const { hp, maxHp, mana, maxMana, level, exp, gold } = req.body;
    const before = { ...session.currentState.stats };
    if (hp !== undefined)
        session.currentState.stats.hp = Math.max(0, hp);
    if (maxHp !== undefined)
        session.currentState.stats.maxHp = Math.max(1, maxHp);
    if (mana !== undefined)
        session.currentState.stats.mana = Math.max(0, mana);
    if (maxMana !== undefined)
        session.currentState.stats.maxMana = Math.max(1, maxMana);
    if (level !== undefined)
        session.currentState.stats.level = Math.max(1, Math.min(100, level));
    if (exp !== undefined)
        session.currentState.stats.exp = Math.max(0, exp);
    if (gold !== undefined)
        session.currentState.stats.gold = Math.max(0, gold);
    adminAudit(admin, 'MODIFY_STATS', 'player', playerId, { before, after: session.currentState.stats }, extractIp(req));
    res.json({ success: true, stats: session.currentState.stats });
});
// POST /admin/players/:playerId/gold
app.post('/admin/players/:playerId/gold', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { playerId } = req.params;
    const { amount } = req.body;
    const session = [...index_1.sessions.values()].find(s => s.playerId === playerId);
    if (!session) {
        res.status(404).json({ error: 'Player not online' });
        return;
    }
    if (amount === undefined) {
        res.status(400).json({ error: 'amount is required' });
        return;
    }
    const before = session.currentState.stats.gold;
    session.currentState.stats.gold = Math.max(0, session.currentState.stats.gold + amount);
    adminAudit(admin, amount >= 0 ? 'ADD_GOLD' : 'REMOVE_GOLD', 'player', playerId, { before, added: amount, after: session.currentState.stats.gold }, extractIp(req));
    res.json({ success: true, gold: session.currentState.stats.gold });
});
// POST /admin/players/:playerId/kick
app.post('/admin/players/:playerId/kick', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { playerId } = req.params;
    const { reason } = req.body;
    const session = [...index_1.sessions.values()].find(s => s.playerId === playerId);
    if (!session) {
        res.status(404).json({ error: 'Player not online' });
        return;
    }
    const msg = reason ? `You have been kicked: ${reason}` : 'You have been kicked by an administrator.';
    session.socket.send(JSON.stringify({ type: 'kicked', text: msg }));
    setTimeout(() => session.socket.terminate(), 1000);
    adminAudit(admin, 'KICK_PLAYER', 'player', playerId, { reason: reason ?? 'no reason' }, extractIp(req));
    res.json({ success: true });
});
// POST /admin/broadcast
app.post('/admin/broadcast', adminAuth, (req, res) => {
    const admin = req.admin;
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
    adminAudit(admin, 'BROADCAST', 'server', null, { message }, extractIp(req));
    res.json({ success: true, recipients: index_1.sessions.size, message });
});
// ─── Bans ─────────────────────────────────────────────────────────────────────
app.get('/admin/bans', adminAuth, async (_req, res) => {
    const bans = await (0, AdminDbManager_1.getActiveBans)();
    res.json({ bans, count: bans.length });
});
app.post('/admin/bans', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { playerId, playerName, reason, expiresAt } = req.body;
    if (!playerId || !playerName) {
        res.status(400).json({ error: 'playerId and playerName are required' });
        return;
    }
    await (0, AdminDbManager_1.banPlayer)(playerId, playerName, admin.id, admin.username, reason ?? null, expiresAt ?? null);
    // Kick if online
    for (const [, session] of index_1.sessions) {
        if (session.playerId === playerId) {
            session.socket.send(JSON.stringify({ type: 'kicked', text: 'Your account has been suspended.' }));
            setTimeout(() => session.socket.terminate(), 500);
        }
    }
    adminAudit(admin, 'BAN_PLAYER', 'player', playerId, { playerName, reason, expiresAt }, extractIp(req));
    res.json({ success: true });
});
app.delete('/admin/bans/:playerId', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { playerId } = req.params;
    await (0, AdminDbManager_1.unbanPlayer)(playerId);
    adminAudit(admin, 'UNBAN_PLAYER', 'player', playerId, {}, extractIp(req));
    res.json({ success: true });
});
// ─── PvP Settings ─────────────────────────────────────────────────────────────
app.get('/admin/pvp', adminAuth, async (_req, res) => {
    const settings = await (0, AdminDbManager_1.getAllPvPSettings)();
    res.json({ settings });
});
app.post('/admin/pvp', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { scope, enabled } = req.body;
    if (!scope || enabled === undefined) {
        res.status(400).json({ error: 'scope and enabled are required' });
        return;
    }
    await (0, AdminDbManager_1.setPvPSetting)(scope, enabled, admin.id);
    adminAudit(admin, enabled ? 'ENABLE_PVP' : 'DISABLE_PVP', scope === 'global' ? 'server' : 'city', scope, { scope, enabled }, extractIp(req));
    res.json({ success: true, scope, enabled });
});
// ─── World Boss ───────────────────────────────────────────────────────────────
app.post('/admin/worldboss/spawn', adminAuth, async (req, res) => {
    const admin = req.admin;
    const { bossId } = req.body;
    if (bossId && !WorldBossEngine_2.WORLD_BOSS_DEFS[bossId]) {
        res.status(400).json({ error: `Unknown bossId. Available: ${Object.keys(WorldBossEngine_2.WORLD_BOSS_DEFS).join(', ')}` });
        return;
    }
    const event = WorldBossEngine_1.worldBossEngine.spawnWorldBoss(bossId);
    if (!event) {
        res.status(409).json({ error: 'A world boss is already active.' });
        return;
    }
    const def = WorldBossEngine_2.WORLD_BOSS_DEFS[event.bossId];
    adminAudit(admin, 'SPAWN_WORLDBOSS', 'server', null, { bossId: event.bossId }, extractIp(req));
    res.json({ success: true, bossId: event.bossId, bossName: def?.name, areaId: event.areaId });
});
app.get('/admin/worldboss', adminAuth, (_req, res) => {
    const defs = Object.values(WorldBossEngine_2.WORLD_BOSS_DEFS).map(d => ({
        id: d.id, name: d.name, level: d.level, maxHp: d.maxHp,
        spawnIntervalMinutes: d.spawnIntervalMinutes, minPlayersRequired: d.minPlayersRequired,
    }));
    const active = WorldBossEngine_1.worldBossEngine.getAllActiveEvents().map(e => ({
        bossId: e.bossId, areaId: e.areaId, currentHp: e.currentHp, maxHp: e.maxHp,
        participants: e.participants.length, expiresAt: new Date(e.expiresAt).toISOString(),
    }));
    res.json({ definitions: defs, active });
});
app.delete('/admin/worldboss', adminAuth, (req, res) => {
    const admin = req.admin;
    const { bossId } = req.query;
    const event = WorldBossEngine_1.worldBossEngine.getActiveEvent(bossId);
    if (!event) {
        res.status(404).json({ error: 'No active world boss found.' });
        return;
    }
    WorldBossEngine_1.worldBossEngine.killWorldBoss(event.bossId);
    adminAudit(admin, 'KILL_WORLDBOSS', 'server', null, { bossId: event.bossId }, extractIp(req));
    res.json({ success: true, bossId: event.bossId });
});
// ─── Content Reload ────────────────────────────────────────────────────────────
const HotReloadWatcher_1 = require("../content/HotReloadWatcher");
const EventEngine_1 = require("../content/EventEngine");
// Content catalog file paths
const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');
const CATALOG_MAP = {
    areas: 'areas.json', enemies: 'enemies.json', items: 'items.json',
    skills: 'skills.json', crafting: 'crafting.json', dungeons: 'dungeons.json',
    shops: 'shops.json', events: 'events.json',
};
app.post('/admin/content/reload', adminAuth, (req, res) => {
    const admin = req.admin;
    const result = (0, HotReloadWatcher_1.manualReload)();
    if (result.success) {
        adminAudit(admin, 'RELOAD_CONTENT', 'server', null, {}, extractIp(req));
        res.json({ success: true, message: result.message });
    }
    else {
        res.status(500).json({ success: false, error: result.message });
    }
});
app.get('/admin/content/:catalog', adminAuth, (req, res) => {
    const catalog = req.params.catalog;
    const filename = CATALOG_MAP[catalog];
    if (!filename) {
        res.status(400).json({ error: 'Unknown catalog' });
        return;
    }
    const filePath = path.join(CONTENT_DIR, filename);
    try {
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Catalog not found' });
            return;
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        res.json({ data, catalog, path: filename });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to read catalog: ' + e.message });
    }
});
app.post('/admin/content/save', adminAuth, (req, res) => {
    const admin = req.admin;
    const { catalog, json } = req.body;
    const filename = CATALOG_MAP[catalog];
    if (!filename) {
        res.status(400).json({ error: 'Unknown catalog' });
        return;
    }
    const filePath = path.join(CONTENT_DIR, filename);
    // Security: verify the resolved path stays within CONTENT_DIR
    if (!path.resolve(filePath).startsWith(path.resolve(CONTENT_DIR))) {
        res.status(403).json({ error: 'Forbidden: path traversal detected' });
        return;
    }
    try {
        // Validate that json is a string and parseable
        if (typeof json !== 'string') {
            res.status(400).json({ error: 'json must be a string' });
            return;
        }
        const parsed = JSON.parse(json); // validate
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            res.status(400).json({ error: 'json must be a JSON object' });
            return;
        }
        fs.writeFileSync(filePath, json, 'utf-8');
        const result = (0, HotReloadWatcher_1.manualReload)();
        adminAudit(admin, 'SAVE_CONTENT', 'server', catalog, { catalog, filename }, extractIp(req));
        res.json({ success: result.success, message: result.message });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// Events
app.get('/admin/events', adminAuth, (_req, res) => {
    const allEvents = (0, EventEngine_1.getAllEvents)();
    const eventList = Object.values(allEvents).map(ev => ({
        id: ev.id,
        title: ev.title,
        type: ev.type,
        startTime: ev.startTime,
        endTime: ev.endTime,
        effects: ev.effects,
        description: ev.description,
    }));
    res.json(eventList);
});
app.post('/admin/events', adminAuth, (req, res) => {
    const admin = req.admin;
    const event = req.body;
    if (!event.id || !event.title || !event.type) {
        res.status(400).json({ success: false, error: 'id, title, and type are required' });
        return;
    }
    try {
        const filePath = path.join(CONTENT_DIR, 'events.json');
        let data = {};
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            data = JSON.parse(raw);
        }
        if (!data.events)
            data.events = {};
        delete data.events[event.id];
        data.events[event.id] = {
            id: event.id,
            title: event.title,
            type: event.type,
            startTime: event.startTime,
            endTime: event.endTime,
            effects: event.effects || {},
            description: event.description || '',
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        adminAudit(admin, 'CREATE_EVENT', 'server', event.id, event, extractIp(req));
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ─── Parties ───────────────────────────────────────────────────────────────────
app.get('/admin/parties', adminAuth, (_req, res) => {
    const parties = PartyManager_1.partyManager.getAllParties?.() ?? [];
    res.json({ parties, count: parties.length });
});
// ─── PvP sessions ──────────────────────────────────────────────────────────────
app.get('/admin/pvp-sessions', adminAuth, (_req, res) => {
    const sess = PvPManager_1.pvpManager.getActiveSessions().map(s => ({
        sessionId: s.sessionId, attackerId: s.attackerId, defenderId: s.defenderId,
        areaId: s.areaId, round: s.round, winner: s.winner, isActive: s.isActive,
    }));
    res.json({ sessions: sess, count: sess.length });
});
// ─── Static file serving for admin UI ─────────────────────────────────────────
const UI_DIR = path.join(__dirname, '..', '..', 'admin');
const indexPath = path.join(UI_DIR, 'index.html');
function serveAdminUI(req, res) {
    let urlPath = req.path === '/' || req.path === '' ? '/index.html' : req.path;
    let filePath = path.join(UI_DIR, urlPath);
    // Security: prevent path traversal
    if (!filePath.startsWith(UI_DIR)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    if (!fs.existsSync(filePath)) {
        // Fallback to index.html for SPA routing
        filePath = indexPath;
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Admin UI not found. Build it first.' });
            return;
        }
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html', '.js': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json',
        '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    };
    res.setHeader('Content-Type', mimeTypes[ext] ?? 'text/plain');
    res.sendFile(filePath);
}
app.use('/admin-panel', (_req, _res, _next) => { });
app.get('/admin-panel', serveAdminUI);
app.use('/admin-panel', express_1.default.static(UI_DIR, { index: 'index.html' }));
// Catch-all for SPA (must come after static files)
const spaHandler = (req, res) => {
    serveAdminUI(req, res);
};
app.get('/admin-panel/*path', spaHandler);
app.use('/admin-panel/*path', spaHandler);
// ─── Start Server ───────────────────────────────────────────────────────────────
let server = null;
function startAdminApi() {
    // Ensure admin UI directory exists
    if (!fs.existsSync(UI_DIR)) {
        fs.mkdirSync(UI_DIR, { recursive: true });
        // Write a placeholder index
        fs.writeFileSync(path.join(UI_DIR, 'index.html'), '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Last Line Admin</title></head>' +
            '<body><h1>Last Line Admin Panel</h1><p>Phase 9 admin UI — build /admin-panel/index.html</p></body></html>');
    }
    server = app.listen(ADMIN_PORT, () => {
        console.log(`[AdminAPI] REST server listening on http://localhost:${ADMIN_PORT}`);
        console.log(`[AdminAPI] Phase 9 — JWT auth, player CRUD, bans, PvP toggle, audit log`);
        console.log(`[AdminAPI] Admin UI: http://localhost:${ADMIN_PORT}/admin-panel`);
        console.log(`[AdminAPI] Default credentials: admin / changeme (change password after first login)`);
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