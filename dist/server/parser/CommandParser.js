"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommand = parseCommand;
const areas_1 = require("../../data/areas");
const InventoryManager_1 = require("../items/InventoryManager");
const items_1 = require("../../data/items");
const RegenEngine_1 = require("../engine/RegenEngine");
const CombatEngine_1 = require("../engine/CombatEngine");
function parseCommand(cmd, save, combatState) {
    const parts = cmd.trim().split(/\s+/);
    const verb = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    // ── Combat Commands ──────────────────────────────────────────────
    if (combatState) {
        if (verb === 'attack' || verb === 'a') {
            return handleAttack(args, save, combatState);
        }
        if (verb === 'flee' || verb === 'f') {
            return handleFlee(save, combatState);
        }
        if (verb === 'item' || verb === 'i') {
            return handleCombatItem(args, save, combatState);
        }
        if (verb === 'log') {
            return { text: (0, CombatEngine_1.formatCombatState)(combatState) };
        }
        return { text: `${(0, CombatEngine_1.formatCombatPrompt)(combatState, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}\n  Unknown command. Type 'attack', 'item', or 'flee'.` };
    }
    switch (verb) {
        case 'look':
        case 'l': {
            const areaDesc = (0, areas_1.describeArea)(save.worldState.currentArea);
            const hpPct = Math.round((save.stats.hp / save.stats.maxHp) * 100);
            const mpPct = Math.round((save.stats.mana / save.stats.maxMana) * 100);
            return {
                text: `${areaDesc}\n\n  HP: ${save.stats.hp}/${save.stats.maxHp} (${hpPct}%)  |  MP: ${save.stats.mana}/${save.stats.maxMana} (${mpPct}%)  |  Gold: ${save.stats.gold}g\n  [${(0, RegenEngine_1.regenStateLabel)(save.regenState)}]`,
            };
        }
        case 'go':
        case 'move': {
            const dir = args[0]?.toLowerCase();
            if (!dir)
                return { text: 'Go where? Usage: go <north|south|east|west>' };
            return handleMove(dir, save);
        }
        case 'stats': {
            const s = save.stats;
            return { text: formatStats(s) };
        }
        case 'inventory':
        case 'inv': {
            const page = Math.max(0, (parseInt(args[0] ?? '1') - 1));
            return { text: (0, InventoryManager_1.formatInventoryPage)(save, page) };
        }
        case 'equip': {
            const unequipped = save.inventory.filter(s => !s.equipped);
            const page = parseInventoryPageIndex(args[0], save);
            if (page === -1 || page >= unequipped.length)
                return { text: 'Invalid slot number.' };
            const item = unequipped[page];
            const newSave = (0, InventoryManager_1.inventoryEquip)(save, item.slotId);
            return {
                text: `You equipped ${(0, items_1.getItem)(item.itemId)?.name ?? item.itemId}.`,
                newSave,
            };
        }
        case 'unequip': {
            const slotMap = { weapon: 'weapon', armor: 'armor', accessory: 'accessory1', ring: 'accessory1' };
            const slot = slotMap[args[0]?.toLowerCase()] ?? 'weapon';
            const newSave = inventoryUnequipBySlot(save, slot);
            return { text: `You unequipped your ${slot}.`, newSave };
        }
        case 'use': {
            const unequipped = save.inventory.filter(s => !s.equipped);
            const page = parseInventoryPageIndex(args[0], save);
            if (page === -1 || page >= unequipped.length)
                return { text: 'Invalid slot number.' };
            const item = unequipped[page];
            const newSave = (0, InventoryManager_1.inventoryUse)(save, item.slotId);
            const used = (0, items_1.getItem)(item.itemId);
            return {
                text: `You used ${used?.name ?? item.itemId}. HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}`,
                newSave,
            };
        }
        case 'drop': {
            const unequipped = save.inventory.filter(s => !s.equipped);
            const page = parseInventoryPageIndex(args[0], save);
            if (page === -1 || page >= unequipped.length)
                return { text: 'Invalid slot number.' };
            const item = unequipped[page];
            const newSave = (0, InventoryManager_1.inventoryRemove)(save, item.slotId);
            return { text: `You dropped ${(0, items_1.getItem)(item.itemId)?.name ?? item.itemId}.`, newSave };
        }
        case 'skills': {
            return { text: formatSkills(save) };
        }
        case 'gold': {
            return { text: `Gold: ${save.stats.gold}g` };
        }
        case 'rest': {
            const area = (0, areas_1.getArea)(save.worldState.currentArea);
            if (area && area.safeZone) {
                const newSave = { ...save, regenState: 'safe_area' };
                return {
                    text: 'You rest in this safe zone. HP and mana regenerate quickly.',
                    newSave,
                };
            }
            return { text: 'You can only rest in safe zones.' };
        }
        case 'save': {
            return { text: 'Game saved.', action: 'save' };
        }
        case 'load': {
            return { text: 'Use "save" at the inn to save your game.', action: 'none' };
        }
        case 'map': {
            return { text: formatMap(save) };
        }
        case 'help':
        case '?': {
            return { text: formatHelp() };
        }
        case 'quit':
        case 'exit': {
            return { text: 'Goodbye!', action: 'quit' };
        }
        default: {
            return { text: `Unknown command: "${verb}". Type 'help' for a list of commands.` };
        }
    }
}
// ─── Movement ──────────────────────────────────────────────────────────
function handleMove(dir, save) {
    const area = (0, areas_1.getArea)(save.worldState.currentArea);
    if (!area)
        return { text: 'Unknown area.' };
    const targetId = area.exits[dir];
    if (!targetId) {
        const validDirs = Object.keys(area.exits).join(', ');
        return { text: `Cannot go "${dir}". Available exits: ${validDirs}` };
    }
    const target = (0, areas_1.getArea)(targetId);
    const newSave = {
        ...save,
        worldState: {
            ...save.worldState,
            currentArea: targetId,
        },
        regenState: target?.safeZone ? 'city' : 'exploring',
    };
    // Try encounter
    if (target && !target.safeZone && target.baseEncounterChance > 0) {
        if (Math.random() < target.baseEncounterChance) {
            const enemies = (0, CombatEngine_1.generateEncounter)(target.levelRange, save.stats.level, 1, 2, 0.08);
            if (enemies.length > 0) {
                const session = (0, CombatEngine_1.createCombatSession)(newSave, enemies, targetId);
                return {
                    text: `${(0, areas_1.describeArea)(targetId)}\n\n  ENCOUNTER! ${enemies.map(e => e.name).join(', ')} blocks your path!\n${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, newSave.stats.hp, newSave.stats.maxHp, newSave.stats.mana, newSave.stats.maxMana)}`,
                    newSave,
                    combatState: session,
                };
            }
        }
    }
    return {
        text: (0, areas_1.describeArea)(targetId) + `\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [${(0, RegenEngine_1.regenStateLabel)(newSave.regenState)}]`,
        newSave,
    };
}
// ─── Combat ───────────────────────────────────────────────────────────────
function handleAttack(args, save, combatState) {
    const enemies = combatState.participants.filter((p) => p.type === 'enemy' && p.hp > 0);
    let targetIdx = parseInt(args[0] ?? '1') - 1;
    if (targetIdx < 0 || targetIdx >= enemies.length)
        targetIdx = 0;
    let session = (0, CombatEngine_1.playerAttack)(combatState, targetIdx);
    session = (0, CombatEngine_1.enemyTurn)(session);
    session = (0, CombatEngine_1.tickStatusEffects)(session);
    session = (0, CombatEngine_1.checkVictory)(session);
    let result;
    if (session.winner === 'player') {
        const newSave = (0, CombatEngine_1.resolveVictory)(save, session);
        result = {
            text: `${(0, CombatEngine_1.formatCombatState)(session)}\n\n  Victory!`,
            newSave,
            combatState: undefined,
        };
    }
    else if (session.winner === 'enemy') {
        const newSave = (0, CombatEngine_1.resolveDefeat)(save);
        result = {
            text: `${(0, CombatEngine_1.formatCombatState)(session)}\n\n  You have been defeated...`,
            newSave,
            combatState: undefined,
        };
    }
    else {
        // Advance turn
        session = (0, CombatEngine_1.advanceTurn)(session);
        result = {
            text: `${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
            combatState: session,
        };
    }
    return result;
}
function handleFlee(save, combatState) {
    const enemies = combatState.participants.filter((p) => p.type === 'enemy' && p.hp > 0);
    const fastestEnemy = enemies.reduce((a, b) => a.agility > b.agility ? a : b);
    const { session, fled } = (0, CombatEngine_1.playerFlee)(combatState, save.stats.level, fastestEnemy.agility);
    if (fled) {
        return {
            text: `${(0, CombatEngine_1.formatCombatState)(session)}\n\n  You fled from battle! No rewards gained.`,
            newSave: save,
            combatState: undefined,
        };
    }
    // Failed flee — enemy gets free attack
    let session2 = (0, CombatEngine_1.enemyTurn)(session);
    session2 = (0, CombatEngine_1.tickStatusEffects)(session2);
    session2 = (0, CombatEngine_1.checkVictory)(session2);
    if (session2.winner === 'enemy') {
        const newSave = (0, CombatEngine_1.resolveDefeat)(save);
        return {
            text: `${(0, CombatEngine_1.formatCombatState)(session2)}\n\n  You have been defeated...`,
            newSave,
            combatState: undefined,
        };
    }
    session2 = (0, CombatEngine_1.advanceTurn)(session2);
    return {
        text: `${(0, CombatEngine_1.formatCombatState)(session2)}\n${(0, CombatEngine_1.formatCombatPrompt)(session2, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
        combatState: session2,
    };
}
function handleCombatItem(args, save, combatState) {
    const unequipped = save.inventory.filter(s => !s.equipped);
    const page = parseInventoryPageIndex(args[0], save);
    if (page === -1 || page >= unequipped.length)
        return { text: 'Invalid slot number.', combatState };
    const item = unequipped[page];
    const newSave = (0, InventoryManager_1.inventoryUse)(save, item.slotId);
    let session = (0, CombatEngine_1.enemyTurn)(combatState);
    session = (0, CombatEngine_1.tickStatusEffects)(session);
    session = (0, CombatEngine_1.checkVictory)(session);
    if (session.winner === 'enemy') {
        return {
            text: `${(0, CombatEngine_1.formatCombatState)(session)}\n\n  You have been defeated...`,
            newSave,
            combatState: undefined,
        };
    }
    session = (0, CombatEngine_1.advanceTurn)(session);
    return {
        text: `${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, newSave.stats.hp, newSave.stats.maxHp, newSave.stats.mana, newSave.stats.maxMana)}`,
        newSave,
        combatState: session,
    };
}
// ─── Helpers ────────────────────────────────────────────────────────────
function parseInventoryPageIndex(raw, save) {
    if (!raw)
        return -1;
    const n = parseInt(raw) - 1;
    if (isNaN(n) || n < 0 || n >= save.inventory.filter(s => !s.equipped).length)
        return -1;
    return n;
}
function inventoryUnequipBySlot(save, slot) {
    return (0, InventoryManager_1.inventoryUnequip)(save, slot);
}
function formatStats(s) {
    const hpPct = Math.round((s.hp / s.maxHp) * 100);
    const mpPct = Math.round((s.mana / s.maxMana) * 100);
    return `
  ╔═══════════════════════════════════════════════════════════════════╗
  ║  ${s.name.padEnd(44)}  Lv ${String(s.level).padStart(3)}        ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║  HP:  ${String(s.hp).padStart(5)}/${s.maxHp} (${String(hpPct).padStart(3)}%)              Gold: ${String(s.gold).padStart(6)}g       ║
  ║  MP:  ${String(s.mana).padStart(5)}/${s.maxMana} (${String(mpPct).padStart(3)}%)              EXP:  ${String(s.exp).padStart(6)}/${s.expToNext}     ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║  STR:  ${String(s.strength).padStart(3)}   DEF:  ${String(s.defense).padStart(3)}   ATK:  ${String(s.attack).padStart(3)}           ║
  ║  AGI:  ${String(s.agility).padStart(3)}   LCK:  ${String(s.luck).padStart(3)}   Crit: ${Math.round(s.critRate * 100)}% / ${Math.round(s.critDamage * 100)}%    ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║  Free Stat Points: ${String(s.freeStatPoints).padStart(2)}   Perk Slots: ${String(s.perkSlots).padStart(2)}                      ║
  ╚═══════════════════════════════════════════════════════════════════╝`;
}
function formatSkills(save) {
    const lines = ['  ──────────── SKILLS ────────────'];
    if (save.skills.physical.length === 0 && save.skills.magic.length === 0) {
        lines.push('  (no skills learned — find scrolls in dungeons)');
    }
    else {
        save.skills.physical.forEach((sk, i) => {
            lines.push(`  [${i + 1}] ${sk.name} Lv${sk.level}  DMG:${sk.baseDamage}  MP:${sk.manaCost}`);
        });
        save.skills.magic.forEach((sk, i) => {
            lines.push(`  [${i + 1}] ${sk.name} Lv${sk.level}  ${sk.element}  DMG:${sk.baseDamage}  MP:${sk.manaCost}`);
        });
    }
    return lines.join('\n');
}
function formatMap(save) {
    return `
  ══════════════════════════════════════════════════════════════
   WORLD MAP  [You are at: ${(0, areas_1.getArea)(save.worldState.currentArea)?.name ?? 'Unknown'}]
  ══════════════════════════════════════════════════════════════
  [Ashford]──[Plains]──[Ravine]──[Irongate]──[Coal Mine]──[River Delta]──[Millhaven]
      │                                                            │
  [Goblin Warren D1]                                       [Thornwick]
      │                                                            │
                                                            [Bamboo Grove]
                                                                   │
  [Rotwood Ruins D2]──[Millhaven]──[Amber Savanna]──[Crystal Badlands]──[Crystalmere City]
                                                                       │
  [Sunken Mines D3]          [Emberveil]──[Mirefen Swamp]──[Shadow Thicket]──[Duskhollow]
                                                                       │
  [Thornwood Labyrinth D4]                              [Thunder Steppes]──[Stormspire Citadel]
                                                                       │
                                                                  [Storm Peaks]
                                                                       │
                                                            [Skybridge Trail]──[Veilreach]
  ══════════════════════════════════════════════════════════════
  Type 'go <dir>' to move. Type 'travel <city>' to fast travel (unlocked cities).
  `;
}
function formatHelp() {
    return `
  ════════════════════════════════════════════════════════════════════
   COMMANDS
  ════════════════════════════════════════════════════════════════════
  MOVEMENT
    look / l                — describe current area
    go <dir>                — move (north/south/east/west)
    rest                    — rest in safe zone (fast regen)
    map                     — show world map

  CHARACTER
    stats                  — view all stats
    inventory / inv [N]    — show inventory (page N)
    equip <n>               — equip item
    unequip <slot>          — unequip slot
    use <n>                 — use consumable
    drop <n>                — drop item
    skills                 — list learned skills
    gold                   — show gold balance

  COMBAT
    attack [n]              — attack enemy n (default: 1)
    flee                    — attempt to escape
    item <n>                — use consumable during combat
    log                     — show combat log

  SYSTEM
    save                    — save game (at Inn)
    help                    — show this help
    quit                    — quit (auto-saves)
  ════════════════════════════════════════════════════════════════════`;
}
//# sourceMappingURL=CommandParser.js.map