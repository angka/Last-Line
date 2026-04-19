"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const readline = __importStar(require("readline"));
const SERVER_URL = 'ws://localhost:8080';
let state = null;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer(line) {
        const cmds = [
            'look', 'l', 'go', 'stats', 'inventory', 'inv', 'equip', 'unequip',
            'use', 'drop', 'skills', 'gold', 'rest', 'save', 'map', 'help',
            'attack', 'a', 'flee', 'f', 'item', 'i', 'log', 'quit',
        ];
        const hits = cmds.filter(c => c.startsWith(line.toLowerCase()));
        return [hits.length ? hits : [], line];
    },
});
function prompt(msg) {
    if (msg)
        process.stdout.write('\n' + msg + '\n');
    rl.question('> ', handleInput);
}
function handleInput(cmd) {
    if (!state?.connected) {
        console.log('Not connected to server. Use "connect" first.');
        prompt();
        return;
    }
    if (!cmd.trim()) {
        prompt();
        return;
    }
    state.socket.send(JSON.stringify({ type: 'command', cmd: cmd.trim() }));
    prompt();
}
function connect(playerId, name, slot = 1) {
    const ws = new ws_1.default(SERVER_URL);
    ws.on('open', () => {
        console.log(`[Connected] Registering as ${name} (slot ${slot})...`);
        ws.send(JSON.stringify({ type: 'register', playerId, name, slot }));
    });
    ws.on('message', (data) => {
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
            }
            else {
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
function divider() {
    return '  ╔═══════════════════════════════════════════════════════════════════════╗';
}
// ─── Boot Sequence ─────────────────────────────────────────────────────────────
function boot() {
    console.log(divider());
    console.log('  ⚔  LAST LINE  —  CLI Adventure Game');
    console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
    console.log('  [1] New Game (create character)');
    console.log('  [2] Load Game (existing save)');
    console.log('  ╚═══════════════════════════════════════════════════════════════════════╝');
    rl.question('> ', (choice) => {
        if (choice.trim() === '1') {
            createCharacter();
        }
        else if (choice.trim() === '2') {
            loadCharacter();
        }
        else {
            console.log('Invalid choice.');
            boot();
        }
    });
}
function createCharacter() {
    rl.question('  Enter your character name: ', (name) => {
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
function loadCharacter() {
    rl.question('  Enter your character name: ', (name) => {
        if (!name.trim()) {
            loadCharacter();
            return;
        }
        const playerId = 'player_' + name.toLowerCase().replace(/\s+/g, '_');
        connect(playerId, name.trim(), 1);
        setTimeout(() => prompt(), 100);
    });
}
boot();
//# sourceMappingURL=index.js.map