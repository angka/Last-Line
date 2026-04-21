# Phase 6 Checkpoint — Skill Polish, Support Skills & PvP

**Date**: 2026-04-21
**Status**: ✅ Complete

---

## What Was Built

Phase 6 fixes the `playerId` bug from Phase 5, wires all skill types into party combat (physical/magic/support), adds automatic party combat trigger when a party member explores and rolls an encounter in the same area, adds `share_loot` for party loot sharing, and adds a full PvP flag system with safe zones.

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| `playerId` field in `SaveFile` | ✅ | Replaces misused `saveId` as player identifier |
| `save.saveId` → `save.playerId` migration | ✅ | All `CommandParser.ts` usages updated |
| Physical skills in party combat | ✅ | `skill physical <n> <enemy>` — `partyPlayerSkill` in `CombatTimerEngine` |
| Magic skills in party combat | ✅ | `magic <n> <enemy>` — same path as physical |
| Support skills (heal/buff/cleanse/revive) | ✅ | `skill support <n> <ally>` — `partyPlayerSupport` in `CombatTimerEngine` |
| Resurrection skill revive in party combat | ✅ | 30% HP revive via `resurrection` skill; `revive <name>` now uses skill |
| Automatic party combat trigger | ✅ | `party_encounter` action → `startPartyCombat(partyId, areaId, enemies)` |
| `share_loot` command | ✅ | `share_loot list`, `share_loot give <n> <player>` |
| PvP flag system | ✅ | `pvp on/off/status/area` — toggles player PvP mode |
| Safe zones for PvP | ✅ | Cities always safe; `pvp.safeZone` updated on movement/travel |
| `activePartyCombats` exported | ✅ | From `PartyCombatManager.ts` — needed by `index.ts` |
| `PartyCombatSession` in `types.ts` | ✅ | Canonical type for party combat session |

---

## New Commands

```
SKILLS (in party combat)
  skill physical <n> <enemy>  — use physical skill n on enemy n
  magic <n> <enemy>           — use magic skill n on enemy n
  skill support <n> <ally>    — use support skill n on party ally

LOOT
  share_loot list             — view your pending loot
  share_loot give <n> <player> — give item n to party member

PvP
  pvp status                  — show your PvP status
  pvp on                      — enable PvP (can attack/be attacked)
  pvp off                     — disable PvP (safe from other players)
  pvp area                    — check current area PvP rules
```

---

## Modified / New Files

```
src/types.ts                          ← Added: PvPState, PartyCombatSession type,
│                                      playerId field in SaveFile
src/server/index.ts                  ← Phase 6: skill/magic command routing in
│                                    party combat, party_encounter handling,
│                                    party combat timer callback, onPartyTimeout
src/server/parser/CommandParser.ts    ← Phase 6: playerId fix, share_loot handler,
│                                    pvp handler, party_encounter return,
│                                    safeZone update on move/travel
src/server/engine/PartyTimerEngine.ts ← Renamed to CombatTimerEngine.ts
│  → partyPlayerSkill()              ← NEW — physical/magic skill in party combat
│  → partyPlayerSupport()            ← NEW — heal/buff/cleanse/revive on ally
src/server/engine/PartyCombatManager.ts ← Phase 6: skill action handling,
│  executePartyAction() now routes     skill/magic/support actions
│  formatPartyHpList()               ← NEW — show party HP without target
│  startPartyCombat(preGenEnemies)   ← accepts pre-generated enemies
│  activePartyCombats exported       ← now export const
src/server/engine/PlayerEngine.ts     ← playerId init, pvp default in createDefaultSave
```

---

## Key Design Decisions

- **`playerId` is now the primary player identifier**: `SaveFile.playerId` (populated at registration from `pid`) replaces `saveId` for all social/party/trade manager calls. `saveId` still exists for persistence (slot-based save lookups).
- **`partyPlayerSupport` handles all support effects**: Heal (hp restore), buff_stat (+stat for N turns), cleanse (clear debuffs), revive (at effectValue% HP), shield. Mana cost is checked and deducted.
- **Automatic party combat uses `party_encounter` action**: `parseCommand` detects 2+ party members in same area, returns `{ action: 'party_encounter', partyEncounter: {...} }`. `index.ts` calls `startPartyCombat(partyId, areaId, enemies)` directly with pre-generated enemies.
- **PvP safe zones are area-based**: `save.pvp.safeZone` is set based on `area.safeZone` on every move/travel. PvP cannot be enabled in a safe zone. Safe zones (city squares) always block PvP regardless of player flag.
- **`activePartyCombats` exported**: Needed by `index.ts` for `onPartyTimeout` callback to access the active combat handle map.

---

## What Is Stubbed / TODO (Phase 7+)

| Feature | Phase | Notes |
|---------|-------|-------|
| PvP combat resolution | 7 | PvP flag system done; actual attack/damage resolution not wired yet |
| World boss global spawns | 7 | Boss spawn events not yet implemented |
| Achievement system UI | 7 | Tracked in SaveFile; no UI yet |
| Admin REST API | 9 | No Express server or admin UI yet |
| Auth & friends | 10 | No login/register/session tokens |
| Housing & Guilds | 11 | Player housing, guild management |

---

## Running the Game

```bash
# Build
npx tsc

# Start server
node dist/server/index.js

# In another terminal, start client(s)
node dist/client/index.js

# Phase 6 tips:
# - Form a party: party invite <name> → party accept
# - Both go to same area
# - Any party member explores → party combat auto-starts
# - Use skill physical <n> / magic <n> / skill support <n> <ally>
# - PvP: pvp on (outside safe zones), pvp off to go safe
# - share_loot give <n> <player> to share loot with party
```

---

## Next: Phase 7 — World Events, Achievements & World Bosses

Next steps: wire PvP combat resolution (when two flagged players are in a PvP zone), add world boss global spawn events, implement the achievement system UI, add procedural dungeon progression, and begin Phase 9 foundation (basic REST API stub).
