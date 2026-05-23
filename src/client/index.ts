import WebSocket from 'ws';
import * as readline from 'readline';

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';

// ─── Server Configuration ────────────────────────────────────────────────────────

const TAILSCALE_IP = '100.108.29.73';
const DEFAULT_PORT = '8080';

let serverUrl: string | null = null;

function getServerUrl(): string {
  return serverUrl || SERVER_URL;
}

function promptServerSelection(): Promise<string> {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║         Last Line - Server Selection                   ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  [1] Connect to Tailscale (${TAILSCALE_IP})   ║`);
  console.log('║  [2] Connect to localhost                            ║');
  console.log('║  [3] Enter custom IP address                        ║');
  console.log('║  [Q] Quit                                           ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  return new Promise((resolve) => {
    rl.question('Enter selection: ', (choice: string) => {
      const trimmed = choice.trim().toLowerCase();
      if (trimmed === '1') {
        console.log(`\n  → Connecting to ${TAILSCALE_IP}:${DEFAULT_PORT}...`);
        resolve(`ws://${TAILSCALE_IP}:${DEFAULT_PORT}`);
      } else if (trimmed === '2') {
        console.log('\n  → Connecting to localhost:8080...');
        resolve('ws://localhost:8080');
      } else if (trimmed === '3') {
        rl.question('  Enter server IP (without port): ', (ip: string) => {
          const cleanIp = ip.trim();
          if (!cleanIp) {
            console.log('  Invalid IP. Using Tailscale default.');
            resolve(`ws://${TAILSCALE_IP}:${DEFAULT_PORT}`);
          } else {
            console.log(`\n  → Connecting to ${cleanIp}:${DEFAULT_PORT}...`);
            resolve(`ws://${cleanIp}:${DEFAULT_PORT}`);
          }
        });
      } else if (trimmed === 'q') {
        console.log('\n  Goodbye!');
        process.exit(0);
      } else {
        console.log('  Invalid selection. Please try again.');
        resolve(promptServerSelection());
      }
    });
  });
}

interface ClientState {
  socket: WebSocket;
  sessionId?: string;
  playerId: string;
  playerName: string;
  token: string;
  saveSlot: number;
  connected: boolean;
}

let state: ClientState | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer(line: string) {
    const cmds = [
      'look', 'l', 'go', 'stats', 'inventory', 'inv', 'equip', 'unequip',
      'use', 'drop', 'skills', 'gold', 'rest', 'save', 'map', 'help',
      'attack', 'a', 'flee', 'f', 'item', 'i', 'log', 'quit',
      'friend', 'friends', 'block', 'shop',
      'travel', 'inn', 'buy', 'sell',
      'explore', 'up', 'down', 'leave', 'dungeon_status',
      'skill', 'magic', 'learn', 'craft',
      'gather', 'mine', 'chop', 'pick', 'fill', 'sift', 'attune',
      'loot', 'pending_loot', 'chest',
      'who', 'nearby', 'say', 'msg', 'whisper', 'shout',
      'party', 'trade', 'pvp',
      'achievements', 'worldboss', 'leaderboard', 'rank',
    ];
    const hits = cmds.filter(c => c.startsWith(line.toLowerCase()));
    return [hits.length ? hits : [], line];
  },
});

function prompt(msg?: string): void {
  if (msg) process.stdout.write('\n' + msg + '\n');
  rl.question('> ', handleInput);
}

function handleInput(cmd: string): void {
  if (!state?.connected) {
    console.log('Not connected to server. Use "connect" first.');
    prompt();
    return;
  }

  if (!cmd.trim()) { prompt(); return; }

  state.socket.send(JSON.stringify({ type: 'command', cmd: cmd.trim() }));

  // Phase 11: Shop command opens browser store
  if (cmd.trim().toLowerCase() === 'shop') {
    console.log('\n  Opening cosmetic store in browser...');
    state.socket.send(JSON.stringify({ type: 'shop' }));
  }
  prompt();
}

function divider(): string {
  return '  ╔═══════════════════════════════════════════════════════════════════════╗';
}

function subDivider(): string {
  return '  ╠═══════════════════════════════════════════════════════════════════════╣';
}

function footer(): string {
  return '  ╚═══════════════════════════════════════════════════════════════════════╝';
}

// ─── Phase 11: Store Display ─────────────────────────────────────────────────────

function displayStore(data: any): void {
  console.log('\n' + divider());
  console.log('  ⚔  LAST LINE — COSMETIC STORE');
  console.log(subDivider());

  const categories = ['skin', 'chat', 'title', 'effect', 'housing'];
  for (const cat of categories) {
    const items = data.cosmetics.filter((c: any) => c.category === cat);
    if (!items.length) continue;
    console.log(`  ║  ── ${cat.toUpperCase()} ─────────────────────────────────────────────`);
    for (const item of items) {
      const owned = data.ownedCosmetics.includes(item.id);
      const price = item.priceUsd ? `$${item.priceUsd.toFixed(2)}` : 'FREE';
      const status = owned ? '✓ OWNED' : price;
      console.log(`  ║    ${item.name.padEnd(25)} [${item.rarity.toUpperCase().padEnd(10)}] ${status}`);
    }
  }

  console.log(subDivider());
  console.log(`  ║  Inventory Slots: ${data.inventorySlots}`);
  console.log(footer());
  console.log('  Type: purchase <item_id> | equip <item_id> | claim <reward_id>\n');
}

// ─── Auth Functions ─────────────────────────────────────────────────────────────

async function authLogin(): Promise<{ success: boolean; playerId?: string; username?: string; token?: string; error?: string }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(getServerUrl());

    ws.on('open', () => {
      rl.question('  Username or email: ', (username: string) => {
        rl.question('  Password: ', async (password: string) => {
          ws.send(JSON.stringify({ type: 'auth_login', username: username.trim(), password }));
        });
      });
    });

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      ws.close();

      if (msg.type === 'auth_success') {
        resolve({ success: true, playerId: msg.playerId, username: msg.username, token: msg.token });
      } else {
        resolve({ success: false, error: msg.text ?? 'Login failed.' });
      }
    });

    ws.on('error', () => {
      resolve({ success: false, error: 'Cannot connect to server.' });
    });
  });
}

async function authRegister(): Promise<{ success: boolean; playerId?: string; username?: string; token?: string; error?: string }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(getServerUrl());

    ws.on('open', () => {
      rl.question('  Choose a username (3-20 chars, letters/numbers/underscore): ', (username: string) => {
        rl.question('  Email: ', (email: string) => {
          rl.question('  Password (min 6 chars): ', (password: string) => {
            ws.send(JSON.stringify({ type: 'auth_register', username: username.trim(), email: email.trim(), password }));
          });
        });
      });
    });

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      ws.close();

      if (msg.type === 'auth_success') {
        resolve({ success: true, playerId: msg.playerId, username: msg.username, token: msg.token });
      } else {
        resolve({ success: false, error: msg.text ?? 'Registration failed.' });
      }
    });

    ws.on('error', () => {
      resolve({ success: false, error: 'Cannot connect to server.' });
    });
  });
}

// ─── Connection ─────────────────────────────────────────────────────────────────

function connectWithAuth(playerId: string, playerName: string, token: string, slot = 1): void {
  const ws = new WebSocket(getServerUrl());

  ws.on('open', () => {
    console.log(`[Connected] Logging in as ${playerName}...`);
    ws.send(JSON.stringify({ type: 'connect', playerId, name: playerName, token, slot }));
  });

  ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'connected' || msg.type === 'loaded') {
      state = { socket: ws, sessionId: msg.sessionId, playerId, playerName, token, saveSlot: slot, connected: true };
      console.log('\n' + divider());
      console.log('  ⚔  LAST LINE  —  CLI Adventure Game');
      console.log(divider());
      if (msg.type === 'connected') {
        console.log('\n  Welcome, ' + playerName + '! Your journey begins at Ashford Village.');
        console.log('  Starting gear: Wooden Sword, Tattered Cloth, 3× Health Potion I');
        console.log('  Type "help" for commands.\n');
      } else {
        console.log('\n  Game loaded. Welcome back, ' + playerName + '.\n');
      }
      ws.send(JSON.stringify({ type: 'command', cmd: 'look' }));
      setTimeout(() => prompt(), 100);
      return;
    }

    if (msg.type === 'auth_error' || msg.type === 'auth_required') {
      console.log('\n  ⚠ ' + (msg.text ?? 'Authentication failed.'));
      ws.close();
      mainMenu();
      return;
    }

    if (msg.type === 'output') {
      process.stdout.write('\n' + msg.text + '\n');
      return;
    }

    if (msg.type === 'push') {
      process.stdout.write('\n' + msg.text + '\n');
      return;
    }

    if (msg.type === 'error') {
      console.log('\n  ⚠ ' + msg.text);
      return;
    }

    if (msg.type === 'quit') {
      console.log('\n  Goodbye!\n');
      rl.close();
      process.exit(0);
    }

    // Phase 11: Store handlers
    if (msg.type === 'store_url') {
      console.log('\n  Opening cosmetic store in your browser...');
      return;
    }

    if (msg.type === 'store_data') {
      displayStore(msg);
      return;
    }

    if (msg.type === 'purchase_success') {
      console.log('\n  ✓ Purchase successful! Item added to your inventory.');
      return;
    }

    if (msg.type === 'cosmetic_equipped') {
      console.log('\n  ✓ Cosmetic equipped!');
      return;
    }

    if (msg.type === 'reward_claimed') {
      console.log('\n  ✓ Reward claimed! Check your cosmetics.');
      return;
    }
  });

  ws.on('error', (err) => {
    console.error('[Connection error]', err.message);
    console.log('  Is the server running? Start it with: npm run dev');
    process.exit(1);
  });

  ws.on('close', () => {
    console.log('\n  Connection closed.');
    state = null;
  });
}

function connectNewCharacter(playerId: string, playerName: string, token: string): void {
  connectWithAuth(playerId, playerName, token, 1);
}

function connectExistingCharacter(playerId: string, playerName: string, token: string): void {
  connectWithAuth(playerId, playerName, token, 1);
}

// ─── Boot / Main Menu ───────────────────────────────────────────────────────────

function mainMenu(): void {
  console.log(divider());
  console.log('  ⚔  LAST LINE  —  CLI Adventure Game');
  console.log(subDivider());
  console.log('  [1] Login (existing account)');
  console.log('  [2] Register (new account)');
  console.log('  [3] Continue as Guest (quick play)');
  console.log(footer());

  rl.question('> ', (choice: string) => {
    const trimmed = choice.trim();
    if (trimmed === '1') {
      doLogin();
    } else if (trimmed === '2') {
      doRegister();
    } else if (trimmed === '3') {
      doGuest();
    } else {
      console.log('Invalid choice. Please enter 1, 2, or 3.');
      mainMenu();
    }
  });
}

async function doLogin(): Promise<void> {
  console.log('\n  ═══ LOGIN ═══');
  const result = await authLogin();

  if (!result.success) {
    console.log('\n  ⚠ ' + (result.error ?? 'Login failed.'));
    console.log('  Press Enter to return to menu...');
    rl.question('', () => mainMenu());
    return;
  }

  console.log('\n  ✓ Login successful!');
  console.log('  Welcome back, ' + result.username + '!');

  // Now show character selection
  characterSelect(result.playerId!, result.username!, result.token!);
}

async function doRegister(): Promise<void> {
  console.log('\n  ═══ CREATE ACCOUNT ═══');
  const result = await authRegister();

  if (!result.success) {
    console.log('\n  ⚠ ' + (result.error ?? 'Registration failed.'));
    console.log('  Press Enter to return to menu...');
    rl.question('', () => mainMenu());
    return;
  }

  console.log('\n  ✓ Account created!');
  console.log('  Welcome, ' + result.username + '! Your account is ready.');

  // Create character and connect
  connectNewCharacter(result.playerId!, result.username!, result.token!);
}

function doGuest(): void {
  // Guest mode: simple registration without email
  const guestId = 'guest_' + Date.now();
  const guestName = 'Guest' + Math.floor(Math.random() * 9999);

  const ws = new WebSocket(getServerUrl());

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth_register', username: guestName, email: guestId + '@guest.local', password: 'guest_' + guestId }));
  });

  ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'auth_success') {
      ws.close();
      console.log('\n  ✓ Guest account created!');
      connectWithAuth(msg.playerId, guestName, msg.token, 1);
    } else if (msg.type === 'auth_error') {
      console.log('\n  ⚠ ' + (msg.text ?? 'Guest mode unavailable.'));
      ws.close();
      mainMenu();
    }
  });

  ws.on('error', () => {
    console.log('\n  ⚠ Cannot connect to server.');
    mainMenu();
  });
}

function characterSelect(playerId: string, playerName: string, token: string): void {
  console.log(divider());
  console.log('  ⚔  CHARACTER SELECT');
  console.log(subDivider());
  console.log(`  Logged in as: ${playerName}`);
  console.log('  [1] New Game (create character)');
  console.log('  [2] Load Game (existing save)');
  console.log('  [3] Back to main menu');
  console.log(footer());

  rl.question('> ', (choice: string) => {
    const trimmed = choice.trim();
    if (trimmed === '1') {
      rl.question('  Enter your character name: ', (name: string) => {
        if (!name.trim() || name.length < 2 || name.length > 20) {
          console.log('  Name must be 2–20 characters.');
          characterSelect(playerId, playerName, token);
          return;
        }
        connectNewCharacter(playerId, name.trim(), token);
      });
    } else if (trimmed === '2') {
      rl.question('  Enter your character name: ', (name: string) => {
        if (!name.trim()) { characterSelect(playerId, playerName, token); return; }
        connectExistingCharacter(playerId, name.trim(), token);
      });
    } else if (trimmed === '3') {
      mainMenu();
    } else {
      console.log('Invalid choice.');
      characterSelect(playerId, playerName, token);
    }
  });
}

// ─── Boot ───────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // Check for SERVER_URL env var first
  if (process.env.SERVER_URL) {
    serverUrl = process.env.SERVER_URL;
    console.log(`\n  → Using server from SERVER_URL: ${serverUrl}`);
    mainMenu();
    return;
  }

  // Show server selection menu
  const selectedUrl = await promptServerSelection();
  serverUrl = selectedUrl;
  mainMenu();
}

boot();