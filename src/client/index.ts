import WebSocket from 'ws';
import * as readline from 'readline';

const SERVER_URL = 'ws://localhost:8080';

interface ClientState {
  socket: WebSocket;
  sessionId?: string;
  playerId: string;
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
  prompt();
}

function connect(playerId: string, name: string, slot = 1): void {
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    console.log(`[Connected] Registering as ${name} (slot ${slot})...`);
    ws.send(JSON.stringify({ type: 'register', playerId, name, slot }));
  });

  ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'connected' || msg.type === 'loaded') {
      state = { socket: ws, sessionId: msg.sessionId, playerId, saveSlot: slot, connected: true };
      console.log('\n' + divider());
      console.log('  ⚔  LAST LINE  —  CLI Adventure Game');
      console.log(divider());
      if (msg.type === 'connected') {
        console.log('\n  Welcome, ' + name + '! Your journey begins at Ashford Village.');
        console.log('  Starting gear: Wooden Sword, Tattered Cloth, 3× Health Potion I');
        console.log('  Type "help" for commands.\n');
      } else {
        console.log('\n  Game loaded. Welcome back, ' + name + '.\n');
      }
      ws.send(JSON.stringify({ type: 'command', cmd: 'look' }));
      return;
    }

    if (msg.type === 'output') {
      process.stdout.write('\n' + msg.text + '\n');
      return;
    }

    if (msg.type === 'quit') {
      console.log('\n  Goodbye!\n');
      rl.close();
      process.exit(0);
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

function divider(): string {
  return '  ╔═══════════════════════════════════════════════════════════════════════╗';
}

// ─── Boot Sequence ─────────────────────────────────────────────────────────────

function boot(): void {
  console.log(divider());
  console.log('  ⚔  LAST LINE  —  CLI Adventure Game');
  console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('  [1] New Game (create character)');
  console.log('  [2] Load Game (existing save)');
  console.log('  ╚═══════════════════════════════════════════════════════════════════════╝');

  rl.question('> ', (choice: string) => {
    if (choice.trim() === '1') {
      createCharacter();
    } else if (choice.trim() === '2') {
      loadCharacter();
    } else {
      console.log('Invalid choice.');
      boot();
    }
  });
}

function createCharacter(): void {
  rl.question('  Enter your character name: ', (name: string) => {
    if (!name.trim() || name.length < 2 || name.length > 20) {
      console.log('  Name must be 2–20 characters.');
      createCharacter();
      return;
    }
    const playerId = 'player_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    connect(playerId, name.trim(), 1);
    setTimeout(() => prompt(), 100);
  });
}

function loadCharacter(): void {
  rl.question('  Enter your character name: ', (name: string) => {
    if (!name.trim()) { loadCharacter(); return; }
    const playerId = 'player_' + name.toLowerCase().replace(/\s+/g, '_');
    connect(playerId, name.trim(), 1);
    setTimeout(() => prompt(), 100);
  });
}

boot();
