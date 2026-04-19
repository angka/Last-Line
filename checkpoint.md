# Phase 1 Checkpoint — Core Single-Player Engine

**Date**: 2026-04-19
**Status**: ✅ Complete

---

## What Was Built

A fully playable single-player CLI game engine in TypeScript, running as a WebSocket server with a CLI client.

### Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| Player stats & level-up | ✅ | STR/AGI/DEF/LCK/ATK/HP/MP/critRate/critDamage/freeStatPoints/perkSlots |
| HP/Mana regen tick | ✅ | 5-second server-side tick; state machine: exploring/safe_area/city/inn/combat |
| Solo combat engine | ✅ | Turn order (agility+roll), 15s timer (stub), damage formulas, status effects, flee mechanic, loot/exp on win, respawn on lose |
| Inventory system | ✅ | Add/remove/equip/use/drop; 30 slots; rarity display; equipment slot bonuses |
| Save/Load persistence | ✅ | sql.js (SQLite-in-WASM); 3 slots per player; auto-save on disconnect |
| CLI server | ✅ | WebSocket on port 8080; commands: look/go/inventory/equip/use/drop/stats/skills/gold/rest/save/map/help/quit |
| CLI client | ✅ | Full-screen CLI; ANSI colors; tab completion; WebSocket transport |
| World system (stub) | ⚠️ | Areas defined in `src/data/areas.ts`; encounters trigger on movement; no cities/dungeons yet |

### Commands Available

```
MOVEMENT:   look/l, go <dir>, rest, map
CHARACTER:  stats, inventory/inv, equip <n>, use <n>, drop <n>, skills, gold
COMBAT:     attack [n], flee, item <n>, log
SYSTEM:      save, help, quit
```

### World Map

34 areas defined across all 8 regions (Ashford → Abyss's Edge).
Encounters trigger probabilistically on movement. No fast travel or city NPCs yet.

---

## File Structure

```
src/
├── types.ts                          ← All TypeScript interfaces
├── sql.js.d.ts                       ← Type declaration for sql.js
├── data/
│   ├── items.ts                     ← ITEMS catalog + rarity colors
│   ├── enemies.ts                   ← 30+ enemies + 11 bosses
│   └── areas.ts                     ← 34 areas with exits, spawns, descriptions
├── server/
│   ├── index.ts                     ← WebSocket server entrypoint
│   ├── engine/
│   │   ├── PlayerEngine.ts          ← createDefaultSave, levelUp, stat helpers
│   │   ├── RegenEngine.ts           ← calcRegenTick, regenStateLabel
│   │   └── CombatEngine.ts          ← generateEncounter, createCombatSession, playerAttack, enemyTurn, flee, resolveVictory/Defeat
│   ├── items/
│   │   └── InventoryManager.ts      ← inventoryAdd/Remove/Equip/Use/Drop + formatInventoryPage
│   ├── persistence/
│   │   └── SaveManager.ts          ← sql.js CRUD for saves table
│   └── parser/
│       └── CommandParser.ts         ← All command handlers
└── client/
    └── index.ts                    ← CLI client with tab completion + ANSI output
```

---

## Key Design Decisions Made

- **sql.js over better-sqlite3**: better-sqlite3 requires native compilation; sql.js is pure WASM with no build deps
- **`equipped: null` in default save**: not auto-equipping starter items — player must explicitly equip
- **Page system for inventory**: `inv` = page 1, `inv 2` = page 2; parseInt(raw ?? '1') - 1
- **Turn timer stub**: 15s timer structure exists but is a no-op in Phase 1 (enemies act instantly)
- **Multiplayer NOT implemented**: PresenceManager/ChatRouter/PartyManager are stubs for Phase 5
- **Combat is solo only**: CombatEngine handles one player vs. enemy groups; no shared CombatSession

---

## What Is Stubbed / TODO

The following are explicitly stubbed for future phases (Phase 2+):

| Stub | Phase | Notes |
|------|-------|-------|
| World cities, NPCs, merchants | 2 | Areas exist in areas.ts; no city interiors or NPCs yet |
| Dungeon system | 2 | No floor traversal, chests, or boss mechanics |
| Skill system (physical/magic scrolls) | 4 | Skills array in SaveFile is empty; no scroll drops |
| Crafting & alchemy | 4 | No crafting recipes or materials |
| Multiplayer (WebSocket presence, chat, parties) | 5–6 | Server is single-session only; no broadcast |
| Admin REST API | 9 | No Express server or admin UI |
| Auth & friends | 10 | No login/register/session tokens |

---

## Running the Game

```bash
# Install
npm install

# Build
npx tsc

# Start server
node dist/server/index.js

# In another terminal, start client
node dist/client/index.js
```

Or combine: `npx ts-node src/client/index.ts` (requires ts-node).

---

## Next: Phase 2 — World & Spawn System

Next step: expand `src/data/areas.ts` with city interior zones, dungeon definitions, NPC spawn points, and random encounter tables per area. Add `travel <city>` fast travel command, city Inn/shop mechanics, and dungeon floor traversal.
