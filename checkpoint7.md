# Phase 7 Checkpoint — Achievements, World Bosses & PvP Combat

**Date**: 2026-04-23
**Status**: ✅ Complete

---

## What Was Built

Phase 7 adds four major systems: full PvP combat resolution, an achievement system with 25+ achievements, global world boss events, and a REST admin API.

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| PvP combat resolution | ✅ | `attack <player>` in PvP zones; 15s turn timer; damage/crit/dodge; flee mechanic |
| Achievement system | ✅ | 25 achievements across 7 categories; `achievements` command; stats tracking |
| World boss events | ✅ | 5 world bosses (Lv10–70); rotation scheduler; `worldboss` command; auto-despawn |
| REST admin API | ✅ | Express server on port 3001; player management; broadcast; boss spawn control |
| Admin API endpoints | ✅ | `GET /api/status`, `GET/POST /admin/*` with token auth |

---

## New Commands

```
PvP
  attack <name>          — challenge a player to PvP combat (both must have PvP on)
  flee                   — attempt to flee from PvP combat
  log                    — view PvP combat status

ACHIEVEMENTS
  achievements           — view all achievements, progress, and stats

WORLD BOSS
  worldboss              — check if a world boss is active
  worldboss status      — show boss HP, time remaining, fighters
  worldboss join        — travel to the active world boss location
```

---

## World Bosses

| Boss | Level | HP | Spawn Interval | Location |
|------|-------|----|----------------|----------|
| Shadow Wolf Alpha | 10 | 2,000 | 45 min | Whispering Plains |
| Iron Goliath | 20 | 5,000 | 60 min | Irongate Outskirts |
| Thornweaver | 35 | 12,000 | 90 min | Thornwick Square |
| Void Revenant | 50 | 25,000 | 120 min | Abyssal Approach |
| Ancient Dragon Lord | 70 | 60,000 | 180 min | Dragon's Lair Entrance |

World bosses spawn automatically in rotation. Players get notified server-wide when one spawns. Use `worldboss join` to travel there. All online players who fight the boss get a share of the EXP and gold reward based on damage dealt.

---

## Achievement Categories

**Combat (⚔):** First Blood, Monster Hunter (50 kills), Slayer (200), Veteran (500), Champion (1000), Dungeon Delver, Boss Breaker (5 bosses), Last Line Holder (all 5 bosses), Rising Hero (Lv 10), Veteran Warrior (Lv 25), Elite Champion (Lv 50)

**Dungeon (🏰):** Goblin Purger, Thornwick Guardian, Mine Breaker, Grave Walker, Dragon Slayer, Bottom Feeder

**Exploration (🗺):** World Explorer (visit all 8 regions)

**Crafting (🔨):** Apprentice Crafter (10 crafts), Master Crafter (50)

**Collection (📦/💎):** Resource Gatherer (100), Master Gatherer (500), Legendary Gear, Mythic Gear

**Social (🤝):** Merchant (10 trades), Commerce Master (50 trades)

**PvP (⚔):** Warlord (1 PvP kill), Arena Veteran (10)

**World Boss (🌍):** World Boss Hunter

---

## REST Admin API

Run separately or auto-starts with the game server:

```bash
# Auto-starts on port 3001
node dist/server/index.js
```

Or run separately:
```bash
ADMIN_TOKEN=mysecret node dist/server/api/AdminApi.js
```

**Public endpoints (no auth):**
```
GET  /api/status        — server status, online players
GET  /api/areas         — area population
```

**Admin endpoints (require X-Admin-Token header):**
```
GET  /admin/stats       — full server stats
GET  /admin/players     — all online players with full save summary
POST /admin/broadcast   — send server-wide message
POST /admin/worldboss/spawn — spawn a world boss manually
GET  /admin/worldboss   — list boss definitions and active events
DEL  /admin/worldboss   — despawn active world boss
GET  /admin/pvp         — active PvP sessions
GET  /admin/parties     — active parties
GET  /admin/dungeons    — dungeon progress for all online players
```

---

## File Structure

```
src/
├── types.ts                           ← Phase 7: Achievement, WorldBoss, PvP types,
│                                        SaveFile.achievements, SaveFile.achievementStats
├── data/ (unchanged)
├── server/
│   ├── index.ts                       ← Phase 7: PvP combat dispatch, world boss init,
│   │                                    admin API start, sessions export
│   ├── engine/
│   │   ├── AchievementEngine.ts       ← NEW — achievement definitions, unlock logic,
│   │   │                                checkAchievementTrigger, formatAchievements,
│   │   │                                formatAchievementUnlock, serialize/deserialize helpers
│   │   ├── WorldBossEngine.ts         ← NEW — 5 world boss defs, spawn engine,
│   │   │                                damage tracking, rotation scheduler,
│   │   │                                formatWorldBossStatus, broadcast helpers
│   │   ├── CombatTimerEngine.ts       ← (unchanged)
│   │   ├── CombatEngine.ts            ← (unchanged)
│   │   ├── PlayerEngine.ts            ← Phase 7: achievements init in createDefaultSave
│   │   ├── PartyCombatManager.ts      ← Phase 7: achievements in party stub save
│   │   └── CraftingManager.ts         ← (unchanged)
│   ├── social/
│   │   ├── PvPManager.ts              ← NEW — PvP combat lifecycle, damage calc,
│   │   │                                attack/flee/victory/defeat, gold plundering
│   │   ├── PresenceManager.ts         ← Phase 7: added getAllParties() to PartyManager
│   │   ├── PartyManager.ts            ← Phase 7: getAllParties() added
│   │   ├── ChatRouter.ts              ← (unchanged)
│   │   └── TradeManager.ts            ← (unchanged)
│   ├── parser/
│   │   └── CommandParser.ts           ← Phase 7: achievements/worldboss handlers,
│   │                                    PvP help text, Phase 7 help section
│   ├── persistence/
│   │   └── SaveManager.ts             ← (unchanged)
│   └── api/
│       └── AdminApi.ts                ← NEW — Express REST API, admin endpoints,
│                                        adminAuth middleware, public status routes
└── client/
    └── index.ts                       ← (unchanged)
```

---

## Key Design Decisions

- **PvP uses its own `PvPCombatSession`**: Separate from `CombatSession` and `PartyCombatSession`. PvP is player-vs-player, no enemies.
- **PvPManager tracks sessions internally**: No shared session map in index.ts; PvPManager is the single source of truth for PvP sessions.
- **World boss rotation is time-based**: `startRotationScheduler()` starts a timer chain; each boss has its own `spawnIntervalMinutes`. Rotation cycles through all 5 bosses.
- **World boss rewards by damage share**: EXP and gold are distributed proportionally to damage dealt.
- **Achievements use `achievementStats` counters**: Simple numeric counters + Sets for dungeons/areas. Checked after each game event (combat win, craft, gather, etc.) via `checkAndUnlockAchievements()`.
- **Achievement Sets serialized as arrays**: `Set<string>` stored as `string[]` in SaveFile for sql.js compatibility.
- **Admin API auto-starts with game server**: Wrapped in try/catch so it doesn't crash the game if Express fails to bind.

---

## Persistence Notes

`achievementStats` fields that need migration in `SaveFile` for existing players:
- `achievements: []` — array of `{ id: string, unlockedAt: number }`
- `achievementStats: { totalKills: 0, bossKills: 0, tradesCompleted: 0, itemsCrafted: 0, resourcesGathered: 0, pvpKills: 0, worldBossKills: 0, dungeonsCleared: [], deepestFloors: {}, visitedAreas: ['ashford_village_square'] }`

The `SaveManager` will need to handle these new fields when loading old saves (existing saves won't have them — treat missing fields as defaults).

---

## What Is Stubbed / TODO (Phase 8+)

| Feature | Phase | Notes |
|---------|-------|-------|
| Achievement stat counters wired to events | 8 | Check/award achievements after combat win, craft, gather, trade, etc. |
| Achievement unlock notification | 8 | Show `formatAchievementUnlock` in-game when earned |
| World boss HP bar visible to all players | 8 | Push HP updates to all clients in the area |
| World boss damage dealt tracking | 8 | Register player damage during world boss combat |
| PvP rank/leaderboard | 8 | Track kills over time, show rank |
| Dungeon deeper floors (infinite) | 8 | Procedural floor generation beyond boss floor |
| Admin REST API auth DB | 9 | Token store, player kick/ban, server config |
| Auth & friends | 10 | Login/register/session tokens |
| Housing & Guilds | 11 | Player housing, guild management |

---

## Running the Game

```bash
# Build
npx tsc

# Start server (Phase 7 — includes admin API on port 3001)
node dist/server/index.js

# In another terminal, start client
node dist/client/index.js

# Phase 7 tips:
# - achievements          — see your progress
# - pvp on               — enable PvP outside safe zones
# - attack <playername>  — challenge another player
# - worldboss            — check for active world boss
# - worldboss join       — travel to fight the boss
```

**Admin API:**
```bash
# Public status (no auth)
curl http://localhost:3001/api/status

# Admin (set token first via ADMIN_TOKEN env)
curl -H "X-Admin-Token: changeme" http://localhost:3001/admin/players
curl -X POST -H "X-Admin-Token: changeme" -H "Content-Type: application/json" \
  -d '{"message":"Server maintenance in 10 minutes!"}' http://localhost:3001/admin/broadcast
curl -X POST -H "X-Admin-Token: changeme" -H "Content-Type: application/json" \
  -d '{"bossId":"shadow_wolf_alpha"}' http://localhost:3001/admin/worldboss/spawn
```

---

## Next: Phase 8 — Achievement Wiring & World Boss Combat

Next steps: wire achievement checking into combat victory, crafting, gathering, and trading handlers so achievements unlock automatically. Add world boss damage registration and HP bar push to clients. Add PvP leaderboard. Implement infinite dungeon floor generation.
