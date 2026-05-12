# Phase 11 — Steam & Monetization

**Date**: 2026-05-12
**Status**: ✅ Complete

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| Steam Auth | ✅ | Ticket validation via Steam Web API |
| Steam Linking | ✅ | Link existing accounts to Steam SSO |
| Cosmetic Store | ✅ | Full CRUD, categories, equip system |
| Cosmetic DB | ✅ | SQLite with seed data (17 items, 7 rewards) |
| DLC Entitlements | ✅ | Area gating in CommandParser |
| Inventory Expansion | ✅ | 50/150 slot purchasable packs |
| Store SPA | ✅ | Browser-based cosmetic store UI |
| Client SHOP | ✅ | Opens browser store |
| Reward System | ✅ | Level-up triggers check and grant rewards |
| Player DB | ✅ | Steam ID linking added |

---

## What We're Building

1. **Steam SDK integration** — Steam Auth via Steamworks ticket validation
2. **Custom cosmetic store** — Browser SPA (admin panel style) embedded in-game
3. **Cosmetic categories** — Skins, Chat Effects, Titles, Status Effects, Housing/Avatar
4. **DLC entitlement system** — Area/content locked behind DLC ownership
5. **Inventory expansion** — 100/200/500 slot purchasable packs
6. **Steam Web API polling** — Verify owned products on player login
7. **Steam linking** — Existing accounts can link to Steam for SSO
8. **Free cosmetic rewards** — Achievement-based unlockables

---

## Architecture

```
src/
├── types_cosmetics.ts               ← CosmeticItem, CosmeticCategory, CosmeticOwned,
│                                       DlcEntitlement, InventoryExpansion, SteamOwnership
│                                       SteamTicketPayload, CosmeticReward
├── types_player.ts                   ← Phase 11: add steamId field, linkSteamAccount()
├── server/
│   ├── auth/
│   │   ├── PlayerAuthService.ts     ← Phase 11: linkSteam, unlinkSteam
│   │   └── SteamAuthService.ts      ← NEW: validateTicket, getSteamId, getOwnedProducts,
│   │                                     steamApiPoll, getEntitlements
│   ├── persistence/
│   │   ├── PlayerDbManager.ts        ← Phase 11: add steamId, steam_linked_at
│   │   └── CosmeticDbManager.ts      ← NEW: cosmetics DB, owned items, DLC entitlements,
│   │                                     inventory slots, reward grants, free claims
│   ├── store/
│   │   └── CosmeticStore.ts          ← NEW: getStoreItems, purchaseCosmetic, applyCosmetic,
│   │                                     checkDlcAccess, expandInventory, grantReward,
│   │                                     claimReward, getPlayerCosmetics
│   └── index.ts                     ← Phase 11: steam_auth, steam_link handlers,
│                                       shop push, poll ownership on login
└── client/
    └── index.ts                    ← Phase 11: SHOP command, store browser open
store/
└── index.html                      ← Cosmetic store SPA (Skins/Chat/Titles/Effects/
                                      Housing/DLC/Inventory tabs, Steam purchase)
```

---

## New WebSocket Messages

```
steam_auth    { ticket }                    → { steam_success { playerId, steamId } | steam_error }
steam_link    { token, ticket }              → { linked { steamId } | already_linked | error }
steam_unlink  { token }                      → { unlinked | no_link | error }
shop                                       → { store_url: "http://..." }  (opens browser)
store_sync    {}                             → { cosmetics[], dlc[], inventory_slots }
claim_reward  { rewardId }                   → { claimed { cosmeticId } | already_claimed | locked }
```

---

## Steam Auth Flow

```
1. Client (Steam client running) → sends steam_auth { ticket }
2. Server → POST to Steam Web API verify ticket
3. Success → get steamId, check player_db for existing steamId
   - Found → login existing player
   - Not found → check if player has steamId NULL
     - Has account (via email/pass) → return steam_link_prompt
     - No account → create new player linked to steamId
4. Failure → return steam_error
```

---

## Steam Linking Flow

```
1. Player logged in via email/password
2. Player types: linksteam (in-game command) or clicks "Link Steam" in store
3. Client → steam_link { token, ticket }
4. Server validates ticket, links steamId to existing player
5. Future steam_auth logins → auto-login as linked player
```

---

## Free Cosmetic Rewards

| Trigger | Reward |
|---------|--------|
| First login (new player) | Starter title "New Adventurer" |
| Level 10 reached | Chat effect "Beginner's Glow" |
| Level 25 reached | Skin: "Iron Guard Helm" |
| Level 50 reached | Title: "Veteran" |
| First dungeon clear | Skin: "Dungeon Delver's Plate" |
| First PvP kill | Chat bubble "Vanquisher" |
| 10 friends | Title: "Popular" |
| First purchase | Chat effect "Premium Sparkle" |
| Achievement: 100 kills | Skin: "Bloodstained Blade" |
| Achievement: 5 dungeons | Housing item "Torch" |

---

## DLC Entitlements

| DLC | Unlocks | Check Points |
|-----|---------|--------------|
| `dlc_forest` | Deep Forest area, forest materials, forest boss | area entrance, item shop, dungeon |
| `dlc_cave` | Cave system, cave materials, cave boss | area entrance, item shop, dungeon |
| `dlc_season1` | Seasonal event content, exclusive rewards, season title | login, event NPC, event command |

---

## Database Schema

```sql
cosmetics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,       -- 'skin'|'chat'|'title'|'effect'|'housing'
  subcategory TEXT,
  rarity TEXT NOT NULL,
  description TEXT,
  price_usd REAL,                -- NULL = free/reward only
  steam_product_id TEXT,
  effect_data TEXT,
  equip_slot TEXT,
  is_dlc INTEGER DEFAULT 0,
  dlc_required TEXT,
  requires_level INTEGER,
  created_at TEXT NOT NULL
)

player_cosmetics (
  player_id TEXT NOT NULL,
  cosmetic_id TEXT NOT NULL,
  equipped INTEGER DEFAULT 0,
  acquired_at TEXT NOT NULL,
  source TEXT,
  PRIMARY KEY (player_id, cosmetic_id)
)

player_entitlements (
  player_id TEXT NOT NULL,
  dlc_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL,
  source TEXT,
  PRIMARY KEY (player_id, dlc_id)
)

inventory_slots (
  player_id TEXT PRIMARY KEY,
  base_slots INTEGER DEFAULT 50,
  purchased_slots INTEGER DEFAULT 0
)

cosmetic_rewards (
  reward_id TEXT PRIMARY KEY,
  cosmetic_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
)

player_reward_claims (
  player_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (player_id, reward_id)
)
```

---

## Environment Variables

```bash
STEAM_API_KEY=...              # Steam Web API key
STEAM_APP_ID=...               # Steam App ID for this game
STEAM_WEB_API_URL=https://api.steampowered.com
```