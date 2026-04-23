/**
 * Phase 5 — Party Combat Manager
 * Coordinates shared combat sessions for party members.
 * Manages the combat lifecycle: start, turns, timer, resolution.
 */

import type { SaveFile, CombatParticipant } from '../../types';
import { presenceManager } from '../social/PresenceManager';
import { partyManager } from '../social/PartyManager';
import {
  createPartyCombatSession,
  advancePartyTurn,
  getCurrentTurnParticipant,
  formatPartyCombatState,
  formatPartyCombatPrompt,
  startPartyTurnTimer,
  handlePartyTimeout,
  checkPartyVictory,
  partyPlayerAttack,
  partyPlayerSkill,
  partyPlayerSupport,
  partyEnemyTurn,
  rollPartyFlee,
  resolvePartyVictory,
  resolvePartyDefeat,
  revivePlayer,
  type PartyCombatSession,
} from './CombatTimerEngine';
import { resolveVictory, resolveDefeat, createCombatSession, generateEncounter } from './CombatEngine';
import { computeAttack } from './PlayerEngine';
import { getArea } from '../../data/areas';
import { getDungeonChestLoot } from './LootEngine';

interface PartyCombatHandle {
  session: PartyCombatSession;
  timerHandle: { clear(): void };
}

export const activePartyCombats = new Map<string, PartyCombatHandle>();

// ─── Start Party Combat ────────────────────────────────────────────────────────

export function startPartyCombat(
  partyId: string,
  areaId: string,
  preGenEnemies?: CombatParticipant[],
): PartyCombatSession | null {
  const party = partyManager.getParty(partyId);
  if (!party) return null;

  const partyMemberData = party.members
    .filter(m => m.hp > 0)
    .map(m => {
      const session = presenceManager.getSession(m.playerId);
      const save = session?.currentState;
      return {
        playerId: m.playerId,
        name: m.playerName,
        hp: m.hp,
        maxHp: m.maxHp,
        mana: m.mana,
        maxMana: m.maxMana,
        attack: save ? computeAttack(save.stats) : 10,
        strength: save?.stats.strength ?? 10,
        agility: save?.stats.agility ?? 10,
        critRate: save?.stats.critRate ?? 0.05,
        critDamage: save?.stats.critDamage ?? 1.5,
      };
    });

  if (partyMemberData.length === 0) return null;

  const enemies = preGenEnemies ?? (() => {
    const scaledCount = Math.min(2 + Math.floor(partyMemberData.length / 2), 4);
    return generatePartyEncounter(areaId, scaledCount);
  })();
  if (enemies.length === 0) return null;

  const session = createPartyCombatSession(partyId, partyMemberData, enemies, areaId);

  partyManager.notifyAllMembers(partyId, `⚔ PARTY COMBAT started! ${enemies.length} enemies appear!`);

  const handle = startPartyTurnTimer(session, onPartyTimeout);
  activePartyCombats.set(partyId, { session, timerHandle: handle });

  for (const m of party.members) {
    partyManager.updateActivity(m.playerId, 'In Combat');
  }

  return session;
}

function generatePartyEncounter(areaId: string, partySize: number): CombatParticipant[] {
  const area = getArea(areaId);
  if (!area) return [];

  const avgLevel = getAveragePartyLevel();
  const enemies = generateEncounter(
    area.levelRange as [number, number],
    avgLevel,
    partySize,
    partySize + 1,
    0.10,
  );

  if (enemies.length === 0) return [];

  const tempSession = createCombatSession(createMinimalSave(), enemies, areaId);
  return tempSession.participants.filter(p => p.type === 'enemy');
}

function getAveragePartyLevel(): number {
  const allPlayers = [...presenceManager.getAllPlayers()];
  if (allPlayers.length === 0) return 20;
  const levels = allPlayers
    .filter(p => partyManager.isInParty(p.playerId))
    .map(p => p.level);
  return levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 20;
}

function createMinimalSave(): SaveFile {
  return {
    saveId: 'temp',
    playerId: 'temp',
    playerName: 'temp',
    savedAt: new Date().toISOString(),
    playtime: 0,
    stats: {
      name: 'temp',
      level: 20,
      exp: 0,
      expToNext: 1000,
      hp: 500, maxHp: 500,
      mana: 100, maxMana: 100,
      gold: 0,
      strength: 20, agility: 20, defense: 20, luck: 10,
      attack: 20, critRate: 0.05, critDamage: 1.5,
      freeStatPoints: 0, perkSlots: 0,
    },
    inventory: [],
    equipped: { weapon: null, armor: null, accessory1: null, accessory2: null },
    skills: { physical: [], magic: [], support: [] },
    worldState: {
      currentArea: '', currentCity: '',
      unlockedCities: [], unlockedDungeons: [],
      defeatedBosses: [], dungeonProgress: [], dungeonChests: [],
    },
    pendingLoot: [],
    socialPrefs: { chatVisible: true, nearbyVisible: true, chatArea: true, chatParty: true, chatShout: true },
    pvp: { enabled: false, safeZone: false },
    pvpStats: { kills: 0, deaths: 0, winStreak: 0, bestStreak: 0, seasonWins: 0, seasonPoints: 1000 },
    regenState: 'combat',
    achievements: [],
    achievementStats: {
      totalKills: 0, bossKills: 0, tradesCompleted: 0, itemsCrafted: 0,
      resourcesGathered: 0, pvpKills: 0, worldBossKills: 0,
      dungeonsCleared: [], deepestFloors: {}, visitedAreas: [],
    },
  };
}

// ─── Get active combat ────────────────────────────────────────────────────────

export function getPartyCombat(partyId: string): PartyCombatSession | null {
  return activePartyCombats.get(partyId)?.session ?? null;
}

export function getPlayerPartyCombat(playerId: string): { partyId: string; session: PartyCombatSession } | null {
  const party = partyManager.getPartyOf(playerId);
  if (!party) return null;
  const handle = activePartyCombats.get(party.partyId);
  if (!handle) return null;
  return { partyId: party.partyId, session: handle.session };
}

export function isInPartyCombat(playerId: string): boolean {
  return getPlayerPartyCombat(playerId) !== null;
}

export function getPartyCombatForArea(areaId: string): { partyId: string; session: PartyCombatSession }[] {
  const result: { partyId: string; session: PartyCombatSession }[] = [];
  for (const [partyId, handle] of activePartyCombats) {
    if (handle.session.areaId === areaId) {
      result.push({ partyId, session: handle.session });
    }
  }
  return result;
}

// ─── Timer callback ───────────────────────────────────────────────────────────

function onPartyTimeout(
  updatedSession: PartyCombatSession,
  timedOutPlayerId: string,
  timedOutCount: number,
): void {
  const handle = activePartyCombats.get(updatedSession.partyId);
  if (!handle) return;

  const result = handlePartyTimeout(updatedSession, timedOutPlayerId, timedOutCount);
  const finalSession = checkPartyVictory(result);
  handle.session = finalSession;

  const name = result.participants.find(p => p.playerId === timedOutPlayerId)?.name ?? 'Player';
  if (timedOutCount >= 3) {
    partyManager.notifyMember(timedOutPlayerId, `☠ You have been knocked unconscious! Wait for revival or battle to end.`);
    partyManager.setDowned(timedOutPlayerId, true);
  } else {
    partyManager.notifyMember(timedOutPlayerId, `⏰ Turn timed out (${timedOutCount}/3). Skipping...`);
    partyManager.incrementTimedOut(timedOutPlayerId);
  }

  if (!finalSession.winner) {
    handle.timerHandle.clear();
    handle.timerHandle = startPartyTurnTimer(finalSession, onPartyTimeout);
  }
}

// ─── Execute player action ─────────────────────────────────────────────────────

export function executePartyAction(
  playerId: string,
  action: 'attack' | 'flee' | 'heal' | 'buff' | 'skill' | 'magic' | 'support',
  args: {
    targetIdx?: number;
    targetPlayerId?: string;
    skillType?: 'physical' | 'magic' | 'support';
    skillIdx?: number;
  } = {},
): { session: PartyCombatSession; text: string } | null {
  const result = getPlayerPartyCombat(playerId);
  if (!result) return null;
  const { partyId, session } = result;

  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player' || current.playerId !== playerId) {
    return { session, text: 'It is not your turn.' };
  }

  const playerSession = presenceManager.getSession(playerId);
  const playerSave = playerSession?.currentState;

  let updated = session;
  let manaUsed = 0;

  if (action === 'attack') {
    updated = partyPlayerAttack(session, playerId, args.targetIdx ?? 0);
    updated = partyEnemyTurn(updated);
    updated = checkPartyVictory(updated);
  } else if (action === 'skill' || action === 'magic') {
    if (!playerSave) return null;
    const skillType = args.skillType ?? 'physical';
    let skill: any;
    if (skillType === 'physical') {
      skill = playerSave.skills.physical[args.skillIdx ?? 0];
    } else {
      skill = playerSave.skills.magic[args.skillIdx ?? 0];
    }
    if (!skill) return { session, text: 'Skill not found.' };
    updated = partyPlayerSkill(session, playerId, skill, args.targetIdx ?? 0, playerSave);
    manaUsed = Math.max(Math.floor(skill.manaCost * (1 - (skill.level - 1) * 0.05)), Math.floor(skill.manaCost * 0.30));
    updated = partyEnemyTurn(updated);
    updated = checkPartyVictory(updated);
  } else if (action === 'support') {
    if (!playerSave) return null;
    if (!args.targetPlayerId) return { session, text: 'Specify target: heal <ally> / buff <ally> / revive <ally>' };
    const skill = playerSave.skills.support[args.skillIdx ?? 0];
    if (!skill) return { session, text: 'No support skill in that slot.' };
    const res = partyPlayerSupport(session, playerId, skill, args.targetPlayerId, playerSave);
    if (!res) return { session, text: 'Not enough mana or invalid target.' };
    updated = res.session;
    manaUsed = res.manaUsed;
    updated = partyEnemyTurn(updated);
    updated = checkPartyVictory(updated);
  } else if (action === 'flee') {
    const { fled, log } = rollPartyFlee(updated);
    updated = { ...updated, log };
    if (fled) {
      cleanupPartyCombat(partyId);
      partyManager.notifyAllMembers(partyId, `🏃 The party fled from combat! No rewards gained.`);
      return { session: updated, text: 'The party fled from combat! No rewards gained.' };
    }
    updated = partyEnemyTurn(updated);
    updated = checkPartyVictory(updated);
  } else if (action === 'heal' || action === 'buff') {
    if (!playerSave) return null;
    if (!args.targetPlayerId) {
      // Show party members HP when no target given
      return { session, text: formatPartyHpList(session, partyId) };
    }
    // Use best available support skill (healing_touch or healing_light for heal, first buff skill for buff)
    const supportIdx = args.skillIdx ?? playerSave.skills.support.findIndex((s: any) =>
      action === 'heal' ? s.effectType === 'heal' : s.effectType === 'buff_stat',
    );
    if (supportIdx < 0) {
      return { session, text: action === 'heal'
        ? 'No healing skills learned. Use "skill support <n> <ally>" when you have a healing scroll.'
        : 'No buff skills learned. Use "skill support <n> <ally>" when you have a buff scroll.' };
    }
    const skill = playerSave.skills.support[supportIdx];
    const res = partyPlayerSupport(session, playerId, skill, args.targetPlayerId, playerSave);
    if (!res) return { session, text: 'Not enough mana or invalid target.' };
    updated = res.session;
    manaUsed = res.manaUsed;
    updated = partyEnemyTurn(updated);
    updated = checkPartyVictory(updated);
  }

  // Apply mana cost to session
  if (manaUsed > 0 && playerSession) {
    playerSession.currentState = {
      ...playerSession.currentState,
      stats: { ...playerSession.currentState.stats, mana: playerSession.currentState.stats.mana - manaUsed },
    };
  }

  if (updated.winner === 'player') {
    const lootResults = resolvePartyLoot(updated, partyId);
    updated = resolvePartyVictory(updated, lootResults);
    const handle = activePartyCombats.get(partyId);
    if (handle) handle.session = updated;

    const enemies = updated.participants.filter((p: any) => p.type === 'enemy');
    if (enemies.length === 0) {
      autoUnlockDungeonChest(updated.areaId, partyId);
    }

    const output = formatPartyCombatState(updated) + '\n  🎉 VICTORY! Party wins!';
    cleanupPartyCombat(partyId);
    return { session: updated, text: output };
  }
  if (updated.winner === 'enemy') {
    const saveUpdates = applyPartyDefeat(updated, partyId);
    updated = resolvePartyDefeat(updated, saveUpdates);
    const handle = activePartyCombats.get(partyId);
    if (handle) handle.session = updated;
    const output = formatPartyCombatState(updated) + '\n  ☠ DEFEAT... The party falls...';
    cleanupPartyCombat(partyId);
    return { session: updated, text: output };
  }

  updated = advancePartyTurn(updated);
  const handle = activePartyCombats.get(partyId);
  if (handle) {
    handle.timerHandle.clear();
    handle.timerHandle = startPartyTurnTimer(updated, onPartyTimeout);
    handle.session = updated;
  }

  return {
    session: updated,
    text: formatPartyCombatState(updated) + '\n' + formatPartyCombatPrompt(updated, playerId),
  };
}

// ─── Format party HP list ─────────────────────────────────────────────────────

function formatPartyHpList(session: PartyCombatSession, partyId: string): string {
  const lines: string[] = ['  ══════════ PARTY HP ══════════'];
  const players = session.participants.filter((p: any) => p.type === 'player' && p.isPlayer);
  for (const p of players) {
    const hpPct = Math.round((p.hp / p.maxHp) * 100);
    const bar = '[' + '█'.repeat(Math.round(hpPct / 10)) + '░'.repeat(10 - Math.round(hpPct / 10)) + ']';
    const tag = p.hp <= 0 ? ' [UNCONSCIOUS]' : '';
    lines.push(`  ${p.name.padEnd(14)} HP: ${String(p.hp).padStart(4)}/${p.maxHp} ${bar}${tag}`);
  }
  lines.push('  ─────────────────────────────────────');
  lines.push('  Use: heal <ally> / buff <ally> / revive <ally>');
  return lines.join('\n');
}

// ─── Resolve loot for all party members ───────────────────────────────────────

function resolvePartyLoot(session: PartyCombatSession, partyId: string): Map<string, SaveFile> {
  const results = new Map<string, SaveFile>();
  const party = partyManager.getParty(partyId);
  if (!party) return results;

  const enemies = session.participants.filter(p => p.type === 'enemy');
  for (const m of party.members) {
    const mSession = presenceManager.getSession(m.playerId);
    if (!mSession) continue;
    const fakeSession = createCombatSession(mSession.currentState, enemies as any, session.areaId);
    const updatedSave = resolveVictory(mSession.currentState, fakeSession);
    mSession.currentState = updatedSave;
    results.set(m.playerId, updatedSave);
  }
  return results;
}

// ─── Apply defeat to all party members ────────────────────────────────────────

function applyPartyDefeat(session: PartyCombatSession, partyId: string): Map<string, SaveFile> {
  const results = new Map<string, SaveFile>();
  const party = partyManager.getParty(partyId);
  if (!party) return results;

  for (const m of party.members) {
    const mSession = presenceManager.getSession(m.playerId);
    if (!mSession) continue;
    const updatedSave = resolveDefeat(mSession.currentState);
    mSession.currentState = updatedSave;
    results.set(m.playerId, updatedSave);
  }
  return results;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

function cleanupPartyCombat(partyId: string): void {
  const handle = activePartyCombats.get(partyId);
  if (handle) {
    handle.timerHandle.clear();
    activePartyCombats.delete(partyId);
  }
  const party = partyManager.getParty(partyId);
  if (party) {
    for (const m of party.members) {
      partyManager.updateActivity(m.playerId, 'Exploring');
      partyManager.setDowned(m.playerId, false);
    }
  }
}

// ─── Auto-unlock dungeon chest on boss kill ─────────────────────────────────

function autoUnlockDungeonChest(areaId: string, partyId: string): void {
  const { getDungeonForArea } = require('../../data/dungeons');
  const dungeon = getDungeonForArea(areaId);
  if (!dungeon) return;

  const chestLoot = getDungeonChestLoot(dungeon.id);
  const party = partyManager.getParty(partyId);
  if (!party) return;

  for (const m of party.members) {
    const mSession = presenceManager.getSession(m.playerId);
    if (!mSession) continue;
    const current = mSession.currentState;
    const newChests = [...(current.worldState.dungeonChests ?? [])];
    const existing = newChests.find(c => c.areaId === areaId);
    if (!existing) {
      newChests.push({ areaId, items: chestLoot, opened: true });
    }
    mSession.currentState = {
      ...current,
      pendingLoot: [...current.pendingLoot, ...chestLoot],
      worldState: { ...current.worldState, dungeonChests: newChests },
    };
  }

  partyManager.notifyAllMembers(partyId, `📦 Dungeon chest auto-unlocked! Loot added to pending loot for all members.`);
}

// ─── Broadcast turn start ─────────────────────────────────────────────────────

export function broadcastTurnStart(
  partyId: string,
  session: PartyCombatSession,
  newPlayerId: string,
): void {
  const next = getCurrentTurnParticipant(session);
  if (!next) return;
  partyManager.notifyMember(newPlayerId, `[⚔ YOUR TURN! 15s]`);
  partyManager.notifyAllMembers(partyId, `[Party] Waiting for ${next.name}...`, newPlayerId);
}
