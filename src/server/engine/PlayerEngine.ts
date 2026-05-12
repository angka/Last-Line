import type { PlayerStats, SaveFile } from '../../types';
import { getDefaultEquipment } from '../content/ContentManager';
import { v4 as uuid } from 'uuid';

// ─── Stat Helpers ──────────────────────────────────────────────────────────────

export function calcExpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function calcDodgeChance(agility: number): number {
  return agility / (agility + 150);
}

export function calcAccuracy(agility: number, weaponAccuracy = 70): number {
  return agility * 0.5 + weaponAccuracy;
}

export function calcCritRate(level: number, baseLuck: number): number {
  return Math.min(0.75, 0.05 + level * 0.005 + baseLuck * 0.003);
}

export function calcCritDamage(level: number): number {
  return 1.5 + level * 0.01;
}

// ─── Level Up ─────────────────────────────────────────────────────────────────

export function levelUp(stats: PlayerStats): PlayerStats {
  const s = { ...stats };
  s.level += 1;
  s.maxHp += 10;
  s.maxMana += 5;
  s.strength += 2;
  s.agility += 1;
  s.defense += 2;
  s.luck += 1;
  s.critRate = Math.min(0.75, s.critRate + 0.005);
  s.critDamage += 0.1;
  s.hp = s.maxHp;
  s.mana = s.maxMana;
  s.exp -= s.expToNext;
  s.expToNext = calcExpToNext(s.level);

  if (s.level % 5 === 0) s.freeStatPoints += 1;
  if (s.level % 10 === 0) s.perkSlots += 1;

  return s;
}

export function applyStatPoint(stats: PlayerStats, stat: 'strength' | 'agility' | 'defense' | 'luck'): PlayerStats {
  if (stats.freeStatPoints <= 0) return stats;
  const s = { ...stats };
  s.freeStatPoints -= 1;
  s[stat] += 1;
  return s;
}

// ─── Default Stats ────────────────────────────────────────────────────────────

export function createDefaultStats(name: string): PlayerStats {
  return {
    name,
    level: 1,
    exp: 0,
    expToNext: 100,
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    gold: 50,
    strength: 5,
    agility: 5,
    defense: 5,
    luck: 3,
    attack: 5,
    critRate: 0.05,
    critDamage: 1.5,
    freeStatPoints: 0,
    perkSlots: 0,
  };
}

// ─── Default SaveFile ──────────────────────────────────────────────────────────

export function createDefaultSave(playerName: string): SaveFile {
  return {
    saveId: uuid(),
    playerId: '', // populated at registration time
    playerName,
    savedAt: new Date().toISOString(),
    playtime: 0,
    stats: createDefaultStats(playerName),
    inventory: [],
    equipped: {
      weapon: null,
      armor: null,
      accessory1: null,
      accessory2: null,
    },
    skills: { physical: [], magic: [], support: [] },
    worldState: {
      currentArea: 'ashford_village_square',
      currentCity: 'ashford_village',
      unlockedCities: ['ashford_village'],
      unlockedDungeons: [],
      defeatedBosses: [],
      dungeonProgress: [],
      dungeonChests: [],
    },
    pendingLoot: [],
    socialPrefs: {
      chatVisible: true,
      nearbyVisible: true,
      chatArea: true,
      chatParty: true,
      chatShout: true,
    },
    pvp: { enabled: false, safeZone: true },
    regenState: 'city',
    achievements: [],
    achievementStats: {
      totalKills: 0,
      bossKills: 0,
      tradesCompleted: 0,
      itemsCrafted: 0,
      resourcesGathered: 0,
      pvpKills: 0,
      worldBossKills: 0,
      dungeonsCleared: [],
      deepestFloors: {},
      visitedAreas: ['ashford_village_square'],
    },
    pvpStats: {
      kills: 0,
      deaths: 0,
      winStreak: 0,
      bestStreak: 0,
      seasonWins: 0,
      seasonPoints: 1000, // starting ELO
    },
  };
}

// ─── Combat Stats ───────────────────────────────────────────────────────────────

export function computeAttack(stats: PlayerStats, weaponDamage = 0): number {
  const wpn = weaponDamage;
  const strBonus = stats.strength * 0.5;
  return Math.floor(stats.attack + wpn + strBonus);
}
