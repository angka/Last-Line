"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBossEncounter = generateBossEncounter;
exports.generateEncounter = generateEncounter;
exports.createCombatSession = createCombatSession;
exports.playerAttack = playerAttack;
exports.playerFlee = playerFlee;
exports.enemyTurn = enemyTurn;
exports.applyStatusEffects = applyStatusEffects;
exports.tickStatusEffects = tickStatusEffects;
exports.checkVictory = checkVictory;
exports.advanceTurn = advanceTurn;
exports.resolveVictory = resolveVictory;
exports.resolveDefeat = resolveDefeat;
exports.formatCombatState = formatCombatState;
exports.formatCombatPrompt = formatCombatPrompt;
exports.playerSkill = playerSkill;
const ContentManager_1 = require("../content/ContentManager");
const ContentManager_2 = require("../content/ContentManager");
const ContentManager_3 = require("../content/ContentManager");
const PlayerEngine_1 = require("./PlayerEngine");
const LootEngine_1 = require("./LootEngine");
const EventEngine_1 = require("../content/EventEngine");
const uuid_1 = require("uuid");
// ─── Encounter Generation ───────────────────────────────────────────────────
function generateBossEncounter(bossId) {
    const boss = (0, ContentManager_1.getEnemy)(bossId);
    if (!boss || !boss.isBoss)
        return null;
    return boss;
}
function generateEncounter(areaLevelRange, playerLevel, groupSizeMin = 1, groupSizeMax = 2, eliteChance = 0.08) {
    const enemies = (0, ContentManager_1.getAllEnemies)();
    const pool = Object.values(enemies).filter(e => !e.isBoss && e.level >= areaLevelRange[0] && e.level <= areaLevelRange[1]);
    if (pool.length === 0)
        return [];
    const count = Math.min(groupSizeMax, groupSizeMin + Math.floor(Math.random() * (groupSizeMax - groupSizeMin + 1)));
    const chosen = [];
    for (let i = 0; i < count; i++) {
        // Weighted by proximity to player level
        const weights = pool.map(e => {
            const dist = Math.abs(e.level - playerLevel);
            return Math.max(1, 10 - dist);
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        let selected = pool[0];
        for (let j = 0; j < pool.length; j++) {
            r -= weights[j];
            if (r <= 0) {
                selected = pool[j];
                break;
            }
        }
        const isElite = i === 0 && Math.random() < eliteChance;
        chosen.push((0, ContentManager_1.scaleEnemy)(selected, isElite));
    }
    return chosen;
}
// ─── Session Creation ─────────────────────────────────────────────────────
function createCombatSession(save, enemies, areaId) {
    const player = {
        id: save.saveId,
        type: 'player',
        name: save.stats.name,
        hp: save.stats.hp,
        maxHp: save.stats.maxHp,
        mana: save.stats.mana,
        maxMana: save.stats.maxMana,
        attack: (0, PlayerEngine_1.computeAttack)(save.stats),
        strength: save.stats.strength,
        agility: save.stats.agility,
        defense: save.stats.defense,
        critRate: save.stats.critRate,
        critDamage: save.stats.critDamage,
        statusEffects: [],
        agiRoll: 0,
        isPlayer: true,
        playerId: save.saveId,
    };
    const enemyParticipants = enemies.map((e, i) => ({
        id: e.id + '_' + i + '_' + Date.now(),
        type: 'enemy',
        name: e.name,
        hp: e.maxHp,
        maxHp: e.maxHp,
        mana: 0,
        maxMana: 0,
        attack: e.attack,
        strength: e.strength,
        agility: e.agility,
        defense: e.defense,
        critRate: 0.05,
        critDamage: 1.5,
        statusEffects: [],
        agiRoll: 0,
        isElite: e.isElite,
        level: e.level,
    }));
    const participants = [player, ...enemyParticipants];
    // Roll turn order
    for (const p of participants) {
        p.agiRoll = p.agility + Math.floor(Math.random() * 11);
    }
    participants.sort((a, b) => b.agiRoll - a.agiRoll);
    return {
        sessionId: (0, uuid_1.v4)(),
        participants,
        turnIndex: 0,
        round: 1,
        areaId,
        log: [],
        turnStartedAt: Date.now(),
        turnTimeoutMs: 15000,
        timedOutCount: new Map(),
        winner: undefined,
    };
}
// ─── Combat Resolution ────────────────────────────────────────────────────
function playerAttack(session, targetIdx) {
    const participant = session.participants[session.turnIndex];
    if (participant.type !== 'player')
        return session;
    const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
    if (targetIdx < 0 || targetIdx >= enemies.length)
        return session;
    const target = enemies[targetIdx];
    const log = [...session.log];
    const raw = participant.attack * (1 + participant.strength / 100);
    const mitigated = raw * (1 - target.defense / (target.defense + 200));
    const crit = Math.random() < participant.critRate;
    const final = crit ? mitigated * participant.critDamage : mitigated;
    const dodge = Math.random() < target.agility / (target.agility + 150);
    const damage = dodge ? 0 : Math.max(1, Math.floor(final));
    target.hp -= damage;
    const critTag = crit ? ' CRITICAL!' : '';
    const dodgeTag = dodge ? ' MISS!' : '';
    log.push({ round: session.round, text: `${participant.name} attacks ${target.name} → ${damage} damage!${critTag}${dodgeTag}` });
    return { ...session, log, participants: [...session.participants] };
}
function playerFlee(session, playerLevel, enemyAgility) {
    const log = [...session.log];
    const fleeChance = Math.min(0.90, Math.max(0.10, (session.participants[session.turnIndex].agility - enemyAgility) / 100 + 0.50));
    const rolled = Math.random() * 100;
    if (rolled <= fleeChance * 100) {
        log.push({ round: session.round, text: `${session.participants[session.turnIndex].name} fled successfully!` });
        return { session: { ...session, log, winner: 'player' }, fled: true };
    }
    log.push({ round: session.round, text: `${session.participants[session.turnIndex].name} failed to flee!` });
    // Enemy gets free attack — handled in next phase
    return { session: { ...session, log }, fled: false };
}
function enemyTurn(session) {
    const attacker = session.participants[session.turnIndex];
    if (attacker.type !== 'enemy')
        return session;
    const log = [...session.log];
    const player = session.participants.find(p => p.type === 'player');
    if (!player || player.hp <= 0)
        return session;
    const raw = attacker.attack * (1 + attacker.strength / 100);
    const mitigated = raw * (1 - player.defense / (player.defense + 200));
    const dodge = Math.random() < (player.agility / (player.agility + 150));
    const damage = dodge ? 0 : Math.max(1, Math.floor(mitigated));
    const updated = session.participants.map(p => p.id === player.id ? { ...p, hp: Math.max(0, p.hp - damage) } : p);
    log.push({
        round: session.round,
        text: `${attacker.name} attacks ${player.name} → ${damage} damage!${dodge ? ' MISS!' : ''}`,
    });
    return { ...session, participants: updated, log };
}
function applyStatusEffects(participant) {
    let hp = participant.hp;
    const effects = [];
    for (const eff of participant.statusEffects) {
        if (eff.type === 'poison')
            hp = Math.max(0, hp - Math.floor(participant.maxHp * 0.05));
        if (eff.type === 'burn')
            hp = Math.max(0, hp - Math.floor(participant.maxHp * 0.08));
        if (eff.type === 'bleed')
            hp = Math.max(0, hp - Math.floor(participant.maxHp * 0.03));
        effects.push({ ...eff, remainingTurns: eff.remainingTurns - 1 });
    }
    return {
        ...participant,
        hp,
        statusEffects: effects.filter(e => e.remainingTurns > 0),
    };
}
function tickStatusEffects(session) {
    const updated = session.participants.map(applyStatusEffects);
    return { ...session, participants: updated };
}
function checkVictory(session) {
    const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
    const player = session.participants.find(p => p.type === 'player');
    if (enemies.length === 0) {
        return { ...session, winner: 'player' };
    }
    if (!player || player.hp <= 0) {
        return { ...session, winner: 'enemy' };
    }
    return session;
}
function advanceTurn(session) {
    let { turnIndex, round } = session;
    turnIndex++;
    // Skip dead participants
    while (turnIndex < session.participants.length) {
        const p = session.participants[turnIndex];
        if (p.hp > 0)
            break;
        turnIndex++;
    }
    if (turnIndex >= session.participants.length) {
        // New round
        round++;
        turnIndex = 0;
        const sorted = [...session.participants];
        // Re-sort living participants by agility
        const living = sorted.filter(p => p.hp > 0);
        living.sort((a, b) => b.agiRoll - a.agiRoll);
        return {
            ...session,
            turnIndex: 0,
            round,
            participants: living,
        };
    }
    return { ...session, turnIndex, round };
}
// ─── Loot & Rewards ────────────────────────────────────────────────────────
function resolveVictory(save, session) {
    const enemies = session.participants.filter(p => p.type === 'enemy');
    let s = { ...save, stats: { ...save.stats } };
    // Aggregate rewards
    let totalExp = 0;
    let totalGold = 0;
    for (const enemy of enemies) {
        totalExp += (0, ContentManager_1.getEnemy)(enemy.id.split('_').slice(0, -2).join('_'))?.expReward
            ?? (0, ContentManager_1.getEnemy)(enemy.id)?.expReward ?? 0;
        totalGold += (0, ContentManager_1.getEnemy)(enemy.id.split('_').slice(0, -2).join('_'))?.goldReward
            ?? (0, ContentManager_1.getEnemy)(enemy.id)?.goldReward ?? 0;
    }
    // Apply event multipliers
    const expMultiplier = (0, EventEngine_1.getExpMultiplier)();
    const goldMultiplier = (0, EventEngine_1.getGoldMultiplier)();
    const actualExp = Math.floor(totalExp * expMultiplier);
    const actualGold = Math.floor(totalGold * goldMultiplier);
    s.stats = { ...s.stats, exp: s.stats.exp + actualExp, gold: s.stats.gold + actualGold };
    // Level up check
    const levelUps = [];
    while (s.stats.exp >= s.stats.expToNext && s.stats.level < 100) {
        s.stats = (0, PlayerEngine_1.levelUp)({ ...s.stats });
        levelUps.push(`  ★ LEVEL UP! You are now level ${s.stats.level}!`);
    }
    // Determine dungeon context for loot
    const dungeonInfo = (0, ContentManager_3.getDungeonForArea)(session.areaId);
    const dungeonTier = dungeonInfo ? (0, LootEngine_1.getDungeonTier)(dungeonInfo.id) : 1;
    const isBossKill = enemies.some(e => e.isBoss);
    // Roll loot
    const lootDrops = [];
    if (isBossKill) {
        const bossId = enemies.find(e => e.isBoss)?.id ?? '';
        lootDrops.push(...(0, LootEngine_1.rollBossLoot)(bossId, s.stats.luck, s.worldState.defeatedBosses));
        lootDrops.push(...(0, LootEngine_1.rollScrollDrops)(dungeonTier, s.stats.luck));
    }
    else {
        const avgLevel = enemies.reduce((a, e) => a + (e.level ?? 1), 0) / Math.max(1, enemies.length);
        lootDrops.push(...(0, LootEngine_1.rollRegularLoot)(s.stats.luck, avgLevel));
        if (Math.random() < 0.05) {
            lootDrops.push(...(0, LootEngine_1.rollScrollDrops)(dungeonTier, s.stats.luck));
        }
    }
    // Gold bonus
    if (Math.random() < 0.5) {
        const bonusGold = Math.floor((totalGold * 0.3) * (0.5 + Math.random()));
        s.stats = { ...s.stats, gold: s.stats.gold + bonusGold };
    }
    // Merge loot
    s.pendingLoot = (0, LootEngine_1.addLootToPending)(s.pendingLoot, lootDrops);
    let lines = `
  ╔══════════════════════════════════════════════════════╗
  ║  VICTORY!                                           ║
  ╠══════════════════════════════════════════════════════╣
  ║  +${String(actualExp).padStart(6)} EXP   +${String(actualGold).padStart(6)} Gold                ║
  ╚══════════════════════════════════════════════════════╝`;
    if (levelUps.length)
        lines += '\n' + levelUps.join('\n');
    if (expMultiplier > 1 || goldMultiplier > 1) {
        lines += `\n  [Event Bonus: EXP x${expMultiplier} | Gold x${goldMultiplier}]`;
    }
    lines += (0, LootEngine_1.formatLootDrops)(lootDrops);
    return s;
}
function resolveDefeat(save) {
    const goldLost = Math.floor(save.stats.gold * 0.10);
    const s = {
        ...save,
        stats: {
            ...save.stats,
            hp: save.stats.maxHp * 0.30,
            mana: save.stats.maxMana * 0.30,
            gold: save.stats.gold - goldLost,
        },
        regenState: 'city',
    };
    return s;
}
// ─── Combat Log Display ──────────────────────────────────────────────────
function formatCombatState(session) {
    const lines = [];
    lines.push(`\n  ╔═══════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  COMBAT — Round ${session.round}                               ║`);
    lines.push(`  ╠═══════════════════════════════════════════════════════════╣`);
    const player = session.participants.find(p => p.type === 'player');
    if (player) {
        lines.push(`  ║  ${player.name.padEnd(20)} HP: ${String(player.hp).padStart(5)}/${player.maxHp}           ║`);
    }
    const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
    for (const e of enemies) {
        const eliteTag = e.isElite ? '[ELITE]' : '';
        lines.push(`  ║  ${(e.name + eliteTag).padEnd(24)} HP: ${String(e.hp).padStart(5)}/${e.maxHp}           ║`);
    }
    lines.push(`  ╠═══════════════════════════════════════════════════════════╣`);
    const recentLog = session.log.slice(-6);
    for (const entry of recentLog) {
        const text = entry.text.substring(0, 40).padEnd(40);
        lines.push(`  ║  ${text} ║`);
    }
    lines.push(`  ╚═══════════════════════════════════════════════════════════╝`);
    return lines.join('\n');
}
function formatCombatPrompt(session, playerHp, playerMaxHp, playerMana, playerMaxMana) {
    const current = session.participants[session.turnIndex];
    if (!current || current.type !== 'player')
        return '';
    const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
    let enemyList = '\n  Enemies:';
    for (let i = 0; i < enemies.length; i++) {
        enemyList += ` [${i + 1}] ${enemies[i].name} (${enemies[i].hp}/${enemies[i].maxHp})`;
    }
    return `\n${enemyList}\n` +
        `[Your turn! 15s] HP: ${playerHp}/${playerMaxHp} | MP: ${playerMana}/${playerMaxMana}\n` +
        `  Choose: attack <n> / magic <n> / skill <n> / item <n> / flee`;
}
// ─── Skill in Combat ──────────────────────────────────────────────────────────
function playerSkill(session, type, skillIndex, save) {
    const participant = session.participants[session.turnIndex];
    if (participant.type !== 'player') {
        return { session, newSave: save, text: 'Not your turn.' };
    }
    let skill;
    if (type === 'physical') {
        skill = save.skills.physical[skillIndex];
    }
    else if (type === 'magic') {
        skill = save.skills.magic[skillIndex];
    }
    else {
        skill = save.skills.support[skillIndex];
    }
    if (!skill) {
        return { session, newSave: save, text: 'Skill not found.' };
    }
    const manaCost = (0, ContentManager_2.getSkillManaCost)(skill.level, skill.manaCost);
    const damageMultiplier = (0, ContentManager_2.getSkillLevelMultiplier)(skill.level);
    let s = save;
    const enemies = session.participants.filter(p => p.type === 'enemy' && p.hp > 0);
    const targetIdx = 0;
    if (targetIdx < 0 || targetIdx >= enemies.length) {
        return { session, newSave: save, text: 'No valid target.' };
    }
    const target = enemies[targetIdx];
    let log = [...session.log];
    let updatedSession = session;
    if (type === 'physical' || type === 'magic') {
        const magicSkill = skill;
        let baseDamage = skill.baseDamage ?? magicSkill.baseDamage;
        baseDamage = Math.floor(baseDamage * damageMultiplier);
        const scalingStat = magicSkill.scalingStat === 'mana' ? s.stats.mana : s.stats.strength;
        let raw = baseDamage * (1 + scalingStat / 100);
        const crit = Math.random() < s.stats.critRate;
        const mitigated = raw * (1 - target.defense / (target.defense + 200));
        const final = crit ? mitigated * s.stats.critDamage : mitigated;
        const dodge = Math.random() < target.agility / (target.agility + 150);
        const damage = dodge ? 0 : Math.max(1, Math.floor(final));
        target.hp -= damage;
        const critTag = crit ? ' CRITICAL!' : '';
        const dodgeTag = dodge ? ' MISS!' : '';
        const skillName = skill.name;
        const elementTag = magicSkill.element ? '[' + magicSkill.element + ']' : '';
        log.push({ round: session.round, text: participant.name + ' uses ' + skillName + elementTag + ' on ' + target.name + ' -> ' + damage + ' damage!' + critTag + dodgeTag });
        updatedSession = { ...session, log, participants: [...session.participants] };
        s = { ...s, stats: { ...s.stats, mana: s.stats.mana - manaCost } };
    }
    else {
        const supportSkill = skill;
        let text = '';
        if (supportSkill.effectType === 'heal') {
            const healAmount = Math.floor(supportSkill.effectValue * damageMultiplier);
            participant.hp = Math.min(participant.maxHp, participant.hp + healAmount);
            text = participant.name + ' uses ' + skill.name + ' -> healed ' + healAmount + ' HP!';
        }
        else if (supportSkill.effectType === 'buff_stat') {
            text = participant.name + ' uses ' + skill.name + ' -> +' + supportSkill.effectValue + ' to ally for ' + (supportSkill.duration ?? 3) + ' turns!';
        }
        else if (supportSkill.effectType === 'cleanse') {
            participant.statusEffects = [];
            text = participant.name + ' uses ' + skill.name + ' -> cleansed all debuffs!';
        }
        else {
            text = participant.name + ' uses ' + skill.name + '!';
        }
        log.push({ round: session.round, text });
        updatedSession = { ...session, log, participants: [...session.participants] };
        s = { ...s, stats: { ...s.stats, mana: s.stats.mana - manaCost } };
    }
    updatedSession = enemyTurn(updatedSession);
    updatedSession = tickStatusEffects(updatedSession);
    updatedSession = checkVictory(updatedSession);
    if (updatedSession.winner === 'player') {
        const newSave = resolveVictory(s, updatedSession);
        return { session: updatedSession, newSave, text: formatCombatState(updatedSession) + '\n  Victory!' };
    }
    if (updatedSession.winner === 'enemy') {
        const newSave = resolveDefeat(s);
        return { session: updatedSession, newSave: newSave, text: formatCombatState(updatedSession) + '\n  You have been defeated...' };
    }
    updatedSession = advanceTurn(updatedSession);
    return {
        session: updatedSession,
        newSave: s,
        text: formatCombatState(updatedSession) + '\n' + formatCombatPrompt(updatedSession, s.stats.hp, s.stats.maxHp, s.stats.mana, s.stats.maxMana),
    };
}
//# sourceMappingURL=CombatEngine.js.map