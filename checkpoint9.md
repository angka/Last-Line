# Phase 9 Checkpoint — Admin Panel

**Date**: 2026-04-27
**Status**: ✅ Complete

---

## What Was Built

Phase 9 implements a full admin panel with JWT authentication, player management, ban/unban system, per-area PvP toggle, audit logging, WebSocket ban rejection, rate limiting, and a complete browser-based admin UI.

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| Admin auth (JWT) | ✅ | bcrypt password verify, 8h JWT expiry, login/logout |
| Admin DB (separate) | ✅ | `saves/admin.db` — admins, sessions, audit_log, pvp_settings, player_bans |
| Default admin account | ✅ | username: `admin` / password: `changeme` (change on first login) |
| Player CRUD | ✅ | View, edit stats, give/remove gold, kick — all online players |
| Ban/unban | ✅ | Permanent or timed bans; auto-kick online banned players on ban |
| WebSocket ban rejection | ✅ | Banned players blocked at connect time (register + load) |
| PvP admin toggle | ✅ | Global + per-city PvP enable/disable via admin DB |
| Audit log | ✅ | Every mutation logged with admin, action, target, payload, IP, timestamp |
| Rate limiting | ✅ | 100 req / 15 min per IP on admin endpoints |
| Admin browser UI | ✅ | Full SPA at `/admin-panel` — login, dashboard, players, bans, PvP, world boss, audit, admins, profile |
| Express on port 3001 | ✅ | Auto-starts with game server |

---

## New Commands (Admin UI)

Open in browser at `http://localhost:3001/admin-panel`

| Panel | Features |
|-------|----------|
| **Dashboard** | Server stats, online players table with quick actions |
| **Players** | Search/filter, view detail (HP, gold, achievements, PvP stats), edit stats, give gold, kick |
| **Bans** | Ban by ID+name, optional reason, optional expiry; unban active bans |
| **PvP Settings** | Toggle switch for global PvP and 14 city areas |
| **World Boss** | Spawn/kill bosses, view active boss, server broadcast |
| **Audit Log** | Paginated log of all admin actions |
| **Admin Accounts** | Superadmin can create/deactivate admin accounts |
| **Profile** | Change own password, view session info |

---

## REST API Endpoints

**Public (no auth):**
```
GET  /api/status          — server status, online count
GET  /api/areas           — area population
POST /api/admin/login     — admin login → JWT token
```

**Admin (Bearer JWT):**
```
GET   /api/admin/me             — current admin info
POST  /api/admin/logout         — invalidate session
POST  /api/admin/password       — change own password
GET   /api/admin/admins         — list all admin accounts
POST  /api/admin/admins         — create admin (superadmin only)
DEL   /api/admin/admins/:id     — deactivate admin (superadmin only)
GET   /api/admin/audit          — audit log (limit/offset)
GET   /admin/stats              — full server stats
GET   /admin/players            — all online players (search param)
GET   /admin/players/:id         — single player detail
POST  /admin/players/:id/stats  — modify player stats
POST  /admin/players/:id/gold    — add/remove gold
POST  /admin/players/:id/kick   — kick player
POST  /admin/broadcast          — server-wide message
GET   /admin/bans               — active bans list
POST  /admin/bans               — ban a player
DEL   /admin/bans/:playerId     — unban a player
GET   /admin/pvp                — PvP settings per area
POST  /admin/pvp                — set PvP scope enabled/disabled
GET   /admin/worldboss           — boss defs + active events
POST  /admin/worldboss/spawn    — spawn world boss
DEL   /admin/worldboss          — kill active world boss
GET   /admin/pvp-sessions       — active PvP sessions
GET   /admin/parties            — active parties
```

---

## File Structure

```
src/
├── types_admin.ts                        ← NEW — AdminAccount, AdminSession, AuditLogEntry,
│                                          PvpSetting, PlayerBan, AdminPlayerSummary,
│                                          AdminServerStats types
├── server/
│   ├── index.ts                          ← Phase 9: isPlayerBanned check at connect
│   │                                       (register + load), async startPvPCombat call
│   ├── api/
│   │   ├── AdminApi.ts                  ← Full rewrite: JWT auth, all admin endpoints,
│   │   │                                   static admin UI serving, SPA fallback
│   │   └── RateLimiter.ts               ← NEW — token bucket rate limiter (100/15min/IP)
│   ├── persistence/
│   │   └── AdminDbManager.ts           ← NEW — admin DB bootstrap, auth, audit,
│   │                                       PvP settings, ban/unban, admin CRUD
│   └── social/
│       └── PvPManager.ts                 ← Phase 9: isPvPAllowedInArea check,
│                                           async startPvPCombat
admin/
└── index.html                           ← Full admin SPA (vanilla JS, no build needed)
```

---

## Key Design Decisions

- **Separate admin DB (`saves/admin.db`)**: Admin data is isolated from player save data. Never depends on player DB being loaded.
- **HMAC-based JWT (no library)**: Token = base64(payload).base64(HMAC-SHA256). No external JWT library needed. 8h expiry.
- **Default superadmin seeded on first run**: `admin / changeme` — UI prompts to change password.
- **PvP toggle is additive**: Both global AND per-city must be enabled for PvP in an area. Admin toggle overrides player `pvp.enabled` flag.
- **Banned players kicked on connect**: Check runs on both `register` and `load` WebSocket messages before session creation.
- **Audit log on every mutation**: Includes admin ID, action name, target, payload diff, IP address, timestamp.
- **Rate limiter is in-memory**: Per-IP sliding window, resets on restart.
- **Admin UI is a pure SPA**: No build step — one `index.html` file with vanilla JS. Served from `admin/` directory.

---

## Environment Variables

```bash
ADMIN_PORT=3001              # Admin API port (default 3001)
ADMIN_JWT_SECRET=...         # JWT signing secret (change in production!)
ADMIN_TOKEN=...              # Old Phase 7 token auth (unused in Phase 9)
```

---

## What Is Stubbed / TODO (Phase 10+)

| Feature | Phase | Notes |
|---------|-------|-------|
| Player auth (register/login/logout) | 10 | Players still auto-register; no bcrypt on player passwords yet |
| Friend system | 10 | friends list, whisper/accept/decline, block |
| Steam / monetization | 11 | Steam API, cosmetic store, entitlements |
| Content hot-update | 12 | JSON overrides, event engine, live editing |

---

## Running the Game

```bash
# Build
npx tsc

# Start server (Phase 9 — includes admin API on port 3001)
node dist/server/index.js

# Admin panel
# Open: http://localhost:3001/admin-panel
# Login: admin / changeme

# Change default password after first login!
```

---

## Next: Phase 10 — Auth & Friends

Next steps: implement player auth with bcrypt registration/login/logout, JWT tokens for players, friend system (send/accept/decline/block), whisper notifications, friend online/offline status, and session invalidation on new login.
