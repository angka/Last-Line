# Phase 10 Checkpoint — Auth & Friends

**Date**: 2026-05-12
**Status**: ✅ Complete

---

## What Was Built

Phase 10 implements player authentication with JWT tokens, account registration/login/logout, and a full friend system with friend requests, block list, and online status tracking.

---

## Deliverables

| Feature | Status | Notes |
|---------|--------|-------|
| Player auth (JWT) | ✅ | bcrypt password hash, 24h JWT expiry, login/register/logout |
| Player DB (separate) | ✅ | `saves/player.db` — players, auth_tokens, friends, blocks |
| Token validation | ✅ | Validates JWT on register/load, blocks banned players |
| Friend system | ✅ | Send/accept/decline/remove friend requests |
| Block system | ✅ | Block/unblock players, auto-remove friendships on block |
| Online status | ✅ | Friends show online/offline status with level |
| Friend notifications | ✅ | Push messages for incoming requests, accepts |
| Client auth UI | ✅ | New menu: login, register, guest mode, character select |

---

## New WebSocket Message Types

**Auth (no session required):**
```
auth_login  { username, password } → { auth_success { playerId, username, token } | auth_error }
auth_register { username, email, password } → { auth_success | auth_error }
logout { token } → { logged_out }
```

**Game Session (requires valid token):**
```
register { token, playerId?, name?, slot? } → { connected, sessionId, save }
load { token, playerId?, slot } → { loaded, save }
```

The `token` field authenticates the player. If `playerId`/`name` are omitted, they're derived from the validated token.

---

## New Commands (In-Game)

```
FRIEND
  friend list          — view friends (shows online/offline + level)
  friend requests       — view pending friend requests
  friend add <name>    — send friend request
  friend accept <name> — accept a friend request
  friend decline <name> — decline a friend request
  friend remove <name>  — remove a friend

BLOCK
  block list            — view blocked players
  block add <name>      — block a player (also removes friendship)
  block remove <name>   — unblock a player
```

---

## File Structure

```
src/
├── types_player.ts                        ← NEW — PlayerAccount, FriendEntry, BlockEntry,
│                                            PlayerJWTPayload, PlayerAuthSession
├── server/
│   ├── auth/
│   │   └── PlayerAuthService.ts          ← NEW — registerPlayer, loginPlayer, logoutPlayer,
│   │                                       changePassword, validateToken, JWT helpers
│   ├── persistence/
│   │   └── PlayerDbManager.ts            ← NEW — player DB, CRUD for accounts, tokens,
│   │                                       friends, blocks, username/email validation
│   ├── social/
│   │   └── FriendManager.ts              ← NEW — sendFriendRequest, acceptFriend,
│   │                                       blockUser, getFriendsList, format helpers
│   ├── parser/
│   │   └── CommandParser.ts             ← Phase 10: handleFriend, handleBlock (async)
│   └── index.ts                          ← Phase 10: auth handlers, token validation,
│                                           ban check on register/load, await parseCommand
└── client/
    └── index.ts                         ← Full rewrite: mainMenu (login/register/guest),
                                          characterSelect, auth flow, token storage
```

---

## Key Design Decisions

- **Separate player DB (`saves/player.db`)**: Player accounts isolated from game saves. Allows auth before any save data exists.
- **HMAC-based JWT (no library)**: Same pattern as admin JWT. Token = base64(payload).base64(HMAC-SHA256). 24h expiry.
- **Player ID from token, not client**: The `playerId` in register/load messages is derived from the JWT token, not trusted from the client. Prevents ID spoofing.
- **bcrypt password hashing**: 10 salt rounds, stored in `players.password_hash`.
- **Block auto-removes friends**: Blocking someone also removes the friendship in both directions.
- **ParseCommand is now async**: Friend/block commands require DB queries, so parseCommand is `async`.
- **Guest mode**: Allows quick play without email — generates a temporary guest account.

---

## Database Schema (saves/player.db)

```sql
players (
  id            TEXT PRIMARY KEY,       -- UUID
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_login    TEXT
)

player_auth_tokens (
  token         TEXT PRIMARY KEY,       -- JWT
  player_id     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL
)

friends (
  player_id     TEXT NOT NULL,
  friend_id     TEXT NOT NULL,
  status        TEXT NOT NULL,           -- 'pending' | 'accepted'
  since         INTEGER,
  PRIMARY KEY (player_id, friend_id)
)

blocks (
  player_id     TEXT NOT NULL,
  blocked_id    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  PRIMARY KEY (player_id, blocked_id)
)
```

---

## Environment Variables

```bash
PLAYER_JWT_SECRET=...         # JWT signing secret (default: dev placeholder, change in production!)
```

---

## Running the Game

```bash
# Build
npx tsc

# Start server (Phase 10 — player auth enabled)
node dist/server/index.js

# Start client (Phase 10 — new auth menu)
node dist/client/index.js
```

Client will show:
```
  ⚔  LAST LINE  —  CLI Adventure Game
  ╠═══════════════════════════════════════════════════════════════════════╣
  [1] Login (existing account)
  [2] Register (new account)
  [3] Continue as Guest (quick play)
```

---

## What Is Stubbed / TODO (Phase 11+)

| Feature | Phase | Notes |
|---------|-------|-------|
| Steam API integration | 11 | Steam SDK, cosmetic store, entitlements |
| Content hot-update | 12 | JSON overrides, event engine, live editing |
| Achievement rewards auto-apply | - | Rewards defined but not auto-applied |
| Season reset for PvP leaderboard | - | ELO decay and season reset command |

---

## Next: Phase 11 — Steam & Monetization

Next steps: integrate Steam API for authentication, add cosmetic item store, implement entitlement system for DLC content, and add inventory expansion purchasables.