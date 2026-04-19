"use strict";
// ─── Skill Handler (in combat) ────────────────────────────────────────────────
function handleSkill(args, save, combatState) {
    if (combatState) {
        return handleCombatSkill(args, save, combatState);
    }
    return { text: 'Skills can only be used during combat. Type "skills" to see your learned skills.' };
}
function handleCombatSkill(args, save, combatState) {
    const skillType = (args[0] || 'physical').toLowerCase();
    const idx = parseInt(args[1] || '1') - 1;
    if (skillType === 'physical' || skillType === 'phys') {
        if (idx < 0 || idx >= save.skills.physical.length) {
            return { text: 'Invalid skill number. Type "skills" to see your physical skills.' };
        }
        const skill = save.skills.physical[idx];
        const manaCost = getSkillManaCost(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = playerSkill(combatState, 'physical', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.combatState };
    }
    if (skillType === 'magic' || skillType === 'mag') {
        if (idx < 0 || idx >= save.skills.magic.length) {
            return { text: 'Invalid magic number. Type "skills" to see your magic skills.' };
        }
        const skill = save.skills.magic[idx];
        const manaCost = getSkillManaCost(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = playerSkill(combatState, 'magic', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.combatState };
    }
    if (skillType === 'support' || skillType === 'sup') {
        if (idx < 0 || idx >= save.skills.support.length) {
            return { text: 'Invalid support skill number.' };
        }
        const skill = save.skills.support[idx];
        const manaCost = getSkillManaCost(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = playerSkill(combatState, 'support', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.combatState };
    }
    return { text: 'Usage: skill physical/magic/support <n>' };
}
// ─── Learn Skill ──────────────────────────────────────────────────────────────
function handleLearn(args, save) {
    const raw = args[0];
    if (!raw) {
        const scrolls = save.inventory.filter(slot => {
            const item = getItem(slot.itemId);
            return item?.type === 'scroll';
        });
        if (scrolls.length === 0) {
            return { text: 'No skill scrolls in inventory. Find scrolls in dungeons or buy them from shops.' };
        }
        const lines = ['  ══════════ SKILL SCROLLS ══════════', '  Scrolls in inventory (use "learn <n>"):'];
        scrolls.forEach((slot, i) => {
            const item = getItem(slot.itemId);
            lines.push(`  [${i + 1}] ${item?.name ?? slot.itemId} — ${item?.description ?? ''}`);
        });
        lines.push('  ─────────────────────────────────────');
        lines.push('  Use "learn <n>" to learn the skill from scroll N.');
        return { text: lines.join('\n') };
    }
    const page = parseInventoryPageIndex(raw, save);
    const scrolls = save.inventory.filter(slot => {
        const item = getItem(slot.itemId);
        return item?.type === 'scroll';
    });
    if (page < 0 || page >= scrolls.length) {
        return { text: 'Invalid scroll number. Type "learn" to see your scrolls.' };
    }
    const slot = scrolls[page];
    const result = getSkillByItemId(slot.itemId);
    if (!result) {
        return { text: 'Could not determine the skill taught by this scroll.' };
    }
    const { type, skill } = result;
    let s = save;
    if (type === 'physical') {
        const existing = s.skills.physical.find(sk => sk.id === skill.id);
        if (existing)
            return { text: `You already know ${skill.name}.` };
        s = { ...s, skills: { ...s.skills, physical: [...s.skills.physical, { ...skill, killCount: 0 }] } };
    }
    else if (type === 'magic') {
        const existing = s.skills.magic.find(sk => sk.id === skill.id);
        if (existing)
            return { text: `You already know ${skill.name}.` };
        s = { ...s, skills: { ...s.skills, magic: [...s.skills.magic, { ...skill, killCount: 0 }] } };
    }
    else {
        const existing = s.skills.support.find(sk => sk.id === skill.id);
        if (existing)
            return { text: `You already know ${skill.name}.` };
        s = { ...s, skills: { ...s.skills, support: [...s.skills.support, { ...skill, linkedKills: 0 }] } };
    }
    s = inventoryRemove(s, slot.slotId);
    const skillName = skill.name;
    return {
        text: `  ★ You learned ${skillName}!\n  "${skill.description}"\n  Use "skill ${type === 'magic' ? 'magic' : type === 'support' ? 'support' : 'physical'} <n>" to activate it in combat.`,
        newSave: s,
    };
}
// ─── Crafting ────────────────────────────────────────────────────────────────
function handleCraft(args, save) {
    if (args.length === 0) {
        return { text: formatCraftingMenu(save) };
    }
    const idx = parseInt(args[0]) - 1;
    if (isNaN(idx) || idx < 0) {
        return { text: 'Usage: craft [n] — type "craft" without args to see recipes.' };
    }
    const result = craftItem(save, idx);
    return { text: result.text, newSave: result.newSave };
}
// ─── Gathering ────────────────────────────────────────────────────────────────
function handleGather(verb, save) {
    const result = gatherFromNode(save, save.worldState.currentArea, verb);
    return { text: result.text, newSave: result.newSave };
}
// ─── Pending Loot ────────────────────────────────────────────────────────────
function handlePendingLoot(save, subargs) {
    const loot = save.pendingLoot;
    if (loot.length === 0) {
        return { text: 'No pending loot. Defeat enemies or bosses to earn loot.' };
    }
    const lines = ['  ══════════ PENDING LOOT ══════════'];
    loot.forEach((drop, i) => {
        const item = getItem(drop.itemId);
        const qty = drop.quantity > 1 ? ` x${drop.quantity}` : '';
        const col = item ? rarityColor(item.rarity) : '';
        const r = RARITY_RESET;
        lines.push(`  [${i + 1}] ${col}${drop.name}${r}${qty}  (${drop.rarity})`);
    });
    lines.push('  ─────────────────────────────────────');
    lines.push('  Type "loot claim" to add all loot to your inventory.');
    if (subargs?.[0] === 'claim') {
        const maxSlots = 30;
        const unequipped = save.inventory.filter(s => !s.equipped);
        const freeSlots = maxSlots - unequipped.length;
        if (freeSlots <= 0) {
            return { text: 'Your inventory is full. Free up a slot to claim loot.', newSave: save };
        }
        let s = save;
        let claimed = 0;
        for (const drop of loot) {
            if (claimed >= freeSlots)
                break;
            if (drop.itemId === 'gold') {
                s = { ...s, stats: { ...s.stats, gold: s.stats.gold + drop.quantity } };
            }
            else {
                const result2 = inventoryAdd(s, drop.itemId, drop.quantity);
                if (result2.added > 0) {
                    s = result2.save;
                    claimed++;
                }
            }
        }
        s = { ...s, pendingLoot: [] };
        return {
            text: `  ✓ Claimed ${claimed} item stack(s) of loot.`,
            newSave: s,
        };
    }
    return { text: lines.join('\n') };
}
// ─── Dungeon Chest ──────────────────────────────────────────────────────────
function handleDungeonChest(save) {
    const areaId = save.worldState.currentArea;
    if (!isDungeonArea(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const dungeonInfo = getDungeonForArea(areaId);
    if (!dungeonInfo)
        return { text: 'Unknown dungeon.' };
    const existing = save.worldState.dungeonChests?.find(c => c.areaId === areaId);
    if (existing?.opened) {
        return { text: 'You already opened this floor chest.' };
    }
    const chestLoot = getDungeonChestLoot(dungeonInfo.id);
    const lines = ['  ══════════ DUNGEON CHEST ══════════'];
    for (const drop of chestLoot) {
        const item = getItem(drop.itemId);
        if (drop.itemId === 'gold') {
            lines.push(`  + ${drop.quantity}g`);
        }
        else {
            const col = item ? rarityColor(item.rarity) : '';
            const r = RARITY_RESET;
            lines.push(`  + ${col}${drop.name}${r} x${drop.quantity}`);
        }
    }
    let s = save;
    if (!s.worldState.dungeonChests) {
        s = { ...s, worldState: { ...s.worldState, dungeonChests: [] } };
    }
    s = { ...s, worldState: { ...s.worldState, dungeonChests: [...s.worldState.dungeonChests, { areaId, items: chestLoot, opened: true }] } };
    s.pendingLoot = [...s.pendingLoot, ...chestLoot];
    return {
        text: lines.join('\n') + '\n  Loot added to pending loot. Use "loot" to claim.',
        newSave: s,
    };
}
// ─── Updated formatSkills ───────────────────────────────────────────────────
function formatSkills(save) {
    const lines = ['  ═══════════ SKILLS ═══════════'];
    const hasSkills = save.skills.physical.length + save.skills.magic.length + save.skills.support.length > 0;
    if (!hasSkills) {
        lines.push('  (no skills learned — use "learn" with a scroll to learn skills)');
    }
    else {
        if (save.skills.physical.length > 0) {
            lines.push('  PHYSICAL:');
            save.skills.physical.forEach((sk, i) => {
                lines.push(`    [${i + 1}] ${sk.name}  Lv${sk.level}  DMG:${sk.baseDamage}  MP:${sk.manaCost}  Kills:${sk.killCount}`);
            });
        }
        if (save.skills.magic.length > 0) {
            lines.push('  MAGIC:');
            save.skills.magic.forEach((sk, i) => {
                lines.push(`    [${i + 1}] ${sk.name}  Lv${sk.level}  ${sk.element}  DMG:${sk.baseDamage}  MP:${sk.manaCost}  Kills:${sk.killCount}`);
            });
        }
        if (save.skills.support.length > 0) {
            lines.push('  SUPPORT:');
            save.skills.support.forEach((sk, i) => {
                lines.push(`    [${i + 1}] ${sk.name}  Lv${sk.level}  ${sk.effectType}  MP:${sk.manaCost}  Kills:${sk.linkedKills}`);
            });
        }
    }
    lines.push('  ───────────────────────────────────');
    lines.push('  In combat: skill physical/magic/support <n>');
    lines.push('  Find scrolls in dungeons to learn new skills.');
    return lines.join('\n');
}
// ─── Updated look with gathering nodes ─────────────────────────────────────
function formatAreaNodesDisplay(areaId) {
    const nodes = GATHERING_NODES[areaId] ?? [];
    if (nodes.length === 0)
        return '';
    const lines = ['  Resource Nodes:'];
    for (const node of nodes) {
        lines.push(`    ► ${node.name}  [${node.verb}]${node.requiresTool ? ` (${node.requiresTool})` : ''}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=phase3_handlers.js.map