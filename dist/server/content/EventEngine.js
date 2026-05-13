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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEvents = loadEvents;
exports.reloadEvents = reloadEvents;
exports.checkActiveEvents = checkActiveEvents;
exports.getActiveEvents = getActiveEvents;
exports.getExpMultiplier = getExpMultiplier;
exports.getGoldMultiplier = getGoldMultiplier;
exports.getDropMultiplier = getDropMultiplier;
exports.getSpawnedEnemies = getSpawnedEnemies;
exports.getTreasureAreas = getTreasureAreas;
exports.getLastCheck = getLastCheck;
exports.getAllEvents = getAllEvents;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EVENTS_FILE = path.join(__dirname, '..', '..', '..', 'content', 'events.json');
let events = {};
let activeEvents = [];
let lastCheck = 0;
function loadEvents() {
    if (!fs.existsSync(EVENTS_FILE)) {
        console.log('[EventEngine] events.json not found, no events loaded');
        return;
    }
    try {
        const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
        events = JSON.parse(content);
        console.log(`[EventEngine] Loaded ${Object.keys(events).length} events`);
    }
    catch (err) {
        console.error('[EventEngine] Failed to load events.json:', err);
        events = {};
    }
}
function reloadEvents() {
    loadEvents();
    checkActiveEvents();
}
function checkActiveEvents() {
    const now = Date.now();
    const active = [];
    for (const event of Object.values(events)) {
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();
        const isActive = now >= start && now <= end;
        active.push({
            ...event,
            isActive,
            timeRemaining: isActive ? end - now : 0,
        });
    }
    activeEvents = active.filter(e => e.isActive);
    lastCheck = now;
    return activeEvents;
}
function getActiveEvents() {
    return activeEvents;
}
function getExpMultiplier() {
    let multiplier = 1.0;
    for (const event of activeEvents) {
        if (event.effects.expMultiplier) {
            multiplier *= event.effects.expMultiplier;
        }
    }
    return multiplier;
}
function getGoldMultiplier() {
    let multiplier = 1.0;
    for (const event of activeEvents) {
        if (event.effects.goldMultiplier) {
            multiplier *= event.effects.goldMultiplier;
        }
    }
    return multiplier;
}
function getDropMultiplier(enemyId, itemId) {
    let multiplier = 1.0;
    for (const event of activeEvents) {
        if (event.type === 'drop_modifier' && event.effects.dropMultiplier) {
            if (enemyId && event.effects.affectedEnemies?.includes(enemyId)) {
                multiplier *= event.effects.dropMultiplier;
            }
            if (itemId && event.effects.affectedItems?.includes(itemId)) {
                multiplier *= event.effects.dropMultiplier;
            }
            if (!enemyId && !itemId && !event.effects.affectedEnemies?.length && !event.effects.affectedItems?.length) {
                multiplier *= event.effects.dropMultiplier;
            }
        }
    }
    return multiplier;
}
function getSpawnedEnemies() {
    const spawned = [];
    for (const event of activeEvents) {
        if (event.type === 'enemy_spawn' && event.effects.spawnEnemyId && event.effects.spawnAreaId) {
            spawned.push({ enemyId: event.effects.spawnEnemyId, areaId: event.effects.spawnAreaId });
        }
    }
    return spawned;
}
function getTreasureAreas() {
    const areas = [];
    for (const event of activeEvents) {
        if (event.type === 'treasure_spawn' && event.effects.treasureAreaIds) {
            areas.push(...event.effects.treasureAreaIds);
        }
    }
    return areas;
}
function getLastCheck() {
    return lastCheck;
}
function getAllEvents() {
    return events;
}
//# sourceMappingURL=EventEngine.js.map