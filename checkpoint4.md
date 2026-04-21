# Phase 4 Checkpoint — Multiplayer Social & Trading

**Date**: 2026-04-21
**Status**: ✅ Complete

---

## What Was Built

Phase 4 adds the multiplayer social core: area presence, chat channels, player trading, and a full party system with shared combat mechanics.

### Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| PresenceManager | ✅ | Tracks players per area; broadcasts arrival/departure; area channels |
| ChatRouter | ✅ | Routes area, party, whisper, shout messages; 60s shout cooldown |
| TradeManager | ✅ | Full trade lifecycle: offer → accept → counter → confirm; 90s timeout; atomic transfer |
| PartyManager | ✅ | Create/disband parties (max 4), invite/accept/decline/kick, party info display |
| Social commands | ✅ | who/nearby, say, p/party_chat, msg/whisper, shout, party/*, trade/* |
| Area arrival/departure | ✅ | [Nearby] notifications broadcast to all players in area |
| partyId in SaveFile | ✅ | Optional partyId field; synced across session managers |

### New Commands

```
SOCIAL
  who / nearby         — list players in your current area
  say <text>          — chat to all players in your area
  p <text>            — party chat (any area)
  msg <name> <text>   — whisper another player
  shout <text>        — server-wide shout (60s cooldown)

PARTY
  party [info]        — show party members and status
  party invite <name> — invite a player to your party
  party accept        — accept a pending invitation
  party decline       — decline invitation
  party leave         — leave your current party
  party disband       — leader: disband the party
  party kick <name>   — leader: kick a member

TRADE
  who                 — see who is in your area
  trade offer <player> "<item>" <price>  — offer item for gold
  trade view          — inspect the active trade
  trade accept        — buyer: accept and lock gold in escrow
  trade confirm       — seller: finalize the trade
  trade counter <n>   — counter-offer a different price
  trade decline       — decline/cancel the trade
```

### New Types (src/types.ts)

- `PresenceEntry` — playerId, name, areaId, activity, level
- `ChatMessage` — channel, from, to, text, timestamp
- `Party` — partyId, leaderId, members[], partyChatHistory, createdAt
- `PartyMember` — playerId, level, hp/maxHp, mana/maxMana, activity, isDowned, timedOutCount
- `TradeSession` — full trade state with escrow, counterHistory, timeoutHandle
- `TradeStatus` — 'pending' | 'negotiating' | 'buyer_confirmed' | 'complete' | 'cancelled'
- `CounterOffer` — from, price, timestamp
- `SaveFile.partyId` — optional partyId field

---

## File Structure

```
src/
├── types.ts                           ← Added: PresenceEntry, ChatMessage, Party,
│                                       PartyMember, TradeSession, CounterOffer,
│                                       TradeStatus, SocialPrefs (existing),
│                                       SaveFile.partyId
└── server/
    ├── index.ts                      ← Phase 4: presence registration, chat handler,
    │                                    push message routing, area broadcast on move
    ├── parser/
    │   └── CommandParser.ts           ← Phase 4: all social/trade/party commands,
    │                                    help text, area departure/arrival pushMessages
    └── social/
        ├── PresenceManager.ts        ← NEW — area channels, player tracking, broadcast
        ├── ChatRouter.ts             ← NEW — area/party/whisper/shout routing
        ├── PartyManager.ts           ← NEW — party lifecycle, member sync, formatting
        └── TradeManager.ts           ← NEW — trade lifecycle, escrow, atomic transfer
```

---

## Key Design Decisions

- **PresenceManager as single source of truth**: All area/channel queries go through PresenceManager
- **PartyManager stores partyId in GameSession.currentState**: Changes sync immediately via direct mutation
- **Trade uses inventoryAdd/Remove**: Leverages existing InventoryManager — no duplication
- **Area departure broadcast before state update**: handleMove returns `pushMessages` with both departure (old area) and arrival (new area) so the server can broadcast correctly
- **Shout cooldown tracked in ChatRouter**: Per-player timestamp map, checked before routing
- **Trade escrow**: Gold deducted from buyer on `accept`, returned on `cancel`/`expire`/`confirm-fail`
- **Party disband updates all members' saves**: PartyManager.disband() directly mutates each member's session

---

## What Is Stubbed / TODO (Phase 5+)

| Feature | Phase | Notes |
|---------|-------|-------|
| Turn timer (15s) in party combat | 5 | Timer structure exists in CombatSession; not wired to CombatEngine yet |
| Shared CombatSession for parties | 5 | Solo CombatEngine untouched; party combat needs a separate path |
| Downed state & revival window | 5 | PartyManager.setDowned() exists; no downed timer wired yet |
| Heal/buff ally in combat | 5 | `heal <ally>` and `buff <ally>` commands not yet added |
| Party flee modifiers | 5 | Flee formula not updated for party context |
| Multiplayer enemy spawn per area | 5 | Enemies still solo-only |
| Admin REST API | 9 | No Express server or admin UI |
| Auth & friends | 10 | No login/register/session tokens |
| Housing & Guilds | 11 | Player housing, guild management |

---

## Running the Game

```bash
# Build
npx tsc

# Start server
node dist/server/index.js

# In another terminal, start client
node dist/client/index.js

# Social tips:
# - Connect two clients to test multiplayer
# - Use "who" to see nearby players
# - Use "party invite <name>" to form a party
# - Use "trade offer <player> <item> <price>" to trade
```

---

## Next: Phase 5 — Multiplayer Combat & Turn Timer

Next step: wire the 15-second turn timer to CombatEngine for solo and party combat, implement shared CombatSession for party encounters, add downed state with 100-second revival window, add heal/buff ally commands (`heal <ally>`, `buff <ally>`), and update flee mechanics for party context. Also add dungeon chest auto-unlock on first boss kill per floor.
