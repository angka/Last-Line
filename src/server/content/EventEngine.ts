import * as fs from 'fs';
import * as path from 'path';
import type { GameEvent, ActiveEvent } from '../../types_event';

const EVENTS_FILE = path.join(__dirname, '..', '..', '..', 'content', 'events.json');

let events: Record<string, GameEvent> = {};
let activeEvents: ActiveEvent[] = [];
let lastCheck: number = 0;

export function loadEvents(): void {
  if (!fs.existsSync(EVENTS_FILE)) {
    console.log('[EventEngine] events.json not found, no events loaded');
    return;
  }
  try {
    const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
    events = JSON.parse(content);
    console.log(`[EventEngine] Loaded ${Object.keys(events).length} events`);
  } catch (err) {
    console.error('[EventEngine] Failed to load events.json:', err);
    events = {};
  }
}

export function reloadEvents(): void {
  loadEvents();
  checkActiveEvents();
}

export function checkActiveEvents(): ActiveEvent[] {
  const now = Date.now();
  const active: ActiveEvent[] = [];

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

export function getActiveEvents(): ActiveEvent[] {
  return activeEvents;
}

export function getExpMultiplier(): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (event.effects.expMultiplier) {
      multiplier *= event.effects.expMultiplier;
    }
  }
  return multiplier;
}

export function getGoldMultiplier(): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (event.effects.goldMultiplier) {
      multiplier *= event.effects.goldMultiplier;
    }
  }
  return multiplier;
}

export function getDropMultiplier(enemyId?: string, itemId?: string): number {
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

export function getSpawnedEnemies(): { enemyId: string; areaId: string }[] {
  const spawned: { enemyId: string; areaId: string }[] = [];
  for (const event of activeEvents) {
    if (event.type === 'enemy_spawn' && event.effects.spawnEnemyId && event.effects.spawnAreaId) {
      spawned.push({ enemyId: event.effects.spawnEnemyId, areaId: event.effects.spawnAreaId });
    }
  }
  return spawned;
}

export function getTreasureAreas(): string[] {
  const areas: string[] = [];
  for (const event of activeEvents) {
    if (event.type === 'treasure_spawn' && event.effects.treasureAreaIds) {
      areas.push(...event.effects.treasureAreaIds);
    }
  }
  return areas;
}

export function getLastCheck(): number {
  return lastCheck;
}

export function getAllEvents(): Record<string, GameEvent> {
  return events;
}