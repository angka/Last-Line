# Phase 12 — Data-Driven Hot Update, Polish & Polish

**Date**: 2026-05-13
**Status**: ✅ Complete

---

## What We're Building

### 1. Data-Driven Hot Update System

**Goal**: Replace hardcoded TypeScript catalogs with JSON files + runtime loading, enabling live content updates and a dynamic event system.

#### Architecture

```
src/server/
├── content/
│   ├── ContentManager.ts     ← Loads/reloads all JSON catalogs at runtime
│   ├── HotReloadWatcher.ts  ← File watcher + admin-triggered reload
│   └── EventEngine.ts       ← Event scheduling, spawning, time-windows
content/
├── areas.json
├── enemies.json
├── items.json
├── skills.json
├── crafting.json
├── dungeons.json
├── shops.json
└── events.json              ← Event definitions with spawn rules
```

#### ContentManager
- Loads all `.json` catalogs from `content/` folder on startup
- `reloadCatalog(name)` — reloads single catalog from disk
- `reloadAll()` — hot-reload everything
- Exposes `getArea()`, `getEnemy()`, `getItem()`, etc. with in-memory cache
- All game code goes through ContentManager instead of importing directly from `.ts` files

#### HotReloadWatcher
- Watches `content/` directory for file changes (fs.watch)
- Auto-reloads on file change in dev mode
- Admin API: `POST /api/content/reload` (admin auth required)
- Admin SPA button: "Reload Content" — reloads all catalogs, notifies connected players

#### EventEngine
- Loads events from `events.json`
- Each event has: `id`, `title`, `startTime`, `endTime`, `type`, `effects`
- Event types:
  - `area_spawn` — Adds a temporary encounter zone / spawns special enemies
  - `drop_modifier` — Boosts drop rates for specific items/enemies
  - `bonus_exp` — All combat gives 2x EXP
  - `enemy_spawn` — Spawns a world boss in a specific area
  - `treasure_spawn` — Adds treasure chests to areas
- `checkActiveEvents()` runs on player login and every 60 seconds
- Active events broadcast to all online players

#### Live World Editing (Admin SPA)
- **Content Editor Tab**: Edit enemies/items/areas/dungeons — textarea with JSON, save writes to file, triggers hot-reload
- **Event Manager Tab**: List all events, create/edit/delete events, set start/end times
- **Live View Tab**: See currently active events, connected players count

#### JSON Catalog Format

**enemies.json**:
```json
{
  "feral_wolf": { "id": "feral_wolf", "name": "Feral Wolf", "level": 1, "maxHp": 40, ... }
}
```

**events.json**:
```json
{
  "spring_festival_2026": {
    "id": "spring_festival_2026",
    "title": "Spring Festival",
    "description": "Bonus XP all weekend!",
    "startTime": "2026-05-15T00:00:00Z",
    "endTime": "2026-05-17T23:59:59Z",
    "type": "bonus_exp",
    "effects": { "expMultiplier": 2.0 },
    "icon": "festival"
  }
}
```

---

### 2. Polish & Bug Fixes

- Survey current bugs/issues from code inspection and testing
- Polish pass on UI/UX — better feedback loops, animations, clear messaging
- Combat feedback: hit/miss/crit notifications, damage numbers, status effect icons
- Error handling improvements: graceful degradation, user-friendly error messages
- Tab completion improvements in CLI client

---

### 3. Full Security Audit

**Scope**:
- WebSocket message validation (all incoming messages)
- SQL injection prevention (all PlayerDbManager, AdminDbManager, CosmeticDbManager queries)
- Admin API authentication & authorization (JWT, role checks)
- Input sanitization on all user-controlled data
- Rate limiting effectiveness review
- Steam ticket validation security
- Session token security
- File path traversal prevention in content editor
- XSS prevention in chat and admin panel
- Privilege escalation checks

---

### 4. Performance & Optimization

- Database efficiency: query optimization, indexing, batch operations
- Connection pooling / db instance sharing
- Memory usage: reduce object allocations, GC pressure
- Content catalog caching: lazy loading, LRU cache for rarely-used entries
- WebSocket message batching for broadcasts
- Load testing: simulate N concurrent players
- Startup time optimization (lazy init of non-critical systems)

---

### 5. Balance & Economy Tuning

**Enemy balancing**:
- Review stat curves by region/dungeon floor
- Adjust HP, attack, defense scaling per level
- Validate difficulty progression (is level 50 content 50x harder than level 1?)

**Loot tables**:
- Review drop rates across enemy tiers
- Ensure rare items are actually rare
- Balance crafting material drop rates vs. vendor prices

**Economy**:
- Gold sinks: is gold being spent faster than it's earned?
- Vendor price balancing
- Equipment progression curve

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `content/areas.json` | Area catalog (converted from areas.ts) |
| `content/enemies.json` | Enemy catalog (converted from enemies.ts) |
| `content/items.json` | Item catalog (converted from items.ts) |
| `content/skills.json` | Skill catalog (converted from skills.ts) |
| `content/crafting.json` | Crafting recipes (converted from crafting.ts) |
| `content/dungeons.json` | Dungeon definitions (converted from dungeons.ts) |
| `content/shops.json` | Shop definitions (converted from shops.ts) |
| `content/events.json` | Event definitions (new) |
| `src/server/content/ContentManager.ts` | Runtime catalog loader with cache |
| `src/server/content/HotReloadWatcher.ts` | File watcher + admin reload API |
| `src/server/content/EventEngine.ts` | Event scheduler and spawner |
| `src/types_content.ts` | TypeScript types for content schemas |
| `src/types_event.ts` | TypeScript types for events |

### Modified Files

| File | Change |
|------|--------|
| `src/server/index.ts` | Route content requests through ContentManager |
| `src/server/parser/CommandParser.ts` | Use ContentManager for all lookups |
| `src/server/engine/CombatEngine.ts` | Use ContentManager, add event effects |
| `src/server/engine/LootEngine.ts` | Use ContentManager, apply drop_modifier events |
| `src/server/engine/PlayerEngine.ts` | Apply bonus_exp events |
| `src/data/*.ts` | Keep as source-of-truth, JSON generated from these |
| `admin/index.html` | Add Content Editor, Event Manager, Live View tabs |

### Deleted After Migration

- After JSON catalogs are stable and validated, old `src/data/*.ts` files can be archived

---

## Tasks

- [ ] **1. ContentManager**: Create ContentManager.ts with JSON loading and cache
- [ ] **2. Convert areas.ts → areas.json**
- [ ] **3. Convert enemies.ts → enemies.json**
- [ ] **4. Convert items.ts → items.json**
- [ ] **5. Convert skills.ts → skills.json**
- [ ] **6. Convert crafting.ts → crafting.json**
- [ ] **7. Convert dungeons.ts → dungeons.json**
- [ ] **8. Convert shops.ts → shops.json**
- [ ] **9. HotReloadWatcher**: File watcher + admin reload endpoint
- [ ] **10. EventEngine**: Event loading, scheduling, effect application
- [ ] **11. events.json**: Initial event definitions (bonus_exp, drop_modifier templates)
- [ ] **12. Admin SPA**: Content Editor, Event Manager, Live View tabs
- [ ] **13. Polish pass**: Bug fixes, UI/UX improvements, feedback loops
- [ ] **14. Security audit**: Full review of server, auth, APIs
- [ ] **15. Performance optimization**: DB, memory, caching, load testing
- [ ] **16. Balance tuning**: Enemy stats, loot tables, economy

---

## Completion Summary

**Migration Completed**: 2026-05-13

### What Was Done
1. All TypeScript catalogs migrated to JSON format in `content/` directory
2. `ContentManager.ts` loads all JSON catalogs at runtime with in-memory caching
3. `HotReloadWatcher.ts` monitors content directory and auto-reloads on changes
4. `EventEngine.ts` handles event scheduling with effects (bonus_exp, drop_modifier, etc.)
5. Admin API endpoints for content reload and catalog editing
6. All game systems updated to use ContentManager instead of direct imports

### Archived Files
The following TypeScript files were moved to `src/data/archive/`:
- `areas.ts`
- `enemies.ts`
- `items.ts`
- `skills.ts`
- `crafting.ts`
- `dungeons.ts`
- `shops.ts`

### Key Logs (Startup)
```
[ContentManager] Loaded catalogs at 2026-05-13T00:26:57.393Z
[EventEngine] Loaded 3 events
[HotReloadWatcher] Started watching content/ directory
[AdminAPI] Admin UI: http://localhost:3001/admin-panel
```

### Notes
- TypeScript catalogs excluded from tsconfig.json to prevent build errors
- Admin panel SPA catch-all route fixed to use named path parameter
- All remaining tasks (polish, security audit, performance, balance) are for future phases

---

## Dependencies

- Phase 11 (Steam Auth, Cosmetic Store, Reward System)
- Phase 10 (Player Auth, Friends)
- Phase 9 (Admin System, Rate Limiter)

---

## Next Steps

1. Migrate all `.ts` catalogs to `.json`
2. Build ContentManager and wire into game engine
3. Build EventEngine
4. Add hot-reload and admin tools
5. Polish, security audit, performance tuning, balance pass
