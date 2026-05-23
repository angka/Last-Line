# Last Line — MMO CLI Adventure Game

**Version**: 1.0.0  
**Release Date**: 2026-05-13  
**Status**: Stable

A multiplayer CLI adventure game with WebSocket client/server architecture. Players explore a vast world, battle enemies, craft items, trade with others, and compete on leaderboards.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Server Installation (Ubuntu)](#server-installation-ubuntu)
- [Client Installation](#client-installation)
- [Player Commands](#player-commands)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Admin Panel](#admin-panel)
- [Cosmetic Store](#cosmetic-store)
- [WebSocket API](#websocket-api)
- [Release Notes](#release-notes)

---

## Features

### Core Gameplay
- **Exploration**: 34+ areas across 8 regions with dynamic encounters
- **Combat System**: Turn-based with physical/magic skills, status effects, crits
- **Crafting**: Gathering nodes, crafting recipes, profession system
- **Dungeons**: Multi-floor dungeons with bosses, treasure chests, elite enemies
- **Leveling**: Stats allocation, perk slots, free stat points on level-up

### Multiplayer
- **Parties**: Party formation, shared combat, loot sharing, revive mechanics
- **Chat**: Area chat, party chat, whispers, global shout
- **Trading**: Player-to-player trade system
- **Friends & Block**: Friend list, block list, online status
- **PvP**: Duel system with opt-in PvP areas

### Economy
- **Vendors**: City shops with tiered item catalogs
- **Crafting Economy**: Gathering materials, crafting valuable items
- **Gold Sinks**: Purchases, crafting fees, dungeon fees, inn rest

### Progression
- **Achievements**: 25+ achievements tracking kills, bosses, dungeons, equipment
- **World Bosses**: Timed world boss spawns with coordinated combat
- **Leaderboards**: PvP rankings, level rankings
- **Cosmetic Rewards**: Free cosmetics earned through gameplay milestones

### Admin & Content Management
- **Admin Panel**: Browser-based SPA for player management, bans, PvP toggle
- **Hot-Reload Content**: Edit enemies, items, areas without restart
- **Event System**: Time-limited events (bonus EXP, drop modifiers, boss spawns)
- **Security**: JWT auth, SQL injection prevention, input sanitization

---

## Project Structure

```
last-line/
├── content/                    # JSON game content (hot-reloadable)
│   ├── areas.json            # Area definitions
│   ├── enemies.json          # Enemy definitions
│   ├── items.json            # Item catalog
│   ├── skills.json          # Physical/magic/support skills
│   ├── crafting.json        # Materials, recipes, gathering nodes
│   ├── dungeons.json        # Dungeon definitions
│   ├── shops.json           # Shop catalogs
│   └── events.json          # Time-limited events
├── src/
│   ├── types.ts             # Core game types
│   ├── types_*.ts           # Extended type definitions
│   ├── client/
│   │   └── index.ts         # CLI client (WebSocket)
│   └── server/
│       ├── index.ts         # Server entry point
│       ├── auth/            # Authentication services
│       │   ├── PlayerAuthService.ts
│       │   └── SteamAuthService.ts
│       ├── api/             # REST API
│       │   └── AdminApi.ts  # Admin panel API
│       ├── content/         # Content management
│       │   ├── ContentManager.ts
│       │   ├── EventEngine.ts
│       │   └── HotReloadWatcher.ts
│       ├── engine/          # Game engines
│       │   ├── CombatEngine.ts
│       │   ├── CraftingManager.ts
│       │   ├── LootEngine.ts
│       │   ├── PartyCombatManager.ts
│       │   ├── PlayerEngine.ts
│       │   ├── RegenEngine.ts
│       │   ├── AchievementEngine.ts
│       │   ├── WorldBossEngine.ts
│       │   └── WorldBossCombatEngine.ts
│       ├── items/
│       │   └── InventoryManager.ts
│       ├── parser/
│       │   └── CommandParser.ts  # Command handlers
│       ├── persistence/     # Database managers
│       │   ├── SaveManager.ts
│       │   ├── PlayerDbManager.ts
│       │   ├── AdminDbManager.ts
│       │   └── CosmeticDbManager.ts
│       ├── social/          # Social features
│       │   ├── ChatRouter.ts
│       │   ├── FriendManager.ts
│       │   ├── LeaderboardManager.ts
│       │   ├── PartyManager.ts
│       │   ├── PresenceManager.ts
│       │   ├── PvPManager.ts
│       │   └── TradeManager.ts
│       └── store/
│           └── CosmeticStore.ts
├── admin/
│   └── index.html           # Admin panel SPA
├── store/
│   └── index.html           # Cosmetic store SPA
├── dist/                    # Compiled JavaScript (do not edit)
├── saves/                   # SQLite game database
└── package.json
```

---

## Server Installation (Ubuntu 24.04 LTS)

### Quick Install (Automated)

The easiest way to install on a fresh Ubuntu 24.04 LTS server:

```bash
# Clone the repository
git clone https://github.com/angka/Last-Line.git
cd Last-Line

# Run the automated installer
sudo bash install-server.sh
```

The installer will:
1. Update system packages
2. Install Node.js 20.x, git, and required tools
3. Clone repository from GitHub
4. Install npm dependencies and build TypeScript
5. Create required directories (saves, content)
6. Configure firewall (UFW) for game ports
7. Create systemd service for automatic startup
8. Generate secure JWT secrets
9. Start the server
10. Create update script for easy future updates

### Installation Options

```bash
# Install with specific git repository
sudo bash install-server.sh --repo https://github.com/your-fork/Last-Line.git

# Install to custom directory
sudo bash install-server.sh --install-dir /home/user/games/last-line

# Install as specific user
sudo bash install-server.sh --user gameuser

# Combined options
sudo bash install-server.sh --user gameuser --repo https://github.com/your-fork/Last-Line.git
```

#### Full Usage Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--user <username>` | Create/use specified system user | `lastline` |
| `--repo <url>` | Git repository URL | `https://github.com/angka/Last-Line.git` |
| `--install-dir <path>` | Installation directory | `/opt/last-line` |
| `--help`, `-h` | Show help message | - |

#### Environment Variables

You can also customize ports using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_PORT` | 8080 | Game server WebSocket port |
| `ADMIN_PORT` | 3001 | Admin panel HTTP port |
| `STORE_PORT` | 3002 | Cosmetic store port |

Example with custom ports:
```bash
GAME_PORT=9000 ADMIN_PORT=9001 STORE_PORT=9002 sudo bash install-server.sh
```

#### What the Script Does

| Step | Action |
|------|--------|
| 1 | Update apt packages |
| 2 | Install Node.js 20.x |
| 3 | Install git, curl, ufw |
| 4 | Create system user |
| 5 | Clone repository |
| 6 | Install npm dependencies |
| 7 | Build TypeScript |
| 8 | Create saves/content directories |
| 9 | Configure UFW firewall |
| 10 | Create systemd service |
| 11 | Generate .env configuration |
| 12 | Start server |

### Manual Installation

If you prefer manual setup:

#### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs npm git ufw

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### Installation Steps

```bash
# Create game directory
sudo mkdir -p /opt/last-line
cd /opt/last-line

# Clone repository
sudo git clone https://github.com/angka/Last-Line.git .

# Install dependencies
sudo npm install

# Build TypeScript
sudo npm run build

# Create required directories
sudo mkdir -p saves content
sudo chmod 755 saves content
```

#### Configuration

Create `.env` file in `/opt/last-line/`:

```bash
# Server
PORT=8080
ADMIN_PORT=3001
NODE_ENV=production

# JWT Secrets (generate with: openssl rand -base64 32)
PLAYER_JWT_SECRET=<your-secret-key>
ADMIN_JWT_SECRET=<your-admin-secret-key>

# Steam API (optional - for Steam authentication)
STEAM_API_KEY=<your-steam-api-key>
STEAM_APP_ID=<your-steam-app-id>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Systemd Service Setup

Create `/etc/systemd/system/last-line.service`:

```ini
[Unit]
Description=Last Line Game Server
Documentation=https://github.com/angka/Last-Line
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/last-line
EnvironmentFile=/opt/last-line/.env
ExecStart=/usr/bin/node dist/server/index.js

# Auto-restart configuration
Restart=on-failure
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30

# Restart limits (prevent infinite loops)
StartLimitInterval=300
StartLimitBurst=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=last-line

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/last-line
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

**Important:** The `EnvironmentFile=/opt/last-line/.env` line loads JWT secrets from the .env file. Without it, the server will fail to start.

```bash
# Enable auto-start on boot
sudo systemctl daemon-reload
sudo systemctl enable last-line

# Start service now
sudo systemctl start last-line

# Verify auto-start is enabled
sudo systemctl is-enabled last-line  # Should return "enabled"

# Check status
sudo systemctl status last-line

# View logs
sudo journalctl -u last-line -f
```

#### Firewall Setup

```bash
# Allow ports
sudo ufw allow 8080/tcp   # Game server
sudo ufw allow 3001/tcp   # Admin panel
sudo ufw allow 3002/tcp   # Cosmetic store

# Enable firewall (if not already enabled)
sudo ufw enable
```

### Server Management

```bash
# Service commands
sudo systemctl start last-line      # Start server
sudo systemctl stop last-line       # Stop server
sudo systemctl restart last-line     # Restart server
sudo systemctl status last-line     # Check status
sudo journalctl -u last-line -f    # View live logs

# Verify auto-start is enabled (server will start on reboot)
sudo systemctl is-enabled last-line  # Returns "enabled" if configured

# Alternative: Run directly
cd /opt/last-line
npm start
```

### Auto-Start on Reboot

The game server automatically starts when the server machine reboots.

**Verification:**
```bash
# Check if auto-start is enabled
sudo systemctl is-enabled last-line

# Test by rebooting
sudo reboot
# After reboot:
sudo systemctl status last-line
```

**If auto-start doesn't work:**
```bash
# Re-enable the service
sudo systemctl reenable last-line
sudo systemctl daemon-reload
sudo systemctl start last-line
```

### Updating the Server

When a new version is released, update the server using the update script:

```bash
# Download and run the update script
sudo curl -fsSL https://raw.githubusercontent.com/angka/Last-Line/main/update-server.sh -o /opt/last-line/update-server.sh
sudo bash /opt/last-line/update-server.sh
```

Or if the script is already on your server:

```bash
sudo bash /opt/last-line/update-server.sh
```

The update script will:
1. Stop the server
2. Pull the latest changes from GitHub
3. Install npm dependencies
4. Rebuild TypeScript
5. Restart the server

**Note:** The update script is included in the initial installation.

### Default Ports

| Port | Service | Access URL | Firewall Rule |
|------|---------|------------|----------------|
| 8080 | Game Server | `ws://<server>:8080` | `ufw allow 8080/tcp` |
| 3001 | Admin Panel | `http://<server>:3001/admin-panel` | `ufw allow 3001/tcp` |
| 3002 | Cosmetic Store | `http://<server>:3002/store/` | `ufw allow 3002/tcp` |

**Note:** All three ports are automatically opened by the install script when UFW is active.

---

## Client Installation

### Connecting to Server

By default, the client connects to `ws://localhost:8080`. To connect to a remote server, use the `SERVER_URL` environment variable:

```bash
# Windows (PowerShell)
$env:SERVER_URL="ws://192.168.1.100:8080"; npm run client

# Linux/macOS
SERVER_URL=ws://192.168.1.100:8080 npm run client

# Run with default (local server)
npm run client
```

### Windows

#### Option 1: Pre-built (recommended)

1. Download the `dist/client/` folder from the server
2. Run with custom server:
```powershell
$env:SERVER_URL="ws://your-server-ip:8080"
node dist/client/index.js
```

#### Option 2: From source

```powershell
# Install Node.js 20.x from https://nodejs.org/

# Clone/copy project files
git clone <repository-url>
cd last-line

# Install dependencies
npm install

# Build
npm run build

# Run client (local server)
npm run client

# Run client (remote server)
$env:SERVER_URL="ws://your-server-ip:8080"; npm run client
```

### Linux

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone/copy project files
git clone <repository-url>
cd last-line

# Install dependencies
npm install

# Build
npm run build

# Run client (local server)
npm run client

# Run client (remote server)
SERVER_URL=ws://your-server-ip:8080 npm run client
```

### macOS

```bash
# Install Node.js via Homebrew
brew install node@20

# Clone/copy project files
git clone <repository-url>
cd last-line

# Install dependencies
npm install

# Build
npm run build

# Run client (local server)
npm run client

# Run client (remote server)
SERVER_URL=ws://your-server-ip:8080 npm run client
```

### Connecting to Server

When the client prompts for server address, enter:
- **Local**: `localhost:8080`
- **Remote**: `<server-ip>:8080`

### Client Features

#### Session Persistence

The client automatically saves your login session to `~/.lastline/session.json`. When you restart the client, you'll see a "Continue as [username]" option to skip re-entering credentials.

```
╔═══════════════════════════════════════════════════════╗
║         Last Line - Server Selection                   ║
╠═══════════════════════════════════════════════════════╣
║  [C] Continue as angka                                ║
║  [1] Login (existing account)                         ║
║  [2] Register (new account)                           ║
║  [3] Continue as Guest (quick play)                   ║
╚═══════════════════════════════════════════════════════╝
```

To clear saved session: manually delete `~/.lastline/session.json`

#### New Player Experience

First-time characters see:
1. **Dark Fantasy Story Intro** — Sets the tone of a dying world where reality frays
2. **First Steps Commands Card** — Quick reference for essential commands
3. **Starting Location** — Ashford Village Square (safe zone, level 1-5)

```
═══════════════════════════════════════════════════════════════
                  THE WORLD IS DYING

  Reality frays at the edges. The Void bleeds through cracks in
  the fabric of existence. In villages like Ashford, people
  speak of shadows that move wrong, of dreams that bleed into
  waking hours.

  You have arrived at the edge of the known world. Beyond these
  cobblestones, darkness waits — ancient, hungry, patient.

  But also: treasure, glory, and answers to questions you
  haven't learned to ask yet.
═══════════════════════════════════════════════════════════════
```

---

## Player Commands

### Movement & Exploration

| Command | Alias | Description |
|---------|-------|-------------|
| `look` | `l` | View current area description |
| `go <dir>` | | Move in direction (north/south/east/west/up/down) |
| `map` | | Display explored areas |
| `travel <city>` | `tp` | Fast travel to unlocked city |

### Character

| Command | Alias | Description |
|---------|-------|-------------|
| `stats` | | View character statistics |
| `inventory <page>` | `inv` | View inventory (specify page) |
| `equip <n>` | | Equip item by slot number |
| `unequip <slot>` | | Unequip from slot (weapon/armor/accessory/ring) |
| `use <n>` | | Use consumable item |
| `drop <n>` | | Drop item from inventory |
| `skills` | | View learned skills |
| `gold` | | View gold amount |
| `achievements` | | View unlocked achievements |
| `rank` | | View your player rank |

### Combat

| Command | Alias | Description |
|---------|-------|-------------|
| `attack <n>` | `a` | Attack enemy (option: target number) |
| `skill <t> <n>` | `magic` | Use physical/magic skill |
| `learn <skill>` | | Learn new skill from scroll |
| `item <n>` | `i` | Use item in combat |
| `flee` | `f` | Attempt to flee combat |
| `log` | | View combat status |

### Dungeon

| Command | Alias | Description |
|---------|-------|-------------|
| `enter` | | Enter dungeon (at entrance) |
| `explore` | | Explore current floor for enemies |
| `up` | | Go to previous floor |
| `down` | | Go to next floor |
| `leave` | | Exit dungeon |
| `chest` | | Open treasure chest |
| `dungeon_status` | | View dungeon progress |

### Crafting & Gathering

| Command | Alias | Description |
|---------|-------|-------------|
| `gather` | | Gather from nearest node |
| `mine` | | Mine ore deposits |
| `chop` | | Chop wood |
| `pick` | | Pick herbs |
| `craft` | | Open crafting menu |
| `craft <recipe>` | | Craft specific recipe |

### Shopping

| Command | Alias | Description |
|---------|-------|-------------|
| `shop` | | View city shop |
| `buy <item>` | | Purchase item |
| `sell <item>` | | Sell item to vendor |
| `inn` | | Rest at inn (save game) |

### Social

| Command | Alias | Description |
|---------|-------|-------------|
| `who` | `nearby` | View players in current area |
| `say <text>` | | Send message to area |
| `shout <text>` | | Send message to all players |
| `msg <player> <text>` | `whisper` | Send private message |
| `p <text>` | `party_chat` | Send party message |

### Party & Trade

| Command | Alias | Description |
|---------|-------|-------------|
| `party invite <player>` | | Invite player to party |
| `party accept` | | Accept party invitation |
| `party leave` | | Leave current party |
| `party_start` | | Start party combat |
| `trade <player>` | | Initiate trade with player |
| `revive <player>` | | Revive fallen party member |
| `heal <ally>` | | Heal party member |
| `buff <ally>` | | Buff party member |
| `share_loot` | | Share pending loot with party |
| `pvp` | | View PvP options |

### Friends & Settings

| Command | Alias | Description |
|---------|-------|-------------|
| `friends` | `friend` | Manage friend list |
| `block <player>` | | Block/unblock player |
| `shop` | | Open cosmetic store (browser) |
| `save` | | Save game at inn |
| `help` | `?` | View help |

### Admin Commands (requires admin role)

| Command | Description |
|---------|-------------|
| `broadcast <msg>` | Broadcast message to all players |
| `shutdown` | Shutdown server |
| `reload` | Hot-reload content |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 8080 | Game server WebSocket port |
| `ADMIN_PORT` | No | 3001 | Admin panel HTTP port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `PLAYER_JWT_SECRET` | Yes | - | JWT secret for player authentication |
| `ADMIN_JWT_SECRET` | Yes | - | JWT secret for admin authentication |
| `STEAM_API_KEY` | No | - | Steam Web API key for Steam auth |
| `STEAM_APP_ID` | No | - | Steam application ID |
| `RATE_LIMIT_WINDOW_MS` | No | 60000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `ADMIN_USER` | No | admin | Default admin username |
| `ADMIN_PASS` | No | admin123 | Default admin password |

---

## Database

The game uses SQLite (via sql.js) for persistence. The database file is stored at:

```
saves/game.db
```

### Tables

- **players**: Player accounts (auth)
- **saves**: Character save data (3 slots per player)
- **auth_tokens**: Active JWT sessions
- **friends**: Friend relationships
- **blocks**: Blocked players
- **admin_accounts**: Admin panel accounts
- **admin_sessions**: Admin JWT sessions
- **audit_log**: Admin actions audit trail
- **player_bans**: Bans
- **cosmetics**: Cosmetic item definitions
- **player_cosmetics**: Owned cosmetics
- **player_entitlements**: DLC entitlements
- **cosmetic_rewards**: Reward definitions
- **player_reward_claims**: Claimed rewards

---

## Admin Panel

Access: `http://<server-ip>:3001/admin-panel`

### Features

- **Dashboard**: Server stats, online players
- **Players**: View online players, player details
- **Bans**: Ban/unban players
- **PvP Settings**: Toggle PvP per area
- **World Boss**: Trigger and manage world bosses
- **Audit Log**: View admin actions
- **Admin Accounts**: Create/delete admin users
- **Content Editor**: Edit game content (JSON)
- **Events**: Create and manage time-limited events
- **Live View**: Real-time server monitoring

### Default Credentials

```
Username: admin
Password: admin123
```

**Change these immediately in production!**

---

## Cosmetic Store

Access: `http://<server-ip>:3002/store/` (or via `/shop` command)

### Features

- **Browse Categories**: Skins, Chat Effects, Titles, Status Effects
- **Preview Items**: See cosmetic appearances
- **Purchase**: Steam Wallet or free rewards
- **Inventory**: View owned cosmetics
- **Equip**: Apply cosmetics to character

### Free Rewards

Players earn free cosmetics through gameplay:

| Trigger | Reward |
|---------|--------|
| Level 10 | Chat Effect "Beginner's Glow" |
| Level 25 | Skin "Iron Guard Helm" |
| Level 50 | Title "Veteran" |
| First Dungeon Clear | Skin "Dungeon Delver's Plate" |
| First PvP Kill | Chat Bubble "Vanquisher" |
| 10 Friends | Title "Popular" |

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://<server>:8080');
```

### Client → Server Messages

```javascript
// Authentication
{ type: 'register', playerName: 'Hero', password: 'secret' }
{ type: 'login', playerName: 'Hero', password: 'secret' }
{ type: 'logout' }

// Game commands
{ type: 'command', text: 'look' }
{ type: 'command', text: 'go north' }

// Social
{ type: 'say', text: 'Hello!' }
{ type: 'whisper', target: 'Player2', text: 'Hi' }

// Party
{ type: 'party_invite', target: 'Player2' }
{ type: 'party_accept', partyId: 'xxx' }

// Trade
{ type: 'trade_request', target: 'Player2' }
{ type: 'trade_accept', tradeId: 'xxx' }
```

### Server → Client Messages

```javascript
// Auth response
{ type: 'login_success', playerId: 'xxx', token: 'jwt', save: {...} }
{ type: 'login_error', error: 'Invalid credentials' }

// Command response
{ type: 'command', text: 'Area description...', newSave: {...} }

// Combat
{ type: 'combat', session: {...} }
{ type: 'victory', rewards: {...} }

// Social
{ type: 'area_chat', player: 'Player2', text: 'Hello!' }
{ type: 'whisper', from: 'Player2', text: 'Hi' }

// Notifications
{ type: 'notification', text: 'Achievement unlocked!' }
{ type: 'level_up', newLevel: 10 }
```

---

## Release Notes

### v1.0.0 (2026-05-13)

#### New Features

**Data-Driven Architecture**
- JSON-based game content (enemies, items, areas, dungeons, skills, crafting)
- Hot-reload content without server restart
- Admin panel content editor
- Event system for time-limited bonuses

**Player Features**
- Full crafting system with gathering nodes
- Party combat with shared loot
- World boss events
- Cosmetic rewards system
- Expanded achievement tracking

**Admin Features**
- Browser-based admin SPA
- Event manager
- Live server monitoring
- Content hot-reload

#### Bug Fixes

- Fixed TypeScript compilation errors
- Fixed CLI tab completion
- Fixed database query issues
- Added proper error handling

#### Security

- JWT authentication with expiry
- WebSocket message validation
- SQL injection prevention
- Input sanitization
- Path traversal prevention
- Rate limiting

#### Performance

- Database indexes on all queried columns
- In-memory content caching
- WebSocket message optimization

---

### v0.9.0 (2026-05-12)

#### New Features

- Steam authentication integration
- Cosmetic store with 17 items across 6 categories
- DLC entitlement system for gated areas
- Free cosmetic rewards for achievements
- Player inventory expansion purchasable

---

### v0.8.0 (2026-04-28)

#### New Features

- Achievements system (25+ achievements)
- PvP leaderboard
- World boss engine
- Party system enhancements
- Enhanced admin system with audit logging

---

### v0.7.0 (2026-04-23)

#### New Features

- Multiplayer WebSocket server
- Party formation and management
- Trading system
- Social features (chat, whispers, shouts)
- Friend list and block list

---

### v0.6.0 (2026-04-21)

#### New Features

- Dungeon system with multi-floor traversal
- Boss encounters and treasure chests
- Equipment rarity tiers (common → mythic)
- Extended crafting system

---

### v0.5.0 (2026-04-19)

#### New Features

- Combat engine with skills
- Physical and magic skill trees
- Status effects (poison, burn, stun, etc.)
- Loot and inventory management

---

### v0.1.0 (2026-04-19)

#### Initial Release

- Single-player CLI game engine
- WebSocket server/client architecture
- 34 areas across 8 regions
- Basic combat system
- Save/load functionality

---

## Support

For issues or feature requests, open an issue on the project repository.

---

## License

MIT License
