# CLI Adventure Game - Last Iine — Project Blueprint (`Last Line.md`)

## Project Overview

A **text-based multiplayer CLI adventure game** with a client-server architecture. The server is
the single source of truth for all game state, world simulation, combat, spawns, and social
interaction. Multiple players connect simultaneously via WebSocket. Players share the same world —
they can encounter each other in any area, chat freely (including mid-combat), form parties,
fight enemies together, and buff or heal one another in real time. Login/auth is added **last**,
after all core mechanics, content, and balancing are stable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                             SERVER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Game     │  │ Story    │  │ Save/Load│  │ Regen Tick Timer   │  │
│  │ Engine   │  │ Engine   │  │ Manager  │  │ (per player)       │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Combat   │  │ World    │  │ NPC/Guild│  │ Spawn Engine       │  │
│  │ Engine   │  │ Manager  │  │ Manager  │  │ (per area)         │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Inventory│  │ Crafting │  │ Session  │  │ Loot Engine        │  │
│  │ Manager  │  │ System   │  │ Manager  │  │                    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Party    │  │ Chat     │  │ Presence │  │ Multiplayer Combat │  │
│  │ Manager  │  │ Router   │  │ Manager  │  │ Engine             │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Admin    │  │ PvP      │  │ Admin    │  │ Admin Audit        │  │
│  │ Auth     │  │ Manager  │  │ REST API │  │ Log                │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Store    │  │ Entitle- │  │ Cosmetic │  │ Friend             │  │
│  │ Manager  │  │ ment Mgr │  │ Renderer │  │ Manager            │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
      ▲           ▲           ▲           ▲              ▲
      │  WebSocket (each player = 1 persistent socket)   │ HTTP REST (Admin)
      ▼           ▼           ▼           ▼              ▼
  [Client A]  [Client B]  [Client C]  [Client D]   [Admin Browser]
   (CLI)       (CLI)       (CLI)       (CLI)         (Web UI)
```

### Tech Stack
- **Server**: Node.js (TypeScript) — single process, event-driven, non-blocking
- **Transport**: WebSocket (`ws` lib) — one persistent connection per player
- **Admin API**: Express.js REST API — runs on a separate port (default: 8081), serves the Admin Web UI and all admin endpoints
- **Admin UI**: Single-page HTML/CSS/JS dashboard served by the Express server — no framework required, vanilla JS with fetch API
- **Persistence**: SQLite (`better-sqlite3`) — one DB, shared world state + per-player saves
- **Story Engine**: Static JSON templates + optional Anthropic API for dynamic quest narratives
- **Regen Timer**: Per-player `setInterval` tick (every 5 real seconds = 1 game tick)
- **Client**: Node.js or Python CLI — reads stdin, writes formatted output to stdout

### Key Multiplayer Design Principles
- The server owns all state. Clients only send commands and receive formatted text responses.
- Area presence is tracked server-side. Players in the same area share a broadcast channel.
- Chat messages are delivered by the server as **push events** — they interrupt the client's
  current output line and appear inline with a prefix tag (e.g. `[Chat] Kael: hey!`).
- Party combat is a **shared CombatSession** object on the server. All party members act in the
  same turn queue alongside enemies. Each player gets their own input prompt on their turn.
- Players can always send chat commands regardless of game state (combat, menu, exploring).
- **Every player turn in combat has a 15-second countdown timer.** If no combat action is
  submitted before the timer expires, the turn is forfeited automatically and play advances to
  the next combatant. This applies to both solo and party combat to keep the game moving and
  prevent a single AFK player from blocking a shared party battle.

---

## Development Order

```
Phase 1: Core Single-Player Engine
  └── Player stats, combat (incl. flee), inventory, save/load, regen tick

Phase 2: World & Spawn System
  └── Cities, dungeons, areas, random enemy spawns, encounter groups

Phase 3: Story, Quests & NPCs
  └── Story engine, quest templates, NPC dialogue, guild board

Phase 4: Skills, Crafting & Economy
  └── Scrolls, crafting recipes, weapon tiers, alchemy, merchants

Phase 5: Multiplayer Core
  └── Presence system, area broadcasts, chat router, player listing

Phase 6: Party & Multiplayer Combat
  └── Party system, shared CombatSession, cooperative actions (buff/heal ally)

Phase 7: Content Population
  └── All 16 cities, 17 dungeons, items, enemies, boss drop tables

Phase 8: Balance & Polish
  └── Exp curve, gold, spawn rates, party scaling, drop weights, regen rates

Phase 9: Admin Panel
  └── Admin auth, REST API, Web UI, player management, PvP toggle

Phase 10: Auth & Friends
  └── Login, register, logout, session tokens, friend list

Phase 11: Monetization (Steam DLC)
  └── Steam API integration, cosmetic store, inventory expansion, entitlement system

Phase 12: Data-Driven Hot-Update
  └── ContentManager, EventEngine, live world editing, limited-time events, catalog management
```

---

## Player Stats

```ts
interface PlayerStats {
  // Identity
  name: string;
  level: number;           // 1–100+
  exp: number;
  expToNext: number;

  // Resources
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;

  // Combat
  strength: number;        // Physical damage multiplier
  agility: number;         // Turn order, dodge chance, flee chance
  defense: number;         // Damage reduction
  luck: number;            // Crit chance bonus, loot rarity weight
  attack: number;          // Base attack (weapon.damage + str bonus)
  critRate: number;        // 0.0–0.75 (max 75%)
  critDamage: number;      // e.g. 1.5 = 150% damage on crit

  // Derived
  dodgeChance: number;     // agility / (agility + 150)
  accuracy: number;        // agility * 0.5 + weapon.accuracy
  fleeChance: number;      // see Flee Mechanic

  // Multiplayer / Social
  partyId: string | null;  // null if not in a party
  chatVisible: boolean;    // player preference: show/hide incoming chat
  nearbyVisible: boolean;  // player preference: show/hide nearby player notifications
}
```

### Level-Up Stat Gains

```
Per level:
  +10  maxHp         +1   luck
  +5   maxMana       +0.5% critRate   (cap: 75%)
  +2   strength      +0.1  critDamage
  +2   defense
  +1   agility

Per 5 levels:  +1 free stat point (player choice)
Per 10 levels: +1 passive perk slot
```

---

## Multiplayer Presence System

The **PresenceManager** tracks which players are in which area at all times. It is the backbone
of all social features: notifications, nearby listing, chat routing, and party detection.

### Area Broadcast Channels

Every area (city district, dungeon floor, overworld zone) is a **broadcast channel**. When a
player enters an area, they are subscribed to that channel. When they leave, they unsubscribe.

```ts
interface AreaChannel {
  areaId: string;
  players: Map<string, GameSession>;  // playerId → session
}

class PresenceManager {
  channels: Map<string, AreaChannel>;

  enter(playerId: string, areaId: string): void;
  leave(playerId: string, areaId: string): void;
  broadcast(areaId: string, message: string, excludeId?: string): void;
  getPlayersInArea(areaId: string): GameSession[];
  getAreaOf(playerId: string): string;
}
```

### Arrival & Departure Notifications

When a player enters an area that already has other players (and those players have
`nearbyVisible: true`), the server pushes a notification to all existing members:

```
[Nearby] Kael has entered the area.
```

When a player leaves:
```
[Nearby] Kael has left the area.
```

These notifications are **opt-in per player**. Players who set `nearby off` will not see them,
but they still appear to others who have `nearby on`.

### Nearby Player Listing

At any time, a player can run `who` or `nearby` to see who else is in their current area.
The server queries the PresenceManager and responds with a formatted table:

```
Players in Crystalmere City (3 online):
  ─────────────────────────────────────────────────
  Kael        Lv 28  Mage       [Exploring]
  Ryuna       Lv 31  Ranger     [In Combat]
  Borek       Lv 25  Warrior    [Resting]
  ─────────────────────────────────────────────────
  Type 'msg <name> <text>' to whisper.
  Type 'party invite <name>' to invite to party.
  Type 'trade offer <n> <item> <price>' to propose a trade.
```

Status shown is the player's current activity state (Exploring, In Combat, Resting, Shopping,
Trading, etc.).

---

## Chat System

Chat is always available regardless of the player's current game state. The server delivers
incoming messages as **push events** — they are injected into the client output stream with a
prefix tag so they can be visually distinguished from game output.

### Chat Channels

| Channel    | Command                  | Scope                                  | Requires       |
|------------|--------------------------|----------------------------------------|----------------|
| **Area**   | `say <text>`             | All players in the same area           | Just be there  |
| **Party**  | `p <text>` / `party chat`| All party members (any area)           | In a party     |
| **Whisper**| `msg <name> <text>`      | One specific player (any area online)  | Player online  |
| **Shout**  | `shout <text>`           | Entire server (all online players)     | Cooldown 60s   |

### Chat Push Format (client receives)

```
[Area]   Kael: Is anyone at the crystal cave entrance?
[Party]  Ryuna: I'm on floor 3 — come down!
[Whisper from Borek]: Need a heal?
[Shout]  Zael: Server first boss kill — Lich King down!
```

### Chat During Combat

Chat messages can be sent and received **during combat** without consuming a combat turn.
The server handles chat as a separate, non-turn action.

```
[Combat] Your turn! Choose: attack / skill / magic / item / flee
> say Borek can you heal me next turn?
[Area] You: Borek can you heal me next turn?
[Combat] Still your turn. Choose: attack / skill / magic / item / flee
> attack
You strike Goblin Warlord for 142 damage!
[Area] Borek: on it!
```

Chat input during combat does not advance the turn counter. The game simply processes the chat
and re-prompts for the combat action.

### Chat Preferences

```
nearby on/off     → toggle area arrival/departure notifications
chat on/off       → toggle ALL incoming chat (area, party, whisper, shout)
chat area on/off  → toggle only area channel
chat party on/off → toggle only party channel
chat shout on/off → toggle only server-wide shouts
```

Whisper messages are always delivered regardless of preferences — they cannot be silenced,
though a future block-list feature can be added in Phase 9.

---

## Player Trading System

Players can buy and sell items **directly with each other** at a mutually agreed gold price.
The server brokers the transaction so neither player can cheat — gold and items only transfer
once **both parties explicitly confirm** the final deal. Trading is available to any two online
players who are in the **same area** (same city, dungeon floor, or overworld zone).

### Trading Rules

- Both players must be in the **same area** (same `areaId` in PresenceManager).
- Trading is **not available during combat** (either player's `[In Combat]` status blocks it).
- Players cannot trade **Quest Items** (`tradelock: true` flag on the item).
- Players cannot trade items that are currently **equipped** (must unequip first).
- The buyer must have enough free **inventory slots** to receive the item.
- The buyer must have enough **gold** to cover the agreed price.
- A trade session has a **90-second timeout** — if not confirmed by both sides within 90s,
  it is automatically cancelled and both players are notified.
- A player can only be in **one active trade session** at a time.
- Gold is held in escrow by the server from the moment the buyer confirms, until the seller
  also confirms. If the trade is cancelled at any point, gold is returned immediately.

### Trade Lifecycle

```
STEP 1 — Seller initiates offer:
  trade offer Kael "Void Wraith Essence" 5000
  → Server checks: same area? not in combat? item not equipped? not quest-locked?
  → Kael receives push:
      [Trade] Ryuna offers you "Void Wraith Essence" (Legendary Material) for 5000g.
      Type 'trade view' to inspect the item, 'trade counter <price>' to negotiate,
      'trade accept' to agree, or 'trade decline' to refuse.
      [Trade expires in 90s]

STEP 2a — Buyer accepts at offered price:
  trade accept
  → Server checks: Kael has 5000g? has inventory space?
  → Gold locked in escrow. Seller notified:
      [Trade] Kael accepted your offer of 5000g. Type 'trade confirm' to complete.
  → Seller must confirm within 90s.

STEP 2b — Buyer counters with a different price:
  trade counter 4000
  → Ryuna receives:
      [Trade] Kael counters your offer: 4000g for "Void Wraith Essence".
      Type 'trade accept' to agree, 'trade counter <price>' to counter again,
      or 'trade decline' to cancel.
  → Counter-offer resets the 90-second timer.
  → No limit on number of counter-offers (players negotiate freely).

STEP 3 — Final confirm:
  Once BOTH players have agreed on a price (buyer ran 'trade accept', seller ran
  'trade confirm'):
  → Server atomically:
      1. Deducts finalPrice gold from buyer
      2. Adds finalPrice gold to seller
      3. Removes item from seller inventory
      4. Adds item to buyer inventory
  → Both players receive confirmation:
      [Trade] ✓ Trade complete! Ryuna sold "Void Wraith Essence" to Kael for 4000g.

CANCELLATION — any point:
  trade cancel   → Either player can cancel at any time before final confirm.
  → Any escrowed gold is returned immediately.
  → Both players notified: [Trade] Trade with Kael was cancelled.
  → 90s timeout also triggers automatic cancellation.
```

### Trade Data Model

```ts
interface TradeSession {
  tradeId: string;
  sellerId: string;
  buyerId: string;
  areaId: string;                    // both must stay in this area
  item: InventorySlot;               // the item being sold (snapshot at offer time)
  offeredPrice: number;              // seller's initial asking price
  agreedPrice: number | null;        // null until both sides agree
  buyerConfirmed: boolean;           // buyer ran 'trade accept'
  sellerConfirmed: boolean;          // seller ran 'trade confirm'
  goldEscrowed: boolean;             // true once buyer's gold is locked
  counterHistory: CounterOffer[];    // full negotiation log
  createdAt: number;                 // Date.now()
  expiresAt: number;                 // createdAt + 90_000
  timeoutHandle: NodeJS.Timeout;
  status: 'pending' | 'negotiating' | 'buyer_confirmed' | 'complete' | 'cancelled';
}

interface CounterOffer {
  fromPlayerId: string;
  price: number;
  timestamp: number;
}
```

### Item Inspection During Trade

Before accepting, the buyer can inspect the offered item in full detail:

```
trade view
→ Server sends full item card:

  ╔══════════════════════════════════════════════╗
  ║  Void Wraith Essence                         ║
  ║  [Legendary] [Crafting Material]             ║
  ╠══════════════════════════════════════════════╣
  ║  Used in: Shadow Reaper Scythe (recipe)      ║
  ║           Shadow Silk Armor (recipe)         ║
  ║  Source:  Void Wraith Zelthar (Dungeon 7)    ║
  ║  Stack:   1 / 10                             ║
  ║  Trade Locked: No                            ║
  ╠══════════════════════════════════════════════╣
  ║  Seller:  Ryuna          Asking: 5000g       ║
  ║  Your gold: 6200g        After: 1200g        ║
  ╚══════════════════════════════════════════════╝
  Type 'trade accept', 'trade counter <price>', or 'trade decline'.
```

### Area-Leave During Active Trade

If either player moves out of the area (or disconnects) while a trade session is active:

```
→ Trade is immediately cancelled.
→ Any escrowed gold is returned to the buyer.
→ Both players notified:
    [Trade] Trade cancelled — Ryuna has left the area.
```

### TradeManager (Server Module)

```ts
class TradeManager {
  activeTrades: Map<string, TradeSession>;  // tradeId → session
  playerTrades: Map<string, string>;        // playerId → tradeId (1 active per player)

  offer(sellerId, buyerId, item, price): TradeSession | Error;
  counter(tradeId, fromPlayerId, newPrice): void;
  acceptBuyer(tradeId, buyerId): void;       // locks gold in escrow
  confirmSeller(tradeId, sellerId): void;    // executes atomic transfer
  cancel(tradeId, byPlayerId): void;
  expireTrade(tradeId): void;               // called by timeout
  canTrade(playerId): boolean;              // checks combat, area, existing trade
}
```

Atomic transfer uses a **database transaction** (SQLite `BEGIN / COMMIT`) to guarantee both
the gold deduction and item transfer succeed together or both roll back. No half-transfers.

### Trade History (Optional, Phase 7+)

For audit and dispute reference, completed trades can be logged to a `trade_history` table:

```sql
CREATE TABLE trade_history (
  id          INTEGER PRIMARY KEY,
  trade_id    TEXT,
  seller_id   TEXT,
  buyer_id    TEXT,
  item_id     TEXT,
  item_name   TEXT,
  final_price INTEGER,
  area_id     TEXT,
  completed_at TEXT
);
```

Players can run `trade history` to see their last 10 completed trades.

---

## Party System

Players can form parties to explore and fight together. A party shares a **CombatSession** when
engaging enemies, and party members can target each other with support actions.

### Party Rules

- Max party size: **4 players**
- Party persists across area transitions — members can be in different areas and rejoin
- Party disbands automatically if the leader disconnects for more than 2 minutes
- Players can leave a party at any time with `party leave`
- A player cannot be in two parties simultaneously

### Party Lifecycle

```
1. Player A runs: party invite Kael
   → Kael receives: [Party] Ryuna invites you to a party. Type 'party accept' or 'party decline'.

2. Kael runs: party accept
   → Party is created. Both players are notified:
     [Party] Kael has joined. Party: Ryuna, Kael (2/4)

3. Either player can then: party invite Borek
4. Leader can: party kick <name>
5. Any member can: party leave
6. Leader can: party disband  → disbands for all members
```

### Party Data Model

```ts
interface Party {
  partyId: string;
  leaderId: string;
  members: string[];          // playerIds, max 4
  combatSessionId?: string;   // set when party is in shared combat
  createdAt: Date;
}
```

### Party Info Display

```
party info  →

  ══════════════════════════════════════
   Party: Ryuna's Group  [3/4 members]
  ══════════════════════════════════════
   ★ Ryuna    Lv 31  HP 480/520  MP 200/300  [Ranger]   [Your area]
     Kael     Lv 28  HP 310/400  MP 150/250  [Mage]     [Crystal Cave F2]
     Borek    Lv 25  HP 620/620  MP 80/120   [Warrior]  [Your area]
  ══════════════════════════════════════
   Type 'party invite <name>' to add a 4th member.
```

HP and mana are shown live (updated each time the command is run or on each combat turn).

---

## Multiplayer Combat System

### Solo vs. Party Combat

When a player triggers an encounter alone, a normal solo **CombatSession** is created for that
player. When a party triggers an encounter (any party member enters a combat-eligible area and
rolls an encounter while other members are in the **same area**), a **shared CombatSession** is
created for all co-located party members.

> Non-combat party members in a different area are not pulled into the fight — they receive a
> party chat notification: `[Party] Ryuna has entered combat in Crystal Cave F2!`

### Shared CombatSession

```ts
interface CombatSession {
  sessionId: string;
  type: 'solo' | 'party';
  participants: CombatParticipant[];  // players + enemies, in turn order
  turnIndex: number;                  // index into participants[]
  round: number;
  areaId: string;
  log: CombatLogEntry[];

  // Turn timer
  turnTimer: NodeJS.Timeout | null;   // server-side setTimeout handle
  turnStartedAt: number;              // Date.now() when current turn began
  turnTimeoutMs: number;              // always 15000 (15 seconds)
  timedOutCount: Map<string, number>; // playerId → consecutive timeout count

  // Downed timers (party combat)
  downedTimers: Map<string, NodeJS.Timeout>; // playerId → 100s auto-respawn handle
  downedAt: Map<string, number>;             // playerId → Date.now() when downed
  downedTimeoutMs: number;                   // always 100000 (100 seconds)
}

interface CombatParticipant {
  id: string;
  type: 'player' | 'enemy';
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  statusEffects: StatusEffect[];
  agiRoll: number;                    // determines turn order
}
```

### Multiplayer Turn Order

All players and all enemies share a single turn queue, ordered by agility roll.

```
Example — Party of 3 vs. 2 enemies:

  Turn order rolled at combat start:
  1. Kael        (agility 42 + roll 8 = 50)
  2. Shadow Fiend (agility 38 + roll 9 = 47)
  3. Ryuna       (agility 35 + roll 7 = 42)
  4. Borek       (agility 28 + roll 6 = 34)
  5. Void Wraith (agility 25 + roll 4 = 29)

  Each combatant acts once per round in this order.
  On a player's turn, only THAT player is prompted. Others watch the log.
  On an enemy's turn, the server resolves AI and broadcasts the result to all.
```

### Turn Timer

Every player turn — in both **solo** and **party** combat — runs a strict **15-second server-side
countdown**. The timer is set via `setTimeout` on the server when the turn begins and is cleared
the moment a valid combat action is received.

```
Turn starts → server fires:
  setTimeout(forfeitTurn, 15000)
  pushToPlayer: "[Your turn! 15s] HP: 310/520 | MP: 200/300
    Choose: attack / skill <n> / magic <n> / item <n> / heal <ally> / buff <ally> / flee"

At 10 seconds remaining (t+5s):
  pushToPlayer: "[10s remaining] Still your turn!"

At 5 seconds remaining (t+10s):
  pushToPlayer: "[5s!] Act now or your turn will be skipped!"

At 0 seconds (t+15s, timer fires):
  clearTimeout — forfeitTurn() executes:
    • No action is taken for that player this turn
    • Server broadcasts to all combat participants:
        [Combat] Kael's turn timed out — turn skipped!
    • timedOutCount[playerId]++
    • Advance turnIndex to next combatant
```

**Chat is exempt from the timer.** Sending `say`, `msg`, `p`, or `shout` during a turn does
NOT count as a combat action and does NOT clear the timer. The turn continues running down.

#### Consecutive Timeout Behaviour

To handle players who go AFK mid-combat without disconnecting:

```
timedOutCount[playerId]:
  1 timeout:  Turn skipped silently. Warning message to player.
  2 timeouts: Turn skipped. Party receives:
                [Combat] Kael has been AFK for 2 turns.
  3 timeouts: Player is automatically ejected from the CombatSession.
              Treated the same as a successful flee:
                [Combat] Kael was removed from combat (AFK).
              Player is returned to the area they were in.
              They do NOT receive exp or loot from that combat.
              timedOutCount resets on their next combat action.

Solo combat:  3 consecutive timeouts → combat ends. Player is treated as having fled
              (same consequence: returned to area, no rewards). Enemies despawn.
```

#### Disconnect During Combat

If a player's WebSocket disconnects while it is their turn:

```
Solo:   Combat is paused for up to 60 seconds (reconnect window).
        If player reconnects within 60s → combat resumes from their turn.
        If not → combat ends. Player respawns at last Inn, loses 10% gold.

Party:  Player is immediately ejected from the CombatSession (same as 3 AFK timeouts).
        Party continues combat without them.
        On reconnect, player is placed back in the area outside of combat.
        They receive no loot from that fight.
```

### What Other Players See While Waiting

While it's not their turn, party members receive a **live combat log** pushed to their screen,
including real-time timer updates for the active player's turn:

```
[Combat Log] Kael used Fire Bolt → Shadow Fiend takes 312 damage! (Burn applied)
[Combat Log] Shadow Fiend attacks Borek → 88 damage!
[Combat] It's Ryuna's turn.  [15s]
[Combat] Ryuna: [10s remaining]
[Combat Log] Ryuna used Healing Light on Borek → Borek recovers 280 HP!
[Combat] It's your turn, Borek.  HP: 620/620 | MP: 80/120  [15s]
  Choose: attack / skill <n> / magic <n> / item <n> / heal <ally> / buff <ally> / flee
```

The `[Xs]` countdown shown to waiting players is updated at 10s and 5s warnings only (not every
second) to avoid flooding the terminal. Only the active player sees the full countdown prompts.

### Targeting System in Party Combat

In party combat, attack skills and magic need a **target**. The command syntax changes:

```
Solo:    attack              (implicit target = only enemy)
Party:   attack <target>     (required when multiple enemies)
         magic 1 <target>
         skill 2 <target>

Support: heal <ally_name>    → use a heal skill or item on an ally
         buff <ally_name>    → use a buff skill on an ally
         item <n> <target>   → use a consumable on self, ally, or enemy
```

Target can be a player name, enemy name, or shorthand index (`e1`, `e2` for enemies; `p1`, `p2`
for party members by party slot order).

---

## Cooperative Actions (Buff & Heal Allies)

Players can use **support skills** and **items** on allies during party combat. These consume
the player's turn, the same as any other combat action.

### Heal Ally

```
heal <ally_name>
  → Uses the player's best available heal skill on the target ally.
  → If no heal skill is learned, uses a Health Potion from inventory (if available).
  → Costs mana (if skill) or consumes item.

Example:
  > heal Borek
  Ryuna casts Healing Light on Borek → Borek recovers 280 HP! (380/620)
```

### Buff Ally

```
buff <ally_name>
  → Opens a sub-menu listing available buff skills that can target allies.
  → Player selects a buff skill by number.

buff <ally_name> <skill_n>
  → Direct shortcut if skill number is known.

Example:
  > buff Kael 2
  Ryuna casts Haste on Kael → Kael gains +20 agility for 3 turns!
```

### Item on Ally

```
item <item_n> <ally_name>
  → Uses the consumable item on the specified ally.

Example:
  > item 3 Borek
  Ryuna uses Health Potion V on Borek → Borek recovers 350 HP!
```

### Support Skill Types

Support skills are a **skill category** separate from physical and magic attack skills.
They are learned from specific scrolls (support scrolls) or quest rewards.

```ts
interface SupportSkill {
  id: string;
  name: string;
  level: number;             // 1–10
  killCount: number;         // healed/buffed ally kills that count toward level-up
  manaCost: number;
  targetType: 'ally' | 'self' | 'all_allies' | 'any';
  effectType: 'heal' | 'buff_stat' | 'cleanse' | 'shield' | 'revive';
  effectValue: number;       // heal amount, stat bonus value, etc.
  duration?: number;         // turns (for buffs)
  description: string;
}
```

### Example Support Skills

| Skill             | Effect                                              | Mana | Level Source          |
|-------------------|-----------------------------------------------------|------|-----------------------|
| Healing Touch     | Restore 100 HP to ally                              | 15   | Scroll (Millhaven)    |
| Healing Light     | Restore 280 HP to ally                              | 30   | Scroll (Crystalmere)  |
| Greater Heal      | Restore 600 HP to ally                              | 60   | Quest reward          |
| Full Restore      | Restore all HP + clear status to ally               | 120  | Boss drop             |
| Haste             | +20 agility to ally for 3 turns                     | 25   | Scroll (Thornwick)    |
| Iron Guard        | +30 defense to ally for 3 turns                     | 25   | Scroll (Irongate)     |
| Empower           | +25% attack to ally for 3 turns                     | 30   | Scroll (Stormspire)   |
| Arcane Infuse     | +30% magic damage to ally for 3 turns               | 35   | Quest reward          |
| Cleanse           | Remove all negative status from ally                | 20   | Scroll (Crystalmere)  |
| Barrier           | Shield ally: absorb damage = caster.defense × 3    | 40   | Quest reward          |
| Resurrection      | Revive fallen ally to 30% HP (1 use per combat)     | 150  | Boss drop (rare)      |
| Rally             | +10% all stats to ALL allies for 2 turns            | 80   | Dungeon 9+ boss drop  |

### Skill Level-Up via Support

Support skills level up when the ally being healed/buffed **earns a kill** on the same turn
the support effect is active. This encourages teamwork — buffing someone before their kill
counts toward your support skill exp.

```
Skill Lv 1→2:  10 linked kills    Lv 6→7:  400 linked kills
Lv 2→3:  25                       Lv 7→8:  750
Lv 3→4:  50                       Lv 8→9:  1,500
Lv 4→5:  100                      Lv 9→10: 3,000
Lv 5→6:  200
```

### Player Death in Party Combat

If a player's HP reaches 0 in party combat, they enter a **Downed** state rather than
immediately respawning. While Downed they can still:
- **Chat** (area, party, whisper)
- **Watch** the combat log
- **Not act** on their turn (skipped automatically)

#### Downed Timer — 100-Second Auto-Respawn

The moment a player is Downed, the server starts a **100-second countdown** for that player.
A visible countdown is pushed to the downed player every 10 seconds:

```
[Downed] You are incapacitated! Allies have 100s to revive you.
[Downed] 90s remaining...
[Downed] 80s remaining...
[Downed] 70s remaining...
...
[Downed] 10s remaining — no revival incoming. Prepare to respawn.
[Downed] Time's up. You are being respawned.
```

Party members see a compact status line when the active combat turn ends:
```
[Combat] Borek is DOWNED — 72s until auto-respawn.
```

#### Revival Window

If another party member uses **Resurrection** skill or a **Revive Shard** item on the downed
player before the 100-second timer expires:
- Downed player is revived at **30% HP** (Resurrection skill) or **50% HP** (Revive Shard)
- The 100-second countdown timer is cancelled
- Revived player re-enters the turn queue at the bottom of current round order
- Party members receive: `[Combat] Kael has been revived by Ryuna! (30% HP)`

#### Auto-Respawn on Timer Expiry

If the 100-second timer reaches zero without revival:

```
Respawn location: nearest city to the dungeon/area where combat took place
  → Determined by: WorldManager.getNearestCity(areaId)
  → Player is placed at the city's designated respawn point:
       city.respawnPoint = "fountain"  (every city has one)

Respawn conditions:
  • HP restored to 30% of maxHp
  • Mana restored to 30% of maxMana
  • All negative status effects cleared (Poison, Burn, Bleed, etc.)
  • Gold penalty: −10% gold (same as solo death)
  • Items: NO items are lost on respawn
  • Player is removed from the CombatSession turn queue
  • Player receives loot rolls if the party ultimately wins (they contributed before going down)
  • If the party had already wiped before the 100s expired: respawn still fires at expiry

Server broadcasts to party:
  [Party] Kael was not revived in time — respawned at Crystalmere City Fountain.
Player receives on respawn:
  [Respawn] You have been revived at Crystalmere City Fountain.
           HP: 144/480 | MP: 75/250 | Gold lost: 420g
```

#### Nearest City Resolution

```ts
// WorldManager
getNearestCity(areaId: string): City {
  const area = this.areas.get(areaId);

  // If area is inside a dungeon, use the dungeon's linked entrance city
  if (area.dungeonId) {
    const dungeon = this.dungeons.get(area.dungeonId);
    return this.cities.get(dungeon.entranceCityId);
  }

  // For overworld areas, find city with smallest hop distance
  return this.cities
    .values()
    .sort((a, b) => this.hopDistance(areaId, a.id) - this.hopDistance(areaId, b.id))[0];
}
```

Each city definition in `cities.json` includes a `respawnPoint` field:

```json
{
  "id": "crystalmere_city",
  "name": "Crystalmere City",
  "respawnPoint": {
    "areaId": "crystalmere_city_square",
    "description": "The glowing crystal fountain at the heart of the city square."
  }
}
```

When a player respawns at the fountain, the server sends a scene description:
```
You wake with a gasp at the base of the crystal fountain.
Cold water mists your face. The city hums around you — life goes on.
HP: 144/480 | MP: 75/250
```

#### Party Win with Downed Members

If the party kills all enemies while one or more members are still in the Downed countdown:
- All downed timers are immediately cancelled
- Downed players are revived at **1 HP** at their current location (not respawned to city)
- They receive their full loot rolls and EXP share
- Party receives: `[Party] Victory! Downed members have been roused by the battle's end.`

#### Party Wipe

If ALL party members are either Downed or dead simultaneously:
- All active Downed timers are cancelled
- All players respawn immediately at their nearest city fountain (no waiting for the 100s)
- Each player loses 10% gold
- No loot from the encounter
- Server sends to each player: `[Party] The party has been wiped. Respawning...`

---

## Flee in Party Combat

Flee in party combat is an **individual decision**. Each player chooses independently.
The `flee` command must be entered **before the 15-second turn timer expires** — a timed-out
turn does not auto-flee; it is simply skipped with no action.

```
Flee rules in party context:
  • Each player rolls their own flee chance (same formula as solo)
  • A player who successfully flees exits combat — removed from the turn queue
  • Remaining party members continue fighting
  • If ALL players flee, the combat session ends for everyone (no rewards)
  • If only SOME flee, remaining players get all the loot if they win
  • A player who flees cannot rejoin the same ongoing combat instance

Flee modifiers in party:
  +5%   flee chance if a party member is already dead/downed (morale break)
  −15%  flee chance if you are the only remaining standing party member
```

---

## HP & Mana Regeneration

Regeneration is a **server-side tick** (every 5 real seconds) per player.

### Regen States

| State              | Condition                                | HP/tick       | Mana/tick     |
|--------------------|------------------------------------------|---------------|---------------|
| **In Combat**      | In active CombatSession                  | 0             | 0             |
| **Exploring**      | Moving through area                      | +0.5% maxHp   | +0.5% maxMana |
| **Safe Area Rest** | `rest` in safe zone                      | +2% maxHp     | +2% maxMana   |
| **City / Town**    | Present in any city (not at Inn)         | +1% maxHp     | +1% maxMana   |
| **Inn / Motel**    | Paid rest at Inn                         | Full restore  | Full restore  |

- Safe zones: `safeZone: true` areas (city squares, guild halls). No spawns.
- Inn rest: costs gold (see pricing below), instantly restores full HP+mana and clears all debuffs.
- Regen pauses at combat start; resumes immediately when combat ends.
- Party members in the same safe zone all benefit from safe-zone regen simultaneously.

### Inn Pricing

```
Ashford Village:  10g    Stormspire Citadel: 120g
Irongate Town:    25g    Veilreach:          130g
Millhaven:        30g    Cinderpeak:         150g
Thornwick:        35g    Ashenmoor:          170g
Crystalmere City: 60g    Wraithgate:         200g
Emberveil:        70g    Obsidian Keep:      250g
Duskhollow:       80g    The Sanctum:        400g
Saltmere:         85g    Abyss's Edge:       500g
```

---

## Combat System (Solo)

### Turn Structure

```
1. Encounter triggered (spawn roll or dungeon room)
2. Turn order: roll (agility + random 0–10) for player and each enemy
3. Player turn — server starts a 15-second countdown timer
     Server sends: "[Your turn! 15s] HP: 310/400 | MP: 150/250"
     Player must choose one action before timer expires:
       attack          → basic weapon attack on enemy
       skill <n>       → physical skill (costs mana)
       magic <n>       → magic skill (costs mana)
       item <n>        → use consumable (self only in solo)
       flee            → agility vs. fastest enemy (see Flee Mechanic)
     ── Timer warnings ──────────────────────────────────────────
     At 10s remaining: "[10s] Still your turn — choose an action!"
     At  5s remaining: "[5s!] Time running out!"
     At  0s           : Turn forfeited. Server broadcasts:
                        "[Combat] Ryuna's turn timed out — turn skipped!"
                        Proceeds to next combatant. No action taken.
     ────────────────────────────────────────────────────────────
     Chat commands (say, msg, p) do NOT reset or stop the timer.
4. Enemy turn — AI resolves instantly (no timer)
5. End-of-turn: tick status effects, decrement durations
6. Resolution:
     WIN  → exp + gold + loot
     LOSE → player HP = 0 → respawn at nearest city fountain
               HP restored to 30% maxHp, mana to 30% maxMana
               All negative status effects cleared
               Gold penalty: −10% gold, no items lost
     FLED → return to area, no rewards
7. Regen tick resumes
```

### Flee Mechanic

```
fleeChance = clamp(0.10,
  (player.agility − fastestEnemy.agility) / 100 + 0.50,
  0.90)

Roll d100:
  ≤ fleeChance × 100  → Success: exit combat. No rewards.
  >  fleeChance × 100 → Fail: enemy free attack. Turn lost.

Modifiers:
  +10%  player HP < 20%
  −20%  boss enemy
  −10%  per extra enemy beyond 1
  0%    if Stunned or Frozen (cannot attempt)
```

### Damage Formulas

```
Physical:
  raw       = (player.attack + weapon.damage) × (1 + strength / 100)
  mitigated = raw × (1 − enemy.defense / (enemy.defense + 200))
  final     = crit? mitigated × critDamage : mitigated
  final     = dodged? 0 : final

Magic:
  raw       = skill.baseDamage × (1 + scalingStat / 100)
  elemental = raw × [1.25 weak | 0.75 resist | 1.0 neutral]
  final     = crit? elemental × critDamage : elemental

Enemy → Player:
  raw       = enemy.attack × (1 + enemy.strength / 100)
  mitigated = raw × (1 − player.defense / (player.defense + 200))
  final     = dodged? 0 : mitigated
```

### Status Effects

| Effect  | Source          | Mechanic                                         |
|---------|-----------------|--------------------------------------------------|
| Poison  | Skills/Items    | −5% maxHp/turn, 3–5 turns, curable               |
| Burn    | Fire magic      | −8% maxHp/turn, 2–4 turns, curable               |
| Stun    | Thunder magic   | Skip turn; 30% resist; 1–2 turns                 |
| Freeze  | Ice magic       | −50% agility, blocks flee; 2 turns               |
| Bleed   | Blade skills    | −3% maxHp/turn, stacks ×3                        |
| Weaken  | Debuff skills   | −25% attack for 3 turns                          |
| Shield  | Support skills  | Absorb damage = caster.defense × mult            |
| Regen   | Potions/skills  | +5% maxHp/combat turn, 3 turns                   |
| Curse   | Dark magic      | −30% all stats, 3 turns; only Antidote cures     |
| Silence | Shadow magic    | Cannot use skills/magic for 2 turns              |

---

## Loot Distribution in Party Combat

When a party kills an enemy group, loot is **rolled per player** — everyone gets their own
independent loot roll. This prevents loot drama and rewards cooperative play.

```
Loot distribution rules:
  • Each player rolls their own drop table independently (luck applies per player)
  • Gold is split equally among all surviving/standing party members
  • Boss exclusive drops are rolled per player (everyone has a chance)
  • If a player is Downed when combat ends, they still receive loot rolls
  • EXP is awarded equally to all party members regardless of who dealt damage

Party EXP bonus (party size incentive):
  2 members: +10% EXP each
  3 members: +20% EXP each
  4 members: +30% EXP each
```

---

## Random Enemy Spawn System

Enemies spawn probabilistically per move. In multiplayer, area spawn rates are **not multiplied**
per player — the area has one encounter roll that fires when *any* player moves. This prevents
a city full of players from creating enemy swarms.

### Spawn Config (per area)

```ts
interface AreaSpawnConfig {
  areaId: string;
  safeZone: boolean;
  baseEncounterChance: number;    // 0.0–1.0 per move action by any player
  enemyPool: SpawnEntry[];
  groupSizeMin: number;
  groupSizeMax: number;           // hard cap: 5
  eliteChance: number;            // one enemy spawns as elite (1.5× stats)
  scalingByPartySize: boolean;    // if true, group size scales with party size
}
```

### Party Scaling on Encounter Group Size

If `scalingByPartySize: true` for the area, the enemy group size is adjusted:

```
base group size roll: random(groupSizeMin, groupSizeMax)
party size 1: no modifier
party size 2: +1 enemy (min 1, max 5)
party size 3: +2 enemies (min 2, max 5)
party size 4: +2–3 enemies (min 2, max 5)

Boss encounters: always fixed enemy count regardless of party size.
```

### Encounter Chance per Area Type

```
Overworld roads:            15–20%    Dungeon floors 1–3:   40–50%
Open grassland / plains:    20–28%    Dungeon floors 4–6:   50–60%
Forest (shallow):           28–35%    Dungeon floors 7–10:  60–70%
Forest (deep / ancient):    35–45%    Safe zones:           0% (always)
Swamp / marsh:              38–48%
Volcanic / ash waste:       40–50%
Mountain / ridge:           35–45%
Bamboo forest:              25–35%
Haunted forest / moors:     42–52%
Void / rift zones:          55–65%
```

---

## World Structure

### Overworld Map — Area Network

The world is a **connected graph of areas**. Cities and dungeons are nodes, but between
them lie **overworld areas** — forests, swamps, mountains, deserts, and more. Players
physically traverse these zones to travel between cities (or use fast travel if unlocked).
Each overworld area has its own biome, enemy pool, and **resource nodes** for gathering.

---

### Overworld Areas (Between Cities)

The map is divided into **region tiers** matching city level ranges. Each region contains
3–6 overworld areas connecting its cities. Below is the complete list.

---

#### REGION 1 — Ashford → Irongate `[Lv 1–12]`

```
Ashford Village ──[Whispering Plains]──[Goblin Ravine Road]── Irongate Town
                         │
                 [Thornwood Edge]
                         │
                   Thornwick (City 4)
```

| Area                 | Biome         | Level | Key Gathering        | Key Enemies             |
|----------------------|---------------|-------|----------------------|-------------------------|
| Whispering Plains    | Open grassland| 1–8   | Red Herb, Blue Herb, Wheat Fiber | Feral Wolf, Bandit, Slime |
| Goblin Ravine Road   | Rocky ravine  | 3–10  | Iron Ore, Goblin Fang, Flint Stone | Goblin Scout, Bandit Thug |
| Thornwood Edge       | Dense forest  | 5–14  | Moon Blossom, Sylvan Herb, Thornwood Branch | Forest Spider, Wild Boar |

---

#### REGION 2 — Irongate → Millhaven & Thornwick `[Lv 8–22]`

```
Irongate Town ──[Coal Hollow Mines]──[River Delta Marshland]── Millhaven
                                              │
                                     [Thornwick Deep Forest]── Thornwick
```

| Area                    | Biome             | Level | Key Gathering             | Key Enemies                   |
|-------------------------|-------------------|-------|---------------------------|-------------------------------|
| Coal Hollow Mines       | Underground caves | 6–15  | Coal, Iron Ore, Copper Ore, Cave Mushroom | Mine Rat, Cave Bat, Rock Golem Shard |
| River Delta Marshland   | Wetland marsh     | 10–20 | River Pearl, Swamp Reed, Blue Herb, Water Lily | Marsh Toad, River Serpent, Bog Wraith |
| Thornwick Deep Forest   | Ancient forest    | 12–22 | Sylvan Herb, Moon Blossom, Ancient Bark, Rare Seed | Dire Wolf, Forest Witch, Treewalker |

---

#### REGION 3 — Millhaven → Crystalmere → Emberveil `[Lv 18–38]`

```
Millhaven ──[Amber Savanna]──[Crystal Badlands]── Crystalmere City
                                      │
                            [Emberveil Volcanic Road]── Emberveil
```

| Area                     | Biome          | Level | Key Gathering                    | Key Enemies                        |
|--------------------------|----------------|-------|----------------------------------|------------------------------------|
| Amber Savanna            | Open savanna   | 14–25 | Savanna Grass, Lion Claw, Amber Stone, Wild Grain | Sand Lion, Hyena Pack, Dust Elemental |
| Crystal Badlands         | Crystal desert | 20–32 | Mana Crystal (Raw), Crystal Shard, Desert Rose, Quartz | Crystal Scorpion, Sand Wyrm, Mirage Spirit |
| Emberveil Volcanic Road  | Volcanic ash   | 28–38 | Magma Ore, Volcanic Rock, Phoenix Bloom, Ember Shard | Fire Imp, Lava Crab, Ash Golem |

---

#### REGION 4 — Crystalmere → Duskhollow → Saltmere `[Lv 30–52]`

```
Crystalmere ──[Mirefen Swamp]──[Shadow Thicket]── Duskhollow
                                      │
                             [Saltmere Coast Road]── Saltmere
```

| Area                | Biome            | Level | Key Gathering                        | Key Enemies                       |
|---------------------|------------------|-------|--------------------------------------|-----------------------------------|
| Mirefen Swamp       | Deep swamp       | 28–42 | Swamp Herb, Poison Mushroom, Bog Ore, Murk Water | Swamp Troll, Venomfang Viper, Bog Witch |
| Shadow Thicket      | Dark thorned wood| 35–48 | Shadow Silk (raw), Darkwood Branch, Cursed Herb, Nightshade | Shadow Stalker, Thornbeast, Dark Faerie |
| Saltmere Coast Road | Rocky coastline  | 38–52 | Deep Sea Crystal (shore), Salt Rock, Sea Herb, Driftwood | Coastal Bandit, Sea Crab, Tide Elemental |

---

#### REGION 5 — Duskhollow → Stormspire → Veilreach `[Lv 48–68]`

```
Duskhollow ──[Thunder Steppes]──[Storm Peaks]── Stormspire Citadel
                                      │
                            [Skybridge Trail]── Veilreach
```

| Area               | Biome            | Level | Key Gathering                        | Key Enemies                            |
|--------------------|------------------|-------|--------------------------------------|----------------------------------------|
| Thunder Steppes    | Stormy highland  | 45–58 | Stormstone, Thunder Herb, Storm Feather, Charged Crystal | Thunder Drake, Storm Hawk, Lightning Golem |
| Storm Peaks        | Mountain summit  | 52–65 | Stormcore Ore (raw), Alpine Flower, Mountain Ice, Eagle Feather | Wyvern, Mountain Giant, Ice Harpy |
| Skybridge Trail    | Floating pathway | 58–68 | Windweave Fiber (raw), Sky Crystal, Cloud Herb, Breeze Stone | Wind Phantom, Sky Serpent, Gale Elemental |

---

#### REGION 6 — Stormspire → Cinderpeak → Ashenmoor `[Lv 62–82]`

```
Stormspire ──[Ashen Wastes]──[Dragon's Spine Ridge]── Cinderpeak
                                      │
                           [Moorland Expanse]── Ashenmoor
```

| Area                  | Biome         | Level | Key Gathering                          | Key Enemies                           |
|-----------------------|---------------|-------|----------------------------------------|---------------------------------------|
| Ashen Wastes          | Burnt desert  | 60–75 | Dragon Bone (fragment), Ash Stone, Phoenix Bloom, Scorched Ore | Ash Drake, Charred Golem, Fire Wraith |
| Dragon's Spine Ridge  | Mountain/cliff| 68–80 | Dragon Scale (shed), Mythril Vein (rare), Dragon Tear, Claw Fragment | Elder Wyvern, Ridge Drake, Stone Titan |
| Moorland Expanse      | Bleak moors   | 72–82 | Cursed Essence (raw), Moorgrass, Bone Shard, Dark Crystal | Wraith Hound, Moor Banshee, Undead Knight |

---

#### REGION 7 — Ashenmoor → Wraithgate → Obsidian Keep `[Lv 78–92]`

```
Ashenmoor ──[Ghostwood]──[Obsidian Badlands]── Wraithgate
                                  │
                        [Ruined Citadel Road]── Obsidian Keep
```

| Area                | Biome           | Level | Key Gathering                          | Key Enemies                        |
|---------------------|-----------------|-------|----------------------------------------|------------------------------------|
| Ghostwood           | Haunted forest  | 78–88 | Wraith Essence (raw), Ghost Wood, Soul Herb, Silver Ore | Spectral Wolf, Haunted Armor, Ghost Witch |
| Obsidian Badlands   | Black rock plain| 82–90 | Obsidian Shard, Black Crystal, Void Herb, Onyx Stone | Obsidian Golem, Void Crawler, Dark Titan |
| Ruined Citadel Road | Crumbling ruins | 85–92 | Ancient Rune Stone, Cursed Iron, Worn Blueprint Fragment | Fallen Paladin, Ruin Wraith, Cursed Construct |

---

#### REGION 8 — Obsidian Keep → The Sanctum → Abyss's Edge `[Lv 88–100+]`

```
Obsidian Keep ──[Sacred Highlands]──[Void Frontier]── The Sanctum
                                          │
                                 [Abyssal Approach]── Abyss's Edge
```

| Area                | Biome             | Level  | Key Gathering                           | Key Enemies                           |
|---------------------|-------------------|--------|-----------------------------------------|---------------------------------------|
| Sacred Highlands    | Holy mountain     | 88–95  | Holy Relic Fragment (surface), Sacred Herb, Light Crystal, Blessed Stone | Holy Revenant, Sanctum Guardian, Celestial Knight |
| Void Frontier       | Reality-torn plain| 92–100 | Void Core (shard), Void Herb, Chaos Fragment, Rift Crystal | Void Walker, Chaos Imp, Rift Stalker |
| Abyssal Approach    | Dark abyss rim    | 95–100+| Void Core (dense), Abyssal Stone, Nameless Essence, Eclipse Shard | Abyssal Knight, Void Dragon Spawn, Rift Giant |

---

### Gathering System

Every overworld area (and some dungeon safe-rooms) contains **resource nodes** — physical
spots the player can interact with to collect crafting materials. Nodes have limited uses
before they deplete and must respawn.

---

#### Resource Node Types

| Node Type          | Biome(s)         | Verb     | Materials Yielded                 |
|--------------------|------------------|----------|-----------------------------------|
| **Herb Patch**     | Grassland, Forest, Moor | `gather` | Herbs, flowers, rare seeds       |
| **Mining Vein**    | Cave, Mountain, Badlands| `mine`   | Ore, stone, crystals, gems       |
| **Lumber Spot**    | Forest, Swamp    | `chop`   | Wood, bark, rare wood types      |
| **Water Source**   | Marsh, Coast, River| `fill`  | Water Flask, Spirit Water, Sea Water|
| **Fungal Cluster** | Cave, Swamp      | `pick`   | Mushrooms, spores, rare fungi    |
| **Bone Pile**      | Moor, Ruins, Desert| `sift`  | Bone Shard, Fragment, Ancient Bone|
| **Void Rift**      | Void zones only  | `attune` | Void Core shard, Chaos Fragment, Rift Crystal |

---

#### Resource Node Schema (`areas.json` extension)

```json
{
  "id": "mirefen_swamp",
  "name": "Mirefen Swamp",
  "biome": "swamp",
  "cityId": null,
  "safeZone": false,
  "baseEncounterChance": 0.45,
  "description": "Murky water clings to your boots. The air smells of rot and something older.",
  "exits": ["crystalmere_south_road", "shadow_thicket_north", "duskhollow_west_gate"],
  "enemyPool": [...],
  "groupSizeMin": 1,
  "groupSizeMax": 3,
  "eliteChance": 0.08,
  "scalingByPartySize": true,
  "resourceNodes": [
    {
      "nodeId": "mirefen_herb_01",
      "nodeType": "herb_patch",
      "name": "Swamp Herb Cluster",
      "verb": "gather",
      "position": "near the mossy log to the east",
      "maxUses": 3,
      "respawnMinutes": 30,
      "lootTable": [
        { "itemId": "swamp_herb",      "chance": 0.80, "qtyMin": 1, "qtyMax": 3 },
        { "itemId": "poison_mushroom", "chance": 0.40, "qtyMin": 1, "qtyMax": 2 },
        { "itemId": "blue_herb",       "chance": 0.25, "qtyMin": 1, "qtyMax": 1 },
        { "itemId": "water_lily",      "chance": 0.15, "qtyMin": 1, "qtyMax": 1 },
        { "itemId": "murk_water",      "chance": 0.50, "qtyMin": 1, "qtyMax": 1 }
      ],
      "requiresTool": null,
      "minPlayerLevel": 28
    },
    {
      "nodeId": "mirefen_ore_01",
      "nodeType": "mining_vein",
      "name": "Bog Ore Vein",
      "verb": "mine",
      "position": "jutting from the submerged rocks",
      "maxUses": 2,
      "respawnMinutes": 60,
      "lootTable": [
        { "itemId": "bog_ore",    "chance": 0.85, "qtyMin": 1, "qtyMax": 3 },
        { "itemId": "iron_ore",   "chance": 0.35, "qtyMin": 1, "qtyMax": 2 },
        { "itemId": "dark_crystal","chance":0.10, "qtyMin": 1, "qtyMax": 1 }
      ],
      "requiresTool": "pickaxe",
      "minPlayerLevel": 28
    }
  ]
}
```

---

#### Tool Requirements

Some node types require a **tool item** in inventory (not equipped — just carried):

| Tool          | Required For       | Where to Buy / Craft              |
|---------------|--------------------|-----------------------------------|
| `pickaxe`     | Mining veins       | Any Blacksmith (50g)              |
| `herb_knife`  | Rare herb patches  | Merchant (40g) — not required for basic herbs |
| `wood_axe`    | Lumber spots       | Any Blacksmith (45g)              |
| `water_flask` | Water sources      | Any Merchant (10g) — consumed on fill, returns filled version |

Tools are **not consumed** by gathering (except Water Flask which exchanges empty → filled).
Tools do not use an equipment slot — they sit in inventory.

---

#### Gathering Command Flow

```
Player enters Mirefen Swamp. Server describes the area:

  Mirefen Swamp
  ─────────────────────────────────────────────────────────
  Murky water clings to your boots. The air smells of rot and something older.
  Exits: [north] Crystalmere Road  [east] Shadow Thicket  [west] Duskhollow Gate

  You notice:
    ► A Swamp Herb Cluster near the mossy log to the east.  [gather]
    ► A Bog Ore Vein jutting from the submerged rocks.      [mine] requires pickaxe

> gather

  You crouch down and begin harvesting the swamp herbs...

  ─────────────────────────────────────────────────────────
  Gathered from Swamp Herb Cluster:
    + Swamp Herb      ×2
    + Poison Mushroom ×1
    + Water Lily      ×1
  ─────────────────────────────────────────────────────────
  Node uses remaining: 2 / 3   (respawns in 30 minutes)

> mine

  You don't have a Pickaxe. Buy one at any Blacksmith for 50g.

(After buying a pickaxe:)
> mine

  You swing your pickaxe into the bog rock...

  ─────────────────────────────────────────────────────────
  Mined from Bog Ore Vein:
    + Bog Ore    ×2
    + Iron Ore   ×1
  ─────────────────────────────────────────────────────────
  Node uses remaining: 1 / 2   (respawns in 60 minutes)
```

---

#### Gathering During Combat

Gathering is **not available during combat**. If an encounter triggers while a player is
mid-gather (multiple `gather` taps), the gathering is cancelled:

```
  [Encounter!] A Swamp Troll lurches from the water!
  Gathering interrupted.
```

The node's uses are NOT consumed if gathering is interrupted. The player gets nothing.

---

#### Multiple Players at the Same Node

Nodes are **shared** — all players in the area can see and use them. Uses deplete globally:

```
  Player A gathers herb node → uses: 2 remaining
  Player B gathers same node → uses: 1 remaining
  Player C tries to gather   → "The Swamp Herb Cluster has been picked clean.
                                 It will regrow in about 22 minutes."
```

This creates natural resource competition and encourages cooperation or timing.

---

#### Node Respawn System (Server-Side)

```ts
interface ResourceNodeState {
  nodeId: string;
  areaId: string;
  usesRemaining: number;
  maxUses: number;
  depleted: boolean;
  respawnAt: number | null;       // Date.now() + respawnMinutes * 60_000
  respawnTimer?: NodeJS.Timeout;
}

class GatheringManager {
  private nodeStates: Map<string, ResourceNodeState>;

  getNodeState(nodeId: string): ResourceNodeState;

  gather(playerId: string, areaId: string, nodeId: string): GatherResult | Error;
    // → validates: player in area, node not depleted, tool if required, inv space
    // → rolls loot table
    // → decrements usesRemaining
    // → if usesRemaining === 0: sets depleted=true, starts respawn timer
    // → broadcasts to area: "[Nearby] Kael gathered from the Swamp Herb Cluster (2 uses left)"

  onRespawn(nodeId: string): void;
    // → sets depleted=false, usesRemaining=maxUses
    // → broadcasts to area if any players are present:
    //     "[Area] The Swamp Herb Cluster has regrown."

  getVisibleNodes(areaId: string): ResourceNodeState[];
    // → returns all nodes in area with their current state (for 'look' command)
}
```

---

#### Luck Affects Gathering

The player's **luck stat** increases the chance of rolling rare materials from a node:

```
effectiveChance = baseChance + (player.luck / 10) * 0.005
e.g. baseChance 10% + 60 luck = 10% + 3% = 13% effective

Max bonus from luck on gathering: +8% (regardless of luck value)
```

---

#### `look` Command — Shows Resource Nodes

The `look` command now lists visible nodes alongside the area description:

```
> look

  Dragon's Spine Ridge                          [Lv 68–80, Mountain]
  ─────────────────────────────────────────────────────────────────
  The jagged peaks cut the sky like broken teeth. Wind howls through
  the gaps, carrying the distant smell of smoke. Below, you can see
  the lights of Cinderpeak far to the south.

  Exits: [south] Ashen Wastes  [north] Cinderpeak Road  [east] Cave Mouth

  Players here: Borek (Lv 72)

  Resource Nodes:
    ► Dragon Scale Shed   [gather]  — 3 uses remaining
    ► Mythril Vein        [mine]    — 2 uses remaining  (requires Pickaxe)
    ► Alpine Flower Patch [gather]  — DEPLETED  (respawns in 18 min)

  Enemies: Dragon wyverns patrol this ridge. [encounter chance: high]
```

---

#### Gathering & Autocomplete

Add to `completionData.ts`:

```ts
private _gatherableNodes: string[] = [];  // node verbs available in current area
gatherableNodes = () => this._gatherableNodes;
updateGatherableNodes(verbs: string[]) { this._gatherableNodes = verbs; }
```

Server sends `sync_area` with node states included. Client adds to autocomplete:

```ts
// In autocomplete switch:
case 'gather':
case 'mine':
case 'chop':
case 'pick':
case 'fill':
case 'attune':
  // These are standalone commands — no arg needed (one node per type per area usually)
  // If area has multiple nodes of same type, complete with node name
  return this.filterAndBuild(this.data.gatherableNodes(), partial, prefix);
```

---

#### `sync_area` Payload Update

The server now includes node states in `sync_area`:

```ts
{ type: 'sync_area', data: {
    playerNames:   ['Borek'],
    npcNames:      [],
    areaName:      "Dragon's Spine Ridge",
    resourceNodes: [
      { verb: 'gather', name: 'Dragon Scale Shed',   usesRemaining: 3, depleted: false },
      { verb: 'mine',   name: 'Mythril Vein',        usesRemaining: 2, depleted: false, requiresTool: 'pickaxe' },
      { verb: 'gather', name: 'Alpine Flower Patch', usesRemaining: 0, depleted: true, respawnMinutes: 18 },
    ]
}}
```

---

#### All Gatherable Materials by Biome

```
GRASSLAND / PLAINS
  Red Herb, Blue Herb, Wheat Fiber, Wild Grain, Clover, Common Seed

FOREST (Early)
  Moon Blossom, Sylvan Herb, Thornwood Branch, Rare Seed, Wild Mushroom, Pine Sap

FOREST (Deep / Ancient)
  Ancient Bark, Rare Seed, Forest Crystal, Glowing Mushroom, Faerie Pollen

ROCKY RAVINE / CAVE
  Iron Ore, Copper Ore, Coal, Flint Stone, Cave Mushroom, Cave Crystal

MOUNTAIN / SUMMIT
  Stormstone, Mountain Ice, Alpine Flower, Eagle Feather, Stormcore Ore (raw), Mythril Vein (rare node)

SWAMP / MARSH
  Swamp Herb, Poison Mushroom, Blue Herb, Water Lily, Murk Water, Bog Ore, Dark Crystal

VOLCANIC / ASH
  Magma Ore, Ember Shard, Phoenix Bloom, Volcanic Rock, Fire Coral

SAVANNA / DESERT
  Amber Stone, Wild Grain, Desert Rose, Savanna Grass, Quartz, Sand Crystal

COASTLINE
  Deep Sea Crystal (shore), Salt Rock, Sea Herb, Driftwood, Water Flask (fill)

DARK FOREST / SHADOW THICKET
  Shadow Silk (raw), Darkwood Branch, Cursed Herb, Nightshade, Soul Herb

BAMBOO FOREST  ← *dedicated biome between Thornwick and Crystalmere*
  Bamboo Stalk (crafting material for light armor/accessories), Spirit Dew (rare alchemy),
  Bamboo Mushroom, Green Crystal Shard, Panda Claw (rare enemy drop)

MOOR / RUINS
  Cursed Essence (raw), Bone Shard, Moorgrass, Ancient Rune Stone, Cursed Iron

HAUNTED FOREST
  Wraith Essence (raw), Ghost Wood, Silver Ore, Soul Herb, Spirit Crystal

VOID / RIFT
  Void Core Shard, Chaos Fragment, Rift Crystal, Nameless Essence, Eclipse Shard
```

---

#### Bamboo Forest — Dedicated Area

Between City 4 (Thornwick) and City 5 (Crystalmere) lies a unique area:

**Arashiyama Bamboo Grove** `[Lv 18–28, Bamboo Forest]`

```
Thornwick ──[Arashiyama Bamboo Grove]── Crystalmere City
```

| Node              | Verb     | Materials                                    |
|-------------------|----------|----------------------------------------------|
| Bamboo Stand      | chop     | Bamboo Stalk ×1–4, Bamboo Fiber ×1–2         |
| Spirit Pool       | fill     | Spirit Dew ×1 (rare), Pure Water ×1          |
| Bamboo Mushroom Patch | pick | Bamboo Mushroom ×1–3, Green Spore ×0–1      |
| Crystal Outcrop   | mine     | Green Crystal Shard ×1–2, Mana Crystal Raw ×0–1 |

Enemy pool: Bamboo Panda (passive unless attacked), Shadow Tengu, Spirit Wisp, Jade Serpent

**Bamboo Stalk** is used in crafting lightweight weapons (Bamboo Spear, Spirit Staff) and
light armor (Bamboo Wrist Guards, Nature Cloak). It is one of the lightest materials and
gives an agility bonus when used in armor crafts.

---

#### World Map Visual (ASCII)

The `map` command shows the full area network:

```
> map

  ══════════════════════════════════════════════════════════════════════
   WORLD MAP                              [You are at: ★]
  ══════════════════════════════════════════════════════════════════════

  [Ashford]──[Plains]──[Ravine Rd]──[Irongate]──[Coal Hollow]──[River Delta]──[Millhaven]
      │                                                                │
  [Goblin Warren D1]                                          [Thornwick Deep Forest]
                                                                       │
                                                               ★[Thornwick]
                                                                       │
                                                          [Arashiyama Bamboo Grove]
                                                                       │
  [Rotwood Ruins D2]──[Millhaven]──[Amber Savanna]──[Crystal Badlands]──[Crystalmere]
                                                                       │
                                                          [Emberveil Volcanic Road]
                                                                       │
         [Sunken Mines D3]──[Irongate]          [Emberveil]──[Mirefen Swamp]
                                                                       │
  [Thornwood Labyrinth D4]──[Thornwick]              [Shadow Thicket]──[Duskhollow]
                                                                       │
                                                      [Saltmere Coast Road]──[Saltmere]
                                                                       │
                                                 [Thunder Steppes]──[Stormspire]
                                                                       │
                                                             [Storm Peaks]
                                                                       │
                                                        [Skybridge Trail]──[Veilreach]
  ...
  ══════════════════════════════════════════════════════════════════════
  Type 'map detail <region>' for a zoomed view of a region.
  Unlocked areas shown normally. Locked areas shown as [???].
```

---

#### Updated CLI Commands for Gathering

```
GATHERING (in overworld areas)
  look                   → shows area description + visible resource nodes + node status
  gather                 → gather from herb patch / scale shed / flower patch in current area
  mine                   → mine ore vein in current area (requires Pickaxe in inventory)
  chop                   → chop lumber spot (requires Wood Axe)
  pick                   → pick fungal cluster / bone pile
  fill                   → fill water flask at water source (consumes empty flask)
  attune                 → attune to void rift (Void Frontier / Abyssal Approach areas only)
  nodes                  → list all resource nodes in current area with uses + respawn time
  map                    → full world map
  map detail <region>    → zoomed region map with area names
```

---

#### GatheringManager Added to Server Modules

```
├── world/
│   ├── WorldManager.ts
│   ├── GatheringManager.ts       ← node state, gather(), respawn timers, luck scaling
│   ├── areas.json                ← area nodes + resourceNodes[] array
│   ├── cities.json
│   ├── dungeons.json
│   └── enemies.json
```

---

#### Gathering System Testing Checklist

- [ ] `look` in overworld area shows resource nodes with uses + respawn status
- [ ] `gather` yields correct materials from loot table with correct probabilities
- [ ] `mine` blocked without Pickaxe in inventory — correct error message shown
- [ ] `chop` blocked without Wood Axe — correct error shown
- [ ] `fill` consumes empty Water Flask, returns filled version (correct item)
- [ ] Node uses decrement on each gather; depleted message shown at 0 uses
- [ ] Depleted node shows respawn countdown in `look` and `nodes`
- [ ] Respawn timer fires correctly; broadcasts regrow message to area players
- [ ] Multiple players depleting same node: correct shared state (no extra uses)
- [ ] Gathering interrupted by combat: node uses NOT consumed, player gets nothing
- [ ] Luck stat correctly increases rare material roll chance (capped at +8%)
- [ ] `sync_area` includes node states → Tab autocomplete shows correct gather/mine verbs
- [ ] Party member gathers same node: partner sees `[Nearby] Kael gathered from...` broadcast
- [ ] Bamboo Stalk usable in light armor crafting recipes (CraftingManager integration)
- [ ] Mythril Vein (Dragon's Spine Ridge) correctly classified as rare node (very low spawn weight)

Each city has: Merchant, Guild Board, Blacksmith, Alchemist Table, Inn.
Each city has **exclusive items** only available there.

---

#### CITY 1 — Ashford Village `[Lv 1–5]`
Inn: 10g | Guild rank: F | Theme: Humble starter village.
**Exclusives**: Villager's Lucky Charm (+3 luck), Ashford Bread (+30 HP + removes Weaken),
Rusty Iron Ore (early crafting material)

#### CITY 2 — Irongate Town `[Lv 5–12]`
Inn: 25g | Guild rank: F–E | Theme: Industrial mining town.
**Exclusives**: Irongate Steel Ingot (mid-tier crafting ore), Miner's Lamp (+10% dungeon EXP),
Forge Hammer Blueprint (enables heavy weapon crafting)

#### CITY 3 — Millhaven `[Lv 10–18]`
Inn: 30g | Guild rank: E | Theme: River trading post.
**Exclusives**: River Pearl (accessory crafting gem), Trader's Ledger (+5% gold on sell),
Millhaven Spiced Ale (+15 agility for 3 turns), Healing Touch Scroll (support skill)

#### CITY 4 — Thornwick `[Lv 15–25]`
Inn: 35g | Guild rank: E–D | Theme: Forest ranger town.
**Exclusives**: Thornwick Arrow Bundle (+15% ranged damage), Sylvan Herb (Potion V+ ingredient),
Ranger's Cloak Blueprint (dodge bonus cloak), Haste Scroll (support skill)

#### CITY 5 — Crystalmere City `[Lv 20–32]`
Inn: 60g | Guild rank: D | Theme: Magical crystal city.
**Exclusives**: Mana Crystal Pure (top-tier magic material), Crystalmere Grimoire (−10% mana cost),
Elemental Shard Box (random element shard), Cleanse Scroll (support skill),
Healing Light Scroll (support skill)

#### CITY 6 — Emberveil `[Lv 28–40]`
Inn: 70g | Guild rank: D | Theme: Volcanic fire settlement.
**Exclusives**: Emberveil Magma Ore (fire weapon material), Inferno Scroll Lv3,
Fireproof Coating (Burn immunity, 1 dungeon run)

#### CITY 7 — Duskhollow `[Lv 35–48]`
Inn: 80g | Guild rank: D–C | Theme: Swamp rogue city.
**Exclusives**: Shadow Silk (rogue armor material), Poison Vial Potent (Bleed×5 + Poison),
Rogue's Handbook (+15% crit on first strike)

#### CITY 8 — Saltmere `[Lv 42–55]`
Inn: 85g | Guild rank: C | Theme: Coastal harbor city.
**Exclusives**: Deep Sea Crystal (ice weapon material), Saltmere Compass (reveals dungeon floor map),
Sailor's Grog (+200 HP, −10 agility 2 turns)

#### CITY 9 — Stormspire Citadel `[Lv 50–65]`
Inn: 120g | Guild rank: C–B | Theme: High-altitude lightning fortress.
**Exclusives**: Stormcore Ingot (legendary crafting metal), Thunder God Scroll (AOE thunder magic),
Citadel War Shield Blueprint (best heavy shield), Empower Scroll (support skill),
Iron Guard Scroll (support skill)

#### CITY 10 — Veilreach `[Lv 58–72]`
Inn: 130g | Guild rank: B | Theme: Floating sky monastery.
**Exclusives**: Windweave Cloth (agility armor material), Monk's Focus Stone (+5% acc + dodge),
Skyreach Elixir (full HP+mana, no Inn), Arcane Infuse Scroll (support skill)

#### CITY 11 — Cinderpeak `[Lv 65–78]`
Inn: 150g | Guild rank: B | Theme: Ash-covered dragon lore city.
**Exclusives**: Dragon Bone Fragment (epic crafting ingredient), Ashen Ember Blueprint,
Dragonhide Potion (+40 defense 4 turns)

#### CITY 12 — Ashenmoor `[Lv 72–85]`
Inn: 170g | Guild rank: B–A | Theme: Cursed necromancer moorland city.
**Exclusives**: Cursed Essence (shadow enchant material), Necromancer's Tome (Soul Drain skill),
Revive Shard (auto-revive 50% HP on death)

#### CITY 13 — Wraithgate `[Lv 80–90]`
Inn: 200g | Guild rank: A | Theme: World-boundary ghost fortress.
**Exclusives**: Wraith Essence (S-tier armor enchant), Spirit Blade Blueprint,
Ghoststep Boots (+25% flee, +20 agility), Barrier Scroll (support skill)

#### CITY 14 — Obsidian Keep `[Lv 85–95]`
Inn: 250g | Guild rank: A | Theme: Fallen champions black fortress.
**Exclusives**: Obsidian Core (mythic crafting ore), Champion's Seal (+10% all stats, no sell),
Dark Arts Compendium (3 exclusive dark magic skills)

#### CITY 15 — The Sanctum `[Lv 90–100]`
Inn: 400g | Guild rank: S | Theme: Hidden holy divine city.
**Exclusives**: Holy Relic Fragment (light weapon material), Sanctum's Blessing Scroll (full cleanse
+ 2-turn immunity), Divine Blueprint Excalibur-class, Greater Heal Scroll (support skill)

#### CITY 16 — Abyss's Edge `[Lv 95–100+]`
Inn: 500g | Guild rank: SS | Theme: Endgame rim outpost.
**Exclusives**: Void Core (mythic material), Abyssal Codex (Arcane Surge skill),
Echo Potion (duplicates next skill at 50%), Rally Scroll (support skill — all allies)

---

### Dungeons (17 Total)

Each dungeon boss has **exclusive drops** only obtainable from that boss.

| # | Dungeon               | Level    | Floors | Boss                      |
|---|-----------------------|----------|--------|---------------------------|
| 1 | Goblin Warren         | Lv 1–6   | 3      | Goblin Warlord            |
| 2 | Rotwood Ruins         | Lv 5–10  | 3      | Ancient Treant            |
| 3 | Sunken Mines          | Lv 8–15  | 4      | Iron Golem Lord           |
| 4 | Thornwood Labyrinth   | Lv 12–20 | 4      | Thornwitch Morgara        |
| 5 | Crystal Cave          | Lv 18–28 | 5      | Crystal Golem Sovereign   |
| 6 | Emberveil Caldera     | Lv 25–38 | 5      | Magma Titan Krag          |
| 7 | Shadow Abyss          | Lv 33–48 | 6      | Void Wraith Zelthar       |
| 8 | Drowned Temple        | Lv 40–55 | 6      | Abyssal Serpent Thalrok   |
| 9 | Storm Pinnacle        | Lv 48–62 | 6      | Storm Archon Velorak      |
|10 | Veil Sanctum          | Lv 55–68 | 7      | Wind Phantom Aerith       |
|11 | Ashen Crypt           | Lv 62–75 | 7      | Elder Drake Ignaroth      |
|12 | Moorhex Catacombs     | Lv 70–82 | 7      | Lich King Malachar        |
|13 | Wraith Fortress       | Lv 78–88 | 8      | Wraith Sovereign Damrak   |
|14 | Obsidian Vault        | Lv 83–93 | 8      | Fallen Champion Valthar   |
|15 | Sanctum Depths        | Lv 88–97 | 9      | Holy Revenant Aldros      |
|16 | The Infinite Spire    | Lv 92–100| 10     | Archon of Chaos Xerath    |
|17 | The Abyssal Maw       | Lv 100+  | 12     | The Nameless Void         |

### Boss Exclusive Drop Examples (Selected)

```
Goblin Warlord (D1):
  Warlord's Cracked Helm — Uncommon (25%) | Goblin King's Fang — Uncommon (15%)
  Crude Command Scroll — teaches Rally Strike (10%)

Void Wraith Zelthar (D7):
  Void Wraith Essence — Legendary material (15%) | Shadow Reaper Scythe — Legendary (8%)
  Eclipse Scroll — teaches Null Zone AOE shadow (6%)

Lich King Malachar (D12):
  Lich Phylactery Shard — Mythic material (10%) | Soul Harvest Scythe — Mythic (5%)
  Undying Curse Scroll — teaches Death Knell instant kill magic (3%)
  Full Restore Scroll — teaches Full Restore support skill (rare, 4%)

Archon of Chaos Xerath (D16):
  Chaos Core — Mythic material (5%) | Scepter of Ruin — Mythic wand (3%)
  Oblivion Scroll — Chaos Flare magic (2%) | Rally Scroll — all-ally buff (5%)

The Nameless Void (D17):
  Fragment of the Void — Mythic, 1 per account (3%)
  Voidwalker's Mantle — Mythic cloak (2%) | Void Collapse Scroll (1%)
  Resurrection Scroll — teaches Resurrection support skill (2%)
```

---

## Boss Loot System

```ts
interface BossDropTable {
  bossId: string;
  guaranteedDrops: DropEntry[];
  exclusiveDrops: DropEntry[];
  commonPool: DropEntry[];
}

interface DropEntry {
  itemId: string;
  chance: number;           // 0.0–1.0
  quantityMin: number;
  quantityMax: number;
  luckScaling: boolean;     // +1% per 10 luck, max +15% bonus
}
```

Drop resolution: guaranteed → exclusive rolls → common pool. Max 5 items per kill.
Full inventory → `pendingLoot` buffer → claim with `pending loot`.
In party: each member rolls the full drop table independently.

---

## Item System

### Rarity Tiers

| Grade     | CLI Color | Drop Weight | Stat Bonus  | First Available |
|-----------|----------|-------------|-------------|-----------------|
| Common    | White     | 60%         | +0–5%       | D1              |
| Uncommon  | Green     | 25%         | +6–15%      | D1              |
| Rare      | Cyan      | 10%         | +16–30%     | D3              |
| Epic      | Purple    | 4%          | +31–60%     | D5              |
| Legendary | Yellow    | 0.9%        | +61–100%    | D7              |
| Mythic    | Red       | 0.1%        | +101–200%   | D12             |

### Item Types

```
Weapons:     Sword, Axe, Dagger, Staff, Bow, Spear, Wand, Scythe, Katana, Hammer
Armor:       Light, Medium, Heavy, Robe, Cloak, Shield
Accessories: Ring, Amulet, Belt, Boots, Gloves, Helmet, Crown (cosmetic)
Consumables: Health Potion I–X, Mana Potion I–X, Elixir, Antidote, Revive Shard,
             Fireproof Coating, Skyreach Elixir, Echo Potion, Sailor's Grog
Materials:   Ore, Ingot, Herb, Crystal, Monster Drop, Essence, Gem, Cloth, Bone, Core
Scrolls:     Physical Skill, Magic Skill, Support Skill (new category)
Recipes:     Crafting Blueprints (permanent)
Quest Items: Key items (no sell, no drop)
```

### Potency System

```
Health Potion I  → +50 HP    Craft: Red Herb ×2 + Flask
Health Potion V  → +350 HP   Craft: Sylvan Herb ×3 + Spirit Water ×2
Health Potion X  → +1200 HP  Craft: Dragon Tear ×5 + Holy Water ×3 + Void Essence ×2

Mana Potion I    → +30 MP    Craft: Blue Herb ×2 + Flask
Mana Potion V    → +200 MP   Craft: Starweed ×3 + Ether ×2
Mana Potion X    → +800 MP   Craft: Arcane Bloom ×5 + Void Dust ×3
```

---

## Skill System

### Physical Skills

Learned from: scroll purchase or quest reward.
Leveled by: kills made using that skill. Max level: 10.
Per level: +10% damage, −5% mana cost.

### Magic Skills

Learned from: boss drop, quest reward, or city-exclusive scroll.
Leveled by: kills made using that magic skill. Max level: 10.
Elements: Fire, Ice, Thunder, Shadow, Light, Earth, Wind, Arcane, Void.

### Support Skills (new)

Learned from: specific support scrolls (city-exclusive) or boss drops.
Leveled by: kills made by an ally while your support effect is active on them. Max level: 10.

### Skill Kill Thresholds

```
Lv 1→2:    10     Lv 4→5:  100     Lv 7→8:    750
Lv 2→3:    25     Lv 5→6:  200     Lv 8→9:  1,500
Lv 3→4:    50     Lv 6→7:  400     Lv 9→10: 3,000
```

---

## Save / Load System

```ts
interface SaveFile {
  saveId: string;
  playerName: string;
  savedAt: string;
  playtime: number;
  stats: PlayerStats;
  regenState: RegenState;
  inventory: Inventory;
  skills: {
    physical: PhysicalSkill[];
    magic: MagicSkill[];
    support: SupportSkill[];      // new
  };
  questLog: { active: Quest[]; completed: string[]; };
  worldState: {
    currentArea: string;
    currentCity: string;
    unlockedCities: string[];
    unlockedDungeons: string[];
    defeatedBosses: string[];
    dungeonProgress: { dungeonId: string; currentFloor: number; }[];
  };
  pendingLoot: LootDrop[];
  socialPrefs: {
    chatVisible: boolean;
    nearbyVisible: boolean;
    chatArea: boolean;
    chatParty: boolean;
    chatShout: boolean;
  };
}
```

- **3 save slots** per player
- Manual save: at any Inn
- Auto-save: on quest complete, boss defeat, city fast-travel, party disband
- On disconnect: immediate auto-save

---

## Server-Side Session & Manager Models

```ts
interface GameSession {
  sessionId: string;
  socket: WebSocket;
  playerId: string;
  saveSlot: number;
  currentState: SaveFile;
  combatState?: CombatSession;    // solo or shared party combat
  regenInterval?: NodeJS.Timeout;
  currentMenu: MenuState;
  connectedAt: Date;
  lastActivity: Date;
}

class SessionManager {
  sessions: Map<string, GameSession>;
  getByPlayerId(id: string): GameSession | null;
  broadcast(areaId: string, msg: string, excludeId?: string): void;
  pushToPlayer(playerId: string, msg: string): void;   // push event delivery
}

class PartyManager {
  parties: Map<string, Party>;
  create(leaderId: string): Party;
  invite(partyId: string, targetId: string): void;
  accept(partyId: string, playerId: string): void;
  leave(partyId: string, playerId: string): void;
  disband(partyId: string): void;
  getPartyOf(playerId: string): Party | null;
}

class ChatRouter {
  routeArea(senderId: string, text: string): void;
  routeParty(senderId: string, text: string): void;
  routeWhisper(senderId: string, targetName: string, text: string): void;
  routeShout(senderId: string, text: string): void;  // server-wide, 60s cooldown
}

// Turn timer is managed inside CombatEngine / PartyCombatEngine:
//   startTurnTimer(session, playerId)  → sets setTimeout 15s + schedules 10s/5s warnings
//   clearTurnTimer(session)            → clears on valid action received
//   forfeitTurn(session, playerId)     → increments timedOutCount, advances turn
//   handleDisconnectDuringTurn(...)    → solo pause 60s / party eject immediately
```

---

## Full CLI Command Reference

```
NAVIGATION
  look                    → describe area + regen state + nearby players (if nearby on)
  go <dir>                → move; may trigger encounter
  travel <city>           → fast travel to unlocked city
  map                     → ASCII world map
  rest                    → rest in safe zone (fast regen)

CHARACTER
  stats                   → all player stats + HP/mana + regen rate
  inventory [N]           → paginated inventory (20/page)
  equip <item>            → equip item
  use <item>              → use consumable (self)
  drop <item>             → drop item
  skills                  → list physical + magic + support skills with levels
  gold                    → current gold balance

SOCIAL
  who / nearby            → list players in current area with their status
  say <text>              → area chat
  msg <name> <text>       → whisper to any online player
  shout <text>            → server-wide broadcast (60s cooldown)
  nearby on/off           → toggle arrival/departure notifications
  chat on/off             → toggle all incoming chat
  chat area on/off        → toggle area channel
  chat party on/off       → toggle party channel
  chat shout on/off       → toggle server-wide shout


TRADE
  trade offer <n> <item> <price>   → offer an item to a nearby player for a gold price
                                      <n> = player name or nearby-list index
                                      <item> = item name or inventory slot number
                                      <price> = asking price in gold
  trade view                        → inspect item in an incoming offer (full item card)
  trade accept                      → accept the current offered/countered price
  trade counter <price>             → propose a different price (no round limit)
  trade confirm                     → seller confirms after buyer accepted (executes transfer)
  trade cancel                      → cancel the active trade session (either party, anytime)
  trade history                     → show your last 10 completed trades
PARTY
  party invite <name>     → invite player to party
  party accept            → accept party invitation
  party decline           → decline party invitation
  party leave             → leave current party
  party kick <name>       → remove member (leader only)
  party disband           → disband for all (leader only)
  party info              → show party member HP/mana/location/status
  p <text>                → party chat shortcut

COMBAT — SOLO (in combat only)
  attack                  → basic attack
  skill <n>               → physical skill n
  magic <n>               → magic skill n
  item <n>                → use consumable (self)
  flee                    → attempt escape

COMBAT — PARTY (in shared combat only)
  attack <target>         → attack enemy (e1, e2, or name)
  skill <n> <target>      → physical skill on enemy target
  magic <n> <target>      → magic skill on enemy target
  heal <ally>             → best available heal on ally (p1/p2/name)
  buff <ally> <skill_n>   → buff skill on ally
  item <n> <target>       → consumable on self, ally, or enemy
  flee                    → individual flee attempt
  combat log              → show full current combat log

EXPLORATION
  talk <npc>              → NPC dialogue
  shop                    → merchant menu
  buy <item>              → buy from merchant
  sell <item>             → sell item
  quest                   → active quests
  quest log               → completed quests
  guild                   → guild quest board
  accept <quest>          → accept quest
  craft [weapon]          → crafting menu / craft item
  alchemy                 → alchemist table
  brew <potion>           → brew potion
  inn                     → pay to rest at Inn (full restore + save)
  pending loot            → claim pending boss loot from full-inventory kills

DUNGEON
  enter dungeon           → enter dungeon at entrance
  next floor              → advance to next floor
  loot                    → open floor chest
  retreat                 → exit dungeon

SYSTEM
  save                    → manual save (at Inn only)
  load                    → load save slot
  help                    → command reference
  quit                    → exit (auto-save)
```

---

## Server Module Structure

```
server/
├── index.ts
├── session/
│   ├── SessionManager.ts         ← all connected sessions, push delivery
│   └── GameSession.ts
├── social/
│   ├── PresenceManager.ts        ← area channels, enter/leave, broadcast
│   ├── PartyManager.ts           ← party lifecycle, membership
│   ├── ChatRouter.ts             ← area/party/whisper/shout routing
│   ├── TradeManager.ts           ← P2P trade sessions, escrow, atomic transfer
│   └── BountyManager.ts          ← bounty board: post, accept, progress, claim, expiry
├── engine/
│   ├── CombatEngine.ts           ← solo combat + turn timer (startTurnTimer, forfeitTurn)
│   ├── PartyCombatEngine.ts      ← shared CombatSession, turn queue, targeting, AFK eject,
│   │                                downed timer (100s auto-respawn to nearest city fountain)
│   ├── PlayerEngine.ts           ← stats, level-up, exp
│   ├── RegenEngine.ts            ← per-player 5s tick, state machine
│   ├── SpawnEngine.ts            ← encounter rolls, group sizing, party scaling
│   ├── QuestEngine.ts
│   └── StoryEngine.ts
├── world/
│   ├── WorldManager.ts
│   ├── areas.json                ← area nodes: safeZone, spawnConfig, scalingByPartySize
│   ├── cities.json               ← 16 cities + exclusive items + inn prices + respawnPoint
│   ├── dungeons.json             ← 17 dungeons + floor configs + entranceCityId
│   └── enemies.json              ← all enemy stats + spawn weights
├── loot/
│   ├── LootEngine.ts             ← per-player rolls in party, luck scaling
│   ├── boss_drops.json
│   └── loot_pools.json
├── items/
│   ├── ItemManager.ts
│   ├── CraftingManager.ts
│   ├── AlchemyManager.ts
│   └── items.json
├── skills/
│   ├── SkillManager.ts           ← physical, magic, AND support skill tracking
│   ├── physical_skills.json
│   ├── magic_skills.json
│   └── support_skills.json       ← new
├── merchants/
│   ├── MerchantManager.ts
│   └── shops.json
├── quests/
│   ├── QuestManager.ts
│   ├── stories.json
│   └── quests.json
├── persistence/
│   ├── SaveManager.ts
│   └── saves/
├── parser/
│   └── CommandParser.ts          ← handles chat as non-turn action in combat context
├── admin/                        ← Phase 9: Admin Panel
│   ├── AdminAuth.ts              ← admin login, JWT issuance, middleware guard
│   ├── AdminRouter.ts            ← Express router mounting all /api/admin/* routes
│   ├── AdminPlayerController.ts  ← player CRUD, stats edit, gold, items, ban
│   ├── AdminPvpController.ts     ← PvP enable/disable per city or global
│   ├── AdminAuditLog.ts          ← write every admin action to audit_log table
│   ├── PvpManager.ts             ← runtime PvP state, checked by CombatEngine
│   └── ui/                       ← Static Admin Web UI (served by Express)
│       ├── index.html            ← login page
│       ├── dashboard.html        ← main admin dashboard
│       ├── players.html          ← player list & search
│       ├── player_detail.html    ← single player management page
│       ├── pvp.html              ← PvP settings panel
│       ├── audit.html            ← audit log viewer
│       ├── style.css             ← admin UI stylesheet
│       └── app.js                ← client-side JS (fetch API calls)
└── auth/                         ← Phase 10
    ├── AuthManager.ts            ← register, login, logout, token validation, renewal
    └── FriendManager.ts          ← friend requests, accept/decline, remove, block, notify
```

---

## Balancing Notes

- **Player trading**: No server-imposed price floors or ceilings — pure player negotiation.
  The 90-second session timeout and same-area requirement keep trade sessions contained.
  Atomic SQLite transactions guarantee no gold or item duplication/loss on any edge case.
  Quest Items and equipped items are hard-blocked from trading to prevent progression exploits.
- **Turn timer (15s)**: Keeps solo combat snappy and prevents a single AFK player from
  freezing a party fight. The 10s and 5s warnings give enough heads-up without spamming the
  terminal. Chat exemption ensures social interaction doesn't accidentally burn a player's turn.
  3-timeout AFK eject is the safety valve for truly disconnected-but-connected players.
- **Multiplayer EXP**: Party bonus (10–30% extra EXP) offsets the shared combat difficulty.
  Enemy group sizes scale with party, so the challenge stays proportional.
- **Loot per player**: Independent rolls prevent zero-sum loot competition. More players =
  same loot per person, but easier fights. Intentional incentive to party up.
- **Support skill leveling**: Linked-kill mechanic encourages healers/buffers to stay active.
  A pure healer can reach Lv 10 support skills without ever attacking.
- **Chat as non-turn action**: Keeps social engagement alive in combat without breaking turn
  integrity. Chat adds life to the game world without being exploitable.
- **Nearby notifications**: Opt-in prevents spam in high-population areas (endgame hubs like
  Abyss's Edge may have many players moving through).
- **Flee in party**: Individual flee keeps options open but creates natural social tension
  (abandoning teammates). No mechanical punishment for fleeing, but social consequences exist.
- **Boss drops per player**: Prevents one player hoarding boss loot. Scales reward with effort.
- **Regen**: Passive regen (0.5%/tick) sustains exploration. Inn is premium. Safe-zone rest
  is free but requires being stationary (no combat).
- **Exp curve**: `expToNext = 100 × (1.5 ^ (level − 1))`
- **Gold economy**: Enemies 5–200g, quests 100–5000g, mythic crafting 50,000g+.

---

## Phase 10: Authentication & Friend System

This is the final feature phase, added after all game mechanics, content, and balance are
stable. It introduces player **registration, login, logout**, persistent **session tokens**
for auto-login, and a complete **friend list** system with add, remove, and status features.

---

### Auth System

#### Registration

New players run the game client for the first time and are prompted to register:

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  ⚔  ECHOES OF THE ABYSS — Text Adventure                ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Welcome, traveler. No account found on this device.     ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  [1] Register a new account                              ║
  ║  [2] Login to existing account                           ║
  ╚═══════════════════════════════════════════════════════════╝
> 1

  Username (3–20 chars, letters/numbers/underscore):
> Kael

  Password (min 8 chars):
> ********

  Confirm password:
> ********

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✔  Account created: Kael                                ║
  ║  Your session token has been saved to:                   ║
  ║    ~/.adventuregame/token                                ║
  ║  You will be logged in automatically next time.          ║
  ╚═══════════════════════════════════════════════════════════╝

  Creating your character...
  Choose a name for your in-game character (can differ from username):
> Kael

  Welcome, Kael. Your journey begins at Ashford Village.
```

**Server-side registration flow:**

```ts
POST /auth/register  (over WebSocket initial handshake, not HTTP)
  1. Validate username: 3–20 chars, alphanumeric + underscore, unique
  2. Validate password: min 8 chars
  3. Hash password: bcrypt(password, 12 rounds)
  4. INSERT into players table
  5. Create default save slot 1 (fresh character at Ashford)
  6. Issue JWT token (30-day expiry)
  7. Save token to client: ~/.adventuregame/token
  8. Return: { success, token, playerId, characterName }
```

---

#### Login

Returning players who have a saved token are auto-logged in silently. Players without a
token (new device, token expired, or manually logged out) see the login prompt:

**Auto-login (token exists):**

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  ⚔  ECHOES OF THE ABYSS                                 ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Welcome back, Kael.                                     ║
  ║  Last login: 2 days ago from this device.                ║
  ╚═══════════════════════════════════════════════════════════╝

  Loading your save... (Slot 1 — Lv 28, Duskhollow, 47h 12m played)

  Choose save slot to load:
  [1] Slot 1 — Kael  Lv 28  Duskhollow         47h 12m
  [2] Slot 2 — Kael  Lv 14  Crystalmere City   12h 05m
  [3] Slot 3 — Empty
  [4] New Game

> 1

  Resuming from Duskhollow — Shadow Market District.
  HP: 480/480  MP: 300/300  Gold: 3,200g
```

**Manual login (no token or expired):**

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  ⚔  ECHOES OF THE ABYSS                                 ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  [1] Register     [2] Login                              ║
  ╚═══════════════════════════════════════════════════════════╝
> 2

  Username: Kael
  Password: ********

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✔  Login successful.  Welcome back, Kael.               ║
  ║  Token saved to ~/.adventuregame/token  (30 days)        ║
  ╚═══════════════════════════════════════════════════════════╝
```

**Failed login:**

```
  ✖  Invalid username or password. Please try again.
  (2 attempts remaining before 30-second lockout)
```

**Server-side login flow:**

```ts
// AuthManager.login()
  1. Look up player by username
  2. If not found: generic error (don't reveal which field is wrong)
  3. bcrypt.compare(inputPassword, storedHash)
  4. If mismatch: increment failed_attempts counter; lockout at 5 fails (30s)
  5. If match:
       a. UPDATE players SET last_login = now() WHERE id = playerId
       b. DELETE old sessions for this player (one active session per player)
       c. INSERT new session: { session_id, player_id, token: jwt.sign(...), expires_at }
       d. Return token to client → client saves to ~/.adventuregame/token
  6. Client sends { type: 'auth', token } on next WebSocket connect
```

---

#### Logout

```
> logout

  ╔═══════════════════════════════════════════════════════════╗
  ║  Logging out...                                          ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Your game has been auto-saved.                          ║
  ║  Token removed from this device.                         ║
  ║  See you next time, Kael.                               ║
  ╚═══════════════════════════════════════════════════════════╝
```

**Server-side logout flow:**

```ts
// AuthManager.logout()
  1. Validate token from session
  2. If player is in combat → reject: "You cannot logout during combat."
  3. If player is in active trade → cancel trade, return escrow, then proceed
  4. Auto-save: SaveManager.save(session)
  5. Clean up session: cancel regen timer, remove from PresenceManager,
     notify area: "[Nearby] Kael has left the game."
  6. DELETE session row from sessions table
  7. Client deletes ~/.adventuregame/token
  8. Close WebSocket
```

**Logout blocked conditions:**

```
  > logout
  ✖ You cannot logout while in combat. Defeat or flee your enemies first.

  > logout
  ✖ You have an active trade with Ryuna. Cancel or complete it first.
     (Type 'trade cancel' to cancel the trade, then logout.)
```

---

#### Token Management

```ts
interface TokenPayload {
  playerId: string;
  username: string;
  iat: number;         // issued at (Unix timestamp)
  exp: number;         // expires at (iat + 30 days)
}

// Token lifecycle:
// - Issued on register or login
// - Saved to ~/.adventuregame/token on client
// - Sent as first message on every WebSocket connection:
//     { type: 'auth', token: '<jwt>' }
// - Server validates: jwt.verify(token, JWT_SECRET)
// - If valid and not expired: restore player session
// - If expired: send { type: 'auth_required', reason: 'token_expired' }
//               → client shows login prompt
// - Renewed automatically: if token has < 7 days remaining, a fresh
//   token is issued and pushed to client silently

// One active session per player — logging in from a new device
// invalidates the previous session:
//   Previous device receives: { type: 'push', text:
//     "[Auth] Your account has been logged in from another device. Disconnecting." }
```

---

### Friend System

Players can maintain a **friend list** — a persistent roster of players they've connected
with. Friends appear with richer presence info than strangers, can be contacted by name
regardless of area, and receive online/offline notifications.

---

#### Friend Request Flow

```
Step 1 — Send a request:

> friend add Ryuna

  ╔═══════════════════════════════════════════════════════════╗
  ║  Friend request sent to Ryuna.                           ║
  ║  Waiting for her to accept...                            ║
  ╚═══════════════════════════════════════════════════════════╝

─────────────────────────────────────────────────────────────

Step 2 — Ryuna receives a push notification (wherever she is):

  ╔═══════════════════════════════════════════════════════════╗
  ║  👤  FRIEND REQUEST                                       ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Kael  (Lv 28, Warrior) wants to add you as a friend.   ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  'friend accept Kael'  or  'friend decline Kael'         ║
  ╚═══════════════════════════════════════════════════════════╝

─────────────────────────────────────────────────────────────

Step 3a — Ryuna accepts:

> friend accept Kael

  ✔ You are now friends with Kael!

  Kael receives:
  ╔═══════════════════════════════════════════════════════════╗
  ║  ✔  Ryuna accepted your friend request!                  ║
  ║  You are now friends.                                    ║
  ╚═══════════════════════════════════════════════════════════╝

Step 3b — Ryuna declines:

> friend decline Kael

  Friend request from Kael declined.

  Kael receives:
  [Friends] Ryuna declined your friend request.
```

---

#### Friend Request Rules

```
Cannot send request to:  yourself, current party members (use party system instead),
                         players you have already blocked

Request expires after:   7 days if not accepted or declined (cleaned up daily)

Pending request limit:   max 20 outgoing pending requests at once

Friend list limit:       max 200 friends per player

If target is offline:    request is stored. They see it as a push event on next login.

Duplicate request:       "You already have a pending request with Ryuna."
Already friends:         "You are already friends with Ryuna."
```

---

#### Viewing Your Friend List

```
> friends

  ╔═══════════════════════════════════════════════════════════╗
  ║  👥  FRIEND LIST  (4 friends)                            ║
  ╠════════════╦═══════╦═══════════════╦════════════════════╣
  ║ Name       ║ Level ║ Status        ║ Location           ║
  ╠════════════╬═══════╬═══════════════╬════════════════════╣
  ║ Ryuna      ║  31   ║ 🟢 Online     ║ Crystal Cave F2    ║
  ║ Borek      ║  25   ║ 🟢 Online     ║ Irongate Town      ║
  ║ Zael       ║  55   ║ ⚫ Offline    ║ Last: 3h ago       ║
  ║ Mira       ║  12   ║ 🔴 In Combat  ║ Goblin Warren F1   ║
  ╚════════════╩═══════╩═══════════════╩════════════════════╝
  'friend msg <n>'     → whisper friend (alias for msg)
  'friend where <n>'   → see full location detail
  'party invite <n>'   → invite friend to party
```

**Status icons:**

| Icon | Meaning                    |
|------|----------------------------|
| 🟢   | Online and active          |
| 🔴   | Online but In Combat       |
| 🟡   | Online but AFK (no input for 5+ min) |
| ⚫   | Offline (shows last seen)  |

Friends see **richer location info** than strangers. Strangers in `who` only show the area
name. Friends show floor/detail (e.g. `Crystal Cave F2` instead of just `Crystal Cave`).

---

#### Online / Offline Notifications

Friends receive a push notification when you come online or go offline:

```
On login:
  [Friends] 🟢 Kael has come online.

On logout / disconnect:
  [Friends] ⚫ Kael has gone offline.
```

These are **opt-in** — players can toggle friend notifications:

```
> friend notify on/off
  Friend online/offline notifications: OFF
```

---

#### Checking a Specific Friend's Status

```
> friend where Ryuna

  Ryuna  (Lv 31, Ranger)
  ─────────────────────────────────────────────────────────────
  Status:    🟢 Online
  Location:  Crystal Cave — Floor 2 (Dungeon Lv 18–28)
  HP:        ████████░░  (~80%)     [party of 2]
  Last seen: now
```

Friends' HP bars are visible to each other (percentage bars only, not raw numbers).

---

#### Removing a Friend

```
> friend remove Ryuna

  Remove Ryuna from your friend list? (yes / no)
> yes

  Ryuna has been removed from your friend list.
  (Ryuna is not notified of the removal.)
```

Removal is **silent** — the removed player does not receive any notification. They simply
no longer appear in each other's friend list. The friendship is symmetric: removing from
your list removes it from their list too.

---

#### Blocking a Player

```
> friend block Kael

  Kael has been blocked.
  ─────────────────────────────────────────────────────────────
  Kael can no longer:
    • Send you friend requests
    • Whisper you (msg)
    • See you in nearby listings
  If Kael was on your friend list, they have been removed.
  Type 'friend unblock Kael' to reverse this.
```

Blocking is **one-directional** — it affects what the blocker sees and what the blocked
can do to the blocker, but not the blocked player's experience with others.

```ts
interface BlockEntry {
  blockerId: string;
  blockedId: string;
  blockedAt: string;
}
```

```
> friend unblock Kael

  Kael has been unblocked.
  You can now receive messages and friend requests from Kael again.
```

---

#### Pending Friend Requests

```
> friend pending

  Pending friend requests:
  ─────────────────────────────────────────────────────────────
  INCOMING (1):
    [1] Borek  (Lv 25, Warrior)  — sent 2 hours ago
        'friend accept Borek'  or  'friend decline Borek'

  OUTGOING (2):
    [1] Zael  — sent 3 days ago  (expires in 4 days)
    [2] Mira  — sent 1 day ago   (expires in 6 days)
    'friend cancel <n>' to withdraw an outgoing request
```

---

#### Whisper to Friend by Name (Anywhere)

Friends can always be whispered regardless of area. This is no different from `msg` but
the friend list provides Tab autocomplete for friend names:

```
> msg Ryuna Hey, can you help me on floor 3?
  [Whisper → Ryuna] Hey, can you help me on floor 3?
```

---

#### Friend List Autocomplete

Add to `completionData.ts`:

```ts
private _friendNames: string[] = [];
friendNames = () => this._friendNames;
updateFriends(names: string[]) { this._friendNames = names; }
```

Add `sync_friends` push event:

```ts
// Sent on login and whenever friend list changes
{ type: 'sync_friends', data: {
    friends: [
      { name: 'Ryuna', online: true,  area: 'Crystal Cave F2' },
      { name: 'Borek', online: true,  area: 'Irongate Town'   },
      { name: 'Zael',  online: false, lastSeen: '3h ago'      },
    ]
}}
```

Add to autocomplete switch:

```ts
case 'friend':
  if (tokens.length === 2)
    return this.filterAndBuild(
      ['add','remove','accept','decline','cancel','block','unblock',
       'pending','list','where','notify','msg'],
      partial, prefix
    );
  if (['add','remove','accept','decline','block','unblock','where','msg'].includes(sub))
    return this.filterAndBuild(this.data.friendNames(), partial, prefix);
  return [];

case 'friends':
  return [];   // standalone command, no args
```

---

### Auth & Friend Data Models

```ts
// Auth
interface AuthPayload {
  username: string;
  passwordHash: string;       // bcrypt, 12 rounds
  playerId: string;
  createdAt: string;
  lastLogin: string;
  failedAttempts: number;     // reset on successful login
  lockedUntil: string | null; // lockout timestamp
  saveSlots: SaveFile[];
}

// Session token
interface TokenPayload {
  playerId: string;
  username: string;
  iat: number;
  exp: number;                // 30 days
}

// Friend relationship
interface Friendship {
  id: string;                 // UUID
  requesterId: string;        // who sent the request
  addresseeId: string;        // who received it
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;          // 7 days from createdAt if still pending
}
```

---

### Auth & Friend Database Tables

```sql
-- ─────────────────────────────────────────────
-- AUTH EXTRAS (adds to existing players table)
-- ─────────────────────────────────────────────
ALTER TABLE players ADD COLUMN failed_attempts INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN locked_until    TEXT;

-- ─────────────────────────────────────────────
-- FRIENDSHIPS
-- ─────────────────────────────────────────────
CREATE TABLE friendships (
  id            TEXT PRIMARY KEY,         -- UUID
  requester_id  TEXT NOT NULL REFERENCES players(id),
  addressee_id  TEXT NOT NULL REFERENCES players(id),
  status        TEXT NOT NULL DEFAULT 'pending',
                                          -- 'pending' | 'accepted' | 'declined'
  created_at    TEXT NOT NULL,
  responded_at  TEXT,
  expires_at    TEXT NOT NULL,            -- created_at + 7 days
  UNIQUE(requester_id, addressee_id)
);

-- ─────────────────────────────────────────────
-- BLOCKS
-- ─────────────────────────────────────────────
CREATE TABLE blocks (
  blocker_id    TEXT NOT NULL REFERENCES players(id),
  blocked_id    TEXT NOT NULL REFERENCES players(id),
  blocked_at    TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status    ON friendships(status);
CREATE INDEX idx_friendships_expires   ON friendships(expires_at);
CREATE INDEX idx_blocks_blocker        ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked        ON blocks(blocked_id);
```

---

### AuthManager & FriendManager (Server Modules)

```ts
class AuthManager {
  register(username: string, password: string): RegisterResult | Error;
  login(username: string, password: string): LoginResult | Error;
  logout(sessionId: string): void;
  validateToken(token: string): TokenPayload | null;
  renewTokenIfNearExpiry(session: GameSession): void;  // silent refresh < 7 days left
  handleDisconnect(session: GameSession): void;         // auto-save, presence cleanup
  isBanned(playerId: string): boolean;
  checkRateLimit(ip: string): boolean;                  // 5 failed attempts → 30s lockout
}

class FriendManager {
  sendRequest(requesterId: string, addresseeUsername: string): void | Error;
  acceptRequest(addresseeId: string, requesterId: string): void | Error;
  declineRequest(addresseeId: string, requesterId: string): void;
  cancelRequest(requesterId: string, addresseeId: string): void;
  removeFriend(playerId: string, friendId: string): void;
  blockPlayer(blockerId: string, targetId: string): void;
  unblockPlayer(blockerId: string, targetId: string): void;
  getFriendList(playerId: string): FriendEntry[];
  getPendingRequests(playerId: string): PendingRequests;
  isFriend(aId: string, bId: string): boolean;
  isBlocked(blockerId: string, targetId: string): boolean;
  notifyOnline(playerId: string): void;   // pushes login notification to all online friends
  notifyOffline(playerId: string): void;  // pushes logout notification to all online friends
  runExpiryCheck(): void;                 // daily job — expire 7-day-old pending requests
}

interface FriendEntry {
  friendId: string;
  friendName: string;
  online: boolean;
  status: 'exploring' | 'in_combat' | 'afk' | 'offline';
  areaId: string | null;
  areaName: string | null;
  level: number;
  hpPercent: number | null;    // null if offline
  lastSeen: string | null;     // null if online
}
```

---

### Updated Server Module Structure (Auth & Friend)

```
└── auth/
    ├── AuthManager.ts            ← register, login, logout, token validation, renewal
    └── FriendManager.ts          ← friend requests, accept/decline, remove, block, notify
```

---

### Updated CLI Commands (Auth & Friend)

```
AUTH (pre-game, before entering world)
  register               → interactive registration wizard
  login                  → manual login prompt (if token missing/expired)
  logout                 → auto-save, clear token, disconnect

FRIEND (in-game, always available)
  friends                → view friend list with status and location
  friend add <n>      → send a friend request to a player
  friend remove <n>   → remove a friend (silent to them)
  friend accept <n>   → accept incoming friend request
  friend decline <n>  → decline incoming friend request
  friend cancel <n>   → withdraw an outgoing pending request
  friend pending         → view incoming + outgoing pending requests
  friend where <n>    → see friend's current location + HP bar
  friend block <n>    → block a player (removes from friends, hides presence)
  friend unblock <n>  → unblock a player
  friend notify on/off→ toggle online/offline push notifications from friends
  friend msg <n> <txt>→ whisper a friend directly from friend list (alias for msg)
```

---

### Startup Integration for Auth & Friend

Add to startup sequence:

```
After step 4 (initialize managers), add:
  4b. Initialize AuthManager (load JWT secret from config)
  4c. Initialize FriendManager
  4d. Start friend request expiry job (daily, same as bounty expiry)

On WebSocket connect (before any game commands):
  if message.type === 'auth':
    token = AuthManager.validateToken(message.token)
    if valid:   restore session, load save, enter world
    if invalid: send { type: 'auth_required', reason: 'token_invalid' }
                client shows login/register prompt
  else:
    send { type: 'auth_required', reason: 'no_token' }
```

---

### Auth & Friend Testing Checklist

**Authentication:**
- [ ] Register: valid username/password creates account, returns token, saves to `~/.adventuregame/token`
- [ ] Register: duplicate username returns error `USERNAME_TAKEN`
- [ ] Register: username < 3 chars or > 20 chars rejected
- [ ] Register: password < 8 chars rejected
- [ ] Login: correct credentials return new token, save to disk
- [ ] Login: wrong password returns generic error (does not reveal which field is wrong)
- [ ] Login: 5 failed attempts → 30-second lockout; lockout timer resets on success
- [ ] Auto-login: valid token on connect → skip prompt, restore session directly
- [ ] Auto-login: expired token → login prompt shown, old token deleted from disk
- [ ] Auto-login: token from new device → previous session disconnected with notification
- [ ] Logout: auto-saves game before disconnecting
- [ ] Logout blocked during combat: correct error shown
- [ ] Logout blocked during active trade: correct error shown; suggests `trade cancel`
- [ ] Token renewal: token with < 7 days left silently refreshed, saved to disk
- [ ] Banned player: connect attempt rejected immediately with ban reason message

**Friend System:**
- [ ] `friend add`: request stored as `pending`, push notification to target if online
- [ ] `friend add`: target offline → request stored, shown as push on their next login
- [ ] `friend accept`: both players' friend lists updated, mutual push notification
- [ ] `friend decline`: request marked declined, silent to decliner, notif to requester
- [ ] `friend cancel`: outgoing pending request withdrawn cleanly
- [ ] `friend remove`: removed from both lists atomically, no notification to removed player
- [ ] `friend block`: removes friendship (if any), prevents whisper/requests/presence visibility
- [ ] `friend unblock`: restores normal visibility and request capability
- [ ] `friends` list: shows correct online/offline status and location for each friend
- [ ] Online notification: friends receive push on login (if `friend notify on`)
- [ ] Offline notification: friends receive push on logout/disconnect (if `friend notify on`)
- [ ] `friend notify off`: no online/offline pushes sent; friendship still functional
- [ ] `friend where <n>`: shows location detail + HP bar (online) or last-seen (offline)
- [ ] Friend list limit: 201st friend request rejected with `FRIEND_LIST_FULL`
- [ ] Pending limit: 21st outgoing request rejected
- [ ] Daily expiry job: 7-day-old pending requests cleaned up, not delivered
- [ ] `sync_friends` push on login: client Tab autocomplete populated with friend names
- [ ] Blocked player's `msg` silently dropped (not delivered, not shown as error to sender)
- [ ] Blocked player's `friend add` returns generic `PLAYER_NOT_FOUND` (don't reveal block)

---

## Getting Started Checklist

**Phase 1 — Core Engine**
- [ ] WebSocket server + `CommandParser`
- [ ] `PlayerEngine` — stats, level-up, exp
- [ ] `CombatEngine` — damage, flee, status effects
- [ ] Turn timer — 15s countdown per player turn, 10s/5s warnings, forfeit on expire
- [ ] `RegenEngine` — 5s tick, 5-state machine
- [ ] `SaveManager` — 3 save slots, pendingLoot buffer

**Phase 2 — World & Spawns**
- [ ] `WorldManager` — load areas, cities, dungeons; area graph with biomes and exits
- [ ] `SpawnEngine` — encounter rolls, group size, elite chance
- [ ] `InventoryManager` — 100-slot cap
- [ ] `GatheringManager` — node state per area, gather/mine/chop/pick/fill/attune verbs
- [ ] Resource node loot table rolls with luck scaling
- [ ] Node depletion + respawn timer (setInterval per node, broadcast regrow to area)
- [ ] Tool requirement checks (pickaxe, wood_axe, herb_knife)
- [ ] Gathering interrupted by combat: node uses not consumed
- [ ] Shared node depletion across all players in area
- [ ] `look` command includes resource node list with uses + respawn countdown
- [ ] `nodes` command — full node status for current area
- [ ] `sync_area` payload includes `resourceNodes[]` for client Tab autocomplete
- [ ] All 24 overworld areas added to `areas.json` with biome + resourceNodes

**Phase 3 — Story & Quests**
- [ ] `QuestEngine` + `StoryEngine` — lifecycle + story templates
- [ ] `SkillManager` — physical + magic tracking, kill gates

**Phase 4 — Economy**
- [ ] `LootEngine` — boss drops, luck scaling, pendingLoot
- [ ] `ItemManager` + `CraftingManager` + `AlchemyManager`
- [ ] `MerchantManager` — city-exclusive stock

**Phase 5 — Multiplayer Core**
- [ ] `PresenceManager` — area channels, enter/leave, broadcast
- [ ] `ChatRouter` — area, party, whisper, shout, cooldown
- [ ] Nearby listing command (`who`, `nearby`)
- [ ] Push event delivery to client (non-turn chat messages)
- [ ] Social preference persistence in SaveFile
- [ ] `TradeManager` — offer, counter, escrow, atomic transfer, 90s timeout
- [ ] `trade_history` table (SQLite) for completed trade logging
- [ ] Area-leave / disconnect cancels active trade session
- [ ] `BountyManager` — post, accept, progress tracking, claim, cancel, expiry
- [ ] `bounties` table (SQLite) with all indexes
- [ ] `onPvpKill` hook: BountyManager.onPvpKill fires after every PvP kill
- [ ] `onDuelWin` hook: BountyManager.onDuelWin fires after duel resolution
- [ ] Daily bounty expiry job (setInterval 24h): refund gold + items, notify poster + hunters
- [ ] Target push notification on bounty post, hunter accept, expiry, and cancellation
- [ ] Duel challenge/accept/decline/timeout flow (60s window)

**Phase 6 — Party & Party Combat**
- [ ] `PartyManager` — invite, accept, leave, disband, kick
- [ ] `PartyCombatEngine` — shared CombatSession, turn queue, targeting
- [ ] Turn timer — `startTurnTimer` / `clearTurnTimer` / `forfeitTurn` (15s, warnings at 10s + 5s)
- [ ] Consecutive AFK timeout tracking (`timedOutCount`) — eject at 3 consecutive
- [ ] Disconnect-during-turn handling (solo: 60s pause; party: immediate eject)
- [ ] Heal ally / buff ally / item on ally commands
- [ ] Downed state: HP=0 → Downed (not instant respawn), 100s countdown timer starts
- [ ] Every 10s push countdown warning to downed player; compact status to party
- [ ] Revival within 100s (Resurrection skill / Revive Shard) cancels timer, restores HP
- [ ] Auto-respawn on 100s expiry: `WorldManager.getNearestCity(areaId)` → fountain point
- [ ] Respawn conditions: 30% HP/mana, clear debuffs, −10% gold, no item loss
- [ ] Party win with downed members: cancel all downed timers, revive at 1 HP in-place
- [ ] Party wipe: cancel all downed timers, immediate fountain respawn for all, −10% gold each
- [ ] `cities.json` — add `respawnPoint` field (areaId + description) to all 16 cities
- [ ] `dungeons.json` — add `entranceCityId` field to all 17 dungeons
- [ ] `WorldManager.getNearestCity()` — dungeon → entranceCityId; overworld → hop distance
- [ ] Solo death: nearest city fountain respawn (30% HP/mana, −10% gold, clear debuffs)
- [ ] Party EXP bonus, per-player loot rolls
- [ ] Party flee rules (individual decision, must act before 15s expires)
- [ ] `support_skills.json` + support skill tracking in `SkillManager`
- [ ] SpawnEngine party scaling (`scalingByPartySize`)

**Phase 7 — Content**
- [ ] 16 `cities.json` entries with exclusive items + support scrolls
- [ ] 17 `dungeons.json` entries + boss drop tables
- [ ] `enemies.json` + `areas.json` with spawn configs
- [ ] CLI client — raw keypress handler (`stdin` raw mode, Tab interception)
- [ ] `autocomplete.ts` — `Autocomplete` engine with context-aware `getMatches()`
- [ ] `completionData.ts` — `CompletionData` store with all static + dynamic lists
- [ ] Tab cycling for multi-match: cycle through candidates on repeated Tab, hint display below input
- [ ] Single-match Tab: instant full completion with trailing space
- [ ] No-match Tab: BEL character, no change
- [ ] Argument-level completion: second and third arg completions per command (travel, equip, trade offer, etc.)
- [ ] Arrow key history navigation (Up/Down) and cursor movement (Left/Right)
- [ ] Server sync payloads: `sync_inventory`, `sync_area`, `sync_skills`, `sync_merchant`, `sync_guild_quests`, `sync_craft`, `sync_combat_start`, `sync_combat_end`, `sync_world`
- [ ] Push event handler updated to intercept sync payloads and call `completionData.update*()` silently
- [ ] Verify Tab works during combat (completes `attack`, `skill`, `magic`, `heal`, `buff` with live names)

**Phase 8 — Balance**
- [ ] Exp curve, gold economy, spawn rates, party scaling, drop weights

**Phase 9 — Admin Panel**
- [ ] Express server on port 8081 serving admin UI static files
- [ ] `AdminAuth` — admin login endpoint, bcrypt verify, JWT issue (8h expiry)
- [ ] JWT middleware guard on all `/api/admin/*` routes
- [ ] `AdminPlayerController` — list, search, view, edit stats, add/remove gold, give/remove items, ban/unban
- [ ] `AdminPvpController` — toggle PvP global or per city, read current state
- [ ] `PvpManager` — runtime PvP flag, checked by `CombatEngine` before allowing player-vs-player
- [ ] `AdminAuditLog` — write every admin mutation to `admin_audit_log` table
- [ ] Admin Web UI — login page, dashboard, player list, player detail, PvP panel, audit log viewer
- [ ] Rate limiting on admin endpoints (100 req / 15 min per IP)
- [ ] Banned player connection rejection on WebSocket connect

**Phase 10 — Auth & Friends**
- [ ] `AuthManager` — register, login, logout, bcrypt 12 rounds, JWT 30-day tokens
- [ ] Token saved to `~/.adventuregame/token` on client; auto-login on connect
- [ ] Token renewal: silent refresh when < 7 days remain
- [ ] One active session per player — new login invalidates previous session
- [ ] Failed login lockout: 5 attempts → 30s lockout
- [ ] Logout blocked during combat and active trade
- [ ] `FriendManager` — send/accept/decline/cancel/remove/block/unblock
- [ ] Friend online/offline push notifications (opt-in per player)
- [ ] `friends` list display with status icons and location
- [ ] `friend where <n>` shows HP bar + location detail for online friends
- [ ] `sync_friends` push event on login → client autocomplete populated
- [ ] `friendships` and `blocks` tables in SQLite
- [ ] Daily expiry job: clean up 7-day-old pending friend requests
- [ ] Admin delete player: clean up all friendships and blocks for that player
- [ ] Blocked player: whispers silently dropped, friend requests return generic error

**Phase 11 — Monetization (Steam)**
- [ ] Steam App ID + Web API Key + Publisher Key configured in env (never in code)
- [ ] `StoreManager` — InitTxn, FinalizeTxn, order tracking in `store_orders` table
- [ ] Webhook `/steam/txn-callback` — validate Steam signature, idempotent grant
- [ ] `EntitlementManager` — grant, has, getAll, getInventoryCap (base 100 + expansions)
- [ ] `InventoryManager` uses `getInventoryCap()` instead of hard-coded 100 everywhere
- [ ] `CosmeticRenderer` — username color, chat effect, combat effect, title, theme box rendering
- [ ] `active_cosmetics` table — stores per-player active selections
- [ ] All 6 theme definitions in `themes.json` with ANSI codes
- [ ] Rainbow name color cycling implementation (ANSI per character)
- [ ] Critical Explosion FX fires only on actual crits (not regular attacks)
- [ ] `store` command renders with player's own active theme
- [ ] `store buy` blocks duplicate purchases: "You already own this item."
- [ ] Cosmetic activation commands: namecolor, chatfx, combatfx, title, theme
- [ ] Custom title profanity filter applied on `title custom <text>`
- [ ] Sandbox mode for Steam API during development
- [ ] Refund flow: `store_orders.status = 'refunded'`, entitlement revoked
- [ ] Admin panel Store tab: view purchase history, manually grant/revoke entitlements
- [ ] Sandbox end-to-end test: full purchase flow in Steam sandbox environment

**Phase 12 — Data-Driven Hot-Update**
- [ ] `ContentManager` — initialize from JSON + load overrides + load active events
- [ ] All engines refactored to call `ContentManager.get()` (no direct JSON imports)
- [ ] `content_overrides` table — partial patch merge, is_new support for brand-new entries
- [ ] `active_events` table with end-timers (setTimeout per event)
- [ ] `store_catalog` table — live item additions/modifications/removals
- [ ] `EventEngine` — activate, deactivate, kill hook, collect hook, reward distribution
- [ ] Limited quest event: quest injected to guild boards, shared kill counter, goal reward
- [ ] Dungeon event: temporary floors added/removed cleanly, drop bonus applied/reverted
- [ ] City event: temporary shop items, NPC additions, description suffix, inn price override
- [ ] Sale event: discounts + new items in store, auto-deactivate on event end
- [ ] World event: login banner, EXP/drop multipliers, overworld spawn overrides
- [ ] Admin `/content` hub — active events, scheduled events, live patches
- [ ] Admin event editor — all 5 event types, shared goal config, reward config
- [ ] Admin world editor — city and dungeon live editing with diff preview
- [ ] Admin store product manager — add/edit/disable catalog items
- [ ] Hot-update REST API: create/patch/delete events, overrides, catalog items
- [ ] On server restart: all overrides + active events reloaded from DB correctly
- [ ] Content change push notifications to players in affected areas

---

## Database Schema (SQLite)

Seluruh state game disimpan dalam satu file SQLite. Tabel dipisahkan per domain.

```sql
-- ─────────────────────────────────────────────
-- ADMIN
-- ─────────────────────────────────────────────
CREATE TABLE admins (
  id            TEXT PRIMARY KEY,       -- UUID
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- bcrypt, separate from player accounts
  role          TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'superadmin'
  created_at    TEXT NOT NULL,
  last_login    TEXT,
  is_active     INTEGER DEFAULT 1       -- 0 = deactivated admin account
);

CREATE TABLE admin_sessions (
  session_id    TEXT PRIMARY KEY,
  admin_id      TEXT NOT NULL REFERENCES admins(id),
  token         TEXT UNIQUE NOT NULL,   -- JWT issued on admin login
  ip_address    TEXT,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL
);

CREATE TABLE admin_audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id      TEXT NOT NULL,
  admin_name    TEXT NOT NULL,
  action        TEXT NOT NULL,          -- e.g. 'MODIFY_STATS', 'BAN_PLAYER', 'GIVE_ITEM'
  target_type   TEXT,                   -- 'player' | 'city' | 'server'
  target_id     TEXT,                   -- playerId or cityId affected
  payload       TEXT,                   -- JSON: what changed (before/after)
  ip_address    TEXT,
  performed_at  TEXT NOT NULL
);

CREATE TABLE pvp_settings (
  scope         TEXT PRIMARY KEY,       -- 'global' | cityId (e.g. 'duskhollow')
  enabled       INTEGER DEFAULT 0,      -- 0 = off, 1 = on
  updated_by    TEXT,                   -- admin_id who last changed it
  updated_at    TEXT
);

-- ─────────────────────────────────────────────
-- BANS
-- ─────────────────────────────────────────────
CREATE TABLE player_bans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     TEXT NOT NULL REFERENCES players(id),
  banned_by     TEXT NOT NULL,          -- admin_id
  reason        TEXT,
  banned_at     TEXT NOT NULL,
  expires_at    TEXT,                   -- NULL = permanent ban
  is_active     INTEGER DEFAULT 1
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_id);
CREATE INDEX idx_player_bans_player ON player_bans(player_id);

-- ─────────────────────────────────────────────
-- FRIENDSHIPS & BLOCKS
-- (Full DDL in Auth & Friend System section)
-- ─────────────────────────────────────────────
-- friendships: id, requester_id, addressee_id, status, created_at, expires_at
-- blocks:      blocker_id, blocked_id, blocked_at
-- Indexes: idx_friendships_requester, idx_friendships_addressee,
--          idx_friendships_status, idx_friendships_expires,
--          idx_blocks_blocker, idx_blocks_blocked

-- ─────────────────────────────────────────────
-- BOUNTIES (see Bounty Board System section for full DDL)
-- ─────────────────────────────────────────────
-- bounties table defined in BountyManager section above.
-- Key indexes: idx_bounties_target, idx_bounties_poster,
--              idx_bounties_status, idx_bounties_expires

-- ─────────────────────────────────────────────
-- PLAYERS & AUTH
CREATE TABLE players (
  id            TEXT PRIMARY KEY,       -- UUID
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- bcrypt (Phase 9)
  created_at    TEXT NOT NULL,
  last_login    TEXT
);

CREATE TABLE save_slots (
  id            TEXT PRIMARY KEY,       -- UUID
  player_id     TEXT NOT NULL REFERENCES players(id),
  slot_number   INTEGER NOT NULL,       -- 1, 2, or 3
  save_data     TEXT NOT NULL,          -- full SaveFile as JSON blob
  saved_at      TEXT NOT NULL,
  playtime_secs INTEGER DEFAULT 0,
  UNIQUE(player_id, slot_number)
);

-- ─────────────────────────────────────────────
-- SESSIONS (in-memory primary, DB fallback)
-- ─────────────────────────────────────────────
CREATE TABLE sessions (
  session_id    TEXT PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES players(id),
  token         TEXT UNIQUE NOT NULL,   -- JWT or UUID token
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  last_active   TEXT
);

-- ─────────────────────────────────────────────
-- PARTIES
-- ─────────────────────────────────────────────
CREATE TABLE parties (
  party_id      TEXT PRIMARY KEY,
  leader_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE party_members (
  party_id      TEXT NOT NULL REFERENCES parties(party_id),
  player_id     TEXT NOT NULL,
  joined_at     TEXT NOT NULL,
  PRIMARY KEY (party_id, player_id)
);

-- ─────────────────────────────────────────────
-- TRADE HISTORY
-- ─────────────────────────────────────────────
CREATE TABLE trade_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id      TEXT NOT NULL,
  seller_id     TEXT NOT NULL,
  buyer_id      TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  item_name     TEXT NOT NULL,
  item_grade    TEXT NOT NULL,
  final_price   INTEGER NOT NULL,
  area_id       TEXT NOT NULL,
  completed_at  TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- WORLD STATE (shared, server-authoritative)
-- ─────────────────────────────────────────────
CREATE TABLE defeated_bosses (
  player_id     TEXT NOT NULL,
  boss_id       TEXT NOT NULL,
  defeated_at   TEXT NOT NULL,
  kill_count    INTEGER DEFAULT 1,
  PRIMARY KEY (player_id, boss_id)
);

CREATE TABLE unlocked_cities (
  player_id     TEXT NOT NULL,
  city_id       TEXT NOT NULL,
  unlocked_at   TEXT NOT NULL,
  PRIMARY KEY (player_id, city_id)
);

CREATE TABLE unlocked_dungeons (
  player_id     TEXT NOT NULL,
  dungeon_id    TEXT NOT NULL,
  unlocked_at   TEXT NOT NULL,
  best_floor    INTEGER DEFAULT 1,
  PRIMARY KEY (player_id, dungeon_id)
);

-- ─────────────────────────────────────────────
-- QUEST LOG
-- ─────────────────────────────────────────────
CREATE TABLE quest_log (
  player_id     TEXT NOT NULL,
  quest_id      TEXT NOT NULL,
  status        TEXT NOT NULL,    -- 'active' | 'completed' | 'failed'
  progress      TEXT,             -- JSON: { killed: 3, target: 10 }
  accepted_at   TEXT NOT NULL,
  completed_at  TEXT,
  PRIMARY KEY (player_id, quest_id)
);

-- ─────────────────────────────────────────────
-- SKILL TRACKING
-- ─────────────────────────────────────────────
CREATE TABLE player_skills (
  player_id     TEXT NOT NULL,
  skill_id      TEXT NOT NULL,
  skill_type    TEXT NOT NULL,    -- 'physical' | 'magic' | 'support'
  level         INTEGER DEFAULT 1,
  kill_count    INTEGER DEFAULT 0,
  PRIMARY KEY (player_id, skill_id)
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_save_slots_player ON save_slots(player_id);
CREATE INDEX idx_trade_history_seller ON trade_history(seller_id);
CREATE INDEX idx_trade_history_buyer ON trade_history(buyer_id);
CREATE INDEX idx_quest_log_player ON quest_log(player_id);
CREATE INDEX idx_player_skills_player ON player_skills(player_id);
```

### Prinsip Penyimpanan

- **Hot data** (HP, mana, posisi, combat state): disimpan di memory (`GameSession`). Di-flush ke
  `save_slots` saat auto-save atau disconnect.
- **Cold data** (quest history, trade history, kill records): langsung tulis ke SQLite saat event
  terjadi — tidak perlu menunggu save.
- **SaveFile JSON blob**: seluruh state karakter (stats, inventory, skills, world progress)
  diserialisasi sebagai satu JSON blob ke kolom `save_data`. Ini mempercepat load/save tanpa
  JOIN query yang kompleks.

---

## JSON Data Schemas

Seluruh konten game (item, musuh, dungeon, kota, quest) didefinisikan dalam file JSON.
Berikut adalah schema untuk setiap file.

### `items.json`

```json
{
  "items": [
    {
      "id": "iron_sword",
      "name": "Iron Sword",
      "type": "weapon",
      "weaponType": "sword",
      "grade": "common",
      "damage": 18,
      "accuracy": 5,
      "statBonus": { "strength": 2 },
      "description": "A basic sword forged from iron ore.",
      "stackable": false,
      "maxStack": 1,
      "tradeLock": false,
      "sellPrice": 80,
      "craftable": true
    },
    {
      "id": "health_potion_1",
      "name": "Health Potion I",
      "type": "consumable",
      "consumableType": "heal_hp",
      "grade": "common",
      "potency": 1,
      "effectValue": 50,
      "description": "Restores 50 HP.",
      "stackable": true,
      "maxStack": 99,
      "tradeLock": false,
      "sellPrice": 20,
      "craftable": true
    },
    {
      "id": "void_wraith_essence",
      "name": "Void Wraith Essence",
      "type": "material",
      "grade": "legendary",
      "description": "A dense shard of shadow energy from Void Wraith Zelthar.",
      "stackable": true,
      "maxStack": 10,
      "tradeLock": false,
      "sellPrice": 800,
      "craftable": false
    },
    {
      "id": "quest_key_crypt",
      "name": "Crypt Gate Key",
      "type": "quest",
      "grade": "common",
      "description": "Opens the sealed gate in Moorhex Catacombs.",
      "stackable": false,
      "tradeLock": true,
      "sellPrice": 0
    }
  ]
}
```

### `enemies.json`

```json
{
  "enemies": [
    {
      "id": "goblin_scout",
      "name": "Goblin Scout",
      "level": 2,
      "hp": 45,
      "mana": 10,
      "attack": 8,
      "strength": 5,
      "defense": 3,
      "agility": 12,
      "luck": 2,
      "expReward": 15,
      "goldMin": 3,
      "goldMax": 8,
      "isBoss": false,
      "isElite": false,
      "aiPattern": "aggressive",
      "skills": ["goblin_slash"],
      "weaknesses": ["fire", "light"],
      "resistances": [],
      "dropTable": [
        { "itemId": "goblin_fang", "chance": 0.30, "qtyMin": 1, "qtyMax": 2, "luckScaling": false },
        { "itemId": "leather_scrap", "chance": 0.50, "qtyMin": 1, "qtyMax": 1, "luckScaling": false }
      ]
    },
    {
      "id": "goblin_warlord",
      "name": "Goblin Warlord",
      "level": 6,
      "hp": 420,
      "mana": 60,
      "attack": 28,
      "strength": 18,
      "defense": 12,
      "agility": 15,
      "luck": 5,
      "expReward": 180,
      "goldMin": 80,
      "goldMax": 150,
      "isBoss": true,
      "isElite": false,
      "aiPattern": "boss_aggressive",
      "skills": ["warlord_charge", "rally_cry", "cleave"],
      "weaknesses": ["light"],
      "resistances": ["shadow"],
      "phases": [
        { "hpThreshold": 0.50, "behavior": "enrage", "atkMult": 1.3 },
        { "hpThreshold": 0.25, "behavior": "berserk", "atkMult": 1.6, "defMult": 0.7 }
      ],
      "dropTable": []
    }
  ]
}
```

### `areas.json`

```json
{
  "areas": [
    {
      "id": "ashford_village_square",
      "name": "Ashford Village Square",
      "biome": "city",
      "cityId": "ashford_village",
      "safeZone": true,
      "baseEncounterChance": 0,
      "enemyPool": [],
      "groupSizeMin": 0,
      "groupSizeMax": 0,
      "eliteChance": 0,
      "scalingByPartySize": false,
      "resourceNodes": [],
      "exits": ["ashford_east_road", "ashford_inn", "ashford_guild"],
      "description": "The central square of Ashford Village. A weathered fountain stands at its center.",
      "npcs": ["elder_bramwick", "merchant_torren"]
    },
    {
      "id": "ashford_east_road",
      "name": "East Road of Ashford",
      "biome": "grassland",
      "cityId": null,
      "safeZone": false,
      "baseEncounterChance": 0.25,
      "enemyPool": [
        { "enemyId": "goblin_scout", "weight": 60, "minPlayerLevel": 1, "maxPlayerLevel": 10 },
        { "enemyId": "feral_wolf",   "weight": 30, "minPlayerLevel": 1, "maxPlayerLevel": 8 },
        { "enemyId": "bandit_thug",  "weight": 10, "minPlayerLevel": 3, "maxPlayerLevel": 12 }
      ],
      "groupSizeMin": 1,
      "groupSizeMax": 2,
      "eliteChance": 0.05,
      "scalingByPartySize": true,
      "resourceNodes": [
        {
          "nodeId": "ashford_east_herb_01",
          "nodeType": "herb_patch",
          "name": "Roadside Herb Patch",
          "verb": "gather",
          "position": "growing along the wooden fence",
          "maxUses": 4,
          "respawnMinutes": 20,
          "lootTable": [
            { "itemId": "red_herb",   "chance": 0.80, "qtyMin": 1, "qtyMax": 3 },
            { "itemId": "blue_herb",  "chance": 0.40, "qtyMin": 1, "qtyMax": 2 },
            { "itemId": "wild_grain", "chance": 0.30, "qtyMin": 1, "qtyMax": 2 }
          ],
          "requiresTool": null,
          "minPlayerLevel": 1
        }
      ],
      "exits": ["ashford_village_square", "goblin_warren_entrance", "irongate_north_road"],
      "description": "A dirt road leading east from the village. Footprints in the mud suggest trouble ahead.",
      "npcs": []
    }
  ]
}
```

### `dungeons.json`

```json
{
  "dungeons": [
    {
      "id": "goblin_warren",
      "name": "Goblin Warren",
      "description": "A network of crude tunnels carved into the hillside east of Ashford.",
      "minLevel": 1,
      "maxLevel": 6,
      "totalFloors": 3,
      "unlockRequirement": null,
      "entranceAreaId": "goblin_warren_entrance",
      "entranceCityId": "ashford_village",
      "floors": [
        {
          "floor": 1,
          "name": "Upper Tunnels",
          "baseEncounterChance": 0.40,
          "enemyPool": [
            { "enemyId": "goblin_scout",  "weight": 50, "minPlayerLevel": 1, "maxPlayerLevel": 6 },
            { "enemyId": "goblin_archer", "weight": 30, "minPlayerLevel": 1, "maxPlayerLevel": 6 },
            { "enemyId": "goblin_shaman", "weight": 20, "minPlayerLevel": 2, "maxPlayerLevel": 6 }
          ],
          "groupSizeMin": 1,
          "groupSizeMax": 3,
          "eliteChance": 0.05,
          "scalingByPartySize": true,
          "hasTreasureChest": true,
          "chestLootPoolId": "dungeon_1_common_chest",
          "safeRoom": false
        },
        {
          "floor": 3,
          "name": "Warlord's Chamber",
          "baseEncounterChance": 0,
          "enemyPool": [],
          "groupSizeMin": 0,
          "groupSizeMax": 0,
          "eliteChance": 0,
          "scalingByPartySize": false,
          "hasTreasureChest": false,
          "bossId": "goblin_warlord",
          "safeRoom": false,
          "bossDefeatedAreaDesc": "The warlord's throne lies broken. Dust settles over scattered gold."
        }
      ]
    }
  ]
}
```

### `quests.json`

```json
{
  "quests": [
    {
      "id": "hunt_goblins_01",
      "title": "The Goblin Menace",
      "type": "hunt",
      "source": "guild",
      "guildRankRequired": "F",
      "cityId": "ashford_village",
      "description": "Goblins from the eastern warren have been raiding farms at night.",
      "storyIntroId": "story_goblin_menace",
      "objective": {
        "type": "kill",
        "enemyId": "goblin_scout",
        "count": 10
      },
      "reward": {
        "exp": 200,
        "gold": 150,
        "items": [
          { "itemId": "iron_sword", "chance": 1.0, "qty": 1 }
        ]
      },
      "repeatable": false,
      "prerequisites": []
    },
    {
      "id": "main_01_village_trouble",
      "title": "Trouble at Ashford",
      "type": "story",
      "source": "npc",
      "npcId": "elder_bramwick",
      "cityId": "ashford_village",
      "description": "Elder Bramwick needs someone brave to investigate the goblin threat.",
      "storyIntroId": "story_main_01",
      "objective": {
        "type": "boss_kill",
        "enemyId": "goblin_warlord"
      },
      "reward": {
        "exp": 500,
        "gold": 300,
        "items": [],
        "unlocksCity": "irongate_town"
      },
      "repeatable": false,
      "prerequisites": []
    }
  ]
}
```

### `stories.json`

```json
{
  "stories": [
    {
      "id": "story_goblin_menace",
      "lines": [
        "The guild clerk slides a worn parchment across the counter.",
        "'Three farmsteads hit in two nights,' she says quietly. 'The Hornbeck family lost everything.'",
        "She lowers her voice. 'We need someone who won't flinch at the sight of a blade — or a mob of them.'",
        "The job is simple: thin the goblin numbers in the eastern warren.",
        "Simple, at least, on paper."
      ]
    },
    {
      "id": "story_main_01",
      "lines": [
        "Elder Bramwick grips your arm with surprising strength for someone his age.",
        "'I've seen their warlord,' he says, eyes distant. 'Big. Mean. Smarter than the rest.'",
        "'If you don't stop him, this village won't survive the winter.'",
        "He presses a small coin into your palm — his last, by the look of his coat.",
        "'Come back alive. That's all I ask.'"
      ]
    }
  ]
}
```

---

## NPC & Guild System

### NPC Data Model

```ts
interface NPC {
  id: string;
  name: string;
  role: 'quest_giver' | 'merchant' | 'innkeeper' | 'blacksmith' |
        'alchemist' | 'guild_clerk' | 'story_character';
  areaId: string;
  greeting: string;           // shown when player types 'talk <npc>'
  dialogue: DialogueTree;
  questIds: string[];         // quests this NPC offers
  shopId?: string;            // if role = 'merchant' or 'blacksmith' or 'alchemist'
}

interface DialogueTree {
  root: DialogueNode;
}

interface DialogueNode {
  id: string;
  text: string;               // NPC says this
  options: DialogueOption[];  // player can choose these
}

interface DialogueOption {
  label: string;              // shown to player: "Tell me about the goblins"
  condition?: string;         // optional: 'hasQuest:hunt_goblins_01' | 'questComplete:...'
  nextNodeId: string | 'exit' | 'open_shop' | 'open_quest';
}
```

### NPC Dialogue Display

```
> talk elder_bramwick

Elder Bramwick looks up from his desk with weary eyes.
"Ah, a traveler. Haven't seen many of your kind lately — most stay away these days."

  [1] "What's wrong with the village?"
  [2] "Do you have any work for me?"
  [3] "Tell me about this region."
  [4] "Goodbye."

> 1

"The goblins," he mutters, rubbing his temple. "Eastern warren, just past the old mill.
They've been bold lately — too bold. Someone's organizing them."

  [1] "I'll look into it." (opens quest: The Goblin Menace if not taken)
  [2] "Sounds dangerous."
  [3] "Goodbye."
```

### Guild System

The **Adventurer's Guild** is present in every city. It offers:

- A rotating **quest board** (refreshes every real-time hour)
- A **guild rank** system that unlocks harder quests and better rewards
- A **leaderboard** per city showing top-ranked players by level and boss kills

#### Guild Ranks

| Rank | Label    | Min Level | Unlocks                              |
|------|----------|-----------|--------------------------------------|
| F    | Novice   | 1         | Basic hunt/collect quests            |
| E    | Apprentice| 8        | Dungeon quests, delivery quests      |
| D    | Journeyman| 18       | Named boss quests, escort quests     |
| C    | Veteran  | 35        | Elite dungeon quests                 |
| B    | Expert   | 55        | Multi-stage quests, rare item quests |
| A    | Master   | 75        | Legendary quests, world boss alerts  |
| S    | Champion | 90        | Sanctum quests, mythic item quests   |
| SS   | Legend   | 100       | Abyssal quests, endgame content      |

#### Guild Quest Board

```
> guild

  ══════════════════════════════════════════════════════
   Ashford Adventurer's Guild — Quest Board  [Rank: F]
  ══════════════════════════════════════════════════════
   [1] The Goblin Menace         HUNT    Reward: 150g + Iron Sword
       Kill 10 Goblin Scouts     ★☆☆☆☆  Expires: 58 min
   [2] Herb Gathering            COLLECT Reward: 100g + EXP
       Bring 5x Red Herb         ★☆☆☆☆  Expires: 41 min
   [3] Missing Merchant          ESCORT  Reward: 200g
       Escort Torren to Irongate ★★☆☆☆  [Rank E required]
  ══════════════════════════════════════════════════════
   Type 'accept <n>' to take a quest. Board refreshes in 58 min.
   Active quests: 0 / 3
```

#### Guild Rank Progression

Rank increases by completing quests. Each completed quest awards **Guild Points (GP)**:

```
F-rank quests:  +5 GP    D-rank quests: +25 GP    B-rank quests: +80 GP
E-rank quests:  +12 GP   C-rank quests: +45 GP    A-rank quests: +150 GP
                                                   S-rank quests: +300 GP
                                                   SS-rank quests: +600 GP

Rank thresholds:
  F→E:   50 GP    E→D:   150 GP   D→C:   400 GP   C→B:  1,000 GP
  B→A: 2,500 GP   A→S: 6,000 GP  S→SS: 15,000 GP
```

---

### Bounty Board System

The **Bounty Board** is a sub-section of the Adventurer's Guild available in every city.
Any player can **place a bounty** on another player — funding it with gold, rare items, or
both — and any other player can **accept and complete** the bounty by fulfilling its
objective. If no one claims the bounty within **15 real-time days**, it is automatically
removed and all rewards are returned to the poster.

---

#### Bounty Types

| Type       | Objective                                             | PvP Required? |
|------------|-------------------------------------------------------|---------------|
| `kill`     | Kill the target player once                           | Yes (PvP zone)|
| `defeat_n` | Kill the target player N times (1–10)                 | Yes           |
| `duel`     | Challenge target to a formal duel and win             | Yes (any area)|

> **`kill` / `defeat_n`**: kill must occur in a PvP-enabled city area.
> **`duel`**: bypasses PvP zone — target must explicitly accept.

---

#### Bounty Reward Composition

- **Gold only** — minimum 500g, no cap
- **Items only** — 1–5 non-quest-locked items from poster's inventory
- **Gold + Items** — mixed

Items submitted as bounty rewards are **held in escrow** by the guild the moment the
bounty is posted. They are removed from the poster's inventory immediately.

---

#### Placing a Bounty — Full Screen Flow

```
> bounty post

  [Step 1 — Target player name:]
> Kael
  Found: Kael  Lv 28  [Warrior]  Last seen: Duskhollow

  [Step 2 — Bounty type:]
  [1] Kill once    [2] Kill N times    [3] Formal duel
> 1

  [Step 3 — Reason (optional, 100 chars max):]
> Attacked me without warning and keeps camping my area.

  [Step 4 — Reward type:]
  [1] Gold only    [2] Items only    [3] Gold + Items
> 3

  Gold amount: 1000
  Add items: Shadow Silk
  Added: Shadow Silk x1  [Rare, Material]
  done

  BOUNTY PREVIEW:
  Target:   Kael  (Lv 28, Warrior)
  Type:     Kill once  (in PvP-enabled area)
  Reason:   "Attacked me without warning and keeps camping my area."
  Reward:   1,000g  +  Shadow Silk x1
  Duration: 15 days (expires: 2025-04-18)

  Warning: Reward locked in escrow immediately. Returned if unclaimed after 15 days.
  Confirm? (yes / no)
> yes

  Bounty posted. 1,000g and Shadow Silk x1 are now held in guild escrow.
```

---

#### Bounty Board — Viewing Active Bounties

```
> bounty list

  BOUNTY BOARD — Duskhollow Guild
  ============================================================
  # | Target         | Type    | Reward            | Expires
  ============================================================
  1 | Kael  Lv28 War | Kill x1 | 1000g + 1 item    | 14d 23h
  2 | Borek Lv25 War | Kill x3 | 5,000g            |  8d  4h
  3 | Zael  Lv55 Mag | Duel    | Void Wraith Ess.  |  3d 11h
  ============================================================
  'bounty view <n>' — details   'bounty accept <n>' — take contract
```

---

#### Viewing a Bounty in Detail

```
> bounty view 1

  BOUNTY DETAIL
  ============================================================
  Target:    Kael   Lv 28  [Warrior]
  Posted by: Ryuna  (Duskhollow Guild)
  Type:      Kill once — in any PvP-enabled area
  Reason:    "Attacked me without warning and keeps camping my area."
  REWARD:
    1,000 gold
    Shadow Silk x1  [Rare, Material]
  Posted: 2025-04-03   Expires: 2025-04-18  (14d 23h)
  Status: OPEN — no one has accepted this yet
  ============================================================
  Type 'bounty accept 1' to take this contract.
```

---

#### Accepting a Bounty

```
> bounty accept 1

  BOUNTY CONTRACT ACCEPTED
  ============================================================
  Target:  Kael   Lv 28  [Warrior]
  Task:    Kill Kael once in a PvP-enabled area
  Reward:  1,000g + Shadow Silk x1
  Expires: 14d 23h remaining
  Rules:
    - Kill must happen in a PvP-enabled city zone.
    - You cannot be in the same party as your target.
    - You cannot have posted this bounty yourself.
  Contract saved. Use 'bounty status' to track progress.
```

Multiple hunters can accept the same bounty simultaneously.
The first to complete it claims the reward.

---

#### Target Notification (Push Event)

The moment a bounty is placed, the target receives a push notification:

```
  A BOUNTY HAS BEEN PLACED ON YOU
  ============================================================
  Posted by: Ryuna
  Reason:    "Attacked me without warning and keeps camping my area."
  Reward:    1,000g + Shadow Silk x1
  Duration:  15 days
  Warning: Hunters may now pursue you in PvP-enabled zones.
  Use 'bounty on me' to see all active bounties on you.
```

When a hunter accepts the bounty:
```
  [Bounty] A hunter has accepted the contract on you. Stay alert in PvP zones.
```

When the bounty expires unclaimed:
```
  [Bounty] The bounty posted by Ryuna has expired. No hunter claimed the contract.
```

---

#### Checking Bounties on Yourself

```
> bounty on me

  BOUNTIES TARGETING YOU: 1 active
  ============================================================
  Posted by: Ryuna    Reward: 1,000g + Shadow Silk x1
  Type: Kill once     Expires: 14d 23h    Hunters accepted: 1
  Type 'bounty detail <n>' for full reason.
```

---

#### Completing a Bounty — Kill Confirmed

When a hunter kills the bounty target in a PvP zone, the server fires:

```ts
onPvpKill(killerId: string, targetId: string, areaId: string): void {
  const activeBounties = BountyManager.findActiveByTarget(targetId);
  for (const bounty of activeBounties) {
    if (bounty.acceptedBy.includes(killerId)) {
      BountyManager.recordProgress(bounty.bountyId, killerId);
    }
  }
}
```

**Hunter's screen immediately after kill:**

```
  [PvP] You defeated Kael!

  BOUNTY PROGRESS
  ============================================================
  Contract: Kill Kael  (posted by Ryuna)
  Progress: 1 / 1 kills  COMPLETE
  Return to any guild to claim your reward.
```

For a `defeat_n` bounty (e.g. kill 3 times), partial progress:
```
  Progress: 2 / 3 kills  (1 more to go)
```

---

#### Claiming the Reward at the Guild

The hunter must visit any guild to claim. Reward does not auto-enter inventory.

```
> guild
  [BOUNTY REWARD READY] Contract completed: Kill Kael (posted by Ryuna)
  Reward waiting: 1,000g + Shadow Silk x1 — Type 'bounty claim' to collect.

> bounty claim

  BOUNTY REWARD CLAIMED
  ============================================================
  +1,000 gold  (total: 5,840g)
  +Shadow Silk x1 added to inventory (slot 23)
  Guild Points earned: +30 GP
```

Bounty completions award GP based on reward value:

| Reward Value    | GP Awarded |
|-----------------|------------|
| < 1,000g        | +15 GP     |
| 1,000 – 4,999g  | +30 GP     |
| 5,000 – 19,999g | +60 GP     |
| 20,000g+        | +100 GP    |
| Rare+ item      | +25 GP bonus per rare+ item |

---

#### Bounty Poster Notification on Completion

```
  YOUR BOUNTY HAS BEEN COMPLETED
  ============================================================
  Target:      Kael  (Lv 28, Warrior)
  Completed by: Borek
  Task:         Kill once — FULFILLED
  Your reward has been paid to Borek.
```

---

#### Bounty Expiry — 15-Day Auto-Refund

The server runs a **daily cleanup job** (every 24 hours) scanning for expired bounties:

```ts
runExpiryCheck(): void {
  const expired = db.all(
    `SELECT * FROM bounties WHERE status = 'open' AND expires_at <= ?`, [Date.now()]
  );
  for (const bounty of expired) {
    PlayerEngine.addGold(bounty.poster_id, bounty.gold_reward);
    for (const item of JSON.parse(bounty.item_rewards))
      InventoryManager.addItem(bounty.poster_id, item.itemId, item.qty);
    db.run(`UPDATE bounties SET status = 'expired' WHERE bounty_id = ?`, [bounty.bounty_id]);
    // Notify poster + all accepted hunters
  }
}
```

**Poster's screen on expiry:**

```
  YOUR BOUNTY HAS EXPIRED
  ============================================================
  Target: Kael — no hunter claimed the contract.
  Returned: +1,000g  |  +Shadow Silk x1 returned to inventory (slot 31)
```

If the poster is offline: gold/items silently added to save data, shown on next login.

---

#### Cancelling a Bounty Early

```
> bounty cancel 1

  Cancel the bounty on Kael? Your reward will be returned. (yes/no)
> yes

  Bounty cancelled. +1,000g returned. Shadow Silk x1 returned (slot 31).
```

Rules:
- Cannot cancel if a hunter has **already completed** the kill objective
- Target is notified: `[Bounty] The bounty posted by Ryuna has been cancelled.`
- All hunters who accepted are notified the contract is void
- Partial `defeat_n` progress is discarded; poster still gets full refund

---

#### Checking Your Posted Bounties

```
> bounty mine

  Your Active Bounties (1):
  [1] Target: Kael  Kill x1  1,000g + Shadow Silk x1
      Status: OPEN  Hunters: 2 accepted  Expires: 14d 20h
  Type 'bounty cancel <n>' to cancel and reclaim reward.
```

---

#### Duel Mechanic (Bounty Type: `duel`)

A `duel` bounty bypasses the PvP zone requirement. The target must explicitly accept.

```
Flow:
  1. Hunter accepts a 'duel' bounty
  2. Hunter types: duel challenge Zael
  3. Zael receives:

     DUEL CHALLENGE
     ============================================================
     Borek (Lv 25, Warrior) challenges you to a duel.
     A bounty reward is involved.
     Location: Crystalmere City — Crystal Square
     Accept? (duel accept / duel decline) — 60 seconds to respond.

  4a. duel accept  → PvP CombatSession starts immediately (no PvP zone needed)
      If hunter wins → bounty progress recorded

  4b. duel decline → Challenge cancelled. No penalty. Hunter notified.

  5. 60s no response → auto-declined. Hunter notified.

Rules:
  - Duel can be issued anywhere, not restricted to PvP cities
  - Target MUST accept — cannot be forced
  - PvP kills in PvP zones do NOT count toward 'duel' bounties
  - Duel does NOT award normal PvP EXP — only the bounty reward
```

---

#### Bounty Anti-Abuse Rules

```
Posting:
  Cannot post on: yourself, party members, players below level 5
  Max 3 active bounties posted at once
  Minimum reward: 500g OR at least 1 Uncommon+ item
  Reason: optional, max 100 chars, profanity-filtered

Accepting:
  Cannot accept: your own bounties, bounties against party members
  Max 5 active contracts accepted at once
  No guild rank requirement

Kill validation:
  Must occur in PvP-enabled city area (for kill/defeat_n types)
  Kills outside PvP zones: do NOT count
  Admin-forced deaths: do NOT count
```

---

#### Bounty Data Model

```ts
interface Bounty {
  bountyId: string;
  posterId: string;
  posterName: string;
  targetId: string;
  targetName: string;
  type: 'kill' | 'defeat_n' | 'duel';
  killsRequired: number;
  reason: string;
  goldReward: number;
  itemRewards: BountyItem[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  acceptedBy: string[];
  progress: Map<string, number>;  // hunterId → kills completed
  completedBy?: string;
  postedAt: number;
  expiresAt: number;              // postedAt + 15 days in ms
  completedAt?: number;
}
```

---

#### Bounty Database Table

```sql
CREATE TABLE bounties (
  bounty_id      TEXT PRIMARY KEY,
  poster_id      TEXT NOT NULL REFERENCES players(id),
  poster_name    TEXT NOT NULL,
  target_id      TEXT NOT NULL REFERENCES players(id),
  target_name    TEXT NOT NULL,
  type           TEXT NOT NULL,
  kills_required INTEGER NOT NULL DEFAULT 1,
  reason         TEXT,
  gold_reward    INTEGER NOT NULL DEFAULT 0,
  item_rewards   TEXT NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'open',
  accepted_by    TEXT NOT NULL DEFAULT '[]',
  progress       TEXT NOT NULL DEFAULT '{}',
  completed_by   TEXT,
  posted_at      TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  completed_at   TEXT
);

CREATE INDEX idx_bounties_target  ON bounties(target_id);
CREATE INDEX idx_bounties_poster  ON bounties(poster_id);
CREATE INDEX idx_bounties_status  ON bounties(status);
CREATE INDEX idx_bounties_expires ON bounties(expires_at);
```

---

#### BountyManager (Server Module)

```ts
class BountyManager {
  post(posterId: string, params: PostBountyParams): Bounty | Error;
  accept(bountyId: string, hunterId: string): void | Error;
  onPvpKill(killerId: string, targetId: string, areaId: string): void;
  onDuelWin(winnerId: string, loserId: string): void;
  claim(bountyId: string, hunterId: string): ClaimResult | Error;
  cancel(bountyId: string, requesterId: string): void | Error;
  list(cityId: string, filter?: BountyFilter): Bounty[];
  findActiveByTarget(targetId: string): Bounty[];
  findByPoster(posterId: string): Bounty[];
  findByHunter(hunterId: string): Bounty[];
  runExpiryCheck(): void;
}
```

---

#### Updated Guild Board Display

```
> guild

  Duskhollow Adventurer's Guild    [Rank: C — Veteran]
  ============================================================
  'guild quests'   → quest board
  'guild bounties' → bounty board
  'guild rank'     → your rank and GP progress
  'guild top'      → city leaderboard
```

---

#### Updated CLI Commands for Bounty System

```
BOUNTY (at any guild)
  bounty list              → all active bounties on the board
  bounty list <city>       → bounties from a specific city
  bounty view <n>          → full detail of bounty #n
  bounty accept <n>        → accept bounty contract #n
  bounty status            → your active contracts + kill progress
  bounty post              → interactive wizard to post a new bounty
  bounty mine              → bounties you have posted
  bounty cancel <n>        → cancel your bounty #n (returns reward)
  bounty claim             → claim completed reward at guild
  bounty on me             → all bounties targeting you

DUEL (anywhere)
  duel challenge <player>  → issue a formal duel challenge
  duel accept              → accept incoming duel
  duel decline             → decline incoming duel
```

---

#### Bounty System Testing Checklist

- [ ] Post bounty: gold deducted atomically, items removed from inventory
- [ ] Post bounty: target receives push notification with poster name + reason + reward
- [ ] Post bounty: self-targeting, party member, level < 5 all blocked
- [ ] Post bounty: minimum reward enforced (500g or 1 Uncommon+ item)
- [ ] Post bounty: max 3 active bounties per poster enforced
- [ ] Accept bounty: multiple hunters can accept same bounty simultaneously
- [ ] Accept bounty: max 5 active contracts per hunter enforced
- [ ] PvP kill in PvP zone: onPvpKill fires, bounty progress incremented for correct hunter
- [ ] PvP kill outside PvP zone: does NOT count toward bounty progress
- [ ] defeat_n bounty: partial progress shown after each qualifying kill; reward only on N
- [ ] Duel challenge: non-PvP city allows duel, target receives 60s prompt
- [ ] Duel accept: CombatSession starts, duel win counts toward duel bounty only
- [ ] Duel decline / 60s timeout: hunter notified, no penalty
- [ ] Claim reward at guild: gold + items transferred correctly; pendingLoot if full
- [ ] GP awarded on claim: correct tier per reward value
- [ ] First-complete wins: second hunter notified bounty already claimed
- [ ] Cancel with no completed progress: full refund, target + hunters notified
- [ ] Cancel with partial defeat_n progress: refund still full, progress discarded
- [ ] 15-day expiry job: expired bounties refunded, poster + hunters notified
- [ ] Poster offline at expiry: rewards silently added to save, notification on login
- [ ] Admin delete player: all bounties where player is poster or target cancelled, rewards returned

---

## Client Implementation Guide

The client is a **thin terminal interface** — it only handles:
1. Reading player input from `stdin` with raw keypress interception
2. Sending commands to the server over WebSocket
3. Rendering server responses to `stdout`
4. Handling **push events** (chat, combat logs, trade notifications, turn timer warnings)
5. **Tab-key autocomplete** — context-aware command completion entirely on the client side

### Client Architecture

```
client/
├── index.ts            ← entry point: connect WebSocket, start input loop
├── socket.ts           ← WebSocket connection manager + reconnect logic
├── input.ts            ← raw keypress handler, line buffer, Tab interception
├── autocomplete.ts     ← Tab completion engine (context-aware, client-side)
├── completionData.ts   ← static + dynamic completion lists (commands, items, players)
├── output.ts           ← formatted output renderer (colors, boxes, tables)
├── pushHandler.ts      ← handles server push events injected into stdout
└── config.ts           ← server URL, token storage path (~/.adventuregame/)
```

### Connection Flow

```
1. Client starts
2. Read token from ~/.adventuregame/token (if exists)
3. Connect WebSocket to server
4. If token exists → send: { type: 'auth', token }
   If no token     → show login/register prompt
5. On successful auth → server sends current game state summary
6. Enter main input loop
```

### Input Loop

The standard `readline` module **cannot intercept Tab** — it uses Tab for its own line-editing.
Instead, the client puts `stdin` into **raw mode** and handles every keypress manually. This
gives full control over Tab, arrow keys, Ctrl+C, and backspace without any library conflicts.

```ts
// input.ts — raw keypress handler with Tab interception
import { Autocomplete } from './autocomplete';
import { socket } from './socket';

const autocomplete = new Autocomplete();

// Line buffer: what the user has typed so far
let lineBuffer = '';
// Cursor position within lineBuffer
let cursorPos = 0;
// Cycling state for multi-match Tab cycling
let tabCycleMatches: string[] = [];
let tabCycleIndex = -1;
let lastKeyWasTab = false;

process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.resume();

process.stdin.on('data', (key: string) => {
  // ── Ctrl+C → exit gracefully ──────────────────────────────
  if (key === '\u0003') {
    console.log('\nGoodbye!');
    process.exit(0);
  }

  // ── Enter → submit line ───────────────────────────────────
  if (key === '\r' || key === '\n') {
    process.stdout.write('\n');
    const cmd = lineBuffer.trim();
    lineBuffer = '';
    cursorPos = 0;
    tabCycleMatches = [];
    tabCycleIndex = -1;
    lastKeyWasTab = false;
    if (cmd) submitCommand(cmd);
    printPrompt();
    return;
  }

  // ── Backspace ─────────────────────────────────────────────
  if (key === '\u007f' || key === '\b') {
    if (cursorPos > 0) {
      lineBuffer = lineBuffer.slice(0, cursorPos - 1) + lineBuffer.slice(cursorPos);
      cursorPos--;
      redrawLine();
    }
    lastKeyWasTab = false;
    tabCycleMatches = [];
    return;
  }

  // ── Tab → autocomplete ────────────────────────────────────
  if (key === '\t') {
    handleTab();
    return;
  }

  // ── Escape sequences (arrow keys, etc.) ───────────────────
  if (key.startsWith('\u001b')) {
    handleEscapeSequence(key);
    lastKeyWasTab = false;
    return;
  }

  // ── Printable character ───────────────────────────────────
  lineBuffer = lineBuffer.slice(0, cursorPos) + key + lineBuffer.slice(cursorPos);
  cursorPos++;
  redrawLine();
  lastKeyWasTab = false;
  tabCycleMatches = [];
});

function submitCommand(cmd: string): void {
  const isChat = cmd.startsWith('say ')   || cmd.startsWith('msg ')  ||
                 cmd.startsWith('p ')     || cmd.startsWith('shout ');
  socket.send(JSON.stringify({
    type: isChat ? 'chat' : 'command',
    payload: cmd,
  }));
}

function redrawLine(): void {
  // Move cursor to start of line, clear to end, reprint buffer
  process.stdout.write('\r\x1b[K> ' + lineBuffer);
  // Reposition cursor if not at end
  const charsFromEnd = lineBuffer.length - cursorPos;
  if (charsFromEnd > 0) {
    process.stdout.write(`\x1b[${charsFromEnd}D`);
  }
}

function printPrompt(): void {
  process.stdout.write('> ');
}
```

---

### Tab Autocomplete System

Autocomplete runs **entirely on the client side** — no network round-trip on Tab press. The
client maintains a local copy of context data (inventory items, nearby player names, learned
skills, known cities, etc.) that is kept up-to-date via server push events whenever state
changes. Tab matching is instant.

#### How Tab Works — User Experience

```
Single match:
  User types: "tr" + Tab
  → Instantly completes to: "travel "
  → Cursor positioned after the space, ready for next arg

Multi-match: first Tab shows inline hint, subsequent Tabs cycle through options
  User types: "t" + Tab
  → Matches: travel, trade, talk
  → Line shows: "travel "   (first match auto-inserted)
  → Hint below: [1/3]  travel  trade  talk

  Tab again:
  → Line shows: "trade "   (cycles to second match)
  → Hint below: [2/3]  travel  trade  talk

  Tab again:
  → Line shows: "talk "    (cycles to third match)

  Tab again:
  → Wraps back to: "travel "   [1/3]

  Any non-Tab key:
  → Accepts current selection, clears hint, resumes normal typing

No match:
  User types: "xyz" + Tab
  → No change, small bell sound: \x07 (BEL character)

Argument completion:
  User types: "travel " + Tab
  → Completes the city argument from unlocked cities list:
    [1/5]  Ashford Village  Irongate Town  Crystalmere City  ...

  User types: "travel ash" + Tab
  → Filters to: "travel Ashford Village"   (only one match, auto-completes fully)
```

#### Tab Handler

```ts
// input.ts — handleTab() function

function handleTab(): void {
  const textSoFar = lineBuffer.slice(0, cursorPos);

  if (!lastKeyWasTab) {
    // Fresh Tab press — compute new matches
    tabCycleMatches = autocomplete.getMatches(textSoFar);
    tabCycleIndex   = -1;
  }

  if (tabCycleMatches.length === 0) {
    // No matches — ring bell
    process.stdout.write('\x07');
    lastKeyWasTab = false;
    return;
  }

  // Advance cycle index
  tabCycleIndex = (tabCycleIndex + 1) % tabCycleMatches.length;
  const chosen  = tabCycleMatches[tabCycleIndex];

  // Replace the input buffer with the chosen completion
  lineBuffer = chosen + lineBuffer.slice(cursorPos);
  cursorPos  = chosen.length;

  redrawLine();

  // Show multi-match hint on the line below (if more than 1 match)
  if (tabCycleMatches.length > 1) {
    showCompletionHint(tabCycleMatches, tabCycleIndex);
  }

  lastKeyWasTab = true;
}

function showCompletionHint(matches: string[], activeIdx: number): void {
  const tag     = `\x1b[2m[${activeIdx + 1}/${matches.length}]\x1b[0m`;  // dim
  const display = matches
    .map((m, i) => {
      // Strip trailing space for display
      const label = m.trimEnd().split(' ').pop() ?? m.trimEnd();
      return i === activeIdx
        ? `\x1b[1;33m${label}\x1b[0m`     // bold yellow = active
        : `\x1b[2m${label}\x1b[0m`;        // dim = inactive
    })
    .slice(0, 6)                            // show max 6 hints
    .join('  ');
  const suffix = matches.length > 6 ? `  \x1b[2m+${matches.length - 6} more\x1b[0m` : '';

  // Print hint on the line below the input, then return cursor to input line
  process.stdout.write(`\n${tag}  ${display}${suffix}`);
  process.stdout.write('\x1b[1A');          // move cursor up one line
  redrawLine();                             // restore input line and cursor pos
}
```

#### Autocomplete Engine (`autocomplete.ts`)

```ts
// autocomplete.ts
import { CompletionData } from './completionData';

export class Autocomplete {
  private data: CompletionData;

  constructor() {
    this.data = new CompletionData();
  }

  // Called every Tab press. Returns fully-formed completed strings.
  getMatches(textSoFar: string): string[] {
    const tokens  = textSoFar.trimStart().split(/\s+/);
    const word0   = tokens[0]?.toLowerCase() ?? '';
    const word1   = tokens[1]?.toLowerCase() ?? '';
    const partial = tokens[tokens.length - 1].toLowerCase();

    // ── No tokens yet: complete first command word ──────────
    if (tokens.length <= 1) {
      return this.filterAndBuild(this.data.rootCommands(), partial, '');
    }

    // ── Context-aware argument completion ───────────────────
    return this.completeArgs(word0, word1, tokens, partial, textSoFar);
  }

  private completeArgs(
    cmd: string, sub: string, tokens: string[], partial: string, full: string
  ): string[] {
    const prefix = full.slice(0, full.lastIndexOf(tokens[tokens.length - 1]));

    switch (cmd) {
      // ── Navigation ────────────────────────────────────────
      case 'go':
        return this.filterAndBuild(
          ['north','south','east','west','enter','exit','up','down'],
          partial, prefix
        );

      case 'travel':
        return this.filterAndBuild(this.data.unlockedCities(), partial, prefix);

      // ── Character ─────────────────────────────────────────
      case 'equip':
      case 'use':
      case 'drop':
      case 'examine':
        return this.filterAndBuild(this.data.inventoryItems(), partial, prefix);

      case 'skill':
        return this.filterAndBuild(this.data.learnedSkills('physical'), partial, prefix);

      case 'magic':
        return this.filterAndBuild(this.data.learnedSkills('magic'), partial, prefix);

      // ── Combat ────────────────────────────────────────────
      case 'attack':
        // In party combat: complete enemy or player names
        return this.filterAndBuild(
          [...this.data.combatEnemies(), ...this.data.combatAllies()],
          partial, prefix
        );

      case 'heal':
      case 'buff':
        return this.filterAndBuild(this.data.combatAllies(), partial, prefix);

      case 'item':
        // First arg = inventory slot number or item name; second arg = target
        if (tokens.length === 2)
          return this.filterAndBuild(this.data.inventoryConsumables(), partial, prefix);
        if (tokens.length === 3)
          return this.filterAndBuild(
            ['self', ...this.data.combatAllies(), ...this.data.combatEnemies()],
            partial, prefix
          );
        return [];

      // ── Social ────────────────────────────────────────────
      case 'say':
        return [];  // free text — no completion

      case 'msg':
        if (tokens.length === 2)
          return this.filterAndBuild(this.data.onlinePlayers(), partial, prefix);
        return [];  // second arg = free text message

      case 'talk':
        return this.filterAndBuild(this.data.nearbyNpcs(), partial, prefix);

      // ── Party ─────────────────────────────────────────────
      case 'party':
        if (tokens.length === 2) {
          return this.filterAndBuild(
            ['invite','accept','decline','leave','kick','disband','info'],
            partial, prefix
          );
        }
        if (sub === 'invite' || sub === 'kick')
          return this.filterAndBuild(this.data.nearbyPlayers(), partial, prefix);
        return [];

      // ── Trade ─────────────────────────────────────────────
      case 'trade':
        if (tokens.length === 2) {
          return this.filterAndBuild(
            ['offer','view','accept','counter','confirm','cancel','history'],
            partial, prefix
          );
        }
        if (sub === 'offer') {
          if (tokens.length === 3)
            return this.filterAndBuild(this.data.nearbyPlayers(), partial, prefix);
          if (tokens.length === 4)
            return this.filterAndBuild(this.data.tradeableItems(), partial, prefix);
          // tokens.length === 5: price — no completion (number)
        }
        return [];

      // ── Exploration ───────────────────────────────────────
      case 'buy':
        return this.filterAndBuild(this.data.merchantStock(), partial, prefix);

      case 'sell':
        return this.filterAndBuild(this.data.sellableItems(), partial, prefix);

      case 'accept':
        return this.filterAndBuild(this.data.activeGuildQuests(), partial, prefix);

      case 'craft':
        return this.filterAndBuild(this.data.craftableItems(), partial, prefix);

      case 'brew':
        return this.filterAndBuild(this.data.brewableRecipes(), partial, prefix);

      // ── System ────────────────────────────────────────────
      case 'load':
        return this.filterAndBuild(['slot 1','slot 2','slot 3'], partial, prefix);

      case 'chat':
        if (tokens.length === 2)
          return this.filterAndBuild(
            ['on','off','area','party','shout'], partial, prefix
          );
        if (tokens.length === 3)
          return this.filterAndBuild(['on','off'], partial, prefix);
        return [];

      case 'nearby':
        return this.filterAndBuild(['on','off'], partial, prefix);

      default:
        return [];
    }
  }

  private filterAndBuild(candidates: string[], partial: string, prefix: string): string[] {
    return candidates
      .filter(c => c.toLowerCase().startsWith(partial))
      .map(c => prefix + c + ' ');   // trailing space = ready for next arg
  }
}
```

#### Completion Data Store (`completionData.ts`)

The `CompletionData` class holds all dynamic lists that are updated in real-time as the
server pushes state changes. Static lists (command keywords, directions) are hardcoded.

```ts
// completionData.ts
export class CompletionData {
  // ── Static lists (never change) ─────────────────────────
  rootCommands(): string[] {
    return [
      'look','go','travel','map','rest',
      'stats','inventory','equip','use','drop','skills','gold',
      'say','msg','shout','nearby','chat','who',
      'party','trade',
      'attack','skill','magic','item','heal','buff','flee','combat log',
      'talk','shop','buy','sell','quest','guild','accept',
      'craft','alchemy','brew','inn','pending loot',
      'enter dungeon','next floor','loot','retreat',
      'save','load','help','quit',
    ];
  }

  // ── Dynamic lists (updated by server push events) ────────

  // Items currently in player's inventory
  private _inventoryItems: string[] = [];
  inventoryItems       = () => this._inventoryItems;
  inventoryConsumables = () => this._inventoryItems; // filtered by server response type
  tradeableItems       = () => this._inventoryItems;
  sellableItems        = () => this._inventoryItems;

  // Cities the player has unlocked
  private _unlockedCities: string[] = [];
  unlockedCities = () => this._unlockedCities;

  // Learned physical and magic skills
  private _physicalSkills: string[] = [];
  private _magicSkills:    string[] = [];
  private _supportSkills:  string[] = [];
  learnedSkills(type: 'physical' | 'magic' | 'support'): string[] {
    return type === 'physical' ? this._physicalSkills
         : type === 'magic'    ? this._magicSkills
         : this._supportSkills;
  }

  // Players visible in the current area
  private _nearbyPlayers: string[] = [];
  nearbyPlayers = () => this._nearbyPlayers;
  onlinePlayers = () => this._nearbyPlayers;  // in-area scope for tab (whisper uses all online)

  // NPCs in current area
  private _nearbyNpcs: string[] = [];
  nearbyNpcs = () => this._nearbyNpcs;

  // Current merchant's stock
  private _merchantStock: string[] = [];
  merchantStock = () => this._merchantStock;

  // Active guild quests on the board
  private _guildQuests: string[] = [];
  activeGuildQuests = () => this._guildQuests;

  // Known crafting recipes
  private _craftable: string[] = [];
  craftableItems = () => this._craftable;

  // Known alchemy recipes
  private _brewable: string[] = [];
  brewableRecipes = () => this._brewable;

  // Current combat participants
  private _combatEnemies: string[] = [];
  private _combatAllies:  string[] = [];
  combatEnemies = () => this._combatEnemies;
  combatAllies  = () => this._combatAllies;

  // ── Update methods called by pushHandler ─────────────────
  updateInventory(items: string[])       { this._inventoryItems   = items; }
  updateCities(cities: string[])         { this._unlockedCities   = cities; }
  updateSkills(p: string[], m: string[], s: string[]) {
    this._physicalSkills = p;
    this._magicSkills    = m;
    this._supportSkills  = s;
  }
  updateNearbyPlayers(names: string[])   { this._nearbyPlayers    = names; }
  updateNearbyNpcs(names: string[])      { this._nearbyNpcs       = names; }
  updateMerchantStock(items: string[])   { this._merchantStock    = items; }
  updateGuildQuests(quests: string[])    { this._guildQuests      = quests; }
  updateCraftable(items: string[])       { this._craftable        = items; }
  updateBrewable(recipes: string[])      { this._brewable         = recipes; }
  updateCombat(enemies: string[], allies: string[]) {
    this._combatEnemies  = enemies;
    this._combatAllies   = allies;
  }
  clearCombat() {
    this._combatEnemies  = [];
    this._combatAllies   = [];
  }
}
```

#### How Dynamic Data Stays Fresh

The server sends **state sync payloads** as push events whenever relevant state changes.
The `pushHandler` intercepts these and updates `CompletionData` silently (no visible output):

```ts
// pushHandler.ts — additions for completion data sync
case 'sync_inventory':
  completionData.updateInventory(msg.data.itemNames);
  break;

case 'sync_area':
  completionData.updateNearbyPlayers(msg.data.playerNames);
  completionData.updateNearbyNpcs(msg.data.npcNames);
  break;

case 'sync_skills':
  completionData.updateSkills(msg.data.physical, msg.data.magic, msg.data.support);
  break;

case 'sync_merchant':
  completionData.updateMerchantStock(msg.data.itemNames);
  break;

case 'sync_guild_quests':
  completionData.updateGuildQuests(msg.data.questTitles);
  break;

case 'sync_craft':
  completionData.updateCraftable(msg.data.craftable);
  completionData.updateBrewable(msg.data.brewable);
  break;

case 'sync_combat_start':
  completionData.updateCombat(msg.data.enemyNames, msg.data.allyNames);
  break;

case 'sync_combat_end':
  completionData.clearCombat();
  break;

case 'sync_world':
  completionData.updateCities(msg.data.unlockedCities);
  break;
```

These sync payloads are sent by the server automatically:
- `sync_inventory` → after any item gain, loss, craft, brew, buy, sell, trade
- `sync_area` → when player enters a new area (PresenceManager.enter)
- `sync_skills` → after a skill is learned or levels up
- `sync_merchant` → when player opens a shop
- `sync_guild_quests` → when player opens the guild board
- `sync_bounties` → when player opens the bounty board (`bounty list`)
- `sync_craft` → when player opens the crafting menu
- `sync_friends` → on login and whenever friend list changes (add, remove, accept, block)
- `sync_combat_start` → when a CombatSession begins for this player
- `sync_combat_end` → when combat ends (win, loss, or flee)
- `sync_world` → on login/load, and when a new city is unlocked

#### Completion Behaviour Reference

| What user types | Tab completes…                          | Source         |
|----------------|------------------------------------------|----------------|
| `t`            | `talk ` / `travel ` / `trade `          | Static commands|
| `go `          | `north` / `south` / `east` / `west`…   | Static         |
| `travel `      | `Ashford Village ` / `Crystalmere City `| Unlocked cities|
| `travel cr`    | `travel Crystalmere City `              | Filtered cities|
| `equip `       | `Iron Sword ` / `Leather Armor `…       | Live inventory |
| `use `         | `Health Potion V ` / `Mana Potion III ` | Live inventory |
| `magic `       | `Fire Bolt ` / `Inferno Nova `…         | Learned skills |
| `heal `        | `Kael ` / `Borek `                      | Combat allies  |
| `attack `      | `Shadow Fiend ` / `Void Wraith `        | Combat enemies |
| `trade offer ` | `Kael ` / `Borek `                      | Nearby players |
| `trade offer Kael `| `Iron Sword ` / `Crystal Ore `     | Tradeable items|
| `party invite `| `Kael ` / `Ryuna `                      | Nearby players |
| `msg `         | `Kael ` / `Ryuna ` / `Borek `           | Nearby players |
| `buy `         | `Health Potion I ` / `Iron Sword `…     | Merchant stock |
| `craft `       | `Steel Longsword ` / `Ranger Cloak `…   | Known recipes  |
| `brew `        | `Health Potion V ` / `Mana Potion III ` | Known recipes  |
| `accept `      | `The Goblin Menace ` / `Herb Gathering `| Guild quests   |
| `chat `        | `on ` / `off ` / `area ` / `party `…   | Static         |
| `nearby `      | `on ` / `off `                          | Static         |

#### Arrow Key History (Bonus)

The raw keypress handler also supports **command history** with Up/Down arrow keys:

```ts
// input.ts — history additions
const history: string[] = [];
let historyIndex = -1;

// On Enter: push to history
if (cmd) {
  history.push(cmd);
  historyIndex = history.length;  // reset pointer to end
}

// On Up arrow (\x1b[A): go back in history
function handleEscapeSequence(seq: string): void {
  if (seq === '\x1b[A') {  // Up
    if (historyIndex > 0) {
      historyIndex--;
      lineBuffer = history[historyIndex];
      cursorPos  = lineBuffer.length;
      redrawLine();
    }
  } else if (seq === '\x1b[B') {  // Down
    if (historyIndex < history.length - 1) {
      historyIndex++;
      lineBuffer = history[historyIndex];
      cursorPos  = lineBuffer.length;
      redrawLine();
    } else {
      historyIndex = history.length;
      lineBuffer = '';
      cursorPos  = 0;
      redrawLine();
    }
  } else if (seq === '\x1b[C') {  // Right arrow
    if (cursorPos < lineBuffer.length) { cursorPos++; redrawLine(); }
  } else if (seq === '\x1b[D') {  // Left arrow
    if (cursorPos > 0) { cursorPos--; redrawLine(); }
  }
}
```

#### Server-Side Sync Payload Format

The server sends these as `{ type: 'sync_*', data: {...} }` WebSocket messages:

```ts
// Sent by server when player's inventory changes
{ type: 'sync_inventory', data: { itemNames: ['Iron Sword', 'Health Potion V', ...] } }

// Sent when player enters a new area
{ type: 'sync_area', data: {
    playerNames: ['Kael', 'Ryuna'],
    npcNames:    ['Elder Bramwick', 'Merchant Torren'],
    areaName:    'Ashford Village Square'
}}

// Sent when combat starts
{ type: 'sync_combat_start', data: {
    enemyNames: ['Goblin Scout', 'Goblin Archer'],
    allyNames:  ['Kael', 'Borek']
}}
```

---

### Push Event Handler

Push events arrive as server-initiated WebSocket messages while the player is waiting for
something else (another player's combat turn, a trade offer, a chat message, etc.). They are
injected **above the current prompt line** without erasing what the player has typed.

```ts
// pushHandler.ts
socket.on('message', (raw: string) => {
  const msg = JSON.parse(raw);

  switch (msg.type) {
    case 'response':
      // Normal command response — clear line, print, re-prompt
      clearCurrentLine();
      console.log(msg.text);
      printPrompt();
      break;

    case 'push':
      // Injected event — print above current line, restore cursor
      injectAboveLine(msg.text);
      break;

    case 'combat_prompt':
      // It's this player's combat turn — show timer + choices
      clearCurrentLine();
      console.log(msg.text);   // "[Your turn! 15s] HP: ..."
      printCombatPrompt();
      break;

    case 'combat_log':
      // Other player/enemy acted — show log line
      injectAboveLine(`[Combat] ${msg.text}`);
      break;
  }
});
```

### Output Rendering

All formatted output (tables, item cards, combat stats) is rendered client-side from plain
text strings sent by the server. The server sends pre-formatted strings using box-drawing
characters. The client outputs them verbatim. Color is applied using ANSI escape codes embedded
in the server's response string.

#### ANSI Color Map (server applies)

```
Common    → \x1b[37m  (white)
Uncommon  → \x1b[32m  (green)
Rare      → \x1b[36m  (cyan)
Epic      → \x1b[35m  (magenta/purple)
Legendary → \x1b[33m  (yellow)
Mythic    → \x1b[31m  (red)

[Combat]  → \x1b[31m  (red prefix)
[Party]   → \x1b[32m  (green prefix)
[Trade]   → \x1b[33m  (yellow prefix)
[Nearby]  → \x1b[36m  (cyan prefix)
[Whisper] → \x1b[35m  (purple prefix)
[Shout]   → \x1b[1;37m (bold white)
[Warning] → \x1b[1;33m (bold yellow — turn timer warnings)
```

### Reconnect Logic

```ts
// socket.ts
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // ms
let attempt = 0;

function connect() {
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    attempt = 0;
    authenticate(ws);
  });

  ws.on('close', () => {
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    console.log(`\n[Disconnected] Reconnecting in ${delay / 1000}s...`);
    attempt++;
    setTimeout(connect, delay);
  });

  ws.on('error', (err) => {
    // log silently, 'close' event will fire after
  });
}
```

---

## Server Command Parser

The `CommandParser` receives a raw string from the client and returns a structured
`ParsedCommand` object. It is the first step in every server-side action.

```ts
interface ParsedCommand {
  raw: string;
  action: string;          // first word: 'attack', 'trade', 'say', 'go', etc.
  args: string[];          // remaining tokens
  isChat: boolean;         // true if action is say/msg/p/shout
  isCombatAction: boolean; // true if action is attack/skill/magic/item/heal/buff/flee
  isTradeAction: boolean;  // true if action starts with 'trade'
}

class CommandParser {
  parse(raw: string, session: GameSession): ParsedCommand {
    const tokens = raw.trim().split(/\s+/);
    const action  = tokens[0].toLowerCase();
    const args    = tokens.slice(1);

    return {
      raw,
      action,
      args,
      isChat:         ['say','msg','p','shout'].includes(action),
      isCombatAction: ['attack','skill','magic','item','heal','buff','flee']
                        .includes(action),
      isTradeAction:  action === 'trade',
    };
  }

  // Route parsed command to the correct engine/manager
  route(cmd: ParsedCommand, session: GameSession): void {
    // Chat is always processed first, regardless of game state
    if (cmd.isChat) {
      ChatRouter.route(cmd, session);
      return;
    }

    // Trade commands are processed outside combat
    if (cmd.isTradeAction && !session.combatState) {
      TradeManager.handle(cmd, session);
      return;
    }

    // Combat actions — only if in combat AND it's this player's turn
    if (cmd.isCombatAction && session.combatState) {
      CombatEngine.handleAction(cmd, session);
      return;
    }

    // Everything else — exploration, menu, world navigation
    GameEngine.handleAction(cmd, session);
  }
}
```

---

## Error Handling Strategy

### Client-Side Errors

```
Connection lost     → Show "[Disconnected]", attempt auto-reconnect with backoff
Server timeout      → Resend last command after 5s (idempotent commands only)
Invalid command     → Server responds with: "Unknown command. Type 'help' for a list."
```

### Server-Side Errors

All errors are caught at the WebSocket message handler level and return a structured error
response to the originating client. They never crash the server process.

```ts
// Error response format
{ type: 'error', code: string, message: string }

// Error codes:
'NOT_YOUR_TURN'       → Player sent a combat action but it isn't their turn
'COMBAT_ACTION_OOB'   → Skill/item index out of range
'NOT_IN_COMBAT'       → Player sent combat command while not in combat
'TRADE_IN_PROGRESS'   → Player tried to start a trade while already in one
'TRADE_NOT_SAME_AREA' → Target player is not in the same area
'TRADE_TARGET_AFK'    → Target player is [In Combat] or otherwise unavailable
'INVENTORY_FULL'      → Cannot pick up / receive item, inventory at 100 slots
'INSUFFICIENT_GOLD'   → Buyer doesn't have enough gold for purchase or trade
'ITEM_TRADE_LOCKED'   → Attempted to trade a quest item or equipped item
'ITEM_NOT_FOUND'      → Item name/index does not match any inventory slot
'PARTY_FULL'          → Party already has 4 members
'ALREADY_IN_PARTY'    → Target player is in another party
'AREA_CHANGE_BLOCKED' → Cannot leave area while in combat or active trade
'SAVE_FAILED'         → Disk write error on save (rare — retry suggested)
```

### Data Integrity Guards

```
Before any gold transfer (merchant, trade):
  → Check buyer.gold >= price INSIDE a DB transaction
  → If check fails → rollback, send 'INSUFFICIENT_GOLD'

Before any item transfer (loot, trade, craft):
  → Check receiver inventory slots < 100
  → If check fails → put in pendingLoot or send 'INVENTORY_FULL'

Before combat state mutation:
  → Verify session.combatState exists and turnIndex matches playerId
  → If mismatch → send 'NOT_YOUR_TURN', do not advance state

On WebSocket disconnect:
  → If in trade  → cancel trade, return escrowed gold
  → If in combat → handle disconnect protocol (solo: pause; party: eject)
  → Always       → clearInterval(regenInterval), auto-save to DB
```

---

## Server Configuration & Startup

### Config File (`config.json`)

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "maxConnections": 200
  },
  "admin": {
    "port": 8081,
    "host": "127.0.0.1",
    "jwtSecret": "CHANGE_THIS_ADMIN_SECRET",
    "tokenExpiryHours": 8,
    "bcryptRounds": 12,
    "allowedOrigins": ["http://localhost:8081"],
    "rateLimitWindowMs": 900000,
    "rateLimitMaxRequests": 100
  },
  "game": {
    "turnTimerMs": 15000,
    "turnWarning1Ms": 5000,
    "turnWarning2Ms": 10000,
    "regenTickMs": 5000,
    "tradeTimeoutMs": 90000,
    "shoutCooldownMs": 60000,
    "maxPartySize": 4,
    "maxInventorySlots": 100,
    "maxSaveSlots": 3,
    "questBoardRefreshMs": 3600000,
    "disconnectCombatPauseMs": 60000,
    "afkEjectAfterTimeouts": 3
  },
  "database": {
    "path": "./data/game.db",
    "walMode": true
  },
  "auth": {
    "jwtSecret": "CHANGE_THIS_IN_PRODUCTION",
    "tokenExpiryDays": 30,
    "bcryptRounds": 12
  },
  "story": {
    "useAnthropicApi": false,
    "anthropicApiKey": "",
    "anthropicModel": "claude-sonnet-4-20250514"
  }
}
```

### Startup Sequence

```
1. Load config.json
2. Initialize SQLite (WAL mode, run migrations)
3. Load all JSON data files via ContentManager (applies DB overrides + active events):
     items.json, enemies.json, areas.json, cities.json,
     dungeons.json, quests.json, stories.json,
     physical_skills.json, magic_skills.json, support_skills.json,
     shops.json, boss_drops.json, loot_pools.json
4. Initialize all managers:
     PresenceManager, PartyManager, TradeManager,
     SessionManager, ChatRouter, SpawnEngine,
     QuestEngine, StoryEngine, LootEngine,
     BountyManager, GatheringManager,
     AuthManager, FriendManager
5. Start WebSocket server on configured port
6. Initialize Express admin server on admin port (default 8081):
     - Mount static UI files from admin/ui/
     - Mount /api/admin/* routes with JWT middleware
     - Apply rate limiting to all admin endpoints
7. Start global quest board refresh timer (1 hour)
8. Start bounty expiry check job (every 24 hours)
9. Log: "Game server ready on ws://host:8080"
10. Log: "Admin panel ready on http://host:8081"
```

### Graceful Shutdown

```
On SIGINT / SIGTERM:
  1. Stop accepting new WebSocket connections
  2. Broadcast to all sessions: "[Server] Server shutting down in 10 seconds."
  3. Wait 10 seconds
  4. For each active session:
       → Cancel active trades (return escrowed gold)
       → Auto-save player state to DB
       → Close WebSocket
  5. Close SQLite connection
  6. Exit process
```

---

## Multiplayer Concurrency Notes

Because Node.js is single-threaded, most race conditions are naturally avoided. However, the
following scenarios need explicit guards:

| Scenario | Risk | Guard |
|---|---|---|
| Two players buy the last item from a merchant simultaneously | Double-sell | Check stock inside DB transaction, decrement atomically |
| Both players in a trade disconnect at the same moment | Gold stuck in escrow | `ON DELETE CASCADE` on session → `expireTrade()` fires, returns gold |
| Player moves area while turn timer fires | Stale combat state | Check `session.combatState` still exists before `forfeitTurn()` |
| Party wipe & individual disconnect at same turn | Double-respawn deduction | Check `player.gold` floor = 0 before deducting 10%; fountain respawn fires once per player |
| Two party members both try to revive a downed player | Duplicate revival | Flag `participant.reviveUsed = true` before applying Resurrection |

---

## Testing Checklist

### Unit Tests (per module)

- [ ] `CombatEngine` — damage formula edge cases (0 defense, max crit, dodge)
- [ ] `CombatEngine` — flee formula boundary (min 10%, max 90%, boss −20%)
- [ ] `CombatEngine` — turn timer fires at exactly 15s, warnings at 10s and 5s
- [ ] `CombatEngine` — 3 consecutive AFK timeouts eject player
- [ ] `PlayerEngine` — level-up stat gains, free stat point every 5 levels
- [ ] `InventoryManager` — 100-slot cap enforced, pending loot buffer works
- [ ] `LootEngine` — luck scaling caps at +15%, per-player independent rolls
- [ ] `TradeManager` — escrow locked on buyer confirm, atomic transfer on seller confirm
- [ ] `TradeManager` — 90s timeout cancels trade, returns gold
- [ ] `TradeManager` — quest-locked and equipped items blocked
- [ ] `SpawnEngine` — encounter chance clamps to 0 in safe zones
- [ ] `SpawnEngine` — party size correctly scales group size
- [ ] `RegenEngine` — regen pauses on combat start, resumes on end
- [ ] `CommandParser` — chat commands route without consuming combat turn
- [ ] `Autocomplete` — partial first word returns matching root commands
- [ ] `Autocomplete` — `travel cr` returns only cities starting with "cr" from unlocked list
- [ ] `Autocomplete` — `equip ` returns full inventory item list
- [ ] `Autocomplete` — `magic ` returns only learned magic skills
- [ ] `Autocomplete` — `heal ` returns only combat allies (empty outside combat)
- [ ] `Autocomplete` — `trade offer ` returns nearby player names
- [ ] `Autocomplete` — `trade offer Kael ` returns tradeable inventory items
- [ ] `Autocomplete` — unknown command prefix returns empty matches → BEL only
- [ ] `CompletionData.updateInventory()` — Tab immediately reflects new items
- [ ] Tab cycling — repeated Tab cycles through all matches and wraps
- [ ] Tab cycling — non-Tab key after cycling accepts current selection
- [ ] History — Up arrow recalls last command, Down returns to empty buffer
- [ ] Cursor left/right — redrawLine() repositions cursor correctly in mid-string
- [ ] Push sync payloads — `sync_combat_start` populates enemy/ally lists for Tab

### Integration Tests

- [ ] Full solo combat: spawn → turn loop → win → loot → exp gain
- [ ] Full party combat: 3 players + 2 enemies → turn order → ally heal → boss kill
- [ ] Trade: offer → counter → accept → confirm → atomic transfer verified in DB
- [ ] Disconnect mid-trade: gold returned, trade cancelled
- [ ] Disconnect solo mid-combat: 60s pause → reconnect → combat resumes
- [ ] Disconnect party mid-combat: eject → party continues → win
- [ ] Save/load cycle: save at inn → disconnect → reconnect → load → state intact
- [ ] Quest: accept → progress → complete → reward → guild rank GP awarded
- [ ] AFK 3-timeout: ejected from combat, returned to area, no loot/exp
- [ ] PvP initiation: attacker sees challenge screen, defender sees surprise alert with attacker name/level/class
- [ ] PvP turn order: higher-agility player shown as going first in header to both sides
- [ ] PvP HP bar: both players see opponent HP as percentage bar only (no raw number)
- [ ] PvP own HP: each player always sees their own exact HP number
- [ ] PvP bystander feed: `[PvP-Watch]` lines broadcast to all players in area
- [ ] PvP chat: `say` messages during PvP visible to both combatants and bystanders without consuming turn
- [ ] PvP defeat screen: loser sees defeat box with attacker name + gold penalty; winner sees victory box with EXP reward
- [ ] PvP Downed: 100s countdown pushed to loser every 10s; area bystanders notified on respawn
- [ ] PvP flee success/fail: correct screens shown to both attacker and defender
- [ ] PvP timer expiry: both players see skip message; correct player's turn advances
- [ ] PvP draw (simultaneous 0 HP): both Downed, no EXP awarded, no winner declared
- [ ] PvP disconnect: opponent released from combat with `[PvP] <name> disconnected` message
- [ ] PvP cooldown: 10-second re-attack block on same pair after fight ends
- [ ] PvP disabled mid-fight: both players see admin disable message, session terminated cleanly

---

## Admin Panel

The Admin Panel is a **browser-based web UI** served by an Express HTTP server running on a
separate port (default: **8081**) from the game's WebSocket server (8080). It is completely
isolated from the player-facing game transport — admins authenticate separately using their own
credentials and JWT tokens, and all admin actions are logged to an immutable audit trail.

### Security Model

```
Game server (WebSocket :8080)  ←→  Players (CLI clients)
Admin server (HTTP    :8081)  ←→  Admins (web browser)

Admin server should be:
  - Bound to 127.0.0.1 in production (access via SSH tunnel or VPN)
  - Or placed behind a reverse proxy (nginx) with IP allowlist
  - Never exposed directly on a public port without additional auth layer

Admin JWT:
  - Separate secret from player JWT (different key in config.admin.jwtSecret)
  - Short expiry: 8 hours
  - Stored in browser sessionStorage (not localStorage — clears on tab close)
  - All requests send: Authorization: Bearer <admin_token>
```

### Admin Roles

| Role       | Capabilities                                                 |
|------------|--------------------------------------------------------------|
| `admin`    | Full player management, item/gold management, PvP toggle     |
| `superadmin` | All admin privileges + manage other admin accounts         |

### Admin Authentication

```
POST /api/admin/login
  Body: { username, password }
  Response: { token, adminId, role, expiresAt }

POST /api/admin/logout
  Header: Authorization: Bearer <token>
  Response: { success: true }

GET /api/admin/me
  Header: Authorization: Bearer <token>
  Response: { adminId, username, role, lastLogin }
```

---

### REST API — Full Endpoint Reference

All endpoints require `Authorization: Bearer <admin_token>` header.
All mutating endpoints (POST, PATCH, DELETE) are logged to `admin_audit_log`.

#### Player Endpoints

```
GET    /api/admin/players
  Query: ?search=<name>&page=1&limit=50&status=online|offline|banned
  Response: { players: [...], total, page, limit }
  Returns: id, username, level, hp, gold, area, status, lastLogin, isBanned

GET    /api/admin/players/:playerId
  Response: full player object including stats, inventory summary, quest log,
            skill list, trade history, ban history, save slot info

PATCH  /api/admin/players/:playerId/stats
  Body: {
    level?: number,
    exp?: number,
    hp?: number, maxHp?: number,
    mana?: number, maxMana?: number,
    strength?: number, agility?: number, defense?: number,
    luck?: number, attack?: number,
    critRate?: number, critDamage?: number
  }
  → Validates ranges (level 1–999, critRate 0.0–0.75, etc.)
  → If player is online: pushes updated stats to their session immediately
  → Logs: MODIFY_STATS with before/after diff

PATCH  /api/admin/players/:playerId/gold
  Body: { operation: 'add' | 'remove' | 'set', amount: number }
  → 'add': gold += amount
  → 'remove': gold = max(0, gold - amount)
  → 'set': gold = amount
  → Validates amount > 0, amount <= 999,999,999
  → If player is online: pushes gold update to session
  → Logs: MODIFY_GOLD

POST   /api/admin/players/:playerId/items/give
  Body: {
    itemId: string,
    quantity: number,          -- 1–99 for stackables, always 1 for weapons/armor/accessories/recipes
    itemType: 'weapon' | 'armor' | 'accessory' | 'consumable' |
              'material' | 'scroll' | 'recipe'
  }
  → Validates: itemId exists in items.json, quantity within item's maxStack
  → Validates: player inventory has room (< 100 slots)
  → If player is online: pushes item directly into live inventory
  → Logs: GIVE_ITEM { itemId, itemName, quantity }

POST   /api/admin/players/:playerId/items/remove
  Body: {
    itemId: string,
    quantity: number           -- partial quantity removal supported for stackables
  }
  → Validates: player actually has the item and sufficient quantity
  → If player is online: removes from live inventory immediately
  → Cannot remove equipped items without unequipping first (returns error)
  → Logs: REMOVE_ITEM { itemId, itemName, quantity }

GET    /api/admin/players/:playerId/inventory
  Response: full inventory list with slot numbers, item names, grades, quantities,
            equipped status, tradelock status

POST   /api/admin/players/:playerId/ban
  Body: { reason: string, durationDays?: number }
  → durationDays omitted = permanent ban
  → If player is online: immediately disconnects their WebSocket with message:
      "You have been banned. Reason: <reason>"
  → Inserts row into player_bans table
  → Logs: BAN_PLAYER { reason, duration }

POST   /api/admin/players/:playerId/unban
  Body: { reason?: string }
  → Sets player_bans.is_active = 0 for all active bans on this player
  → Logs: UNBAN_PLAYER

DELETE /api/admin/players/:playerId
  → Permanently deletes player account and all save data
  → Requires role: 'superadmin'
  → Cannot delete a player who is currently online (must ban + disconnect first)
  → Logs: DELETE_PLAYER (irreversible, logged in full)
```

#### PvP Endpoints

```
GET    /api/admin/pvp
  Response: {
    global: { enabled: boolean, updatedBy: string, updatedAt: string },
    cities: [
      { cityId: string, cityName: string, enabled: boolean,
        updatedBy: string, updatedAt: string },
      ...   (all 16 cities listed)
    ]
  }

PATCH  /api/admin/pvp/global
  Body: { enabled: boolean }
  → Sets PvP on or off for the entire game world
  → If enabled=false: overrides all city-level settings (global off = all off)
  → Broadcasts to all online players:
      [Server] PvP has been globally ENABLED/DISABLED by an administrator.
  → Updates pvp_settings WHERE scope='global'
  → Logs: TOGGLE_PVP_GLOBAL { enabled }

PATCH  /api/admin/pvp/city/:cityId
  Body: { enabled: boolean }
  → Sets PvP on or off for a specific city only
  → Only takes effect if global PvP is enabled
  → Broadcasts to players currently in that city:
      [Server] PvP has been ENABLED/DISABLED in <City Name>.
  → Updates pvp_settings WHERE scope=cityId
  → Logs: TOGGLE_PVP_CITY { cityId, cityName, enabled }
```

#### Audit Log Endpoints

```
GET    /api/admin/audit
  Query: ?adminId=&targetId=&action=&from=&to=&page=1&limit=100
  Response: { logs: [...], total, page }
  Returns: id, adminName, action, targetType, targetId, payload, ipAddress, performedAt

GET    /api/admin/audit/export
  Query: ?from=&to=  (date range, ISO format)
  Response: CSV file download of audit log entries in range
```

#### Server Status Endpoint

```
GET    /api/admin/server/status
  Response: {
    uptime: number,             -- seconds since server start
    onlinePlayers: number,
    activeCombatSessions: number,
    activeParties: number,
    activeTrades: number,
    pvpGlobalEnabled: boolean,
    memoryUsageMb: number,
    dbSizeMb: number
  }
```

---

### Admin Web UI

The UI is a **multi-page static web app** served from `admin/ui/`. No build step required —
plain HTML, CSS, and vanilla JavaScript using the Fetch API.

#### Pages

```
/                  → Redirect to /login if no token, else to /dashboard
/login             → Admin login form
/dashboard         → Server status overview (online count, active sessions, PvP state)
/players           → Paginated player list with search + filter + unread mail badge
/players/:id       → Single player management page (stats, gold, items, ban, purchases, mail)
/players/:id/purchases → Full purchase history + entitlement management for one player
/pvp               → PvP settings panel (global toggle + per-city grid)
/audit             → Audit log viewer with filters + CSV export
/mail              → Admin mailbox — all player messages, reply, mark read/resolved
/mail/:id          → Single mail thread view with reply
/store             → Store overview: revenue stats, all orders, entitlement management
```

#### Login Page (`index.html`)

```
┌─────────────────────────────────────────┐
│         ⚔  GAME ADMIN PANEL             │
│─────────────────────────────────────────│
│  Username  [_______________________]    │
│  Password  [_______________________]    │
│                                         │
│            [    Login    ]              │
│                                         │
│  ⚠ Admin access is logged and audited. │
└─────────────────────────────────────────┘
```

#### Dashboard (`dashboard.html`)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚔ Admin Panel          [admin]        [Logout]             │
├──────────┬──────────┬──────────┬────────┬────────┬──────────┤
│ Players  │   PvP    │  Audit   │ Mail🔴7│ Store  │ [Search] │
├──────────┴──────────┴──────────┴────────┴────────┴──────────┤
│                                                             │
│   SERVER STATUS                                             │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│   │ Online      │ │ Combats     │ │ Parties     │          │
│   │    24       │ │     7       │ │     3       │          │
│   └─────────────┘ └─────────────┘ └─────────────┘          │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│   │ Trades      │ │ Uptime      │ │ DB Size     │          │
│   │     2       │ │  14h 32m    │ │  48.2 MB    │          │
│   └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│   ALERTS                                                    │
│   🔴 7 unread player messages  [Go to Mail →]              │
│   🟡 2 unresolved purchase issues  [Go to Store →]         │
│                                                             │
│   PvP STATUS                                                │
│   Global PvP:  ● DISABLED          [Enable]                │
│                                                             │
│   Recent Admin Actions                                      │
│   ─────────────────────────────────────────────────────    │
│   admin1  GIVE_ITEM      → Kael      Iron Sword ×1   2m   │
│   admin1  GRANT_ENTITLE  → Ryuna     Dark Fantasy    5m   │
│   admin1  BAN_PLAYER     → Cheater1  permanent      12m   │
└─────────────────────────────────────────────────────────────┘
```

#### Player List (`players.html`)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Player Management                                                   │
│  [Search by name...____________] [Status ▼] [Mail ▼] [Search]       │
├────┬─────────────┬───────┬──────────┬────────┬────────┬─────────────┤
│ #  │ Username    │ Level │ Status   │ Gold   │ Mail   │ Actions     │
├────┼─────────────┼───────┼──────────┼────────┼────────┼─────────────┤
│ 1  │ Kael        │  28   │ 🟢 Online│ 4,200g │ ✉ 1   │ [View]      │
│ 2  │ Ryuna       │  31   │ 🟢 Online│ 8,100g │  —    │ [View]      │
│ 3  │ Borek       │  25   │ ⚫ Offline│  900g  │ ✉ 2   │ [View]      │
│ 4  │ Cheater1    │  15   │ 🔴 Banned│    0g  │  —    │ [View]      │
├────┴─────────────┴───────┴──────────┴────────┴────────┴─────────────┤
│  Page 1 of 3   [←] [1] [2] [3] [→]                     Total: 127  │
└──────────────────────────────────────────────────────────────────────┘
```

The ✉ badge in the Mail column indicates the number of **unread messages** from that player.
Clicking ✉ on the player row goes directly to that player's mail thread.

#### Player Detail Page (`player_detail.html`)

All management actions for a single player on one page, organised into collapsible sections.
New sections added: **Purchase History**, **Mail Thread**, and **Purchase Support**.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Players                                              │
│  Player: Kael   [Lv 28]   🟢 Online   ✉ 1 unread message      │
├───────────────────┬─────────────────────────────────────────────┤
│  Overview         │  Stats  │  Gold  │  Items  │  Ban  │ More ▼ │
├───────────────────┴─────────────────────────────────────────────┤

  ▼  STATS EDITOR
  Level  [28___] Exp    [14200_] HP     [480__] / [520__]
  Mana   [200__] / [300__]
  STR [42] AGI [35] DEF [38] LCK [20] ATK [85]
  CritRate [0.25] CritDmg [1.6]                  [Save Stats]

  ▼  GOLD
  Current: 4,200g
  Operation: (●) Add  ( ) Remove  ( ) Set
  Amount: [______]                         [Apply Gold]

  ▼  GIVE ITEM
  Type:  [Weapon ▼]   Item: [Search...____________] [🔍]
  Qty:   [1___]                                 [Give Item]

  ▼  REMOVE ITEM
  Inventory: 48/100 slots
  [Iron Sword ×1] [Health Potion V ×12] [Mana Crystal ×3] [...]
  Select: [Health Potion V ▼]  Qty: [5__]          [Remove]

  ▼  PURCHASE HISTORY                                 [🔗 Full View]
  ─────────────────────────────────────────────────────────────────
  Date         │ Item                      │ Price  │ Status
  ─────────────────────────────────────────────────────────────────
  2025-04-01   │ Dark Fantasy Theme        │ $2.99  │ ✔ Complete
  2025-03-28   │ Crimson Name Color        │ $1.99  │ ✔ Complete
  2025-03-20   │ Inventory +50 Slots       │ $3.99  │ ⚠ Issue
  2025-03-15   │ Fire Chat Effect          │ $1.99  │ ✔ Complete
  ─────────────────────────────────────────────────────────────────
  [View All Purchases →]    Total spent: $10.96    4 purchases

  ⚠  PURCHASE ISSUE DETECTED
  Order: Inventory +50 Slots  (2025-03-20, $3.99)
  Status: Payment confirmed by Steam but entitlement NOT granted.
  Reason: Server was down during webhook delivery.
  [Grant Entitlement Now]   [Mark as Resolved]   [View Order Detail]

  ▼  MAIL THREAD (1 unread)
  ─────────────────────────────────────────────────────────────────
  🔴 Kael  →  Admin         2025-04-03 14:22    [UNREAD]
     "Hi, I bought the Inventory expansion but my slots are still
      at 100. Order was on March 20th. Please help!"
  ─────────────────────────────────────────────────────────────────
  [Reply]   [Mark Read]   [Open Full Thread →]

  ▼  BAN / ACCOUNT
  Reason:   [________________________________]
  Duration: (●) Permanent  ( ) Days: [___]
            [Ban Player]             [Delete Account] ⚠
└─────────────────────────────────────────────────────────────────┘
```

---

#### Full Purchase History Page (`/players/:id/purchases`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back   Kael — Purchase History & Entitlements               │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All ▼]  Status: [All ▼]  From: [____]  To: [____]   │
├────────────────────┬──────────────┬─────────┬────────┬─────────┤
│ Date               │ Item         │ Price   │ Status │ Action  │
├────────────────────┼──────────────┼─────────┼────────┼─────────┤
│ 2025-04-01 09:14   │ Dark Fantasy │ $2.99   │ ✔ OK   │ [Revoke]│
│ 2025-03-28 17:32   │ Crimson Name │ $1.99   │ ✔ OK   │ [Revoke]│
│ 2025-03-20 11:08   │ Inv +50 Slots│ $3.99   │ ⚠ ERR  │ [Grant] │
│ 2025-03-15 08:55   │ Fire Chat    │ $1.99   │ ✔ OK   │ [Revoke]│
├────────────────────┴──────────────┴─────────┴────────┴─────────┤
│  Total: 4 orders   Total spent: $10.96   Issues: 1             │
│                                     [Export CSV]               │
├─────────────────────────────────────────────────────────────────┤
│  ACTIVE ENTITLEMENTS                                           │
│  ✔ Dark Fantasy Theme       (active)                           │
│  ✔ Crimson Name Color       (owned, not active)                │
│  ✗ Inventory +50 Slots      (NOT GRANTED — issue)              │
│  ✔ Fire Chat Effect         (owned, not active)                │
├─────────────────────────────────────────────────────────────────┤
│  MANUAL GRANT                                                  │
│  Item ID: [inv_expand_50___________]  [🔍 Search]              │
│  Reason:  [Purchase confirmed, entitlement missing_______]     │
│                                      [Grant Entitlement]       │
└─────────────────────────────────────────────────────────────────┘
```

#### PvP Settings Panel (`pvp.html`)

```
┌─────────────────────────────────────────────────────────────┐
│  PvP Settings                                               │
├─────────────────────────────────────────────────────────────┤
│  GLOBAL PvP                                                 │
│  ● DISABLED      [Enable Global PvP]                        │
│  ⚠ When disabled, all city settings are also inactive.      │
├─────────────────────────────────────────────────────────────┤
│  PER-CITY PvP  (only active when Global PvP is ON)          │
│                                                             │
│  Ashford Village    ○ OFF   [Enable]                        │
│  Irongate Town      ○ OFF   [Enable]                        │
│  Millhaven          ○ OFF   [Enable]                        │
│  Thornwick          ○ OFF   [Enable]                        │
│  Crystalmere City   ● ON    [Disable]                       │
│  Emberveil          ○ OFF   [Enable]                        │
│  Duskhollow         ● ON    [Disable]                       │
│  Saltmere           ○ OFF   [Enable]                        │
│  Stormspire Citadel ○ OFF   [Enable]                        │
│  Veilreach          ○ OFF   [Enable]                        │
│  Cinderpeak         ○ OFF   [Enable]                        │
│  Ashenmoor          ● ON    [Disable]                       │
│  Wraithgate         ○ OFF   [Enable]                        │
│  Obsidian Keep      ● ON    [Disable]                       │
│  The Sanctum        ○ OFF   [Enable]                        │
│  Abyss's Edge       ● ON    [Disable]                       │
├─────────────────────────────────────────────────────────────┤
│  Last updated by admin1 at 2025-03-12 14:22 UTC             │
└─────────────────────────────────────────────────────────────┘
```

#### Audit Log Viewer (`audit.html`)

```
┌─────────────────────────────────────────────────────────────┐
│  Audit Log                            [Export CSV]          │
│  Admin: [All ▼]  Action: [All ▼]  From:[____] To:[____]    │
├──────────────┬──────────────┬────────────┬──────────────────┤
│ Time         │ Admin        │ Action     │ Detail           │
├──────────────┼──────────────┼────────────┼──────────────────┤
│ 14:32:01 UTC │ admin1       │ GIVE_ITEM  │ Kael ← Iron Sword│
│ 14:28:44 UTC │ admin1       │ MODIFY_GOLD│ Ryuna +5000g     │
│ 14:15:02 UTC │ admin1       │ BAN_PLAYER │ Cheater1 (perm.) │
│ 13:50:11 UTC │ superadmin   │ MODIFY_STATS│ Borek Lv 25→30  │
│ 13:44:00 UTC │ admin1       │ TOGGLE_PVP │ Duskhollow ON    │
└──────────────┴──────────────┴────────────┴──────────────────┘
  Page 1 of 8   [←] [1] [2] ... [8] [→]          Total: 382
```

---

#### Mail Inbox (`mail.html`)

The admin mailbox collects all messages sent by players using the in-game `mail admin`
command. Messages are organised into threads per player. Unread count shown in nav badge.

```
┌─────────────────────────────────────────────────────────────────┐
│  ✉  Player Mail Inbox               🔴 7 unread               │
│  [All ▼]  [Unread ▼]  [Category ▼]  [Search player...____]     │
├──────────────────────────────────────────────────────────────── ┤
│  Showing: All Messages   Sort: Newest First                     │
├────┬─────────────┬──────────────────────────────┬──────┬───────┤
│ 🔴 │ From        │ Subject / Preview            │ Date │ Status│
├────┼─────────────┼──────────────────────────────┼──────┼───────┤
│ 🔴 │ Kael        │ [Purchase] "I bought Inv ex… │ 2h   │ Open  │
│ 🔴 │ Borek       │ [Bug] "Got disconnected mid… │ 5h   │ Open  │
│ 🔴 │ Mira        │ [Purchase] "Dark Fantasy the…│ 1d   │ Open  │
│ ✓  │ Ryuna       │ [General] "Love the game! …  │ 2d   │ Closed│
│ 🔴 │ Zael        │ [Purchase] "Bought 3 items b…│ 3d   │ Open  │
│ 🔴 │ Vance       │ [Report] "Player was harassi…│ 3d   │ Open  │
│ 🔴 │ Lira        │ [Purchase] "Inventory slots …│ 4d   │ Open  │
├────┴─────────────┴──────────────────────────────┴──────┴───────┤
│  Page 1 of 2    [←] [→]                        Total: 12      │
└─────────────────────────────────────────────────────────────────┘
```

**Message categories** (auto-tagged by player when sending):
- `[Purchase]` — payment or entitlement issue
- `[Bug]` — gameplay bug report
- `[Report]` — player report (harassment, cheating)
- `[General]` — general feedback or question

---

#### Mail Thread View (`/mail/:id`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Inbox                                                │
│  Thread: Kael — Purchase Issue                    [Close ▼]    │
│  Status: 🔴 Open   Category: [Purchase]   [View Player →]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ FROM: Kael (kael@steam:76561198012345678)   2025-04-03 14:22│ │
│  │ ─────────────────────────────────────────────────────────  │ │
│  │ Hi admin, I bought the Inventory +50 Slots expansion       │ │
│  │ on March 20th. My Steam transaction went through and I     │ │
│  │ was charged $3.99 but my inventory is still at 100 slots.  │ │
│  │ Order ID from Steam: 7812345690. Please help!              │ │
│  │                                                 [🔍 View Order]│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  QUICK ACTIONS                                                  │
│  [Grant: inv_expand_50 to Kael]   [View All Purchases]         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ REPLY                                                      │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Hi Kael, I've looked into your order and confirmed  │   │ │
│  │ │ the payment was received. I've manually granted your│   │ │
│  │ │ Inventory +50 Slots expansion. You should now have  │   │ │
│  │ │ 150 inventory slots. Sorry for the trouble!         │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │ [Send Reply]  [Send + Close Thread]  [Close Without Reply] │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

When admin clicks **[Grant: inv_expand_50 to Kael]** quick action:
- Calls `POST /api/admin/players/:playerId/entitlements/grant`
- EntitlementManager grants item, inventory cap updated immediately
- If player is online: push notification sent
- Action logged to `admin_audit_log` with reason "Support: purchase issue"

When admin sends a reply, the player receives it as an **in-game mail message**:

```
  [Player's CLI]
  ╔═══════════════════════════════════════════════════════════╗
  ║  ✉  REPLY FROM ADMIN                                     ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Hi Kael, I've looked into your order and confirmed      ║
  ║  the payment was received. I've manually granted your    ║
  ║  Inventory +50 Slots expansion. You should now have      ║
  ║  150 inventory slots. Sorry for the trouble!             ║
  ╚═══════════════════════════════════════════════════════════╝
  Use 'mail' to view all your messages.
```

---

#### Store Overview Page (`store.html`)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏪  Store Management                                           │
├────────────────────┬────────────────────┬───────────────────────┤
│  Revenue (30 days) │  Total Orders      │  Issues               │
│  $1,847.23         │  412               │  3 unresolved ⚠       │
├────────────────────┴────────────────────┴───────────────────────┤
│                                                                 │
│  PURCHASE ISSUES  (needs attention)                             │
│  ─────────────────────────────────────────────────────────────  │
│  ⚠ Kael   — Inventory +50 Slots    $3.99   Mar 20  [Resolve]  │
│  ⚠ Mira   — Dark Fantasy Theme     $2.99   Apr 01  [Resolve]  │
│  ⚠ Zael   — Chat Bundle            $9.99   Apr 02  [Resolve]  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  RECENT ORDERS                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  2025-04-03  │ Ryuna     │ Name Color Bundle    │ $9.99  │ ✔   │
│  2025-04-03  │ Borek     │ Combat FX Bundle     │ $9.99  │ ✔   │
│  2025-04-02  │ Zael      │ Chat Bundle          │ $9.99  │ ⚠   │
│  2025-04-01  │ Kael      │ Dark Fantasy Theme   │ $2.99  │ ✔   │
│  ─────────────────────────────────────────────────────────────  │
│  [View All Orders]    [Export CSV]                              │
│                                                                 │
│  MANUAL ENTITLEMENT GRANT                                       │
│  Player: [Search...______]   Item: [Search...______]  [Grant]  │
│  Reason: [Purchase support — order confirmed manually_____]     │
└─────────────────────────────────────────────────────────────────┘
```

**Issue detection** — The server automatically flags orders where:
- `store_orders.status = 'complete'` (Steam confirmed payment)
- BUT no matching row exists in `entitlements` table for that player + item
- These appear as `⚠ Issue` in the player list and store page

---

### PvP System

#### PvpManager (Server Module)

```ts
class PvpManager {
  // In-memory state loaded from pvp_settings table on startup
  private globalEnabled: boolean = false;
  private cityEnabled: Map<string, boolean> = new Map();

  isPvpAllowed(areaId: string, cityId: string | null): boolean {
    if (!this.globalEnabled) return false;
    if (!cityId) return false;              // PvP only in cities, not open world
    return this.cityEnabled.get(cityId) ?? false;
  }

  setGlobal(enabled: boolean, adminId: string): void {
    this.globalEnabled = enabled;
    // Persist to DB + broadcast to all players
  }

  setCity(cityId: string, enabled: boolean, adminId: string): void {
    this.cityEnabled.set(cityId, enabled);
    // Persist to DB + broadcast to players in that city
  }

  loadFromDb(): void {
    // Called on server startup — reads all pvp_settings rows
  }
}
```

---

#### PvP Combat Rules

```
Initiated by:  attack <playerName>  — only valid in a PvP-enabled city area
Turn timer:    same 15-second rule applies to both players
Loser:         Downed state → 100s revival window → nearest city fountain respawn
Loser penalty: −5% gold (softer than mob death — NOT 10%)
Loser loot:    NO item drops (prevents griefing / theft)
Winner reward: +EXP equal to 50% of a same-level mob kill
Flee:          available (same agility formula as PvE)
Party members: cannot attack each other
Safe zones:    PvP impossible regardless (safeZone: true blocks it)
Boss rooms:    PvP disabled in all boss rooms regardless of city setting
```

---

#### PvP Initiation Check (Server)

```ts
// CombatEngine — before creating a PvP CombatSession
if (target.type === 'player') {
  if (!PvpManager.isPvpAllowed(session.currentArea, session.currentCityId))
    return error('PVP_NOT_ALLOWED', 'PvP is not enabled in this area.')
  if (target.partyId && target.partyId === attacker.partyId)
    return error('PVP_PARTY_MEMBER', 'You cannot attack a party member.')
  if (target.combatState)
    return error('PVP_TARGET_IN_COMBAT', 'That player is already in combat.')
  // All checks pass → create PvP CombatSession
}
```

---

#### Full PvP Screen Experience

This section documents **exactly what each player sees** at every step of a PvP encounter —
from the moment one player decides to attack through to the respawn.

---

##### STEP 1 — Attacker Initiates

The attacker types the command. The server validates the target is in the same area and
PvP is enabled, then immediately locks both players into a shared PvP CombatSession.

**Attacker's screen** (what Kael sees after typing):

```
> attack Ryuna

  ╔══════════════════════════════════════════════════════════╗
  ║  ⚔  PvP COMBAT INITIATED                                ║
  ║  You challenge Ryuna to combat!                         ║
  ╚══════════════════════════════════════════════════════════╝

  Opponent:  Ryuna      Lv 31  [Ranger]
  Your HP:   480/480    MP: 250/300

  Turn order is being determined...
```

---

##### STEP 2 — Defender Receives Surprise Alert

Ryuna may be doing anything — exploring, browsing a shop, chatting. The PvP challenge
is pushed as a **high-priority interrupt event** that clears the current line and demands
immediate attention. The defender has **no choice** — PvP is forced, not optional.
(Being in a PvP-enabled zone is consent.)

**Defender's screen** (what Ryuna sees — pushed mid-whatever-she-was-doing):

```
[her current prompt is wiped and replaced with:]

  ╔══════════════════════════════════════════════════════════╗
  ║  ⚠  YOU ARE BEING ATTACKED!                             ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Kael  (Lv 28, Warrior) has initiated PvP combat!       ║
  ║  Location: Duskhollow — Shadow Market District           ║
  ╚══════════════════════════════════════════════════════════╝

  Attacker:  Kael       Lv 28  [Warrior]
             HP: ???    MP: ???   (enemy stats hidden until combat begins)
  Your HP:   520/520    MP: 300/300

  You have been pulled into combat. Prepare yourself.
  Turn order is being determined...
```

> **Note on hidden stats**: In PvP, the opponent's exact HP and mana are hidden (shown as
> `???`) to preserve the tension of not knowing how close to death they are. Only their
> name, level, and class are shown. After the fight, no stats are revealed.

---

##### STEP 3 — Turn Order Revealed & Combat Begins

The server rolls agility for both players, determines turn order, and broadcasts the
combat header to both simultaneously.

**Both players see this header pushed to their screens:**

```
  ══════════════════════════════════════════════════════════
   ⚔  PvP COMBAT — Duskhollow: Shadow Market District
  ══════════════════════════════════════════════════════════
   Kael   Lv 28  [Warrior]  HP ███████████ ???/???
   Ryuna  Lv 31  [Ranger]   HP ███████████ ???/???
  ══════════════════════════════════════════════════════════
   Turn order: Ryuna → Kael
   (Ryuna's higher agility gives her the first move.)
  ══════════════════════════════════════════════════════════
```

HP bars use a **10-block bar** (`█` filled, `░` empty) showing percentage only — not
the actual number. This preserves PvP information asymmetry:

```
Full HP:      ██████████  (100%)
Half HP:      █████░░░░░  (50%)
Critical HP:  ██░░░░░░░░  (20%)
```

---

##### STEP 4A — Defender's Turn (she goes first due to higher agility)

**Ryuna's screen** (it is her turn):

```
  ══════════════════════════════════════════════════════════
   ⚔  PvP — Round 1  |  YOUR TURN  [15s]
  ══════════════════════════════════════════════════════════
   Kael   Lv 28  HP ██████████ ???       [Opponent]
   You    Lv 31  HP ██████████ 520/520   [You]
  ══════════════════════════════════════════════════════════
   Actions: attack / skill <n> / magic <n> / item <n> / flee

   Your skills:
     Physical: [1] Piercing Shot  [2] Rapid Fire  [3] Eagle Eye
     Magic:    [4] Wind Blade     [5] Storm Arrow
> _
```

**Kael's screen** (he is waiting — it is not his turn):

```
  ══════════════════════════════════════════════════════════
   ⚔  PvP — Round 1  |  Ryuna's turn...
  ══════════════════════════════════════════════════════════
   Ryuna  Lv 31  HP ██████████ ???       [Opponent]
   You    Lv 28  HP ██████████ 480/480   [You]
  ══════════════════════════════════════════════════════════
   Waiting for Ryuna to act...  [watching]
```

> **During the opponent's turn**, a player can still type `say`, `msg`, `p`, or `shout`.
> These are processed as chat without interrupting the combat turn.

---

##### STEP 4B — Defender Acts

Ryuna types `skill 1` (Piercing Shot):

**Ryuna's screen** immediately after submitting:

```
> skill 1

  [PvP] You use Piercing Shot on Kael!
```

**Both players then see the combat log pushed:**

```
  ──────────────────────────────────────────────────────────
  [PvP] Ryuna uses Piercing Shot!
        → Kael takes 187 damage!  (Bleed applied — 2 turns)
        → Kael's HP: ████████░░  (~80%)
  ──────────────────────────────────────────────────────────
```

> Ryuna sees the exact damage number she dealt (her own actions are transparent).
> Kael sees the exact damage he took (his own HP is always visible to himself).
> Neither player sees the opponent's actual HP number — only the bar percentage.

---

##### STEP 4C — Attacker's Turn

**Kael's screen** (now his turn):

```
  ══════════════════════════════════════════════════════════
   ⚔  PvP — Round 1  |  YOUR TURN  [15s]
  ══════════════════════════════════════════════════════════
   Ryuna  Lv 31  HP ██████████ ???       [Opponent]
   You    Lv 28  HP ████████░░ 384/480   [You]   ← (Bleed: 2 turns)
  ══════════════════════════════════════════════════════════
   Status effects on you: [Bleed ×1 — 2 turns]
   Actions: attack / skill <n> / magic <n> / item <n> / flee
> _
```

**Ryuna's screen** (waiting):

```
  ══════════════════════════════════════════════════════════
   ⚔  PvP — Round 1  |  Kael's turn...
  ══════════════════════════════════════════════════════════
   You    Lv 31  HP ██████████ 520/520   [You]
   Kael   Lv 28  HP ████████░░ ???       [Opponent]
  ══════════════════════════════════════════════════════════
   Waiting for Kael to act...
```

---

##### STEP 5 — End-of-Turn Status Tick

After both players act, status effects tick. **Both players see:**

```
  ──────────────────────────────────────────────────────────
  [Status] Kael suffers Bleed damage — 14 HP lost.
           Kael's HP: ███████░░░  (~72%)
  ──────────────────────────────────────────────────────────
```

---

##### STEP 6A — Attacker Attempts to Flee

If Kael types `flee` on his turn:

**Kael's screen:**
```
> flee

  [PvP] You attempt to flee...
```

**Flee roll result — two possible outcomes:**

*Success (flee chance roll passes):*
```
  [PvP] You escape!  Ryuna could not catch you.
        No rewards. No penalty.
        You return to Duskhollow — Shadow Market District.
```

*Failure:*
```
  [PvP] Ryuna cuts off your escape!
        Ryuna gets a free attack — 156 damage!
        Your HP: ██████░░░░  (~52%)
        Your turn is lost.
```

**Ryuna's screen on Kael flee attempt:**

*Success:*
```
  [PvP] Kael has fled combat. The fight is over.
        No rewards awarded. No penalty to either side.
```

*Failure:*
```
  [PvP] Kael tried to flee — and failed!
        You land a free attack on Kael for 156 damage!
        Kael's HP: ██████░░░░  (~52%)
```

---

##### STEP 7 — Turn Timer Expiry During PvP

If Kael does not act within 15 seconds:

**Kael's screen (warnings):**
```
  [10s] Still your turn — choose an action!
  [5s!] Time running out!
  [PvP] Your turn timed out — turn skipped!
```

**Ryuna's screen:**
```
  [PvP] Kael's turn timed out — turn skipped!
        Ryuna's turn is next.
```

---

##### STEP 8 — Chat During PvP Combat

Both players can send chat messages at any time during PvP without consuming their turn.
Messages appear inline between combat log lines:

**Kael sends `say gg no re` on Ryuna's turn:**

Ryuna sees (pushed above her input prompt):
```
  [Area] Kael: gg no re
```

Kael sees his own message echoed:
```
  [Area] You: gg no re
```

Bystanders in the same area also see all `say` messages — they follow the fight in real time.

**Bystanders in Duskhollow see:**
```
  [Nearby] ⚔ Kael and Ryuna are fighting!  (PvP combat in your area)
  [Area] Kael: gg no re
  [PvP-Watch] Ryuna uses Storm Arrow → Kael takes 203 damage!
```

> Bystanders receive a **`[PvP-Watch]` feed** — a read-only broadcast of the combat log
> pushed to everyone in the same area. They can see every action and damage number in real
> time, creating spectator tension. They cannot intervene.

---

##### STEP 9 — Player is Defeated (HP reaches 0)

Kael's HP hits 0 from Ryuna's final attack.

**Kael's screen:**
```
  ──────────────────────────────────────────────────────────
  [PvP] Ryuna's Rapid Fire hits for 312 damage!
        ✖ You have been DEFEATED.
  ──────────────────────────────────────────────────────────

  ╔══════════════════════════════════════════════════════════╗
  ║  ✖  YOU HAVE BEEN DEFEATED                              ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Defeated by: Ryuna  (Lv 31, Ranger)                   ║
  ║  Location:    Duskhollow — Shadow Market District        ║
  ╠══════════════════════════════════════════════════════════╣
  ║  You are DOWNED. Allies have 100 seconds to revive you. ║
  ║  If no revival: auto-respawn at Duskhollow Fountain.    ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Penalty: −5% gold  (−92g)  No items lost.             ║
  ╚══════════════════════════════════════════════════════════╝

  [Downed] You are incapacitated. 100s until auto-respawn.
  You can still chat while waiting.
> _
```

**Ryuna's screen:**
```
  ──────────────────────────────────────────────────────────
  [PvP] Your Rapid Fire hits Kael for 312 damage!
        ✔ Kael has been DEFEATED!
  ──────────────────────────────────────────────────────────

  ╔══════════════════════════════════════════════════════════╗
  ║  ✔  VICTORY                                             ║
  ╠══════════════════════════════════════════════════════════╣
  ║  You defeated: Kael  (Lv 28, Warrior)                  ║
  ║  Location:     Duskhollow — Shadow Market District       ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Reward: +EXP  84 xp  (50% of same-level mob kill)     ║
  ║  No item drops from PvP.                               ║
  ╚══════════════════════════════════════════════════════════╝

  Returning to Duskhollow — Shadow Market District.
> _
```

**Bystanders in the area see:**
```
  [PvP] ✔ Ryuna defeated Kael in PvP combat!
```

---

##### STEP 10A — Downed Countdown (No Revival)

Kael is Downed. No party member or bystander has Resurrection. Every 10 seconds:

```
  [Downed] 90s remaining...
  [Downed] 80s remaining...
  [Downed] 70s remaining...
  ...
  [Downed] 10s remaining — prepare to respawn.
  [Downed] Respawning now...

  ╔══════════════════════════════════════════════════════════╗
  ║  ✦  RESPAWN                                             ║
  ╠══════════════════════════════════════════════════════════╣
  ║  You wake at the Duskhollow Fountain.                   ║
  ║  The cold stone beneath you is familiar — you've        ║
  ║  been here before.                                      ║
  ╠══════════════════════════════════════════════════════════╣
  ║  HP:   144 / 480   (30%)                               ║
  ║  MP:    90 / 300   (30%)                               ║
  ║  Gold lost: 92g    Items: none lost                    ║
  ║  All status effects cleared.                           ║
  ╚══════════════════════════════════════════════════════════╝

  You are now in Duskhollow — City Square (Fountain).
> _
```

---

##### STEP 10B — Revival by Ally During Downed Countdown

If Borek (a party member in the area) uses Resurrection on Kael within 100 seconds:

**Kael's screen:**
```
  [Party] Borek revives you with Resurrection!

  ╔══════════════════════════════════════════════════════════╗
  ║  ✦  REVIVED                                             ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Borek pulls you back from the brink.                   ║
  ╠══════════════════════════════════════════════════════════╣
  ║  HP: 144 / 480  (30%)    MP: 90 / 300  (30%)           ║
  ║  Gold penalty still applies: −92g                      ║
  ╚══════════════════════════════════════════════════════════╝

  You are back on your feet in Duskhollow — Shadow Market.
> _
```

**Borek's screen:**
```
  [PvP] You revive Kael with Resurrection! (30% HP restored)
```

---

##### STEP 11 — Area Broadcast to All Bystanders on Respawn

When Kael respawns at the fountain, all players in the fountain area see:

```
  [Nearby] Kael has respawned at the fountain.
           (Defeated by Ryuna in PvP)
```

This is a brief social signal — bystanders know what happened.

---

#### PvP Edge Cases & Rules Clarification

```
Q: Can a bystander join the PvP fight mid-combat?
A: No. A PvP CombatSession is locked to its two original participants.
   Bystanders can watch via [PvP-Watch] feed only.

Q: Can a party member heal the Downed player during PvP?
A: Yes — outside the PvP CombatSession. The CombatSession ends the moment
   one player is Downed. Allies can then use Resurrection on the Downed player
   during the 100-second countdown using normal party support actions.

Q: What if both players hit 0 HP on the same turn?
A: Server resolves attacker's action first (the player whose turn it was).
   If attacker is killed by a counterattack/status tick: attacker goes Downed first.
   If defender goes to 0 from attacker's action: defender goes Downed first.
   Ties (simultaneous status ticks killing both) → both go Downed simultaneously,
   both countdown timers start at the same time, no winner, no EXP.

Q: What if the attacker disconnects mid-PvP?
A: Attacker is treated as having fled (no penalty). Defender is released from combat.
   Defender receives: [PvP] Kael disconnected. Combat cancelled. No penalty.

Q: What if the defender disconnects mid-PvP?
A: Same — defender treated as fled. Attacker released. No EXP awarded.

Q: Can a player re-attack the same person immediately after winning?
A: Yes, if the target has respawned and PvP is still enabled in the area.
   There is a 10-second PvP cooldown per pair after a fight ends:
     "Kael recently fought you. You cannot attack them for 8 more seconds."
   This prevents instant chain-killing at the fountain.

Q: Does PvP combat award guild points?
A: No. PvP kills do not count toward guild rank progression.

Q: Can you trade offers be sent mid-PvP?
A: No. Trade is blocked while in any combat (PvP or PvE).

Q: What does the area chat look like to third parties watching the PvP?
A: All [Area] chat is visible. [PvP-Watch] log lines are broadcast showing
   each action and the HP bar update. Third parties see the full fight play out.
```

---

#### PvP Notification on State Change

```
Admin enables global PvP:
  → All online players receive:
    [Server] ⚔ PvP has been ENABLED globally. You may be attacked in PvP zones.

Admin enables PvP in Duskhollow:
  → Players currently in Duskhollow receive:
    [Server] ⚔ PvP has been ENABLED in Duskhollow. Watch your back.
  → Players in other cities receive no notification.

Admin disables PvP globally:
  → All online players in active PvP combat receive:
    [Server] PvP has been DISABLED. Your combat is ending immediately.
  → All active PvP CombatSessions are terminated. No winner, no penalties.
  → All other online players receive:
    [Server] PvP has been DISABLED globally by an administrator.
```

---

#### PvP CombatSession Data Model

```ts
interface PvpCombatSession extends CombatSession {
  type: 'pvp';                      // overrides 'solo' | 'party'
  attackerId: string;               // who initiated
  defenderId: string;               // who was challenged
  areaId: string;
  cityId: string;

  // Both participants are in participants[] with type: 'player'
  // Turn order, timer, status effects — all same as PvE CombatSession

  result?: {
    winnerId: string;
    loserId: string;
    endedBy: 'knockout' | 'flee_attacker' | 'flee_defender' |
             'disconnect_attacker' | 'disconnect_defender' |
             'admin_disable' | 'draw';
    expAwarded: number;
    goldPenalty: number;
  };

  pvpCooldownPair: string;          // e.g. "kael:ryuna" — sorted alphabetically
                                    // stored in memory to enforce 10s re-attack cooldown
}
```

---


---

### Player Mail System (In-Game → Admin)

Players can send messages to the admin team directly from the CLI using the `mail` command.
This is the primary **support channel** — used for purchase issues, bug reports, player
reports, and general feedback.

---

#### Sending Mail from the CLI

```
> mail admin

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✉  SEND MESSAGE TO ADMIN                                ║
  ╚═══════════════════════════════════════════════════════════╝

  Category:
  [1] Purchase issue  (item not received after payment)
  [2] Bug report      (something broken in the game)
  [3] Player report   (harassment, cheating)
  [4] General         (feedback, question, other)
> 1

  Subject (max 80 chars):
> Bought Inventory +50 Slots but still at 100 slots

  Message (max 500 chars, press Enter twice to send):
> Hi, I bought the Inventory +50 Slots expansion on March 20th.
> My Steam payment went through ($3.99 charged) but my inventory
> cap is still 100. My Steam order ID is 7812345690. Please help!
>
  ─────────────────────────────────────────────────────────────
  Category: Purchase issue
  Subject:  Bought Inventory +50 Slots but still at 100 slots
  Message:  Hi, I bought the Inventory +50 Slots expansion...

  Send this message? (yes / no)
> yes

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✔  Message sent to the admin team.                      ║
  ║  You will receive a reply here in the game.              ║
  ║  Use 'mail' to check your inbox for replies.             ║
  ╚═══════════════════════════════════════════════════════════╝
```

---

#### Player Mail Inbox (Receiving Admin Replies)

```
> mail

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✉  YOUR MAILBOX                                         ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  1 new message                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║ # │ From  │ Subject                        │ Date   │ ● ║
  ║ 1 │ Admin │ Re: Inventory +50 Slots issue  │ 2h ago │ 🔴║
  ║ 2 │ Admin │ Welcome to Echoes of the Abyss │ 7d ago │   ║
  ╚═══════════════════════════════════════════════════════════╝
  Type 'mail read <n>' to open a message.

> mail read 1

  ╔═══════════════════════════════════════════════════════════╗
  ║  FROM: Admin Team   │   2025-04-03 16:44                 ║
  ║  RE: Inventory +50 Slots issue                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Hi Kael, I've looked into your order and confirmed the  ║
  ║  payment was received. I've manually granted your        ║
  ║  Inventory +50 Slots expansion. You should now have      ║
  ║  150 inventory slots. Sorry for the inconvenience!       ║
  ╚═══════════════════════════════════════════════════════════╝
  Use 'mail reply 1' to reply, or 'mail delete 1' to remove.
```

---

#### CLI Mail Commands

```
MAIL (in-game, always available)
  mail                   → view your inbox
  mail admin             → compose a new message to admin (interactive wizard)
  mail read <n>          → open message #n
  mail reply <n>         → reply to message #n (opens compose)
  mail delete <n>        → delete a message from your inbox
  mail unread            → show count of unread messages
```

---

### New REST API Endpoints (Mail & Store Support)

#### Mail Endpoints

```
GET    /api/admin/mail
  Query: ?status=open|closed|all&category=purchase|bug|report|general
         &playerId=&page=1&limit=50&unreadOnly=true
  Response: { mails: [...], total, unreadCount }
  Returns: mailId, playerId, playerName, category, subject,
           previewText, sentAt, status, hasReply

GET    /api/admin/mail/:mailId
  Response: full thread — original message + all admin replies,
            plus quick-links to player profile and purchase history

POST   /api/admin/mail/:mailId/reply
  Body: { message: string }
  → Stores admin reply in mail_messages table
  → Pushes reply to player in-game if online; stored for offline delivery
  → Updates mail thread status to 'awaiting_player' or 'closed' (if
    reply includes a resolution note)
  → Logs: MAIL_REPLY { mailId, playerName }

PATCH  /api/admin/mail/:mailId/status
  Body: { status: 'open' | 'closed' | 'resolved' }
  → Updates thread status
  → Logs: MAIL_STATUS_CHANGE

GET    /api/admin/mail/unread-count
  Response: { count: 7 }   — used by dashboard badge polling
```

#### Purchase Support Endpoints

```
GET    /api/admin/players/:playerId/purchases
  Response: {
    orders: [{ orderId, itemId, itemName, price, status, grantedAt }],
    entitlements: [{ itemId, itemName, category, grantedAt }],
    issues: [{ orderId, itemId, reason }]   ← orders paid but not granted
  }

GET    /api/admin/store/issues
  Response: list of all players with paid-but-not-granted orders
  → This powers the ⚠ Issue count on the store dashboard

POST   /api/admin/players/:playerId/entitlements/grant
  Body: { itemId: string, reason: string }
  → Validates itemId exists in Steam item catalog
  → EntitlementManager.grant() (idempotent — safe to call even if already owned)
  → If player is online: push grant notification
  → Updates store_orders.status = 'complete' if matching order found
  → Logs: GRANT_ENTITLEMENT { itemId, reason, triggeredBy: 'admin_support' }

POST   /api/admin/players/:playerId/entitlements/revoke
  Body: { itemId: string, reason: string }
  → Removes entitlement row
  → Clears active_cosmetics entry for this item if it was active
  → If player is online: push revoke notification + cosmetic stripped immediately
  → Logs: REVOKE_ENTITLEMENT { itemId, reason }

GET    /api/admin/store/orders
  Query: ?status=all|complete|pending|failed|refunded&page=1&limit=100
         &from=&to=&playerId=
  Response: paginated order list with player names and amounts

GET    /api/admin/store/revenue
  Query: ?period=7d|30d|90d|all
  Response: { totalRevenue, orderCount, topItems: [{itemId, count, revenue}] }
```

---

### Mail & Store Database Tables

```sql
-- ─────────────────────────────────────────────
-- PLAYER MAIL (player → admin communication)
-- ─────────────────────────────────────────────
CREATE TABLE mail_threads (
  mail_id       TEXT PRIMARY KEY,           -- UUID
  player_id     TEXT NOT NULL REFERENCES players(id),
  player_name   TEXT NOT NULL,
  category      TEXT NOT NULL,              -- 'purchase'|'bug'|'report'|'general'
  subject       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
                                            -- 'open'|'closed'|'resolved'
  created_at    TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  assigned_to   TEXT                        -- admin_id (optional assignment)
);

CREATE TABLE mail_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mail_id       TEXT NOT NULL REFERENCES mail_threads(mail_id),
  sender_type   TEXT NOT NULL,              -- 'player' | 'admin'
  sender_id     TEXT NOT NULL,              -- playerId or adminId
  sender_name   TEXT NOT NULL,
  body          TEXT NOT NULL,
  sent_at       TEXT NOT NULL,
  read_at       TEXT                        -- NULL = unread by recipient
);

CREATE INDEX idx_mail_threads_player   ON mail_threads(player_id);
CREATE INDEX idx_mail_threads_status   ON mail_threads(status);
CREATE INDEX idx_mail_threads_category ON mail_threads(category);
CREATE INDEX idx_mail_messages_thread  ON mail_messages(mail_id);
```

---

### Updated Admin Module Files

```
├── admin/
│   ├── AdminAuth.ts
│   ├── AdminRouter.ts
│   ├── AdminPlayerController.ts
│   ├── AdminPvpController.ts
│   ├── AdminMailController.ts            ← NEW: mail inbox, reply, status
│   ├── AdminStoreController.ts           ← NEW: orders, issues, grant/revoke
│   ├── AdminAuditLog.ts
│   ├── PvpManager.ts
│   └── ui/
│       ├── index.html
│       ├── dashboard.html               ← updated: alerts, mail badge
│       ├── players.html                 ← updated: mail column, unread badge
│       ├── player_detail.html           ← updated: purchases + mail sections
│       ├── player_purchases.html        ← NEW: full purchase + entitlement page
│       ├── pvp.html
│       ├── audit.html
│       ├── mail.html                    ← NEW: admin mail inbox
│       ├── mail_thread.html             ← NEW: single thread + reply
│       ├── store.html                   ← NEW: orders, issues, manual grant
│       ├── style.css
│       └── app.js
```

---

### New Audit Action Types

```ts
type AdminAction =
  | 'MODIFY_STATS'
  | 'MODIFY_GOLD'
  | 'GIVE_ITEM'
  | 'REMOVE_ITEM'
  | 'BAN_PLAYER'
  | 'UNBAN_PLAYER'
  | 'DELETE_PLAYER'
  | 'TOGGLE_PVP_GLOBAL'
  | 'TOGGLE_PVP_CITY'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'GRANT_ENTITLEMENT'    // ← NEW: manual store remedy
  | 'REVOKE_ENTITLEMENT'   // ← NEW: revoke purchased cosmetic
  | 'MAIL_REPLY'           // ← NEW: admin replied to player mail
  | 'MAIL_STATUS_CHANGE';  // ← NEW: thread opened/closed/resolved
```

---

### Updated Admin Testing Checklist

**Mail System:**
- [ ] Player `mail admin` wizard: category, subject, message stored in `mail_threads`
- [ ] Admin mail inbox (`/mail`) shows all threads with unread badge count
- [ ] Admin dashboard shows unread mail count with link to mail page
- [ ] Admin reply: stored in `mail_messages`, pushed to player if online
- [ ] Admin reply to offline player: stored, delivered as push on next login
- [ ] `mail read <n>` marks message as read in `mail_messages.read_at`
- [ ] Mail thread status changes (open → resolved) logged to audit
- [ ] Player receives in-game push notification for admin reply mid-session
- [ ] Player `mail` inbox shows admin replies correctly
- [ ] Mail category filter on admin inbox works correctly for all 4 categories

**Purchase Support:**
- [ ] Issue detection: order `status=complete` with no entitlement → flagged as ⚠
- [ ] Store page shows all flagged issues in "PURCHASE ISSUES" section
- [ ] Player detail page shows purchase history with ⚠ on missing entitlements
- [ ] `[Grant Entitlement Now]` quick action grants correctly and marks order resolved
- [ ] `POST /api/admin/players/:id/entitlements/grant` idempotent (safe to double-call)
- [ ] Grant pushes notification to online player: inventory cap updates immediately
- [ ] Grant to offline player: applied to save data, shown on next login
- [ ] Revoke: removes entitlement, strips active cosmetic from online player in real-time
- [ ] Manual grant from store page (without linked order) works correctly
- [ ] All grant/revoke actions logged with reason field in audit log
- [ ] Revenue stats endpoint returns correct totals for each time period
- [ ] `[View All Orders]` CSV export generates correctly with all order fields

---

### Admin Audit Log

Every admin action that mutates any game state is recorded. Audit entries are **write-only** —
no admin (including superadmin) can delete or modify audit log entries through the UI or API.

```ts
interface AuditEntry {
  adminId: string;
  adminName: string;
  action: AdminAction;
  targetType: 'player' | 'city' | 'server';
  targetId: string;
  payload: {
    before?: Record<string, unknown>;   // state before the change
    after?: Record<string, unknown>;    // state after the change
    description: string;                // human-readable summary
  };
  ipAddress: string;
  performedAt: string;                  // ISO timestamp
}

type AdminAction =
  | 'MODIFY_STATS'
  | 'MODIFY_GOLD'
  | 'GIVE_ITEM'
  | 'REMOVE_ITEM'
  | 'BAN_PLAYER'
  | 'UNBAN_PLAYER'
  | 'DELETE_PLAYER'
  | 'TOGGLE_PVP_GLOBAL'
  | 'TOGGLE_PVP_CITY'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT';
```

Example audit payload for `MODIFY_STATS`:
```json
{
  "before": { "level": 25, "strength": 50, "gold": 1200 },
  "after":  { "level": 30, "strength": 60, "gold": 1200 },
  "description": "Admin admin1 modified stats for player Borek: level 25→30, strength 50→60"
}
```

---

### Admin Testing Checklist

- [ ] Admin login returns JWT, wrong password returns 401
- [ ] All `/api/admin/*` routes reject requests without valid JWT (403)
- [ ] Token expiry (8h) rejects stale tokens, prompts re-login
- [ ] `MODIFY_STATS` — online player receives updated stats in real time via push event
- [ ] `MODIFY_GOLD` — add/remove/set all work; remove floors at 0 (no negative gold)
- [ ] `GIVE_ITEM` — validates item exists, validates inventory space, pushes to live session
- [ ] `GIVE_ITEM` — quantity respects item's `maxStack` limit
- [ ] `REMOVE_ITEM` — partial quantity removal for stackables works correctly
- [ ] `REMOVE_ITEM` — equipped item removal is blocked with clear error
- [ ] `BAN_PLAYER` — online player immediately disconnected with ban message
- [ ] `BAN_PLAYER` — banned player cannot reconnect (checked on WebSocket handshake)
- [ ] `UNBAN_PLAYER` — player can reconnect after unban
- [ ] `DELETE_PLAYER` — requires superadmin role; blocked if player is online
- [ ] `TOGGLE_PVP_GLOBAL enable` — all online players receive broadcast
- [ ] `TOGGLE_PVP_GLOBAL disable` — all active PvP combats terminated, players notified
- [ ] `TOGGLE_PVP_CITY` — only players in that city receive broadcast
- [ ] PvP attack blocked outside PvP zones (correct error message)
- [ ] PvP attack blocked against party members
- [ ] Every mutating action writes to `admin_audit_log` with before/after payload
- [ ] Audit log export generates valid CSV with correct date filtering
- [ ] Rate limiter blocks >100 requests/15min from same IP with 429 response

---

## Inventory Manager

### Equipment Slots

Each player has **6 equipment slots**. Equipping an item replaces whatever was previously
in that slot (old item returns to inventory if space available, otherwise blocked).

```ts
interface EquippedGear {
  weapon:    WeaponItem    | null;  // Sword, Axe, Dagger, Staff, etc.
  armor:     ArmorItem     | null;  // Light, Medium, Heavy, Robe, Cloak
  shield:    ShieldItem    | null;  // Only equippable with one-handed weapons
  ring:      AccessoryItem | null;  // +1 ring slot (only one ring at a time)
  amulet:    AccessoryItem | null;  // +1 amulet slot (separate from ring)
  boots:     AccessoryItem | null;  // Boots, Belt, Gloves share this slot
}
```

Rules:
- Two-handed weapons (Greatsword, Scythe, Staff, Spear, Bow) **block the shield slot**.
- Ring and Amulet are **separate slots** — both can be worn simultaneously.
- Boots/Belt/Gloves share one slot — only the last equipped of these three is active.
- A Helmet/Crown uses no slot — it is a cosmetic overlay (no stat effect, display only).
- An equipped item cannot be sold, dropped, or traded until unequipped first.

### Inventory Operations

```ts
class InventoryManager {
  // View
  getInventory(playerId: string): InventorySlot[];
  getPage(playerId: string, page: number, pageSize = 20): InventorySlot[];
  findItem(playerId: string, nameOrSlot: string | number): InventorySlot | null;

  // Modify
  addItem(playerId: string, itemId: string, qty: number): AddResult;
    // Returns: { success, slot, overflow }
    // overflow = items that couldn't fit (inventory full)

  removeItem(playerId: string, itemId: string, qty: number): boolean;
  equipItem(playerId: string, slotRef: string | number): EquipResult;
  unequipItem(playerId: string, gearSlot: keyof EquippedGear): boolean;
  useItem(playerId: string, slotRef: string | number): UseResult;
  dropItem(playerId: string, slotRef: string | number, qty: number): boolean;

  // Queries
  hasItem(playerId: string, itemId: string, qty?: number): boolean;
  freeSlots(playerId: string): number;    // 100 − slots.length
  isFull(playerId: string): boolean;

  // Stack management
  stackItem(slot: InventorySlot, qty: number): InventorySlot;
  splitStack(playerId: string, slotRef: string | number, qty: number): boolean;
}
```

### Stack Trade Behaviour

When trading a stackable item, the seller specifies the quantity:

```
trade offer Kael "Dragon Scale" 3 2000
  → Offer: 3x Dragon Scale for 2000g total
  → Server splits the stack at moment of transfer:
      seller.inventory: Dragon Scale ×7 → Dragon Scale ×4  (3 transferred)
      buyer.inventory:  gains Dragon Scale ×3 (new slot or merges with existing)
```

Partial-stack trades are fully supported. The full stack is never locked — only the
transferred quantity is held in the trade offer snapshot.

---

## Crafting Manager

### Crafting Flow

```
1. Player opens crafting table at a Blacksmith in any city
2. Server responds with available recipes (blueprints player owns + has materials for):

   CRAFTING TABLE — Irongate Blacksmith
   ══════════════════════════════════════════════════
   [1] Iron Sword (Common)          ✓ Can craft
       Materials: Iron Ore ×2, Leather Strap ×1
   [2] Steel Longsword (Rare)       ✗ Missing: Mana Crystal ×1
       Materials: Steel Ingot ×5, Mana Crystal ×2, Wolf Fang ×1
   [3] Forge Hammer (Epic)          ✗ Missing: Golem Core Fragment ×1
       Materials: Iron Ingot ×10, Coal ×5, Golem Core Fragment ×1
   ══════════════════════════════════════════════════
   Type 'craft <n>' to craft that item.

3. Player types: craft 1
4. Server:
   a. Verifies blueprint is in player's recipe list (or is ungated common recipe)
   b. Verifies all materials are present in inventory (atomic check)
   c. Removes all required materials from inventory
   d. Adds crafted weapon to inventory (if space available)
   e. Sends sync_inventory push event to update Tab autocomplete
   f. Displays result:

      You craft an Iron Sword!
      ┌─────────────────────────────┐
      │  Iron Sword   [Common]      │
      │  Damage: 18  Accuracy: +5  │
      │  Bonus: +2 Strength         │
      └─────────────────────────────┘
      Materials consumed: Iron Ore ×2, Leather Strap ×1
```

### Grade-Unlock Requirements

Higher-grade weapons require a Blacksmith at a minimum city tier:

```
Common / Uncommon   → Any city blacksmith
Rare                → Irongate or higher (City 2+)
Epic                → Crystalmere or higher (City 5+)
Legendary           → Cinderpeak or higher (City 11+)
Mythic              → Abyss's Edge only (City 16)
```

### Blueprint Ownership

Blueprints sit in the player's inventory as permanent items. They are consumed by the recipe
data lookup, not destroyed on crafting. A blueprint enables all future crafts of that item:

```ts
interface Blueprint {
  itemId: string;           // e.g. "blueprint_steel_longsword"
  type: 'recipe';
  unlocksItemId: string;    // the item this blueprint enables
  grade: ItemGrade;
  tradeLock: false;         // blueprints CAN be traded between players
}
```

---

## Alchemy Manager

### Brew Flow

```
1. Player approaches Alchemist Table in any city
2. Server responds with known recipes filtered by available ingredients:

   ALCHEMIST TABLE — Crystalmere
   ══════════════════════════════════════════════════
   [1] Health Potion I      ✓ Can brew (×12 batches)
       Ingredients: Red Herb ×2, Flask ×1  → yields 1 potion
   [2] Health Potion V      ✗ Missing: Spirit Water ×1
       Ingredients: Sylvan Herb ×3, Spirit Water ×2
   [3] Mana Potion III      ✓ Can brew (×3 batches)
       Ingredients: Blue Herb ×3, Ether ×1
   ══════════════════════════════════════════════════
   Type 'brew <n>' or 'brew <n> <qty>' to craft in bulk.

3. Player types: brew 1 5  (brew 5 Health Potion I)
4. Server:
   a. Checks ingredients for all 5 batches (Red Herb ×10, Flask ×5)
   b. Removes ingredients in one atomic operation
   c. Adds Health Potion I ×5 to inventory (stacks if slot exists)
   d. Sends sync_inventory, displays:

      You brew 5x Health Potion I.
      Red Herb −10  |  Flask −5
      Health Potion I: 5 added (total in bag: 17)
```

### Potion Recipes — All Potency Levels

```
Health Potion I   (+50 HP):   Red Herb ×2        + Flask ×1
Health Potion II  (+100 HP):  Red Herb ×3        + Flask ×1 + Binding Agent ×1
Health Potion III (+180 HP):  Moon Blossom ×2    + Flask ×1
Health Potion IV  (+260 HP):  Moon Blossom ×3    + Herb Extract ×1
Health Potion V   (+350 HP):  Sylvan Herb ×3     + Spirit Water ×2
Health Potion VI  (+460 HP):  Sylvan Herb ×4     + Spirit Water ×2 + Crystal Dust ×1
Health Potion VII (+580 HP):  Phoenix Bloom ×2   + Ether ×2
Health Potion VIII(+700 HP):  Phoenix Bloom ×4   + Ether ×3 + Crystal Dust ×1
Health Potion IX  (+900 HP):  Dragon Tear ×2     + Holy Water ×2
Health Potion X   (+1200 HP): Dragon Tear ×5     + Holy Water ×3 + Void Essence ×2

Mana Potion I   (+30 MP):  Blue Herb ×2    + Flask ×1
Mana Potion II  (+60 MP):  Blue Herb ×3    + Flask ×1 + Ether Dust ×1
Mana Potion III (+100 MP): Starweed ×2     + Flask ×1
Mana Potion IV  (+150 MP): Starweed ×3     + Ether ×1
Mana Potion V   (+200 MP): Arcane Bloom ×2 + Ether ×2
Mana Potion VI  (+270 MP): Arcane Bloom ×3 + Ether ×2 + Mana Crystal ×1
Mana Potion VII (+360 MP): Void Herb ×2    + Spirit Water ×2
Mana Potion VIII(+460 MP): Void Herb ×4    + Spirit Water ×3
Mana Potion IX  (+600 MP): Star Essence ×2 + Holy Water ×2
Mana Potion X   (+800 MP): Arcane Bloom ×5 + Void Dust ×3

Elixir of Clarity (full HP+MP restore): Phoenix Tear ×3 + Dragon Blood ×2 + Holy Water ×2
Antidote (clears Poison+Burn):          Herb Extract ×2 + River Pearl ×1
```

---

## Inn Rest Flow

```
1. Player types: inn

2. Server checks: is player in a city area?
   → No: "There is no inn here. Find a city to rest."
   → Yes: proceed

3. Server checks: is player in combat or active trade?
   → Yes: "You can't rest right now."
   → Yes (combat): "You are still in combat!"

4. Server shows inn menu:

   ══════════════════════════════════
    The Drowsy Dragon Inn — Irongate
   ══════════════════════════════════
    A room for the night costs 25g.
    Current gold: 1,840g

    [1] Rent a room (25g)
        Full HP + Mana restore
        Clears all status effects
        Auto-saves your game
    [2] Just sit by the fire
        Slow regen (same as city regen)
        Free, no save
    [3] Leave
   ══════════════════════════════════

5a. Player picks [1] — Rent a room:
    → Check gold >= 25
    → Deduct 25g from player.gold
    → Set hp = maxHp, mana = maxMana
    → Clear all active status effects
    → Set regenState = 'city' (not inn — restore is instant, not a state)
    → Trigger auto-save (SaveManager.save)
    → Push sync_inventory (gold changed)
    → Display:

       You pay 25g and sink into a warm bed.
       Morning comes quietly.
       HP: 520/520 ✓  MP: 300/300 ✓  All ailments cleared.
       [Game saved]

5b. Player picks [2] — Sit by fire:
    → regenState stays 'city' (1% per tick, same as being in city)
    → No save, no cost
    → Display:
       You pull up a stool near the fireplace. The warmth is welcome.
```

---

## Dungeon Floor Progression

### Floor-by-Floor Flow

```
ENTERING A DUNGEON
──────────────────
1. Player arrives at dungeon entrance area (e.g. goblin_warren_entrance)
2. Player types: enter dungeon
3. Server checks:
   → Not in combat? ✓
   → Not in active trade? ✓
   → Level meets dungeon minLevel? (warning shown if under-levelled, not blocked)
   → Party size vs. scalingByPartySize? (spawn config adjusted)
4. Player (and party, if applicable) enters Floor 1.
5. Server sends floor description + encounter chance info:

   ┌─────────────────────────────────────────────┐
   │  GOBLIN WARREN — Floor 1: Upper Tunnels     │
   │  Recommended Level: 1–6                     │
   │  Darkness presses in from all sides.        │
   │  The stench of goblin is overwhelming.      │
   └─────────────────────────────────────────────┘
   Exits: [deeper ↓]  Safe room: None  Chest: Present

EXPLORING A FLOOR
─────────────────
- Each 'go' action in the dungeon rolls the spawn encounter check
- A floor has a fixed number of move tiles (3–7 depending on floor size)
- Once all tiles are traversed, 'next floor' becomes available
- Treasure chest appears on one random tile per floor (not always reachable first pass)
- Safe rooms (marked safeRoom: true on certain floors) have no encounters,
  allow rest, and show on the floor map

TREASURE CHEST
──────────────
Player types: loot
Server checks: is there a chest on this tile and it hasn't been opened?
  → Yes: rolls loot from floor's chestLootPoolId, adds to inventory (or pendingLoot)
       "You pry open the chest. Inside: Health Potion III ×2, Iron Ore ×4"
  → Already opened: "The chest is empty."
  → No chest here: "There is nothing to loot here."

BOSS ROOM (FINAL FLOOR)
───────────────────────
Final floor of every dungeon has no random encounters — only the boss.
Player types: next floor on the penultimate floor → enters boss room:

   ┌─────────────────────────────────────────────┐
   │  GOBLIN WARREN — Floor 3: Warlord's Chamber │
   │                                             │
   │  A massive throne of bones looms ahead.     │
   │  The Goblin Warlord rises, grinning.        │
   └─────────────────────────────────────────────┘
   The Goblin Warlord blocks your path!
   [Combat begins automatically]

RETREATING
──────────
Player types: retreat
  → If in combat: must flee combat first, then retreat
  → If not in combat: player exits dungeon, placed at dungeon entrance area
  → Floor progress is LOST (must start from floor 1 next time)
  → Party members who are still inside are NOT pulled out — each player retreats
    individually
  → Exception: if all party members retreat, dungeon instance closes

DUNGEON COMPLETION
──────────────────
After killing the boss on the final floor:
  → Boss drop table rolled (per player)
  → Server records boss defeat in defeated_bosses table
  → First-time kill banner shown:
       ✦ DUNGEON CLEAR — GOBLIN WARREN ✦
       First clear bonus: +200 EXP, +100g
  → Player can still explore remaining floors for loot before leaving
  → Defeated boss does NOT respawn in the same session
    (respawns on next dungeon entry)
```

### Dungeon Difficulty Scaling (Floor Depth)

```
Per floor beyond floor 1:
  Enemy stats:      +12% HP, +8% ATK, +5% DEF per floor
  Encounter chance: +5% per floor (from base, capped at 70%)
  Exp per kill:     +10% per floor
  Gold per kill:    +8% per floor
  Loot rarity:      +1% weight shift toward Uncommon+ per floor
  Elite chance:     +3% per floor (max +15% total bonus)
```

---

## Fast Travel System

Fast travel is available only from within a **city area**. It cannot be used during combat,
active trade, or while in a dungeon.

```
travel <city_name>
  → Server checks:
      1. Player is in a safeZone: true area within a city (cityId != null)
      2. Player is not in combat (no active CombatSession)
      3. Player is not in an active TradeSession
      4. Target city is in player.worldState.unlockedCities
  → If all pass: instantly move player to target city's main square
  → Broadcast to origin area: "[Nearby] Kael has left for Crystalmere City."
  → Broadcast to destination area: "[Nearby] Kael has arrived from Irongate Town."
  → sync_area push sent to Kael (new area's players + NPCs)
  → If player is in a party but party members are in different areas: party is not moved —
    only the individual player fast-travels. Party chat notification:
      [Party] Ryuna has fast-travelled to Crystalmere City.
```

---

## Regen Engine — State Machine

### 5 States & Transitions

```
States: COMBAT | EXPLORING | SAFE_REST | CITY | INN_RESTORE

                    enter combat
  EXPLORING ─────────────────────> COMBAT
     ↑  ↑                              │
     │  └─────── combat ends ──────────┘
     │
     │  player types 'rest' in safe zone
     └──────────────────────────────> SAFE_REST
              non-safe area or move              │
  SAFE_REST <──────────────────────────────────┘
     │  enter city area
     └──────────────────────────────> CITY
  CITY ──────────── pay inn ──────> INN_RESTORE
                                        │
  INN_RESTORE ←── (fires once, ─────┘
                  immediately transitions to CITY)

Tick behaviour per state:
  COMBAT:       regen = 0, tick is paused entirely
  EXPLORING:    hp += 0.5% maxHp, mp += 0.5% maxMana  (per 5s tick)
  SAFE_REST:    hp += 2.0% maxHp, mp += 2.0% maxMana  (per 5s tick)
  CITY:         hp += 1.0% maxHp, mp += 1.0% maxMana  (per 5s tick)
  INN_RESTORE:  hp = maxHp, mp = maxMana (fires instantly, transitions to CITY)

Caps: hp and mana cannot exceed maxHp / maxMana respectively.
Tick skips: if player is at full HP and mana, tick is a no-op (no push to client).
Push on tick: only push HP/mana update to client if values actually changed.
```

### Regen Implementation

```ts
// RegenEngine.ts
class RegenEngine {
  private ticks: Map<string, NodeJS.Timeout> = new Map();

  start(session: GameSession): void {
    const tick = setInterval(() => this.applyRegen(session), 5000);
    this.ticks.set(session.playerId, tick);
  }

  stop(session: GameSession): void {
    clearInterval(this.ticks.get(session.playerId));
    this.ticks.delete(session.playerId);
  }

  pause(session: GameSession): void {
    // Called when combat starts — clear tick without resetting state
    this.stop(session);
  }

  resume(session: GameSession): void {
    // Called when combat ends — re-start tick, retain current state
    this.start(session);
  }

  private applyRegen(session: GameSession): void {
    const state = session.currentState.regenState;
    const stats = session.currentState.stats;

    if (state === 'combat') return;

    const rates = { exploring: 0.005, safe_rest: 0.02, city: 0.01, inn: 1.0 };
    const rate   = rates[state] ?? 0;

    const prevHp   = stats.hp;
    const prevMana = stats.mana;

    stats.hp   = Math.min(stats.maxHp,   stats.hp   + Math.floor(stats.maxHp   * rate));
    stats.mana = Math.min(stats.maxMana, stats.mana + Math.floor(stats.maxMana * rate));

    // Inn restore: fire once then transition to city
    if (state === 'inn') {
      session.currentState.regenState = 'city';
    }

    // Only push to client if something changed
    if (stats.hp !== prevHp || stats.mana !== prevMana) {
      SessionManager.pushToPlayer(session.playerId, {
        type: 'regen_tick',
        hp: stats.hp, maxHp: stats.maxHp,
        mana: stats.mana, maxMana: stats.maxMana,
      });
    }
  }
}
```

---

## Status Effect Interactions

### Stacking Rules

```
STACKABLE effects (multiple instances can run simultaneously):
  Bleed      — up to ×3 stacks (each stack is a separate 3%/turn timer)
  Regen      — up to ×2 stacks (e.g. potion + skill can overlap)
  Shield     — only the highest-value shield is active (no stacking)

NON-STACKABLE effects (refreshes duration if applied again):
  Poison, Burn, Stun, Freeze, Weaken, Curse, Silence

SIMULTANEOUS effects (can all be active at once on same target):
  A target can have Poison + Burn + Bleed + Silence + Freeze all at the same time.
  Order of tick application each turn end:
    1. Burn   (highest damage first)
    2. Poison
    3. Bleed  (each stack separately)
    4. Regen  (applied after damage to prevent over-healing)
    5. Decrement all durations, remove expired effects

INTERACTIONS:
  Stun + Freeze  → Both active: target skips turn AND has −50% agility (both apply)
  Freeze + Flee  → Frozen player cannot flee (blocks flee entirely)
  Silence + Stun → Both active: target cannot act and cannot use skills
  Curse + Weaken → Both active: −30% all stats (Curse) AND −25% attack (Weaken) stack
  Shield + Burn  → Burn damage hits the shield first; overflow damages HP
  Regen + Poison → Both tick each turn; net effect can be positive or negative depending
                   on magnitudes. No cancellation — they tick independently.
```

### Cleanse Priority

When `Cleanse` skill or `Antidote` consumable is used:

```
Antidote:  Removes Poison and Burn only.
Cleanse:   Removes ALL negative effects: Poison, Burn, Bleed (all stacks),
           Weaken, Curse, Silence, Freeze.
           Does NOT remove Stun (stun is instantaneous — it already fired).
Inn rest:  Removes ALL negative effects (same as Cleanse).
Respawn:   Removes ALL negative effects.
```

---

## Elite Enemy System

When `eliteChance` rolls true for a spawn, one enemy in the encounter group is promoted to
**Elite** status. Elites have enhanced stats and a better loot table.

```ts
interface EliteModifier {
  hpMult:      1.5,    // 1.5× base HP
  attackMult:  1.3,    // 1.3× base attack
  defenseMult: 1.2,    // 1.2× base defense
  expMult:     2.0,    // 2× EXP on kill
  goldMult:    2.0,    // 2× gold drop
  dropBonus:   +1,     // +1 guaranteed extra item roll from enemy's drop table
  luckShift:   +10,    // treated as if each player has +10 luck for this kill's loot
}
```

Elite enemies are visually flagged in combat output:
```
[Combat] A ★ Goblin Scout (Elite) appears alongside 2 Goblin Archers!
```

Elites do NOT have boss-exclusive drop tables. They use the same drop table as the base
enemy, but with the `luckShift` and `dropBonus` applied.

---

## World Boss System

World bosses are announced via the guild board at **Rank A** and higher cities. They spawn
at fixed overworld areas (not inside dungeons) on a server timer and despawn after 30 minutes
if not killed.

```ts
interface WorldBoss {
  id: string;                  // e.g. 'world_boss_storm_titan'
  name: string;
  spawnAreaId: string;         // overworld area — accessible to all players
  spawnIntervalHours: number;  // how often this boss spawns (e.g. every 4 hours)
  despawnMinutes: number;      // 30 minutes from spawn if unkilled
  level: number;
  hp: number;
  partyRequired: boolean;      // if true, encounter only starts if ≥2 players present
  dropTable: DropEntry[];      // world-exclusive drops (not available elsewhere)
  firstKillBonus: DropEntry[]; // extra reward for server-first kill
}
```

### World Boss Announcement

When a world boss spawns, the server broadcasts a **shout-level announcement** to all
online players:

```
[World] ⚠ The Storm Titan has awakened at the Stormspire Cliffs!
        Rank A+ adventurers — this is your moment. 30 minutes remain.
```

When killed:
```
[World] ✦ The Storm Titan has been slain by Kael's party!
        Server-first kill bonus awarded.
```

### World Boss Combat

World boss fights are open-participation — **any number of players** in the area join the
same CombatSession automatically. There is no party limit for world bosses.

```
Party size EXP bonus for world boss: capped at +30% regardless of participant count
Loot: each participant rolls the drop table independently (same as party combat)
First-kill bonus: only the player who lands the killing blow receives it
```

---

## Passive Perk System

Every 10 levels, the player unlocks one **Passive Perk Slot** and can choose a perk from
the available pool for their level range. Perks are permanent and cannot be changed once set
(choose carefully).

### Perk Tiers

```
TIER 1 perks (unlock at level 10, 20):
  Iron Body         → +5% maxHp permanently
  Swift Feet        → +8 agility permanently
  Sharp Eye         → +5% accuracy permanently
  Fortune's Favor   → +8 luck permanently
  Endurance         → −10% damage taken from status effects (Burn, Poison, Bleed)
  Quick Learner     → +10% EXP from all sources

TIER 2 perks (unlock at level 30, 40):
  Battle Hardened   → +10% maxHp AND +5 defense
  Mana Vessel       → +15% maxMana permanently
  Predator's Instinct → +5% crit rate permanently
  Runic Affinity    → −15% mana cost on all magic skills
  Opportunist       → First-strike damage bonus +20% (first attack in any combat)
  Survivor's Will   → When HP < 20%: +15% damage dealt, +10% flee chance

TIER 3 perks (unlock at level 50, 60):
  Titan's Frame     → +20% maxHp, −5% movement speed (slower agility roll)
  Soul Tap          → 5% lifesteal on all physical attacks
  Arcane Mastery    → +15% magic damage, all elements
  Deadeye           → +10% crit rate AND +20% crit damage
  Shadowstep        → Dodge chance +8% permanently
  Ironwill          → Immune to Stun and Freeze (but still take damage from those skills)

TIER 4 perks (unlock at level 70, 80):
  Juggernaut        → Ignore first instance of damage > 20% maxHp per combat
  Mana Surge        → After using 3 magic skills in combat: next cast is free (0 mana)
  Assassin's Mark   → Critical hits inflict Bleed (1 stack) regardless of weapon type
  Guardian's Oath   → Healing skills on allies restore 20% extra HP
  Dungeon Savant    → +20% EXP in dungeons, +10% loot quality in dungeons
  Gold Sense        → +15% gold from all sources permanently

TIER 5 perks (unlock at level 90, 100):
  Legend's Resolve  → Cannot be Downed (instant respawn at 1 HP instead of Downed state)
  Void Touch        → All attacks have 10% chance to inflict Curse
  Time Distortion   → Turn timer extended to 20s (from 15s) for this player only
  Eternal Mana      → Mana regenerates 1% per combat turn (even during combat)
  World's End       → +10% all damage, stacks with everything
  Master Craftsman  → All crafted items gain +1 grade tier (Common→Uncommon, etc.)
```

### Perk Selection Flow

```
[Level Up!] You reached level 10!
            A new Passive Perk Slot is available.

            Choose your perk (permanent, cannot be changed):
            ──────────────────────────────────────────────
            [1] Iron Body         +5% maxHp permanently
            [2] Swift Feet        +8 agility permanently
            [3] Sharp Eye         +5% accuracy permanently
            [4] Fortune's Favor   +8 luck permanently
            [5] Endurance         −10% status effect damage taken
            [6] Quick Learner     +10% EXP from all sources
            ──────────────────────────────────────────────
            Type 'perk <n>' to select. Or 'perk later' to decide later
            (you can choose anytime with the 'perks' command).
```

---

## Skill Scroll Tiers

Scrolls have a **tier (I–III)** that determines the base level of the skill when first learned.

```
Tier I Scroll  → Skill starts at Level 1
Tier II Scroll → Skill starts at Level 4 (skips early grind)
Tier III Scroll → Skill starts at Level 7 (near mastery — very rare)

Scroll tiers and approximate costs:
  Physical Skill Scroll I:    100–500g    (common merchants)
  Physical Skill Scroll II:   1,000–3,000g (rare merchants, quest rewards)
  Physical Skill Scroll III:  8,000–20,000g (endgame merchants, rare boss drop)

  Magic Skill Scroll I:       500–1,500g  (magic merchants)
  Magic Skill Scroll II:      3,000–8,000g (city-exclusive, boss drops)
  Magic Skill Scroll III:     15,000–40,000g (endgame only, very rare)

  Support Skill Scroll I:     300–800g    (specific city merchants)
  Support Skill Scroll II:    2,000–6,000g (quest rewards, boss drops)
  Support Skill Scroll III:   10,000–25,000g (endgame merchants)
```

A player who already knows a skill and uses a higher-tier scroll of the same skill receives
an **instant level bump** to the scroll's starting level (if current level is lower).
If current level is already at or above the scroll's starting level, the scroll is consumed
but has no effect — a warning is shown before confirmation:

```
> use Whirlwind Scroll II
! You already know Whirlwind Slash at Level 6.
  This scroll starts at Level 4 — using it will have no effect.
  Are you sure? (yes / no)
```

---

## Server-Side Rate Limiting (Game Commands)

To prevent spam and abuse, each player session has per-command rate limits:

```ts
interface RateLimits {
  // Per player, per command type, per time window
  chat_say:     { max: 10, windowMs: 5000  },   // 10 msgs / 5s
  chat_shout:   { max: 1,  windowMs: 60000 },   // 1 shout / 60s (already enforced)
  combat_action:{ max: 1,  windowMs: 500   },   // 1 action / 0.5s (prevent double-fire)
  trade_offer:  { max: 3,  windowMs: 10000 },   // 3 offers / 10s (prevent offer spam)
  general:      { max: 20, windowMs: 3000  },   // 20 commands / 3s (general spam guard)
}
```

When a rate limit is hit, the server silently drops the command and responds:
```
[Rate limit] Slow down! You're sending commands too quickly.
```

This is checked **before** any game logic runs, in the WebSocket message handler.

---

## Python Client Alternative

For players who prefer Python over Node.js, a full Python CLI client is supported.
It implements identical behaviour to the Node.js version.

```
client-python/
├── main.py             ← entry point: connect, auth, input loop
├── socket_client.py    ← WebSocket client (websockets lib)
├── input_handler.py    ← raw terminal input, Tab completion, history
├── autocomplete.py     ← Tab completion engine (mirrors TS version)
├── completion_data.py  ← dynamic completion data store
├── output.py           ← ANSI color output, formatted rendering
├── push_handler.py     ← server push event dispatcher
└── config.py           ← server URL, token path (~/.adventuregame/)
```

### Python Raw Input

```python
# input_handler.py — raw terminal with Tab support
import sys, tty, termios, os

def get_char():
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        # Handle escape sequences (arrow keys)
        if ch == '\x1b':
            ch += sys.stdin.read(2)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
    return ch

class InputHandler:
    def __init__(self, autocomplete, socket_client):
        self.buffer    = ''
        self.cursor    = 0
        self.history   = []
        self.hist_idx  = -1
        self.tab_matches  = []
        self.tab_idx      = -1
        self.last_was_tab = False
        self.ac = autocomplete
        self.ws = socket_client

    def run(self):
        while True:
            ch = get_char()
            if ch == '\x03':           # Ctrl+C
                print('\nGoodbye!'); sys.exit(0)
            elif ch in ('\r', '\n'):   # Enter
                self._submit()
            elif ch == '\x7f':         # Backspace
                self._backspace()
            elif ch == '\t':           # Tab
                self._handle_tab()
            elif ch == '\x1b[A':       # Up arrow
                self._history_up()
            elif ch == '\x1b[B':       # Down arrow
                self._history_down()
            elif ch == '\x1b[C':       # Right arrow
                if self.cursor < len(self.buffer):
                    self.cursor += 1; self._redraw()
            elif ch == '\x1b[D':       # Left arrow
                if self.cursor > 0:
                    self.cursor -= 1; self._redraw()
            elif ch.isprintable():
                self.buffer = self.buffer[:self.cursor] + ch + self.buffer[self.cursor:]
                self.cursor += 1
                self._redraw()
                self.last_was_tab = False
                self.tab_matches  = []

    def _submit(self):
        print()
        cmd = self.buffer.strip()
        self.buffer = ''; self.cursor = 0
        self.tab_matches = []; self.tab_idx = -1; self.last_was_tab = False
        if cmd:
            self.history.append(cmd)
            self.hist_idx = len(self.history)
            is_chat = any(cmd.startswith(p) for p in ('say ','msg ','p ','shout '))
            self.ws.send({'type': 'chat' if is_chat else 'command', 'payload': cmd})
        self._print_prompt()

    def _redraw(self):
        sys.stdout.write(f'\r\x1b[K> {self.buffer}')
        if len(self.buffer) - self.cursor > 0:
            sys.stdout.write(f'\x1b[{len(self.buffer) - self.cursor}D')
        sys.stdout.flush()

    def _print_prompt(self):
        sys.stdout.write('> '); sys.stdout.flush()
```

### Python Dependencies

```
# requirements.txt
websockets>=12.0
```

No other third-party libraries needed. The Python client is fully self-contained.

---

## StoryEngine — Anthropic API Integration

When `config.story.useAnthropicApi` is `true`, the StoryEngine calls the Anthropic API
to generate a unique short story for each quest instance instead of using static templates.

### How It Works

```ts
// StoryEngine.ts
class StoryEngine {
  async getQuestStory(quest: Quest, player: PlayerStats): Promise<string[]> {
    if (!config.story.useAnthropicApi) {
      // Static mode: return from stories.json
      return this.staticStories.get(quest.storyIntroId) ?? this.fallback(quest);
    }

    // Dynamic mode: call Anthropic API
    return await this.generateDynamic(quest, player);
  }

  private async generateDynamic(quest: Quest, player: PlayerStats): Promise<string[]> {
    const prompt = this.buildPrompt(quest, player);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.story.anthropicModel,
        max_tokens: 300,
        system: `You are a narrator for a dark fantasy CLI RPG game.
Write a short quest introduction: 4–6 sentences, atmospheric and immersive.
Present it as lines of narration, not as a list. No headers. No meta-commentary.
Output only the story lines, one sentence per line.`,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    const data   = await response.json();
    const text   = data.content[0].text as string;
    return text.split('\n').filter(l => l.trim().length > 0).slice(0, 6);
  }

  private buildPrompt(quest: Quest, player: PlayerStats): string {
    return `Quest: "${quest.title}"
Type: ${quest.type}
Objective: ${quest.description}
Player name: ${player.name}, Level ${player.level}
Location: ${quest.cityId}
Tone: grim, urgent, morally weighted.
Write the quest introduction.`;
  }
}
```

### Fallback Behaviour

If the Anthropic API call fails (timeout, rate limit, network error), the engine falls back
to the static `stories.json` template for that quest. The player never sees an error — they
simply get the static story instead of a generated one. Failures are logged server-side.

```ts
private async generateDynamic(...): Promise<string[]> {
  try {
    // ... API call
  } catch (err) {
    console.error(`[StoryEngine] API failed for quest ${quest.id}:`, err.message);
    return this.fallback(quest);
  }
}
```

---

## Phase 11: Monetization & Steam Integration

All monetization is handled through **Steam's in-game purchase API** (Steam Microtransaction
API / ISteamMicroTxn). The game is published on Steam as a free-to-play title. Players buy
**cosmetic and convenience items** — nothing that affects combat balance or progression.

> **Design principle**: every paid item is either purely cosmetic (visual only) or a
> convenience upgrade (more inventory space) that does not give competitive advantage.
> No pay-to-win. No stat boosts. No XP multipliers. No exclusive gameplay content.

---

### Steam Integration Architecture

```
┌────────────────────────────────────────────────────────────┐
│  GAME SERVER                                               │
│  ┌────────────────┐   ┌──────────────┐  ┌──────────────┐  │
│  │ StoreManager   │   │ Entitlement  │  │ Cosmetic     │  │
│  │ (Steam API)    │   │ Manager      │  │ Renderer     │  │
│  └────────────────┘   └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────────┘
          ▲                                       ▲
          │  ISteamMicroTxn API (server-to-server)│
          ▼                                       │
  ┌───────────────────┐              ┌────────────┴───────┐
  │  Steam Backend     │              │  Game Client (CLI) │
  │  (payment, wallet) │              │  + Steam Overlay   │
  └───────────────────┘              └────────────────────┘
```

**Key components:**
- **StoreManager** — calls Steam's `InitTxn` and `FinalizeTxn` server-side; never touches
  payment info directly
- **EntitlementManager** — tracks what each Steam account owns; grants items on purchase
- **CosmeticRenderer** — applies owned cosmetics to player output (ANSI codes, prefixes,
  theme packs) when building server response strings

**Steam SDK requirement**: The client must be launched through Steam (Steam overlay active).
The server receives the player's **SteamID64** on connection, used for all purchase calls.

---

### Products Available for Purchase

All products are **one-time purchases** (no subscriptions, no loot boxes).

#### 1. Colored Username Pack

Changes the color of the player's name as it appears in chat, nearby listings,
combat logs, and party info.

| Pack Name          | Color                  | Price (USD) |
|--------------------|------------------------|-------------|
| Crimson Name        | 🔴 Bright Red          | $1.99       |
| Ocean Name          | 🔵 Bright Cyan          | $1.99       |
| Golden Name         | 🟡 Bright Yellow        | $1.99       |
| Shadow Name         | 🟣 Magenta/Purple       | $1.99       |
| Emerald Name        | 🟢 Bright Green         | $1.99       |
| Void Name           | Dark red + italic       | $2.99       |
| Rainbow Name        | Cycles colors per char  | $3.99       |
| **Name Color Bundle** | All 7 packs          | $9.99       |

**What it looks like:**

```
Without:  Kael: hey
With Gold: [Kael]: hey          ← "Kael" rendered in \x1b[1;33m (bold yellow)

Nearby listing:
  Kael      Lv 28  [Warrior]  [Exploring]       ← name in gold
  Ryuna     Lv 31  [Ranger]   [In Combat]        ← name in default white

Combat log (with Rainbow):
  [Combat] K̈a̋e̊l̈ used Fire Bolt → 312 damage!  ← each char cycles ANSI color
```

---

#### 2. Chat Effect Packs

Adds a visual effect **prefix, suffix, or surrounding decoration** to all chat messages.

| Pack Name          | Effect Preview                                         | Price |
|--------------------|--------------------------------------------------------|-------|
| Fire Chat           | `🔥 Kael: message 🔥`                                | $1.99 |
| Thunder Chat        | `⚡ Kael: message ⚡`                                | $1.99 |
| Ice Chat            | `❄ Kael: message ❄`                                  | $1.99 |
| Shadow Chat         | `『Kael』: message`                                   | $1.99 |
| Royal Chat          | `〔Kael〕: message`                                   | $1.99 |
| Void Chat           | `▓▓ Kael ▓▓: message`                                | $2.99 |
| Legendary Chat      | `✦ Kael ✦: message` (name in gold)                   | $2.99 |
| **Chat Bundle**     | All 7 packs                                            | $9.99 |

Chat effects apply to **area**, **party**, **shout**, and **whisper** channels.
They do **not** appear in combat logs (only in social chat).

**Server-side rendering:**

```ts
// CosmeticRenderer.ts
formatChatMessage(sender: GameSession, channel: string, text: string): string {
  const effect = sender.cosmetics.chatEffect;
  const name   = formatUsername(sender);   // applies username color if owned

  if (!effect) return `[${channel}] ${name}: ${text}`;

  const templates: Record<string, string> = {
    'fire':      `🔥 ${name}: ${text} 🔥`,
    'thunder':   `⚡ ${name}: ${text} ⚡`,
    'ice':       `❄ ${name}: ${text} ❄`,
    'shadow':    `『${name}』: ${text}`,
    'royal':     `〔${name}〕: ${text}`,
    'void':      `▓▓ ${name} ▓▓: ${text}`,
    'legendary': `✦ \x1b[1;33m${name}\x1b[0m ✦: ${text}`,
  };
  return `[${channel}] ${templates[effect] ?? `${name}: ${text}`}`;
}
```

---

#### 3. Combat Text Effect Packs

Adds ANSI styling to **damage numbers and action text** in the combat log.
Only the purchasing player's actions are styled — opponents see normal text.

| Pack Name          | Effect                                                   | Price |
|--------------------|----------------------------------------------------------|-------|
| Blazing Strike      | Damage numbers in bold orange: `→ 312 damage! 🔥`       | $1.99 |
| Frostbite Strike    | Numbers in bold cyan with ❄: `→ 312 damage! ❄`         | $1.99 |
| Thunder Strike      | Numbers in bold yellow with ⚡: `→ 312 damage! ⚡`      | $1.99 |
| Shadow Strike       | Numbers in magenta italic: `→ *312* damage!`            | $1.99 |
| Critical Explosion  | Critical hits get `★ CRITICAL ★ 624 damage!` banner     | $2.99 |
| Legendary Combo     | Full styled action line with color gradient              | $3.99 |
| **Combat Bundle**   | All 6 packs                                              | $9.99 |

**What it looks like in combat:**

```
Without:
  [Combat] Kael uses Fire Bolt → Shadow Fiend takes 312 damage!

With Blazing Strike:
  [Combat] Kael uses Fire Bolt → Shadow Fiend takes \x1b[1;91m312\x1b[0m damage! 🔥

With Critical Explosion (on crit):
  [Combat] Kael uses Whirlwind Slash
           ╔══════════════════════════╗
           ║  ★ CRITICAL HIT ★        ║
           ║  Shadow Fiend: 624 dmg! ║
           ╚══════════════════════════╝
```

---

#### 4. Custom Title Packs

A **title** is a short label displayed before the player's name in all chat, listings,
and combat logs. Titles are purely cosmetic — no stat effect.

| Pack Name             | Titles Included                                  | Price |
|-----------------------|--------------------------------------------------|-------|
| Noble Titles           | [Lord], [Lady], [Sir], [Dame]                   | $1.99 |
| Dark Titles            | [Shadow], [Cursed], [Void-Touched], [Fallen]    | $1.99 |
| Heroic Titles          | [Hero], [Champion], [Legend], [Slayer]          | $1.99 |
| Mystical Titles        | [Arcane], [Oracle], [Seer], [Wanderer]          | $1.99 |
| Legendary Titles       | [Mythborn], [Abyssal], [Eternal], [Undying]     | $2.99 |
| Custom Title           | Choose any 1–12 character title (profanity filter) | $4.99 |
| **Title Bundle**       | All 5 packs (excl. Custom)                      | $7.99 |

**What it looks like:**

```
[Shadow] Kael: hey there        ← area chat
[Combat] [Mythborn] Kael uses Fire Bolt → 312 damage!
Nearby: [Lord] Kael  Lv 28  [Warrior]

Setting a title:
> title set Shadow
  Title set: [Shadow] Kael
  This appears in all chats and listings.

> title clear
  Title cleared. Your name appears without a prefix.
```

Players can only display **one title at a time** but can switch freely between owned titles.

---

#### 5. CLI Theme Packs

A **theme** changes the visual style of the entire game interface — border characters,
color scheme, prompt style, and header decorations. Themes apply globally to all output
the player receives.

| Theme Name           | Description                                             | Price |
|----------------------|---------------------------------------------------------|-------|
| Dark Fantasy          | Deep purple borders, gold text, ◆ decorations          | $2.99 |
| Neon Terminal         | Electric cyan on black, matrix-style `│` borders       | $2.99 |
| Parchment Scroll      | Warm sepia tones, ╔╗ box art, scroll-like aesthetic    | $2.99 |
| Blood & Iron          | Deep red accents, heavy `█` block borders              | $2.99 |
| Celestial             | Soft white/gold, ✦ stars, holy aesthetic               | $2.99 |
| Void Abyss            | Pitch black with dim grey, minimal decorations         | $2.99 |
| **Theme Bundle**      | All 6 themes                                           | $12.99|

**What themes change (server-side rendering):**

```ts
interface ThemeDefinition {
  id: string;
  name: string;
  // Box drawing characters
  cornerTL: string;   // e.g. '╔' or '┌' or '◈'
  cornerTR: string;
  cornerBL: string;
  cornerBR: string;
  horizontal: string; // e.g. '═' or '─' or '━'
  vertical: string;   // e.g. '║' or '│' or '┃'
  // Colors (ANSI codes)
  borderColor:  string;   // e.g. '\x1b[35m' (purple)
  headerColor:  string;
  bodyColor:    string;
  accentColor:  string;
  promptSymbol: string;   // e.g. '>' or '❯' or '◆'
  // Decorations
  sectionDivider: string; // e.g. '══════' or '──────' or '✦────✦'
  headerPrefix:   string; // e.g. '⚔' or '◈' or '✦'
}
```

**Example — Dark Fantasy theme vs default:**

```
DEFAULT:
  > look
  ┌──────────────────────────────┐
  │ Duskhollow — Shadow Market   │
  └──────────────────────────────┘
  A fog-choked alley...
  Exits: [north] [east]

DARK FANTASY theme:
  ◆ look
  ╔══════════════════════════════╗
  ║ \x1b[35mDuskhollow — Shadow Market\x1b[0m   ║
  ╚══════════════════════════════╝
  A fog-choked alley...
  ✦ Exits: [north] [east]

NEON TERMINAL theme:
  ❯ look
  ┃\x1b[36m DUSKHOLLOW — SHADOW MARKET \x1b[0m┃
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
  A fog-choked alley...
  ↳ Exits: [north] [east]
```

Theme selection:

```
> theme list
  Available themes: [Default ✓] [Dark Fantasy] [Neon Terminal] [Parchment Scroll]
                    [Blood & Iron] [Celestial] [Void Abyss]
  Owned: Default, Dark Fantasy (purchased)

> theme set "Dark Fantasy"
  Theme applied: Dark Fantasy
  (changes take effect immediately)

> theme reset
  Theme reset to Default.
```

---

#### 6. Inventory Expansion

Increases the player's maximum inventory slot cap. This is the **only paid convenience
item** — all others are cosmetic. It does not affect combat stats.

| Product              | Effect                  | Price  |
|----------------------|-------------------------|--------|
| Inventory +50 Slots   | 100 → 150 slots         | $3.99  |
| Inventory +100 Slots  | 100 → 200 slots         | $6.99  |
| Inventory +200 Slots  | 100 → 300 slots         | $11.99 |
| Max Inventory Bundle  | 100 → 300 slots (max)   | $11.99 |

- Slot expansions are **additive** — buying +50 then +100 gives 250 total (not 300)
- Max cap: **300 slots** total regardless of purchases
- Items bought via `inventory +50` and `inventory +100` stack up to the 300 cap
- Existing items are never lost when buying expansion (only the cap increases)

---

#### 7. Bundle Products

| Bundle                | Includes                                      | Price  |
|-----------------------|-----------------------------------------------|--------|
| Starter Cosmetic Pack  | 1 name color + 1 chat effect + 1 title        | $4.99  |
| Warrior's Arsenal      | Combat bundle + Crimson Name + [Champion]     | $11.99 |
| Shadow Rogue Pack      | Shadow Name + Shadow Chat + [Shadow] title + Void Abyss theme | $9.99 |
| Complete Cosmetic Pack | All color packs + all chat + all titles + all themes | $34.99 |

---

### Steam Microtransaction Flow

Steam's `ISteamMicroTxn` API is a **server-to-server** flow. The client never calls
Steam payment APIs directly — the game server initiates and finalizes all transactions.

```
PURCHASE FLOW:
───────────────────────────────────────────────────────────
1. Player opens in-game store: 'store' or 'store list'
2. Player selects item: 'store buy <item_id>'
3. Client sends { type: 'store_purchase_request', itemId, steamId }
4. Server calls Steam ISteamMicroTxn/InitTxn:
     POST https://partner.steam-api.com/ISteamMicroTxn/InitTxn/v3/
     Body: { steamid, appid, orderid, itemcount, currency, items: [{itemid, qty, amount, description}] }
5. Steam responds with { result: 'OK', params: { transid, steamurl } }
6. Server sends steamurl to client:
     { type: 'store_redirect', url: 'https://store.steampowered.com/checkout/...' }
7. Steam Overlay opens the checkout page (in-game, no browser needed)
8. Player completes payment in Steam Overlay
9. Steam calls server webhook: POST /steam/txn-callback
10. Server calls Steam ISteamMicroTxn/FinalizeTxn:
      POST .../FinalizeTxn/v2/ { orderid, appid }
11. Steam confirms: { result: 'OK' }
12. Server calls EntitlementManager.grant(playerId, itemId)
13. Item immediately available. Player sees push notification:
      [Store] ✔ Purchase complete! Dark Fantasy theme unlocked.
      Type 'theme set "Dark Fantasy"' to apply it.
───────────────────────────────────────────────────────────
```

**Order ID**: Generated server-side as `UUID` — unique per transaction. Stored in
`store_orders` table to prevent duplicate grant on webhook retry.

---

### Steam API Config

```json
// config.json additions
"steam": {
  "appId": 0000000,                  // your Steam App ID
  "webApiKey": "YOUR_STEAM_WEB_API_KEY",
  "publisherKey": "YOUR_PUBLISHER_KEY",
  "txnCallbackSecret": "WEBHOOK_SECRET",
  "sandboxMode": true,               // set false for production
  "currency": "USD",
  "items": {
    "name_color_crimson":   { "price": 199,   "label": "Crimson Name Color"    },
    "name_color_ocean":     { "price": 199,   "label": "Ocean Name Color"      },
    "name_color_gold":      { "price": 199,   "label": "Golden Name Color"     },
    "name_color_shadow":    { "price": 199,   "label": "Shadow Name Color"     },
    "name_color_emerald":   { "price": 199,   "label": "Emerald Name Color"    },
    "name_color_void":      { "price": 299,   "label": "Void Name Color"       },
    "name_color_rainbow":   { "price": 399,   "label": "Rainbow Name Color"    },
    "name_color_bundle":    { "price": 999,   "label": "Name Color Bundle"     },
    "chat_fire":            { "price": 199,   "label": "Fire Chat Effect"      },
    "chat_thunder":         { "price": 199,   "label": "Thunder Chat Effect"   },
    "chat_ice":             { "price": 199,   "label": "Ice Chat Effect"       },
    "chat_shadow":          { "price": 199,   "label": "Shadow Chat Effect"    },
    "chat_royal":           { "price": 199,   "label": "Royal Chat Effect"     },
    "chat_void":            { "price": 299,   "label": "Void Chat Effect"      },
    "chat_legendary":       { "price": 299,   "label": "Legendary Chat Effect" },
    "chat_bundle":          { "price": 999,   "label": "Chat Effect Bundle"    },
    "combat_blazing":       { "price": 199,   "label": "Blazing Strike FX"     },
    "combat_frostbite":     { "price": 199,   "label": "Frostbite Strike FX"   },
    "combat_thunder":       { "price": 199,   "label": "Thunder Strike FX"     },
    "combat_shadow":        { "price": 199,   "label": "Shadow Strike FX"      },
    "combat_critical":      { "price": 299,   "label": "Critical Explosion FX" },
    "combat_legendary":     { "price": 399,   "label": "Legendary Combo FX"    },
    "combat_bundle":        { "price": 999,   "label": "Combat FX Bundle"      },
    "title_noble":          { "price": 199,   "label": "Noble Titles Pack"     },
    "title_dark":           { "price": 199,   "label": "Dark Titles Pack"      },
    "title_heroic":         { "price": 199,   "label": "Heroic Titles Pack"    },
    "title_mystical":       { "price": 199,   "label": "Mystical Titles Pack"  },
    "title_legendary":      { "price": 299,   "label": "Legendary Titles Pack" },
    "title_custom":         { "price": 499,   "label": "Custom Title"          },
    "title_bundle":         { "price": 799,   "label": "Title Bundle"          },
    "theme_dark_fantasy":   { "price": 299,   "label": "Dark Fantasy Theme"    },
    "theme_neon_terminal":  { "price": 299,   "label": "Neon Terminal Theme"   },
    "theme_parchment":      { "price": 299,   "label": "Parchment Scroll Theme"},
    "theme_blood_iron":     { "price": 299,   "label": "Blood & Iron Theme"    },
    "theme_celestial":      { "price": 299,   "label": "Celestial Theme"       },
    "theme_void_abyss":     { "price": 299,   "label": "Void Abyss Theme"      },
    "theme_bundle":         { "price": 1299,  "label": "Theme Bundle"          },
    "inv_expand_50":        { "price": 399,   "label": "Inventory +50 Slots"   },
    "inv_expand_100":       { "price": 699,   "label": "Inventory +100 Slots"  },
    "inv_expand_200":       { "price": 1199,  "label": "Inventory +200 Slots"  },
    "bundle_starter":       { "price": 499,   "label": "Starter Cosmetic Pack" },
    "bundle_warrior":       { "price": 1199,  "label": "Warrior's Arsenal"     },
    "bundle_shadow_rogue":  { "price": 999,   "label": "Shadow Rogue Pack"     },
    "bundle_complete":      { "price": 3499,  "label": "Complete Cosmetic Pack"}
  }
}
```

---

### Entitlement Manager

```ts
interface Entitlement {
  playerId: string;
  steamId: string;
  itemId: string;            // e.g. 'theme_dark_fantasy'
  category: EntitlementCategory;
  purchasedAt: string;
  orderId: string;           // Steam order ID for dedup
}

type EntitlementCategory =
  | 'name_color'
  | 'chat_effect'
  | 'combat_effect'
  | 'title_pack'
  | 'custom_title'
  | 'theme'
  | 'inventory_expansion';

class EntitlementManager {
  grant(playerId: string, itemId: string, orderId: string): void;
    // Idempotent: if orderId already in DB, skip (handles webhook retries)

  has(playerId: string, itemId: string): boolean;

  getAll(playerId: string): Entitlement[];

  getByCategory(playerId: string, cat: EntitlementCategory): Entitlement[];

  getInventoryCap(playerId: string): number;
    // base 100 + sum of owned expansion slots (max 300)
}
```

---

### Active Cosmetic State (in PlayerStats)

```ts
// Part of PlayerStats / SaveFile
interface ActiveCosmetics {
  usernameColor: string | null;    // e.g. 'gold', 'crimson', 'rainbow'
  chatEffect: string | null;       // e.g. 'fire', 'void', null
  combatEffect: string | null;     // e.g. 'blazing', 'critical', null
  activeTitle: string | null;      // e.g. '[Shadow]', '[Mythborn]', '[Kael the Bold]'
  activeTheme: string;             // e.g. 'default', 'dark_fantasy', 'neon_terminal'
}
```

These are saved in `SaveFile` and applied by `CosmeticRenderer` when building every
server response string for this player.

---

### In-Game Store Interface

```
> store

  ╔═══════════════════════════════════════════════════════════╗
  ║  🏪  ECHOES STORE  (powered by Steam)                    ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  All purchases are cosmetic or convenience only.         ║
  ║  No pay-to-win. All purchases permanent.                 ║
  ╠═══════════════╦═══════════════════════════════════════════╣
  ║ [1] Name Colors║ From $1.99 — 7 color options            ║
  ║ [2] Chat Effects║ From $1.99 — 7 effects                 ║
  ║ [3] Combat FX  ║ From $1.99 — 6 effects                  ║
  ║ [4] Titles     ║ From $1.99 — 5 packs + custom           ║
  ║ [5] Themes     ║ From $2.99 — 6 UI themes                ║
  ║ [6] Inventory  ║ From $3.99 — expand to 300 slots        ║
  ║ [7] Bundles    ║ From $4.99 — save up to 30%             ║
  ║ [8] My Items   ║ View + manage owned cosmetics            ║
  ╚═══════════════╩═══════════════════════════════════════════╝
  Type 'store <n>' to browse a category.
  Type 'store buy <item_id>' to purchase.

> store 1

  ╔═══════════════════════════════════════════════════════════╗
  ║  🎨  NAME COLOR PACKS                                    ║
  ╠════════════════════╦══════════╦═══════════╦══════════════╣
  ║ Item               ║ Preview  ║ Price     ║ Status       ║
  ╠════════════════════╬══════════╬═══════════╬══════════════╣
  ║ Crimson Name        ║ Kael     ║ $1.99     ║ Not owned    ║
  ║ Ocean Name          ║ Kael     ║ $1.99     ║ Not owned    ║
  ║ Golden Name         ║ Kael     ║ $1.99     ║ OWNED ✓      ║
  ║ Shadow Name         ║ Kael     ║ $1.99     ║ Not owned    ║
  ║ Emerald Name        ║ Kael     ║ $1.99     ║ Not owned    ║
  ║ Void Name           ║ Kael     ║ $2.99     ║ Not owned    ║
  ║ Rainbow Name        ║ Kael     ║ $3.99     ║ Not owned    ║
  ║ ─────────────────  ║ ──────── ║ ───────── ║ ──────────── ║
  ║ Name Color Bundle   ║ All 7   ║ $9.99     ║ Not owned    ║
  ╚════════════════════╩══════════╩═══════════╩══════════════╝
  'store buy <item_id>'   e.g. 'store buy name_color_crimson'
  'namecolor set crimson' to activate an owned color.

> store buy name_color_crimson

  Purchasing: Crimson Name Color  — $1.99
  ─────────────────────────────────────────────────────────────
  Steam payment overlay opening...
  Complete your purchase in the Steam Overlay.
  (Press Shift+Tab to open Steam Overlay if it doesn't appear)

  [Waiting for Steam confirmation...]

  ╔═══════════════════════════════════════════════════════════╗
  ║  ✔  Purchase complete!                                   ║
  ║  Crimson Name Color unlocked.                            ║
  ║  Type 'namecolor set crimson' to activate it.            ║
  ╚═══════════════════════════════════════════════════════════╝
```

---

### Cosmetic Management Commands

```
STORE
  store                    → open the store main menu
  store <n>             → browse a category (1–8)
  store buy <item_id>      → initiate Steam purchase for an item
  store owned              → alias for 'store 8' — view all owned cosmetics

NAME COLOR
  namecolor list           → list owned name color packs
  namecolor set <color>    → activate a name color (crimson/gold/shadow/etc.)
  namecolor clear          → remove name color (back to default white)
  namecolor preview <color>→ show a preview line with that color applied

CHAT EFFECT
  chatfx list              → list owned chat effects
  chatfx set <effect>      → activate a chat effect (fire/thunder/ice/etc.)
  chatfx clear             → remove chat effect
  chatfx preview <effect>  → show a preview chat line with effect

COMBAT EFFECT
  combatfx list            → list owned combat effects
  combatfx set <effect>    → activate a combat effect
  combatfx clear           → remove combat effect
  combatfx preview <effect>→ show a sample combat log line with effect

TITLE
  title list               → list owned title packs and individual titles
  title set <title>        → set active title  (e.g. 'title set Shadow')
  title custom <text>      → set custom title text (requires custom_title purchase)
  title clear              → remove title

THEME
  theme list               → list owned themes + currently active
  theme set <name>         → apply a theme  (e.g. 'theme set "Dark Fantasy"')
  theme reset              → revert to Default theme
  theme preview <name>     → show a sample screen with that theme applied

INVENTORY
  inventory cap            → show current max slots and any expansion owned
```

---

### CosmeticRenderer (Server Module)

```ts
class CosmeticRenderer {
  private themes: Map<string, ThemeDefinition>;

  // Apply username color to a name string
  formatUsername(name: string, cosmetics: ActiveCosmetics): string;

  // Apply chat effect to a message
  formatChatMessage(sender: GameSession, channel: string, text: string): string;

  // Apply combat text effect to a combat log line
  formatCombatLine(actor: GameSession, line: CombatLogEntry): string;

  // Apply title prefix to a name
  formatTitle(cosmetics: ActiveCosmetics): string;  // e.g. '[Shadow] '

  // Render any box/border using player's active theme
  renderBox(content: string[], session: GameSession): string;
  renderDivider(session: GameSession): string;
  renderPrompt(session: GameSession): string;   // '> ' or '◆ ' or '❯ '

  // Get theme definition for a player
  getTheme(session: GameSession): ThemeDefinition;
}
```

---

### Monetization Database Tables

```sql
-- ─────────────────────────────────────────────
-- STORE & ENTITLEMENTS
-- ─────────────────────────────────────────────
CREATE TABLE store_orders (
  order_id      TEXT PRIMARY KEY,           -- UUID generated server-side
  steam_order_id TEXT,                      -- Steam's transaction ID
  player_id     TEXT NOT NULL REFERENCES players(id),
  steam_id      TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'pending',
                                            -- 'pending' | 'complete' | 'failed' | 'refunded'
  created_at    TEXT NOT NULL,
  completed_at  TEXT
);

CREATE TABLE entitlements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     TEXT NOT NULL REFERENCES players(id),
  steam_id      TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  category      TEXT NOT NULL,
  order_id      TEXT NOT NULL REFERENCES store_orders(order_id),
  granted_at    TEXT NOT NULL,
  UNIQUE(player_id, item_id)                -- one entitlement per player per item
);

CREATE TABLE active_cosmetics (
  player_id         TEXT PRIMARY KEY REFERENCES players(id),
  username_color    TEXT,
  chat_effect       TEXT,
  combat_effect     TEXT,
  active_title      TEXT,
  custom_title_text TEXT,
  active_theme      TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX idx_entitlements_player ON entitlements(player_id);
CREATE INDEX idx_entitlements_item   ON entitlements(item_id);
CREATE INDEX idx_store_orders_player ON store_orders(player_id);
CREATE INDEX idx_store_orders_status ON store_orders(status);
```

---

### Server Module Structure (Monetization)

```
├── store/
│   ├── StoreManager.ts       ← Steam API calls: InitTxn, FinalizeTxn, order tracking
│   ├── EntitlementManager.ts ← grant, has, getAll, getInventoryCap
│   ├── CosmeticRenderer.ts   ← apply colors, effects, themes to output strings
│   └── themes.json           ← all ThemeDefinition objects
```

---

### Monetization Checklist

- [ ] Steam App registered, App ID configured, Web API Key and Publisher Key secured in env
- [ ] `StoreManager` — InitTxn call with correct item/price/currency, orderId generation
- [ ] `StoreManager` — webhook endpoint `/steam/txn-callback` validates Steam signature
- [ ] `StoreManager` — FinalizeTxn called after webhook, order marked complete
- [ ] Idempotent grant: duplicate webhook retry with same orderId skipped safely
- [ ] `EntitlementManager.grant()` — writes to entitlements table, triggers cosmetic unlock push
- [ ] `EntitlementManager.getInventoryCap()` — returns correct cap (100 + expansions, max 300)
- [ ] InventoryManager uses `EntitlementManager.getInventoryCap()` instead of hard-coded 100
- [ ] `CosmeticRenderer.formatUsername()` — applies ANSI color per active_cosmetics row
- [ ] `CosmeticRenderer.formatChatMessage()` — wraps message in correct chat effect template
- [ ] `CosmeticRenderer.formatCombatLine()` — styles damage numbers per active combat effect
- [ ] `CosmeticRenderer.formatTitle()` — prepends title to name in all outputs
- [ ] `CosmeticRenderer.renderBox()` — uses player's active theme's box-drawing characters
- [ ] All 6 theme definitions in `themes.json` with correct ANSI codes and characters
- [ ] `store` command renders full store menu using player's own active theme
- [ ] `store buy` correctly blocks if item already owned: "You already own this item."
- [ ] `namecolor set` validates player owns the pack before activating
- [ ] `title set` validates player owns the title pack containing that title
- [ ] `title custom` validates player owns `custom_title` entitlement + profanity filter
- [ ] Rainbow name color: cycling ANSI codes per character implemented correctly
- [ ] Critical Explosion FX: fires only on actual critical hits (critDamage applied)
- [ ] Sandbox mode: Steam API sandbox used during development, switched off for production
- [ ] Refund handling: if Steam issues a refund, `store_orders.status = 'refunded'` and entitlement revoked
- [ ] Admin panel: new "Store" tab showing purchase history and ability to manually grant/revoke entitlements
- [ ] Player disconnect mid-purchase: order stays 'pending'; webhook fires later, grants item on next login

---

## Data-Driven Hot-Update Architecture

The game uses a **fully data-driven design** — all world content (cities, dungeons, quests,
items, enemies, shop stock, store products) lives in JSON files and a dedicated SQLite
`content` table. The server never hard-codes content into TypeScript. This enables admins
to **add, modify, or remove content at runtime** without restarting the server.

The hot-update system works in three layers:

```
Layer 1 — Static baseline:    JSON files on disk (loaded at startup)
Layer 2 — Live overrides:     content_overrides table in SQLite (takes precedence)
Layer 3 — Ephemeral events:   active_events table (timed, auto-expires)

ContentManager resolves in order: active_events → content_overrides → static JSON
```

This means:
- A dungeon defined in `dungeons.json` can be **modified at runtime** via an override row
- A limited-time event quest can be **added without touching any file** or restarting
- A new store product can be **added immediately** via admin panel
- A city can be **temporarily augmented** with event NPCs and exclusive items
- When the override or event is removed, the original static data is restored automatically

---

### ContentManager (Server Module)

```ts
class ContentManager {
  // In-memory cache of the fully resolved content (after merge)
  private cache: Map<string, ContentDocument>;
  private fileWatcher?: FSWatcher;

  // Load all static JSON into cache, then merge DB overrides
  async initialize(): Promise<void>;

  // Fetch resolved content for a given type and ID
  get<T>(type: ContentType, id: string): T | null;

  // Fetch all entries of a type (e.g. all cities)
  getAll<T>(type: ContentType): T[];

  // Admin: apply a hot-patch — writes to content_overrides, updates in-memory cache
  async applyOverride(type: ContentType, id: string, patch: Partial<unknown>,
                      adminId: string, reason: string): Promise<void>;

  // Admin: remove an override — reverts to static JSON baseline
  async removeOverride(type: ContentType, id: string, adminId: string): Promise<void>;

  // Admin: create a content entry that doesn't exist in static JSON
  async createNew(type: ContentType, id: string, data: unknown,
                  adminId: string, reason: string): Promise<void>;

  // Broadcast hot-update notification to all online players (or specific area)
  private broadcastUpdate(type: ContentType, id: string, change: string): void;

  // File watcher: auto-reload static JSON if file changes on disk (dev mode only)
  watchFiles(): void;
}

type ContentType =
  | 'city'    | 'dungeon'  | 'area'     | 'enemy'
  | 'item'    | 'quest'    | 'story'    | 'shop'
  | 'skill'   | 'recipe'   | 'boss_drop'| 'loot_pool'
  | 'event'   | 'store_item';
```

---

### Database Tables for Hot-Update

```sql
-- ─────────────────────────────────────────────
-- CONTENT OVERRIDES (permanent live patches)
-- ─────────────────────────────────────────────
CREATE TABLE content_overrides (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type  TEXT NOT NULL,      -- 'city' | 'dungeon' | 'quest' | 'item' etc.
  content_id    TEXT NOT NULL,      -- matches 'id' field in the source JSON
  patch_data    TEXT NOT NULL,      -- JSON: partial object merged over static baseline
  is_new        INTEGER DEFAULT 0,  -- 1 = brand-new entry (no static baseline)
  created_by    TEXT NOT NULL,      -- admin_id
  reason        TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(content_type, content_id)
);

-- ─────────────────────────────────────────────
-- LIMITED-TIME EVENTS (auto-expiring content)
-- ─────────────────────────────────────────────
CREATE TABLE active_events (
  event_id      TEXT PRIMARY KEY,   -- UUID
  event_type    TEXT NOT NULL,      -- 'limited_quest' | 'dungeon_event' | 'city_event'
                                    -- | 'sale' | 'world_event'
  name          TEXT NOT NULL,
  description   TEXT,
  content       TEXT NOT NULL,      -- full JSON of the event data
  affected_ids  TEXT NOT NULL,      -- JSON array: city/dungeon/area IDs affected
  starts_at     TEXT NOT NULL,
  ends_at       TEXT NOT NULL,      -- server auto-removes on expiry
  created_by    TEXT NOT NULL,      -- admin_id
  is_active     INTEGER DEFAULT 1,
  banner_text   TEXT,               -- optional: shown to players in-game on login
  banner_color  TEXT DEFAULT 'gold' -- ANSI color for the banner
);

CREATE INDEX idx_content_overrides_type   ON content_overrides(content_type);
CREATE INDEX idx_content_overrides_id     ON content_overrides(content_id);
CREATE INDEX idx_active_events_type       ON active_events(event_type);
CREATE INDEX idx_active_events_ends       ON active_events(ends_at);
CREATE INDEX idx_active_events_active     ON active_events(is_active);
```

---

### Admin Web UI — Content Management Pages

Four new pages added to the admin panel:

```
/content           → Content Manager hub (overview of all live overrides + active events)
/content/events    → Create/edit/stop limited-time events
/content/world     → Edit cities and dungeons (live, hot-patched)
/content/store     → Add/remove/edit store products (already partially covered; expanded here)
```

---

#### Content Hub (`/content`)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧  Content Manager                                            │
├───────────────────┬─────────────────────────────────────────────┤
│  Events           │  World  │  Store  │  [+ New Event]          │
├───────────────────┴─────────────────────────────────────────────┤
│                                                                 │
│  ACTIVE EVENTS (2)                                              │
│  ─────────────────────────────────────────────────────────────  │
│  🟢 Goblin Invasion Crisis        QUEST   ends in 6d 14h  [Edit]│
│  🟢 Summer Weapon Sale            SALE    ends in 2d  3h  [Edit]│
│                                              [+ New Event]      │
│                                                                 │
│  LIVE CONTENT PATCHES (3)                                       │
│  ─────────────────────────────────────────────────────────────  │
│  DUNGEON  shadow_abyss     +2 floors added    by admin1  3d ago │
│  CITY     crystalmere      new shop items     by admin1  1d ago │
│  ITEM     void_core        drop rate ×2       by admin1  5h ago │
│                                              [View All]         │
│                                                                 │
│  SCHEDULED (not yet active)                                     │
│  ─────────────────────────────────────────────────────────────  │
│  🕐 Dragon Festival              WORLD   starts in 2d           │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Limited-Time Event Editor (`/content/events`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✦  Create Limited-Time Event                                   │
├─────────────────────────────────────────────────────────────────┤
│  Event Type:                                                    │
│  (●) Limited Quest Event   — new quest(s) added to guild boards │
│  ( ) Dungeon Event         — modify a dungeon temporarily       │
│  ( ) City Event            — add items/NPCs to a city           │
│  ( ) Microtransaction Sale — discount or add new store items    │
│  ( ) World Event           — server-wide narrative event        │
├─────────────────────────────────────────────────────────────────┤
│  Event Name:   [Goblin Invasion Crisis_________________]         │
│  Description:  [A massive goblin horde threatens Ashford! ____] │
│  Banner Text:  [⚔ GOBLIN INVASION — 7 days remaining! _______] │
│  Banner Color: [Gold ▼]                                         │
├─────────────────────────────────────────────────────────────────┤
│  Duration:                                                      │
│  Start: [Now ●]  ( ) Schedule: [____________]                   │
│  End:   [+ 7 days ▼]  or Custom: [2025-04-10 23:59 UTC]        │
├─────────────────────────────────────────────────────────────────┤
│  QUEST CONFIGURATION                                            │
│  ─────────────────────────────────────────────────────────────  │
│  Quest ID (new):    [event_goblin_invasion_2025_________]       │
│  Title:             [The Goblin Invasion — Limited Event!]      │
│  Type:              [Hunt ▼]                                    │
│  Target city:       [All Cities ▼]  (appears on all boards)    │
│  Guild rank req:    [F ▼]           (accessible to all)         │
│  Objective:         Kill [500___] Goblin Scouts  (server total) │
│  Shared progress:   [●] Yes — all players contribute to goal    │
│  ─────────────────────────────────────────────────────────────  │
│  REWARDS (given when goal is reached):                          │
│  Gold:  [5000___]  EXP: [10000___]                             │
│  Items: [+Add Item]                                             │
│    Item 1: [event_goblin_crown___] Qty: [1]  [×]               │
│    Item 2: [health_potion_5______] Qty: [10] [×]               │
│  Title unlock: [Goblin Slayer______________] (optional)         │
│  ─────────────────────────────────────────────────────────────  │
│  Story intro: [The eastern road reeks of smoke and fear.______] │
│                                                                 │
│               [Preview JSON]   [Save Draft]   [Publish Now]    │
└─────────────────────────────────────────────────────────────────┘
```

---

#### World Editor — City (`/content/world` → city tab)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏙  World Editor — Cities       [Dungeons ▶]                  │
│  Select city: [Crystalmere City ▼]             [+ New City]    │
├─────────────────────────────────────────────────────────────────┤
│  Source: static  JSON    Override: ✔ Active (patched 1d ago)   │
├─────────────────────────────────────────────────────────────────┤
│  BASIC INFO                                                     │
│  Name:    [Crystalmere City________________]                    │
│  Level:   Min [20___]  Max [32___]                              │
│  Inn cost: [60___]g     Guild rank: [D ▼]                       │
│  Theme:   [Magical crystal city with mage university_________]  │
│  Respawn point area: [crystalmere_city_square___________]       │
├─────────────────────────────────────────────────────────────────┤
│  EXCLUSIVE SHOP ITEMS  (shown/sold only in this city)          │
│  [Mana Crystal (Pure)] [Crystalmere Grimoire] [Elem Shard Box] │
│                                    [+ Add Item]  [Remove ▼]    │
├─────────────────────────────────────────────────────────────────┤
│  EVENT ITEMS  (temporary, auto-removed on event end)           │
│  [Event: Dragon Scale ×3 — ends 6d 14h]          [+ Add]      │
├─────────────────────────────────────────────────────────────────┤
│  CONNECTED AREAS                                                │
│  [crystalmere_city_square] [crystal_cave_entrance]             │
│  [crystal_badlands_south]  [arashiyama_bamboo_grove]           │
│                                                    [+ Add Area] │
├─────────────────────────────────────────────────────────────────┤
│  [Reset to Static Baseline]   [Save Changes]   [Preview Diff]  │
└─────────────────────────────────────────────────────────────────┘
```

**Preview Diff** shows exactly what changed vs the static JSON before saving:

```
DIFF — crystalmere_city
─────────────────────────────────────────────────────────────────
+ exclusiveShopItems: added "event_dragon_scale_bundle"
  exclusiveShopItems: [unchanged] Mana Crystal (Pure), ...
─────────────────────────────────────────────────────────────────
This patch will be saved to content_overrides.
Players currently in Crystalmere City will be notified.
```

---

#### World Editor — Dungeon (`/content/world` → dungeon tab)

```
┌─────────────────────────────────────────────────────────────────┐
│  🗺  World Editor — Dungeons       [Cities ◀]                  │
│  Select dungeon: [Shadow Abyss (D7) ▼]         [+ New Dungeon] │
├─────────────────────────────────────────────────────────────────┤
│  Source: static JSON    Override: ✔ Active                      │
├─────────────────────────────────────────────────────────────────┤
│  BASIC INFO                                                     │
│  Name:    [Shadow Abyss___________________]                     │
│  Level:   Min [33___]  Max [48___]                              │
│  Floors:  [6] (base) + [2] (event override) = 8 total           │
│  Entrance area: [shadow_abyss_entrance_____________]            │
│  Entrance city: [duskhollow____________________]                │
├─────────────────────────────────────────────────────────────────┤
│  FLOORS                                    [+ Add Floor]        │
│  ─────────────────────────────────────────────────────────────  │
│  Floor 1  [Upper Tunnels_____]  enc:40%  enemies: [Edit]       │
│  Floor 2  [Void Corridor_____]  enc:45%  enemies: [Edit]       │
│  ...                                                            │
│  Floor 6  [Zelthar's Chamber_]  BOSS: Void Wraith Zelthar      │
│  ─────────── EVENT FLOORS (temporary) ───────────────────────  │
│  Floor 7  [EVENT: Void Rift____] enc:65%  enemies: [Edit] [×]  │
│  Floor 8  [EVENT: Abyss Core___] BOSS: Rift Titan       [×]   │
│  ─────────────────────────────────────────────────────────────  │
│  Event floors auto-remove when event ends.                      │
├─────────────────────────────────────────────────────────────────┤
│  BOSS DROP TABLE  (floor 6)                                     │
│  [Void Wraith Essence 15%] [Shadow Reaper 8%] [Eclipse 6%]     │
│                                            [Edit Drop Table]    │
├─────────────────────────────────────────────────────────────────┤
│  [Reset to Baseline]   [Save Changes]   [Preview Diff]         │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Store Product Manager (`/content/store`)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏪  Store Product Manager                                      │
├─────────────────────────────────────────────────────────────────┤
│  [All ▼]   [Search item...________]           [+ Add Product]  │
├────────────────────────┬──────────┬─────────┬───────┬──────────┤
│ Item ID                │ Label    │ Price   │Status │ Actions  │
├────────────────────────┼──────────┼─────────┼───────┼──────────┤
│ name_color_crimson     │ Crimson… │ $1.99   │ ✔ On  │[Edit][Off]│
│ theme_dark_fantasy     │ Dark Fa… │ $2.99   │ ✔ On  │[Edit][Off]│
│ inv_expand_50          │ Inv +50  │ $3.99   │ ✔ On  │[Edit][Off]│
│ event_summer_pack_2025 │ Summer … │ $4.99   │ ✔ On  │[Edit][Off]│
│ theme_void_abyss       │ Void Ab… │ $2.99   │ ✗ Off │[Edit][On] │
├────────────────────────┴──────────┴─────────┴───────┴──────────┤
│  Total: 38 products   Active: 35   Inactive: 3                 │
└─────────────────────────────────────────────────────────────────┘
```

**Add/Edit Product form:**

```
┌─────────────────────────────────────────────────────────────────┐
│  + Add New Store Product                                        │
├─────────────────────────────────────────────────────────────────┤
│  Item ID (slug):  [event_dragon_pack_2025______________]        │
│  Display Label:   [Dragon Festival Pack____________________]    │
│  Category:        [Bundle ▼]                                    │
│  Price (cents):   [799___]  = $7.99                            │
│  Description:     [Celebrate the Dragon Festival with this ___] │
├─────────────────────────────────────────────────────────────────┤
│  Included Items (for bundle type):                              │
│  [+ Add included item ID]                                       │
│  [name_color_void] [combat_legendary] [title_legendary]        │
├─────────────────────────────────────────────────────────────────┤
│  LIMITED TIME:                                                  │
│  ( ) Always available                                           │
│  (●) Limited — remove after: [2025-04-14 23:59 UTC_____]       │
├─────────────────────────────────────────────────────────────────┤
│  Status: (●) Active   ( ) Inactive                             │
│                                                                 │
│         [Save Draft]   [Publish Now]   [Cancel]                │
└─────────────────────────────────────────────────────────────────┘
```

Changes are **immediately reflected** in the in-game `store` command for all players.
Active items in `store_catalog` override the static `config.json` steam items list.

---

### Event Types — Full Specification

#### Type 1: Limited Quest Event

Adds new time-limited quests to all (or specific) guild boards. Can have:
- **Individual rewards**: each player who completes gets a reward
- **Shared/server goal**: all player kills/collects pool toward a server total;
  everyone online when goal is reached gets the reward

```ts
interface LimitedQuestEvent {
  eventId: string;
  eventType: 'limited_quest';
  name: string;
  storyIntro: string;              // shown when player accepts
  questId: string;                 // injected into quests.json at runtime
  targetCities: string[] | 'all';
  guildRankRequired: GuildRank;
  objective: EventObjective;
  reward: EventReward;
  sharedGoal?: {
    enabled: boolean;
    totalRequired: number;         // e.g. 10,000 total goblin kills server-wide
    currentProgress: number;       // tracked in active_events.content JSON
    reachedAt?: string;            // set when goal is hit
  };
  bannerText: string;
  startsAt: string;
  endsAt: string;
}

interface EventObjective {
  type: 'kill' | 'collect' | 'boss_kill' | 'reach_location';
  targetId: string;                // enemyId or itemId
  count: number;
  countPerPlayer: boolean;         // false = shared server count
}

interface EventReward {
  gold: number;
  exp: number;
  items: { itemId: string; qty: number }[];
  titleUnlock?: string;            // cosmetic title granted on completion
  exclusiveItem?: string;          // event-only item (only grantable during event)
}
```

**In-game appearance on guild board:**

```
> guild

  ╔═══════════════════════════════════════════════════════════╗
  ║  Ashford Adventurer's Guild — Quest Board  [Rank: F]     ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  ✦ LIMITED EVENT — Goblin Invasion Crisis  [6d 14h left] ║
  ║    Kill goblin scouts — server goal: 7,241 / 10,000      ║
  ║    [████████░░░░░░░░] 72%                                 ║
  ║    Reward: 5,000g + Goblin Crown + [Goblin Slayer] title  ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  [1] The Goblin Menace   HUNT  150g + Iron Sword  58 min  ║
  ║  [2] Herb Gathering     COLLECT 100g + EXP       41 min   ║
  ╚═══════════════════════════════════════════════════════════╝
  'accept event' to join the event quest.
```

**Server progress tracking:**

```ts
// EventEngine.ts — onKill hook
onEnemyKill(playerId: string, enemyId: string): void {
  const events = EventEngine.getActiveEventsForEnemy(enemyId);
  for (const event of events) {
    if (event.sharedGoal?.enabled) {
      event.sharedGoal.currentProgress++;
      ContentManager.patchEventProgress(event.eventId, event.sharedGoal.currentProgress);
      if (event.sharedGoal.currentProgress >= event.sharedGoal.totalRequired) {
        EventEngine.triggerGoalReached(event);
      }
    }
  }
}
```

**When shared goal is reached:**

```
  [Server] ✦ GOBLIN INVASION CRISIS — GOAL REACHED!
           10,000 goblins slain. The horde retreats.
           All participants receive: 5,000g + Goblin Crown + [Goblin Slayer] title
           Rewards delivered to your inventory.
```

---

#### Type 2: Dungeon Event

Temporarily modifies an existing dungeon — adds floors, changes enemy pools,
modifies boss drop rates, or adds a temporary sub-boss.

```ts
interface DungeonEvent {
  eventId: string;
  eventType: 'dungeon_event';
  name: string;
  dungeonId: string;              // which dungeon to modify
  patch: {
    addFloors?: DungeonFloor[];   // appended after the final floor
    modifyFloors?: { floor: number; patch: Partial<DungeonFloor> }[];
    bossDropBonus?: {             // temporary drop rate multiplier on boss
      bossId: string;
      multiplier: number;         // e.g. 2.0 = double drop chance
    };
    spawnBoost?: {                // temporary enemy stat multiplier on all floors
      statMultiplier: number;
      expMultiplier: number;
      dropRateMultiplier: number;
    };
  };
  notifyOnEntry: string;          // message shown when player enters the dungeon
  startsAt: string;
  endsAt: string;
}
```

**In-game:** When a player enters an event-modified dungeon:

```
  [Event] ⚠ Shadow Abyss is affected by an active event!
          The Rift Titan stirs in the depths.
          2 extra floors have been added. Proceed with caution.
          Event ends in: 6d 14h
```

---

#### Type 3: City Event

Temporarily augments a city — adds exclusive shop items, event NPCs, or decorative
description changes.

```ts
interface CityEvent {
  eventId: string;
  eventType: 'city_event';
  name: string;
  cityIds: string[];              // which cities are affected
  patch: {
    addShopItems?: {              // temporary stock in the city merchant
      itemId: string;
      price: number;
      qty: number;                // -1 = unlimited stock
    }[];
    addNpcs?: NPC[];              // temporary NPCs (quest givers, lore characters)
    descriptionSuffix?: string;   // appended to city description during event
    innPriceOverride?: number;    // e.g. free inn during festival
  };
  startsAt: string;
  endsAt: string;
}
```

---

#### Type 4: Microtransaction Sale Event

Applies discounts or adds new products to the store for a limited time.

```ts
interface SaleEvent {
  eventId: string;
  eventType: 'sale';
  name: string;                   // e.g. "Summer Festival Sale"
  bannerText: string;
  catalogChanges: {
    discounts?: {
      itemId: string;
      originalPriceCents: number;
      salePriceCents: number;
    }[];
    newItems?: StoreCatalogItem[]; // items added only during this sale
    featuredItems?: string[];      // item IDs shown prominently in store
  };
  startsAt: string;
  endsAt: string;
}
```

**In-game store during a sale:**

```
> store

  ╔═══════════════════════════════════════════════════════════╗
  ║  🏪  ECHOES STORE                         [3d 22h left]  ║
  ║  🔥  SUMMER FESTIVAL SALE — Up to 40% off!               ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  ✦ FEATURED                                              ║
  ║  Dragon Festival Pack    $7.99  [NEW — limited time]      ║
  ║  Theme Bundle            ~~$12.99~~ $7.99  [40% OFF]      ║
  ║  Crimson Name Color      ~~$1.99~~  $0.99  [50% OFF]      ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  [1] Name Colors  ...                                    ║
  ...
```

---

#### Type 5: World Event

A server-wide narrative event that touches multiple systems — spawns special enemies
in overworld areas, adds a story chapter, adjusts world state.

```ts
interface WorldEvent {
  eventId: string;
  eventType: 'world_event';
  name: string;
  chapter: string;                // story text shown to all players on login
  affectedAreas: {
    areaId: string;
    spawnOverride?: Partial<AreaSpawnConfig>;  // e.g. special event enemies
    descriptionSuffix?: string;
  }[];
  globalEffects?: {
    expMultiplier?: number;       // e.g. 1.5 = 50% bonus EXP all week
    dropRateMultiplier?: number;
    pvpForceDisabled?: boolean;   // e.g. ceasefire during lore event
  };
  startsAt: string;
  endsAt: string;
}
```

**On-login banner during world event:**

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  ✦ WORLD EVENT — The Dragon Festival                     ║
  ║  ─────────────────────────────────────────────────────── ║
  ║  The ancient dragons return to celebrate the solstice.   ║
  ║  Legendary drakes soar over Cinderpeak and Stormspire.   ║
  ║  Special drops, 1.5× EXP, and the Festival Quest await.  ║
  ║                                   Ends in: 5d 18h        ║
  ╚═══════════════════════════════════════════════════════════╝
```

---

### Hot-Update REST API Endpoints

```
GET    /api/admin/content/events
  Response: { active: [], scheduled: [], ended: [] }

GET    /api/admin/content/events/:eventId
  Response: full event JSON

POST   /api/admin/content/events
  Body: { eventType, name, content, startsAt, endsAt, bannerText, ... }
  → Writes to active_events table
  → If startsAt <= now: immediately activates
  → Notifies all online players with banner
  → Logs: CREATE_EVENT

PATCH  /api/admin/content/events/:eventId
  Body: partial update (can extend endsAt, change reward, modify content)
  → Updates active_events.content, pushes update notification to online players
  → Logs: UPDATE_EVENT

DELETE /api/admin/content/events/:eventId
  → Sets is_active = 0, removes from ContentManager cache
  → Reverts all temporary changes (event floors, event shop items, etc.)
  → Notifies online players: "[Event] The event has ended."
  → Logs: END_EVENT

GET    /api/admin/content/overrides
  Query: ?type=city|dungeon|item|quest&page=1
  Response: list of all live content_overrides rows

POST   /api/admin/content/overrides
  Body: { contentType, contentId, patchData, reason }
  → Writes to content_overrides, updates in-memory cache
  → If contentId does not exist in static JSON: treated as new entry (is_new=1)
  → Notifies affected players (e.g. players in the city being patched)
  → Logs: CONTENT_OVERRIDE

DELETE /api/admin/content/overrides/:contentType/:contentId
  → Removes override row, reverts in-memory cache to static JSON baseline
  → Logs: CONTENT_REVERT

GET    /api/admin/content/catalog
  Response: all store catalog items (static + DB additions + event sales)

POST   /api/admin/content/catalog
  Body: { itemId, label, priceCents, category, description, limitedUntil? }
  → Adds to store_catalog table (takes precedence over config.json)
  → Immediately visible in player store
  → Logs: STORE_ITEM_ADDED

PATCH  /api/admin/content/catalog/:itemId
  Body: { priceCents?, label?, isActive? }
  → Updates store_catalog
  → Logs: STORE_ITEM_UPDATED

DELETE /api/admin/content/catalog/:itemId
  → Sets isActive = false (soft delete — past purchases unaffected)
  → Item disappears from store immediately
  → Logs: STORE_ITEM_REMOVED
```

---

### Store Catalog Database Table

```sql
-- ─────────────────────────────────────────────
-- LIVE STORE CATALOG (extends config.json items)
-- ─────────────────────────────────────────────
CREATE TABLE store_catalog (
  item_id         TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  category        TEXT NOT NULL,
  price_cents     INTEGER NOT NULL,
  description     TEXT,
  included_items  TEXT,            -- JSON array for bundles
  is_active       INTEGER DEFAULT 1,
  is_sale_price   INTEGER DEFAULT 0,
  original_price  INTEGER,         -- populated during sale events
  limited_until   TEXT,            -- NULL = permanent; datetime = auto-deactivate
  event_id        TEXT,            -- linked event (auto-removed with event)
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX idx_store_catalog_active    ON store_catalog(is_active);
CREATE INDEX idx_store_catalog_event     ON store_catalog(event_id);
CREATE INDEX idx_store_catalog_limited   ON store_catalog(limited_until);
```

---

### EventEngine (Server Module)

```ts
class EventEngine {
  private activeEvents: Map<string, ActiveEvent>;
  private eventTimers: Map<string, NodeJS.Timeout>;   // end-timers per event

  // Load all active events from DB on startup
  async initialize(): Promise<void>;

  // Called by ContentManager when a new event is created/activated
  activateEvent(event: ActiveEvent): void;

  // Deactivate event: revert all patches, notify players, log
  deactivateEvent(eventId: string, reason: 'expired' | 'admin_ended'): void;

  // Kill-hook integration (called by CombatEngine on every enemy death)
  onEnemyKill(playerId: string, enemyId: string, areaId: string): void;

  // Collect-hook (called by QuestEngine on item collect)
  onItemCollect(playerId: string, itemId: string, qty: number): void;

  // Check if an event goal has been reached and trigger rewards
  checkGoalReached(eventId: string): void;

  // Grant event rewards to a player (or all participants on shared goal)
  grantEventReward(playerId: string, event: ActiveEvent): void;

  // Get active events affecting a specific area or dungeon
  getEventsForArea(areaId: string): ActiveEvent[];
  getEventsForDungeon(dungeonId: string): ActiveEvent[];

  // Timer job: check limited store items for expiry (every 5 minutes)
  runCatalogExpiryCheck(): void;
}
```

---

### Updated Startup Sequence

```
1.  Load config.json
2.  Initialize SQLite (WAL mode, run migrations)
3.  Initialize ContentManager:
      a. Load all static JSON files into base cache
      b. Load all content_overrides rows → merge patches into cache
      c. Load all active_events rows → apply event patches into cache
4.  Initialize all managers (uses ContentManager.get() instead of direct JSON imports)
5.  Initialize EventEngine:
      a. Load active events
      b. Set end-timers for each active event (setTimeout to deactivate)
      c. Set catalog expiry timer (setInterval 5 min)
6.  Start WebSocket server on configured port
7.  Initialize Express admin server on admin port (8081)
8.  Start global quest board refresh timer (1 hour)
9.  Start bounty expiry check job (24 hours)
10. Log: "Game server ready on ws://host:8080"
11. Log: "Admin panel ready on http://host:8081"
```

**Every engine now queries ContentManager instead of holding a direct reference to a JSON
object.** Example:

```ts
// BEFORE (static, no hot-update):
const dungeon = dungeons.find(d => d.id === dungeonId);

// AFTER (data-driven, hot-update aware):
const dungeon = ContentManager.get<DungeonDefinition>('dungeon', dungeonId);
```

---

### Updated Server Module Structure (Hot-Update)

```
├── content/                      ← NEW: all hot-update infrastructure
│   ├── ContentManager.ts         ← content resolution (JSON + overrides + events)
│   ├── EventEngine.ts            ← event lifecycle, hooks, reward distribution
│   └── EventTypes.ts             ← TypeScript interfaces for all event types
├── store/
│   ├── StoreManager.ts           ← Steam API, now reads from ContentManager for catalog
│   ├── EntitlementManager.ts
│   └── CosmeticRenderer.ts
│   └── themes.json
```

New admin UI files:

```
│   └── ui/
│       ├── content.html          ← NEW: content hub
│       ├── content_events.html   ← NEW: event editor
│       ├── content_world.html    ← NEW: city/dungeon live editor
│       ├── content_store.html    ← NEW: store product manager
```

New audit action types:

```ts
| 'CREATE_EVENT'     | 'UPDATE_EVENT'    | 'END_EVENT'
| 'CONTENT_OVERRIDE' | 'CONTENT_REVERT'
| 'STORE_ITEM_ADDED' | 'STORE_ITEM_UPDATED' | 'STORE_ITEM_REMOVED'
```

---

### Hot-Update Testing Checklist

**ContentManager:**
- [ ] All engines call `ContentManager.get()` — no direct JSON imports remain
- [ ] `ContentManager.get()` priority: active_event → content_override → static JSON
- [ ] Partial patch merge works correctly (only overrides specified fields)
- [ ] New content (is_new=1) added without static JSON baseline is accessible
- [ ] Reverting override restores original static JSON values exactly

**Events — Limited Quest:**
- [ ] Event quest appears on all targeted guild boards immediately after publish
- [ ] Shared kill counter increments on every qualifying enemy kill
- [ ] Progress bar shown correctly in guild board display
- [ ] Goal reached: all qualifying players receive rewards simultaneously
- [ ] Event end: quest removed from all guild boards, partially-completed players notified
- [ ] Player accepts event quest → `questLog` updated with event quest ID
- [ ] Event quest does NOT persist in `quests.json` after event ends

**Events — Dungeon:**
- [ ] Event floors appear when entering event-modified dungeon
- [ ] Player entering dungeon sees event notification banner
- [ ] Event boss drop bonus applied during event; reverted after event ends
- [ ] Event floors removed cleanly on event end (players inside are not broken)

**Events — City:**
- [ ] Event shop items appear in merchant stock during event
- [ ] City description shows event suffix during event
- [ ] Event inn price override applied correctly during event
- [ ] On event end: event items removed from shop, original prices restored

**Events — Sale:**
- [ ] Sale items/discounts appear in `store` command during sale
- [ ] Sale price shown with strikethrough original price
- [ ] New sale-exclusive items available for purchase during sale only
- [ ] On sale end: items deactivated, prices revert for existing items

**Events — World:**
- [ ] Login banner shown to all online players when world event activates
- [ ] EXP/drop multiplier applied globally during event
- [ ] Special enemies spawn in overworld areas per event config
- [ ] On event end: multipliers removed, special enemies stop spawning

**Store Catalog:**
- [ ] `POST /api/admin/content/catalog` adds item, immediately visible in player `store`
- [ ] `PATCH /api/admin/content/catalog/:id` price change reflected instantly
- [ ] `DELETE /api/admin/content/catalog/:id` removes from store, past purchases unaffected
- [ ] `limited_until` auto-deactivation fires correctly via EventEngine catalog job
- [ ] Items in store_catalog take precedence over config.json items of same ID

**General Hot-Update:**
- [ ] All content changes logged to admin_audit_log with before/after diff
- [ ] Players receive push notification when their current city/dungeon is patched
- [ ] Server restart with active overrides: overrides reloaded from DB correctly
- [ ] Concurrent admin edits: last-write-wins with updated_at timestamp

---

*This file is the single source of truth. Update as decisions are finalized.*
