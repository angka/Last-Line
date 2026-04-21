# Phase 5 Checkpoint — Multiplayer Combat & Turn Timer

**Date**: 2026-04-21
**Status**: ✅ Complete

---

## What Was Built

Phase 5 wires 15-second turn timers into the combat engine for solo and party combat, adds shared `PartyCombatSession` for party encounters, downed/unconscious state with 100-second revival window, `heal`/`buff` ally commands, updated flee mechanics for party context, and dungeon chest auto-unlock after boss kills.

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| 15s turn timer (solo) | ✅ | Wired via `startSoloTurnTimer` / `clearCombatTimer` in `index.ts` |
| 15s turn timer (party) | ✅ | Wired via `startPartyTurnTimer` in `PartyCombatManager` |
| Solo timeout → forfeit turn | ✅ | `handleSoloTimeout` logs turn forfeit, advances to next participant |
| Party timeout → 3 strikes → downed | ✅ | `timedOutCount` map; 3 timeouts = unconscious |
| Downed state | ✅ | `PartyMember.isDowned` + `setDowned()` in `PartyManager` |
| Revival (50 MP flat cost) | ✅ | `revivePlayer()` in `CombatTimerEngine` |
| Shared `PartyCombatSession` | ✅ | Separate from solo `CombatSession`; stores partyId |
| Party attack/flee/heal/buff | ✅ | `executePartyAction()` in `PartyCombatManager` |
| Party flee modifiers | ✅ | `partyFleeChance()` — harder to flee as party (penalty scales with size) |
| Party loot distribution | ✅ | `resolvePartyLoot()` — loot/exp goes to each member's save |
| Party defeat application | ✅ | `applyPartyDefeat()` — each member loses 10% gold |
| Dungeon chest auto-unlock | ✅ | `autoUnlockDungeonChest()` — boss kill auto-opens chest for all members |
| `party_start` command | ✅ | Checks 2+ members in same area before starting |
| `revive <name>` command | ✅ | Costs 50 MP, shows downed member list |
| `heal <ally>` / `buff <ally>` commands | ✅ | Shows HP info, guides to support skill use |
| HP bar display in party combat | ✅ | Unicode bar + [UNCONSCIOUS] tag for downed members |
| Turn indicator (YOUR TURN / waiting) | ✅ | Per-player prompt with countdown label |

---

## New Files

```
src/server/engine/
├── CombatTimerEngine.ts     — Turn timer logic, solo timeout, party timeout,
│                              shared PartyCombatSession, flee, revive, attack
│                              helpers, HP bar rendering
└── PartyCombatManager.ts    — Party combat lifecycle: start, execute action,
                               loot resolution, defeat, dungeon chest auto-unlock,
                               cleanup
```

---

## Modified Files

```
src/types.ts                     — Added partyCombatState to GameSession
src/server/index.ts             — Phase 5: combat timer wiring, party combat
                                  command dispatcher, party combat display
src/server/parser/CommandParser.ts — Added: party_start, revive, heal, buff
                                  commands; help text updated; Phase 5 banner
```

---

## Key Design Decisions

- **`PartyCombatSession` is a separate type from `CombatSession`**: No coupling between solo and party combat systems. Solo combat uses the existing `CombatSession` + new `startSoloTurnTimer`. Party combat uses the new `PartyCombatSession` + `PartyCombatManager`.
- **Turn timer lives in `GameSession.combatTimerHandle`**: Timer handle is stored on the session object so `index.ts` can clear it on combat end.
- **Party flee penalty formula**: `base - ((memberCount - 1) * 0.05)` — harder to coordinate as party grows.
- **Downed = hp=0, not removed from session**: Player stays in `PartyCombatSession.participants` with hp=0 so turn order remains intact for revive logic.
- **Revive cost is flat 50 MP**: Not tied to resurrection skill (skill-based revive is Phase 6 TODO).
- **Dungeon chest auto-unlock**: Called after `resolvePartyVictory`; adds chest loot to each member's `pendingLoot` array.
- **Solo timeout advances turn without removing player**: Just forfeits current turn; player stays in queue.

---

## New Commands

```
PARTY COMBAT
  party_start            — start shared party combat (min 2 members same area)
  attack <n>             — attack enemy n (in shared turn order)
  flee                   — party flee attempt
  heal <ally>           — view party HP / use support skill on ally
  buff <ally>            — view buff skills / use support skill on ally
  revive <name>          — revive a downed party member (costs 50 MP)
  log                    — show full party combat status
```

---

## What Is Stubbed / TODO (Phase 6+)

| Feature | Phase | Notes |
|---------|-------|-------|
| Skill-based revive (resurrection skill) | 6 | Currently flat 50 MP revive; skill-gated revive in Phase 6 |
| Party buff/debuff effects in combat | 6 | StatusEffect application to party members mid-combat |
| Healer targeting (use skill on specific ally) | 6 | `heal`/`buff` currently show help text; wired target select in Phase 6 |
| Automatic party combat trigger on area encounter | 6 | Currently `party_start` is manual; auto-start when party explores |
| Party dungeon chest loot sharing | 6 | Chest loot goes to pendingLoot; can be shared via `share_loot` command |
| Admin REST API | 9 | No Express server or admin UI |
| Auth & friends | 10 | No login/register/session tokens |
| Housing & Guilds | 11 | Player housing, guild management |
| World bosses (global spawns) | 5+ | World boss spawn events not yet implemented |
| Achievement system | 5+ | Tracked in SaveFile; no UI yet |

---

## Running the Game

```bash
# Build
npx tsc

# Start server
node dist/server/index.js

# In another terminal, start client(s)
node dist/client/index.js

# Social tips:
# - Connect two clients, form a party: party invite <name>
# - Both go to same area: party_start
# - Fight together with shared turn order and 15s timer
# - Use "revive <name>" if a party member gets downed
# - Use "heal" to see party HP; use support skills during combat
```

---

## Next: Phase 6 — Skill Polish, World Events & PvP

Next steps: wire skill-based revive (resurrection skill), add automatic party combat trigger when party explores together, implement world boss global spawn events, add PvP flag system with safe zones, and begin the Admin REST API (Phase 9 foundation).
