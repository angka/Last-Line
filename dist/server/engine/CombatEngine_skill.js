"use strict";
// ─── Skill in Combat ──────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerSkill = playerSkill;
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
    const manaCost = getSkillManaCost(skill.level, skill.manaCost);
    const damageMultiplier = getSkillLevelMultiplier(skill.level);
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
//# sourceMappingURL=CombatEngine_skill.js.map