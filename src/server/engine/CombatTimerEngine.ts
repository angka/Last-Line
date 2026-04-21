/**
 * Phase 5 — Combat Timer Engine
 * Wires 15-second turn timers for both solo and party combat.
 * Handles solo timeout → forfeit turn, party timeout → downed state.
 */

import type { CombatSession, CombatParticipant, SaveFile } from '../../types';

export type TurnTimerCallback = (session: CombatSession, timedOutPlayerId: string) => void;

interface TimerHandle {
  clear(): void;
}

// ─── Solo Timer ───────────────────────────────────────────────────────────────

export function startSoloTurnTimer(
  session: CombatSession,
  onTimeout: TurnTimerCallback,
): TimerHandle {
  const current = session.participants[session.turnIndex];
  if (!current) return { clear: () => {} };

  const handle = setTimeout(() => {
    // Mark timeout on this participant
    const timedOutId = current.id;

    // Advance turn: skip the timed-out participant
    let { turnIndex, round } = session;
    turnIndex++;
    while (turnIndex < session.participants.length) {
      const p = session.participants[turnIndex];
      if (p.hp > 0) break;
      turnIndex++;
    }
    if (turnIndex >= session.participants.length) {
      round++;
      turnIndex = 0;
    }

    const updated: CombatSession = {
      ...session,
      turnIndex,
      round,
      turnStartedAt: Date.now(),
    };

    onTimeout(updated, timedOutId);
  }, session.turnTimeoutMs);

  return {
    clear: () => clearTimeout(handle),
  };
}

// ─── Party Combat Session ────────────────────────────────────────────────────

export interface PartyCombatSession {
  sessionId: string;
  participants: CombatParticipant[];   // all combatants (players + enemies)
  turnIndex: number;
  round: number;
  areaId: string;
  log: CombatSession['log'];
  turnStartedAt: number;
  turnTimeoutMs: number;
  timedOutCount: Map<string, number>;
  winner?: 'player' | 'enemy';
  partyId: string;
}

export function createPartyCombatSession(
  partyId: string,
  partyMembers: Array<{ playerId: string; name: string; hp: number; maxHp: number; mana: number; maxMana: number; attack: number; strength: number; agility: number; critRate: number; critDamage: number }>,
  enemies: CombatParticipant[],
  areaId: string,
): PartyCombatSession {
  const participants: CombatParticipant[] = [
    ...partyMembers.map(m => ({
      id: m.playerId,
      type: 'player' as const,
      name: m.name,
      hp: m.hp,
      maxHp: m.maxHp,
      mana: m.mana,
      maxMana: m.maxMana,
      attack: m.attack,
      strength: m.strength,
      agility: m.agility,
      defense: 0, // will be synced from equipped items
      critRate: m.critRate,
      critDamage: m.critDamage,
      statusEffects: [],
      agiRoll: 0,
      isPlayer: true,
      playerId: m.playerId,
    })),
    ...enemies,
  ];

  // Roll initial turn order
  for (const p of participants) {
    p.agiRoll = p.agility + Math.floor(Math.random() * 11);
  }
  participants.sort((a, b) => b.agiRoll - a.agiRoll);

  return {
    sessionId: `party-${partyId}-${Date.now()}`,
    participants,
    turnIndex: 0,
    round: 1,
    areaId,
    log: [],
    turnStartedAt: Date.now(),
    turnTimeoutMs: 15_000,
    timedOutCount: new Map(),
    partyId,
  };
}

export function getCurrentTurnParticipant(session: PartyCombatSession): CombatParticipant | null {
  return session.participants[session.turnIndex] ?? null;
}

export function isPartyPlayerTurn(session: PartyCombatSession): boolean {
  const p = getCurrentTurnParticipant(session);
  return p?.type === 'player' && p.isPlayer === true;
}

export function advancePartyTurn(session: PartyCombatSession): PartyCombatSession {
  let { turnIndex, round } = session;
  turnIndex++;
  while (turnIndex < session.participants.length) {
    const p = session.participants[turnIndex];
    if (p.hp > 0) break;
    turnIndex++;
  }
  if (turnIndex >= session.participants.length) {
    round++;
    turnIndex = 0;
    const living = session.participants.filter(p => p.hp > 0);
    living.sort((a, b) => b.agiRoll - a.agiRoll);
    return { ...session, turnIndex: 0, round, participants: living, turnStartedAt: Date.now() };
  }
  return { ...session, turnIndex, turnStartedAt: Date.now() };
}

export function startPartyTurnTimer(
  session: PartyCombatSession,
  onTimeout: (session: PartyCombatSession, timedOutPlayerId: string, timedOutCount: number) => void,
): TimerHandle {
  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player') return { clear: () => {} };

  const handle = setTimeout(() => {
    const timedOutId = current.playerId!;
    const newCount = (session.timedOutCount.get(timedOutId) ?? 0) + 1;
    session.timedOutCount.set(timedOutId, newCount);

    if (newCount >= 3) {
      // Mark player as downed — don't remove from combat yet
      current.hp = 0;
      onTimeout(session, timedOutId, newCount);
    } else {
      // Just forfeit this turn
      const updated = advancePartyTurn(session);
      onTimeout(updated, timedOutId, newCount);
    }
  }, session.turnTimeoutMs);

  return {
    clear: () => clearTimeout(handle),
  };
}

// ─── Solo timeout handler ───────────────────────────────────────────────────────

export function handleSoloTimeout(
  session: CombatSession,
  timedOutPlayerId: string,
): CombatSession {
  // Add log entry
  const logEntry = { round: session.round, text: `⏰ ${session.participants[session.turnIndex]?.name} timed out — turn forfeited.` };
  const log = [...session.log, logEntry];

  return { ...session, log, turnStartedAt: Date.now() };
}

// ─── Party timeout handler ─────────────────────────────────────────────────────

export function handlePartyTimeout(
  session: PartyCombatSession,
  timedOutPlayerId: string,
  timedOutCount: number,
): PartyCombatSession {
  const current = session.participants[session.turnIndex];
  const name = current?.name ?? 'Player';
  const logEntry = { round: session.round, text: `⏰ ${name} timed out (${timedOutCount}/3).` };
  const log = [...session.log, logEntry];

  if (timedOutCount >= 3) {
    logEntry.text = `☠ ${name} has been knocked unconscious!`;
  }

  return { ...session, log, turnStartedAt: Date.now() };
}

// ─── Format party combat state ────────────────────────────────────────────────

export function formatPartyCombatState(session: PartyCombatSession): string {
  const lines: string[] = [];
  lines.push(`\n  ╔══════════════════════════════════════════════════════════════╗`);
  lines.push(`  ║  PARTY COMBAT — Round ${session.round}                              ║`);
  lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);

  // Party players
  const players = session.participants.filter(p => p.type === 'player' && p.isPlayer);
  for (const p of players) {
    const hpPct = Math.round((p.hp / p.maxHp) * 100);
    const bar = renderHpBar(p.hp, p.maxHp);
    const tag = p.hp <= 0 ? ' [UNCONSCIOUS]' : '';
    lines.push(`  ║  ${p.name.padEnd(16)} ${bar}  ${String(p.hp).padStart(4)}/${p.maxHp}${tag}  ║`);
  }

  lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);

  // Enemies
  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
  for (const e of enemies) {
    const eliteTag = e.isElite ? '[ELITE]' : '';
    lines.push(`  ║  ${(e.name + eliteTag).padEnd(24)} HP: ${String(e.hp).padStart(5)}/${e.maxHp}        ║`);
  }

  lines.push(`  ╠══════════════════════════════════════════════════════════════╣`);
  const recentLog = session.log.slice(-5);
  for (const entry of recentLog) {
    const text = entry.text.substring(0, 42).padEnd(42);
    lines.push(`  ║  ${text} ║`);
  }
  lines.push(`  ╚══════════════════════════════════════════════════════════════╝`);
  return lines.join('\n');
}

export function formatPartyCombatPrompt(
  session: PartyCombatSession,
  playerId: string,
): string {
  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player') return '';

  const isYourTurn = current.playerId === playerId;
  const turnLabel = isYourTurn ? '**YOUR TURN** 15s!' : `Waiting for ${current.name}...`;

  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
  let enemyList = '\n  Enemies:';
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    enemyList += ` [${i + 1}] ${e.name} (${e.hp}/${e.maxHp})`;
  }

  const you = session.participants.find(p => p.playerId === playerId);
  const hp = you?.hp ?? 0;
  const maxHp = you?.maxHp ?? 0;
  const mana = you?.mana ?? 0;
  const maxMana = you?.maxMana ?? 0;

  const actionLine = isYourTurn
    ? `  Choose: attack <n> / skill <type> <n> / magic <n> / item <n> / flee / heal <ally> / buff <ally>`
    : `  Waiting for turn...`;

  return `\n${enemyList}\n` +
    `[${turnLabel}] HP: ${hp}/${maxHp} | MP: ${mana}/${maxMana}\n${actionLine}`;
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────

function renderHpBar(hp: number, maxHp: number): string {
  const total = 12;
  const filled = maxHp > 0 ? Math.round((hp / maxHp) * total) : 0;
  const empty = total - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// ─── Revive downed player (100s window) ───────────────────────────────────────

export function canReviveDownedPlayer(session: PartyCombatSession, playerId: string): boolean {
  const p = session.participants.find(p => p.playerId === playerId);
  return p !== undefined && p.hp <= 0;
}

export function revivePlayer(
  session: PartyCombatSession,
  reviverPlayerId: string,
  targetPlayerId: string,
  reviveHpPercent = 0.30,
): PartyCombatSession {
  const reviver = session.participants.find(p => p.playerId === reviverPlayerId);
  const target = session.participants.find(p => p.playerId === targetPlayerId);

  if (!reviver || !target) return session;
  if (reviver.hp <= 0) return session; // reviver must be alive
  if (target.hp > 0) return session;   // target already alive

  // Consume mana from reviver (resurrection skill or flat 50 MP)
  const manaCost = 50;
  if (reviver.mana < manaCost) return session;

  const hpGain = Math.round(target.maxHp * reviveHpPercent);

  const logEntry = {
    round: session.round,
    text: `✚ ${reviver.name} revives ${target.name}! (+${hpGain} HP)`,
  };

  return {
    ...session,
    log: [...session.log, logEntry],
    participants: session.participants.map(p => {
      if (p.playerId === reviverPlayerId) {
        return { ...p, mana: p.mana - manaCost };
      }
      if (p.playerId === targetPlayerId) {
        return { ...p, hp: hpGain };
      }
      return p;
    }),
    turnStartedAt: Date.now(),
  };
}

// ─── Party flee ──────────────────────────────────────────────────────────────

export function partyFleeChance(
  avgPartyAgility: number,
  fastestEnemyAgility: number,
  memberCount: number,
): number {
  // Harder to flee as party — enemies are stronger
  const base = Math.max(0.10, Math.min(0.80,
    (avgPartyAgility - fastestEnemyAgility) / 120 + 0.40));
  // More members = slightly harder to coordinate
  const penalty = (memberCount - 1) * 0.05;
  return Math.max(0.10, base - penalty);
}

export function rollPartyFlee(session: PartyCombatSession): { fled: boolean; log: PartyCombatSession['log'] } {
  const partyPlayers = session.participants.filter(p => p.type === 'player' && p.isPlayer);
  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);

  if (partyPlayers.length === 0 || enemies.length === 0) {
    return { fled: false, log: session.log };
  }

  const avgAgi = partyPlayers.reduce((a, p) => a + p.agility, 0) / partyPlayers.length;
  const fastestEnemy = enemies.reduce((a, e) => Math.max(a, e.agility), 0);

  const chance = partyFleeChance(avgAgi, fastestEnemy, partyPlayers.length);
  const rolled = Math.random() < chance;

  const log: PartyCombatSession['log'] = [...session.log];
  const name = partyPlayers.map(p => p.name).join(', ');
  log.push({
    round: session.round,
    text: rolled
      ? `🏃 ${name} successfully fled from combat!`
      : `🏃 ${name} failed to flee! The party is regrouping...`,
  });

  if (!rolled) {
    // Enemy gets free attack on each living party member
    for (const enemy of enemies) {
      for (const player of partyPlayers) {
        if (player.hp <= 0) continue;
        const raw = enemy.attack * (1 + enemy.strength / 100);
        const mitigated = raw * (1 - player.defense / (player.defense + 200));
        const dodge = Math.random() < (player.agility / (player.agility + 150));
        const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));
        player.hp = Math.max(0, player.hp - damage);
        log.push({
          round: session.round,
          text: `${enemy.name} attacks ${player.name} → ${damage} damage!${dodge ? ' MISS!' : ''}`,
        });
      }
    }
  }

  return { fled: rolled, log };
}

// ─── Check victory / defeat in party combat ────────────────────────────────────

export function checkPartyVictory(session: PartyCombatSession): PartyCombatSession {
  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
  const livingPlayers = session.participants.filter(p => p.type === 'player' && p.isPlayer && p.hp > 0);

  if (enemies.length === 0) {
    return { ...session, winner: 'player' };
  }
  if (livingPlayers.length === 0) {
    return { ...session, winner: 'enemy' };
  }
  return session;
}

// ─── Party attack ─────────────────────────────────────────────────────────────

export function partyPlayerAttack(
  session: PartyCombatSession,
  playerId: string,
  targetIdx: number,
): PartyCombatSession {
  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player' || current.playerId !== playerId) return session;

  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
  if (targetIdx < 0 || targetIdx >= enemies.length) targetIdx = 0;

  const target = enemies[targetIdx];
  const log: PartyCombatSession['log'] = [...session.log];

  const raw = current.attack * (1 + current.strength / 100);
  const mitigated = raw * (1 - target.defense / (target.defense + 200));
  const crit = Math.random() < current.critRate;
  const final = crit ? mitigated * current.critDamage : mitigated;
  const dodge = Math.random() < (target.agility / (target.agility + 150));
  const damage = dodge ? 0 : Math.max(1, Math.floor(final));

  target.hp -= damage;

  const critTag = crit ? ' CRITICAL!' : '';
  const dodgeTag = dodge ? ' MISS!' : '';
  log.push({ round: session.round, text: `${current.name} attacks ${target.name} → ${damage} damage!${critTag}${dodgeTag}` });

  return { ...session, log, participants: [...session.participants] };
}

// ─── Party player skill (physical or magic) ────────────────────────────────────

export function partyPlayerSkill(
  session: PartyCombatSession,
  playerId: string,
  skill: { id: string; name: string; level: number; baseDamage: number; manaCost: number; scalingStat: 'strength' | 'mana'; element?: string },
  targetIdx: number,
  playerSave: { stats: { strength: number; mana: number; critRate: number; critDamage: number } },
): PartyCombatSession {
  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player' || current.playerId !== playerId) return session;

  const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
  if (targetIdx < 0 || targetIdx >= enemies.length) targetIdx = 0;

  const target = enemies[targetIdx];
  const log: PartyCombatSession['log'] = [...session.log];
  const mult = 1 + (skill.level - 1) * 0.10;
  const baseDamage = Math.floor(skill.baseDamage * mult);
  const scalingStat = skill.scalingStat === 'mana' ? playerSave.stats.mana : playerSave.stats.strength;
  const raw = baseDamage * (1 + scalingStat / 100);
  const crit = Math.random() < playerSave.stats.critRate;
  const mitigated = raw * (1 - target.defense / (target.defense + 200));
  const final = crit ? mitigated * playerSave.stats.critDamage : mitigated;
  const dodge = Math.random() < (target.agility / (target.agility + 150));
  const damage = dodge ? 0 : Math.max(1, Math.floor(final));

  target.hp -= damage;

  const critTag = crit ? ' CRITICAL!' : '';
  const dodgeTag = dodge ? ' MISS!' : '';
  const elemTag = skill.element ? `[${skill.element}]` : '';
  log.push({ round: session.round, text: `${current.name} uses ${skill.name}${elemTag} on ${target.name} → ${damage} damage!${critTag}${dodgeTag}` });

  return { ...session, log, participants: [...session.participants] };
}

// ─── Party player support skill (heal/buff/cleanse/revive on ally) ──────────────

export function partyPlayerSupport(
  session: PartyCombatSession,
  playerId: string,
  skill: { id: string; name: string; level: number; manaCost: number; effectType: string; effectValue: number; duration?: number; targetType: string },
  targetPlayerId: string,
  playerSave: { stats: { mana: number; maxHp: number; maxMana: number } },
): { session: PartyCombatSession; manaUsed: number } | null {
  const current = getCurrentTurnParticipant(session);
  if (!current || current.type !== 'player' || current.playerId !== playerId) return null;

  // Check mana
  const manaCost = Math.max(Math.floor(skill.manaCost * (1 - (skill.level - 1) * 0.05)), Math.floor(skill.manaCost * 0.30));
  if (playerSave.stats.mana < manaCost) return null;

  const target = session.participants.find(p => p.playerId === targetPlayerId);
  if (!target) return null;

  const log: PartyCombatSession['log'] = [...session.log];
  const mult = 1 + (skill.level - 1) * 0.10;
  let updated = session;

  if (skill.effectType === 'heal') {
    const heal = Math.floor(skill.effectValue * mult);
    target.hp = Math.min(target.maxHp, target.hp + heal);
    log.push({ round: session.round, text: `${current.name} uses ${skill.name} on ${target.name} → +${heal} HP!` });
  } else if (skill.effectType === 'buff_stat') {
    const buffValue = skill.effectValue;
    const duration = skill.duration ?? 3;
    target.statusEffects.push({ type: 'buff', stat: 'all', value: buffValue, remainingTurns: duration } as any);
    log.push({ round: session.round, text: `${current.name} uses ${skill.name} on ${target.name} → +${buffValue} all stats for ${duration} turns!` });
  } else if (skill.effectType === 'cleanse') {
    target.statusEffects = [];
    log.push({ round: session.round, text: `${current.name} uses ${skill.name} on ${target.name} → cleansed!` });
  } else if (skill.effectType === 'revive') {
    // Revive at effectValue% HP (effectValue = 30 for resurrection)
    const reviveHp = Math.floor(target.maxHp * (skill.effectValue / 100));
    target.hp = reviveHp;
    log.push({ round: session.round, text: `${current.name} uses ${skill.name} on ${target.name} → REVIVED at ${reviveHp} HP!` });
  } else if (skill.effectType === 'shield') {
    target.statusEffects.push({ type: 'shield', value: skill.effectValue, remainingTurns: skill.duration ?? 3 } as any);
    log.push({ round: session.round, text: `${current.name} uses ${skill.name} on ${target.name} → shield created!` });
  }

  return { session: { ...session, log, participants: [...session.participants] }, manaUsed: manaCost };
}

// ─── Apply mana cost after support skill ──────────────────────────────────────
// Note: mana cost is applied in index.ts after this returns

// ─── Enemy turn in party combat ───────────────────────────────────────────────

export function partyEnemyTurn(session: PartyCombatSession): PartyCombatSession {
  const attacker = session.participants[session.turnIndex];
  if (attacker?.type !== 'enemy') return session;

  const log: PartyCombatSession['log'] = [...session.log];
  const livingPlayers = session.participants.filter(p => p.type === 'player' && p.isPlayer && p.hp > 0);
  if (livingPlayers.length === 0) return session;

  // Enemy attacks random living player
  const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
  const raw = attacker.attack * (1 + attacker.strength / 100);
  const mitigated = raw * (1 - target.defense / (target.defense + 200));
  const dodge = Math.random() < (target.agility / (target.agility + 150));
  const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));

  target.hp = Math.max(0, target.hp - damage);
  log.push({
    round: session.round,
    text: `${attacker.name} attacks ${target.name} → ${damage} damage!${dodge ? ' MISS!' : ''}`,
  });

  return {
    ...session,
    participants: session.participants.map(p =>
      p.id === target.id ? { ...p, hp: Math.max(0, p.hp - damage) } : p,
    ),
    log,
  };
}

// ─── Resolve party combat victory ─────────────────────────────────────────────

export function resolvePartyVictory(
  session: PartyCombatSession,
  lootResults: Map<string, SaveFile>,  // playerId → updated save with loot/exp
): PartyCombatSession {
  const log: PartyCombatSession['log'] = [...session.log];
  log.push({ round: session.round, text: '🎉 VICTORY! The party wins!' });

  for (const [playerId, updatedSave] of lootResults) {
    const p = session.participants.find(p => p.playerId === playerId);
    if (p) {
      p.hp = updatedSave.stats.hp;
      p.mana = updatedSave.stats.mana;
      p.maxHp = updatedSave.stats.maxHp;
      p.maxMana = updatedSave.stats.maxMana;
    }
  }

  return { ...session, log, winner: 'player' };
}

// ─── Resolve party defeat ─────────────────────────────────────────────────────

export function resolvePartyDefeat(
  session: PartyCombatSession,
  saveUpdates: Map<string, SaveFile>,
): PartyCombatSession {
  const log: PartyCombatSession['log'] = [...session.log];
  log.push({ round: session.round, text: '☠ DEFEAT... The party falls...' });

  for (const [playerId, updatedSave] of saveUpdates) {
    const p = session.participants.find(p => p.playerId === playerId);
    if (p) {
      p.hp = updatedSave.stats.hp;
      p.mana = updatedSave.stats.mana;
    }
  }

  return { ...session, winner: 'enemy' };
}
