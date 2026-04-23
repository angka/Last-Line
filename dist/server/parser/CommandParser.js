"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommand = parseCommand;
const areas_1 = require("../../data/areas");
const InventoryManager_1 = require("../items/InventoryManager");
const items_1 = require("../../data/items");
const RegenEngine_1 = require("../engine/RegenEngine");
const CombatEngine_1 = require("../engine/CombatEngine");
const shops_1 = require("../../data/shops");
const skills_1 = require("../../data/skills");
const crafting_1 = require("../../data/crafting");
const CraftingManager_1 = require("../engine/CraftingManager");
const LootEngine_1 = require("../engine/LootEngine");
const dungeons_1 = require("../../data/dungeons");
const CombatEngine_2 = require("../engine/CombatEngine");
const PresenceManager_1 = require("../social/PresenceManager");
const PartyManager_1 = require("../social/PartyManager");
const TradeManager_1 = require("../social/TradeManager");
const PartyCombatManager_1 = require("../engine/PartyCombatManager");
const AchievementEngine_1 = require("../engine/AchievementEngine");
const WorldBossEngine_1 = require("../engine/WorldBossEngine");
function parseCommand(cmd, save, combatState, _sessionId, playerId) {
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
            const areaNodes = (0, CraftingManager_1.formatAreaNodes)(save.worldState.currentArea);
            const hpPct = Math.round((save.stats.hp / save.stats.maxHp) * 100);
            const mpPct = Math.round((save.stats.mana / save.stats.maxMana) * 100);
            return {
                text: `${areaDesc}${areaNodes ? '\n\n' + areaNodes : ''}\n\n  HP: ${save.stats.hp}/${save.stats.maxHp} (${hpPct}%)  |  MP: ${save.stats.mana}/${save.stats.maxMana} (${mpPct}%)  |  Gold: ${save.stats.gold}g\n  [${(0, RegenEngine_1.regenStateLabel)(save.regenState)}]`,
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
        // ── Travel (fast travel between unlocked cities) ──────────────────
        case 'travel':
        case 'tp': {
            return handleTravel(args[0], save);
        }
        // ── Shop ───────────────────────────────────────────────────────────
        case 'shop': {
            return handleShop(save);
        }
        case 'buy': {
            return handleBuy(args[0], save);
        }
        case 'sell': {
            return handleSell(args[0], save);
        }
        // ── Inn ────────────────────────────────────────────────────────────
        case 'inn': {
            return handleInn(save);
        }
        // ── Dungeon Navigation ─────────────────────────────────────────────
        case 'up': {
            return handleDungeonUp(save);
        }
        case 'down': {
            return handleDungeonDown(save);
        }
        case 'leave':
        case 'exit_dungeon': {
            return handleDungeonLeave(save);
        }
        case 'explore': {
            return handleDungeonExplore(save);
        }
        case 'dungeon_status': {
            return handleDungeonStatus(save);
        }
        // ── Skills ─────────────────────────────────────────────────────────
        case 'skill':
        case 'magic': {
            return handleSkill(args, save, combatState);
        }
        case 'learn': {
            return handleLearn(args, save);
        }
        // ── Crafting ────────────────────────────────────────────────────────
        case 'craft': {
            return handleCraft(args, save);
        }
        // ── Gathering ────────────────────────────────────────────────────────
        case 'gather':
        case 'mine':
        case 'chop':
        case 'pick':
        case 'fill':
        case 'sift':
        case 'attune': {
            return handleGather(verb, save);
        }
        // ── Pending Loot ─────────────────────────────────────────────────────
        case 'loot':
        case 'pending_loot': {
            return handlePendingLoot(save, args);
        }
        case 'chest': {
            return handleDungeonChest(save);
        }
        // ── Social: who / nearby ─────────────────────────────────────────────
        case 'who':
        case 'nearby': {
            return handleWho(save);
        }
        // ── Social: Chat ─────────────────────────────────────────────────────
        case 'say': {
            const text = args.join(' ');
            if (!text)
                return { text: 'Say what? Usage: say <text>' };
            return handleAreaChat(text, save);
        }
        case 'p':
        case 'party_chat': {
            const text = args.join(' ');
            if (!text)
                return { text: 'Party chat what? Usage: p <text>' };
            return handlePartyChat(text, save);
        }
        case 'msg':
        case 'whisper': {
            if (args.length < 2)
                return { text: 'Usage: msg <player> <text>' };
            const target = args[0];
            const text = args.slice(1).join(' ');
            return handleWhisper(target, text, save);
        }
        case 'shout': {
            const text = args.join(' ');
            if (!text)
                return { text: 'Shout what? Usage: shout <text>' };
            return handleShout(text, save);
        }
        // ── Social: Party ─────────────────────────────────────────────────────
        case 'party': {
            return handleParty(args, save);
        }
        // ── Social: Trade ─────────────────────────────────────────────────────
        case 'trade': {
            return handleTrade(args, save);
        }
        // ── Party Combat ───────────────────────────────────────────────────────────
        case 'party_start': {
            return handlePartyStart(save);
        }
        case 'revive': {
            return handleRevive(args, save);
        }
        case 'heal': {
            return handlePartyHeal(args, save);
        }
        case 'buff': {
            return handlePartyBuff(args, save);
        }
        case 'share_loot': {
            return handleShareLoot(args, save);
        }
        case 'pvp': {
            return handlePvp(args, save);
        }
        // ── Phase 7: Achievements ────────────────────────────────────────────────
        case 'achievements': {
            return handleAchievements(save);
        }
        // ── Phase 7: World Boss ─────────────────────────────────────────────────
        case 'worldboss': {
            return handleWorldBoss(args, save);
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
    // Auto-unlock city on first visit
    const isCity = target?.regenState === 'city';
    const alreadyUnlockedCity = save.worldState.unlockedCities.includes(targetId);
    const newUnlockedCities = (isCity && !alreadyUnlockedCity)
        ? [...save.worldState.unlockedCities, targetId]
        : save.worldState.unlockedCities;
    // Auto-unlock dungeon on first visit
    const dungeonInfo = (0, dungeons_1.getDungeonForArea)(targetId);
    const dungeonId = dungeonInfo?.id ?? '';
    const alreadyUnlockedDungeon = save.worldState.unlockedDungeons.includes(dungeonId);
    const newUnlockedDungeons = (!alreadyUnlockedDungeon && dungeonId)
        ? [...save.worldState.unlockedDungeons, dungeonId]
        : save.worldState.unlockedDungeons;
    const newSave = {
        ...save,
        worldState: {
            ...save.worldState,
            currentArea: targetId,
            currentCity: isCity ? targetId : save.worldState.currentCity,
            unlockedCities: newUnlockedCities,
            unlockedDungeons: newUnlockedDungeons,
        },
        regenState: target?.safeZone ? 'city' : 'exploring',
        pvp: { ...save.pvp, safeZone: target?.safeZone ?? false },
    };
    const unlockMsg = (!alreadyUnlockedCity && isCity)
        ? `\n\n  ★ New city discovered: ${target?.name} — type "travel" to fast travel here later!`
        : '';
    // Try encounter
    if (target && !target.safeZone && target.baseEncounterChance > 0) {
        if (Math.random() < target.baseEncounterChance) {
            const enemies = (0, CombatEngine_1.generateEncounter)(target.levelRange, save.stats.level, 1, 2, 0.08);
            if (enemies.length > 0) {
                // Check if auto-party-combat should trigger
                if (save.partyId) {
                    const areaPlayers = PresenceManager_1.presenceManager.getPlayersInArea(targetId);
                    const partyMembers = areaPlayers.filter(p => PartyManager_1.partyManager.isInParty(p.playerId) &&
                        PartyManager_1.partyManager.getPartyOf(p.playerId)?.partyId === save.partyId);
                    if (partyMembers.length >= 2) {
                        return {
                            text: `${(0, areas_1.describeArea)(targetId)}\n\n  ⚔ PARTY COMBAT — ${enemies.length} enemies appear!\n  All co-located party members enter combat together.\n  Use "attack <n>", "skill <t> <n>", "magic <n>", "heal <ally>", "buff <ally>", "flee", "log".`,
                            newSave,
                            action: 'party_encounter',
                            pushMessages: [
                                { channel: 'departure', areaId: save.worldState.currentArea, text: `[Nearby] ${save.stats.name} has left.`, excludeSelf: true },
                                { channel: 'arrival', areaId: targetId, text: `[Nearby] ${save.stats.name} has entered the area.`, excludeSelf: false },
                                { channel: 'area', areaId: targetId, text: `[Combat] ⚔ ${save.stats.name} triggered party combat!`, excludeSelf: false },
                            ],
                            partyEncounter: { partyId: save.partyId, areaId: targetId, enemies },
                        };
                    }
                }
                const session = (0, CombatEngine_1.createCombatSession)(newSave, enemies, targetId);
                return {
                    text: `${(0, areas_1.describeArea)(targetId)}\n\n  ENCOUNTER! ${enemies.map(e => e.name).join(', ')} blocks your path!\n${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, newSave.stats.hp, newSave.stats.maxHp, newSave.stats.mana, newSave.stats.maxMana)}`,
                    newSave,
                    combatState: session,
                };
            }
        }
    }
    const dungeonInfo2 = (0, dungeons_1.getDungeonFloor)(targetId);
    const floorNote = dungeonInfo2
        ? `\n  [Dungeon: ${dungeonInfo2.dungeon.name} — Floor ${dungeonInfo2.floor}/${dungeonInfo2.dungeon.floors.length}]`
        : '';
    return {
        text: (0, areas_1.describeArea)(targetId) + `\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [${(0, RegenEngine_1.regenStateLabel)(newSave.regenState)}]${floorNote}${unlockMsg}`,
        newSave,
        pushMessages: [
            // Departure from old area (client hasn't switched areas yet)
            { channel: 'departure', areaId: save.worldState.currentArea, text: `[Nearby] ${save.stats.name} has left.`, excludeSelf: true },
            // Arrival in new area
            { channel: 'arrival', areaId: targetId, text: `[Nearby] ${save.stats.name} has entered the area.`, excludeSelf: false },
        ],
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
// ─── Travel ─────────────────────────────────────────────────────────────
function handleTravel(cityName, save) {
    if (!cityName) {
        const unlocked = areas_1.CITIES.filter(c => save.worldState.unlockedCities.includes(c.id));
        if (unlocked.length === 0) {
            return { text: 'No cities unlocked yet. Explore to discover new cities.' };
        }
        const lines = ['  ═══════════════ FAST TRAVEL ═══════════════'];
        lines.push('  Usage: travel <city-name>');
        lines.push('  ─────────────────────────────────────────────');
        lines.push('  Unlocked Cities:');
        for (const c of unlocked) {
            lines.push(`    ${c.name} [Lv ${c.minLevel ?? '?'}+]`);
        }
        return { text: lines.join('\n') };
    }
    const target = areas_1.CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase() ||
        c.id === cityName.toLowerCase());
    if (!target) {
        return { text: `Unknown city "${cityName}". Type 'travel' to see unlocked cities.` };
    }
    if (!save.worldState.unlockedCities.includes(target.id)) {
        return { text: `"${target.name}" is not yet discovered. Explore to find it.` };
    }
    const newSave = {
        ...save,
        worldState: {
            ...save.worldState,
            currentArea: target.id,
            currentCity: target.id,
        },
        regenState: 'city',
        pvp: { ...save.pvp, safeZone: true },
    };
    return {
        text: `  You arrive at ${target.name}.\n\n${(0, areas_1.describeArea)(target.id)}\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [city — fast regen]`,
        newSave,
    };
}
// ─── Shop ────────────────────────────────────────────────────────────────
function handleShop(save) {
    const cityId = save.worldState.currentCity || save.worldState.currentArea;
    const catalog = (0, shops_1.getShopCatalog)(cityId);
    if (!catalog) {
        return { text: 'There is no shop here.' };
    }
    const lines = ['  ═══════════════ CITY SHOP ═══════════════'];
    lines.push(`  ${(0, areas_1.getArea)(cityId)?.name ?? cityId} General Store`);
    lines.push('  ─────────────────────────────────────────────');
    lines.push(`  Your gold: ${save.stats.gold}g`);
    lines.push('  ─────────────────────────────────────────────');
    lines.push('  [N]  Item                           Price');
    lines.push('  ─────────────────────────────────────────────');
    catalog.items.forEach((itemId, idx) => {
        const item = (0, items_1.getItem)(itemId);
        if (!item)
            return;
        const col = (0, items_1.rarityColor)(item.rarity);
        const r = items_1.RARITY_RESET;
        const price = Math.round(item.buyPrice * 1.1); // 10% markup
        lines.push(`  [${String(idx + 1).padStart(2)}]  ${col}${item.name}${r.padEnd(30 - item.name.length)} ${price}g`);
    });
    lines.push('  ─────────────────────────────────────────────');
    lines.push('  Type "buy <n>" to purchase, "sell <n>" to sell items.');
    return { text: lines.join('\n') };
}
function handleBuy(rawIdx, save) {
    const cityId = save.worldState.currentCity || save.worldState.currentArea;
    const catalog = (0, shops_1.getShopCatalog)(cityId);
    if (!catalog)
        return { text: 'There is no shop here.' };
    if (!rawIdx)
        return { text: 'Usage: buy <number>  — type "shop" to see items.' };
    const idx = parseInt(rawIdx) - 1;
    if (isNaN(idx) || idx < 0 || idx >= catalog.items.length) {
        return { text: `Invalid selection. Type "shop" to see available items.` };
    }
    const itemId = catalog.items[idx];
    const item = (0, items_1.getItem)(itemId);
    if (!item)
        return { text: 'Item not found.' };
    const price = Math.round(item.buyPrice * 1.1);
    if (save.stats.gold < price) {
        return { text: `Not enough gold. ${item.name} costs ${price}g, you have ${save.stats.gold}g.` };
    }
    const { save: newSave } = (0, InventoryManager_1.inventoryAdd)({ ...save, stats: { ...save.stats, gold: save.stats.gold - price } }, itemId, 1);
    return {
        text: `  You purchased ${item.name} for ${price}g. Gold: ${newSave.stats.gold}g`,
        newSave,
    };
}
function handleSell(rawIdx, save) {
    const cityId = save.worldState.currentCity || save.worldState.currentArea;
    if (!(0, shops_1.getShopCatalog)(cityId))
        return { text: 'There is no shop here to sell to.' };
    if (!rawIdx)
        return { text: 'Usage: sell <inventory-slot>  — type "inv" to see your items.' };
    const unequipped = save.inventory.filter(s => !s.equipped);
    const idx = parseInt(rawIdx) - 1;
    if (isNaN(idx) || idx < 0 || idx >= unequipped.length) {
        return { text: `Invalid slot. Type "inv" to see your inventory.` };
    }
    const slot = unequipped[idx];
    const item = (0, items_1.getItem)(slot.itemId);
    if (!item)
        return { text: 'Item not found.' };
    const sellPrice = item.sellPrice;
    const newSave = (0, InventoryManager_1.inventoryRemove)(save, slot.slotId);
    const finalSave = { ...newSave, stats: { ...newSave.stats, gold: newSave.stats.gold + sellPrice } };
    return {
        text: `  You sold ${item.name} for ${sellPrice}g. Gold: ${finalSave.stats.gold}g`,
        newSave: finalSave,
    };
}
// ─── Inn ─────────────────────────────────────────────────────────────────
const INN_PRICES = {
    // tier 1
    1: { hpPct: 0.50, manaPct: 0.50, price: 10 },
    2: { hpPct: 0.75, manaPct: 0.75, price: 30 },
    3: { hpPct: 1.00, manaPct: 1.00, price: 75 },
    4: { hpPct: 1.00, manaPct: 1.00, price: 150 },
    5: { hpPct: 1.00, manaPct: 1.00, price: 300 },
    6: { hpPct: 1.00, manaPct: 1.00, price: 500 },
};
function innTierForCity(cityId) {
    const tierMap = {
        ashford_village_square: 1,
        iron_gate_town_square: 2,
        thornwick_square: 2,
        millhaven_square: 2,
        crystalmere_city_square: 3,
        emberveil_square: 3,
        duskhollow_square: 4,
        stormspire_citadel_square: 4,
        veilreach_square: 5,
        cinderpeak_square: 5,
        ashenmoor_square: 5,
        wraithgate_square: 6,
        obsidian_keep_square: 6,
        the_sanctum_square: 6,
    };
    return tierMap[cityId] ?? 1;
}
function handleInn(save) {
    const cityId = save.worldState.currentCity || save.worldState.currentArea;
    const area = (0, areas_1.getArea)(cityId);
    if (!area?.safeZone || area.regenState !== 'city') {
        return { text: 'There is no inn here. Find a city to rest.' };
    }
    const tier = innTierForCity(cityId);
    const tierData = INN_PRICES[tier];
    const { hpPct, manaPct, price } = tierData;
    if (save.stats.gold < price) {
        return { text: `Not enough gold for the inn. Room costs ${price}g, you have ${save.stats.gold}g.` };
    }
    const newHp = Math.round(save.stats.maxHp * hpPct);
    const newMana = Math.round(save.stats.maxMana * manaPct);
    const newSave = {
        ...save,
        stats: { ...save.stats, hp: newHp, mana: newMana, gold: save.stats.gold - price },
        worldState: { ...save.worldState, currentCity: cityId },
        regenState: 'inn',
    };
    return {
        text: `  You rented a room at the inn and rested deeply.\n  HP restored to ${newHp}/${save.stats.maxHp}  |  MP restored to ${newMana}/${save.stats.maxMana}\n  You paid ${price}g. Gold: ${newSave.stats.gold}g\n\n  Game auto-saved.`,
        newSave,
        action: 'save',
    };
}
// ─── Dungeon Navigation ───────────────────────────────────────────────────
function handleDungeonUp(save) {
    const areaId = save.worldState.currentArea;
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const prevAreaId = (0, dungeons_1.getPrevFloorArea)(areaId);
    if (!prevAreaId) {
        return { text: 'You are already at the dungeon entrance. Use "leave" to exit.' };
    }
    return moveInDungeon(save, prevAreaId, 'up');
}
function handleDungeonDown(save) {
    const areaId = save.worldState.currentArea;
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const nextAreaId = (0, dungeons_1.getNextFloorArea)(areaId);
    if (!nextAreaId) {
        return { text: 'You are at the deepest floor. Prepare for the boss!' };
    }
    return moveInDungeon(save, nextAreaId, 'down');
}
function handleDungeonLeave(save) {
    const areaId = save.worldState.currentArea;
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const info = (0, dungeons_1.getDungeonFloor)(areaId);
    if (!info)
        return { text: 'Unknown dungeon.' };
    const entrance = info.dungeon.entrance;
    const entranceArea = (0, areas_1.getArea)(entrance);
    const newSave = {
        ...save,
        worldState: {
            ...save.worldState,
            currentArea: entrance,
            currentCity: entranceArea?.regenState === 'city' ? entrance : save.worldState.currentCity,
        },
        regenState: entranceArea?.safeZone ? 'city' : 'exploring',
    };
    return {
        text: `  You leave the ${info.dungeon.name} and return to ${entranceArea?.name ?? entrance}.\n\n${(0, areas_1.describeArea)(entrance)}\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g`,
        newSave,
    };
}
function handleDungeonExplore(save) {
    const areaId = save.worldState.currentArea;
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon. Explore the wilderness with "go <dir>".' };
    }
    const area = (0, areas_1.getArea)(areaId);
    if (!area || area.baseEncounterChance === 0) {
        return { text: 'Nothing to explore here.' };
    }
    // Check if this is a boss floor
    const dungeonInfo2 = (0, dungeons_1.getDungeonFloor)(areaId);
    const isBossFloor = dungeonInfo2 ? dungeonInfo2.dungeon.floors[dungeonInfo2.floor - 1]?.bossFloor : false;
    if (isBossFloor && dungeonInfo2) {
        const boss = (0, CombatEngine_2.generateBossEncounter)(dungeonInfo2.dungeon.bossId);
        if (boss) {
            const session = (0, CombatEngine_1.createCombatSession)(save, [boss], areaId);
            return {
                text: `${area.name}\n\n  ⚔ BOSS BATTLE! ${boss.name} rises to meet you!\n${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
                combatState: session,
            };
        }
    }
    // Normal dungeon floor — 100% encounter on explore
    const dungeonFloor = dungeonInfo2 ? dungeonInfo2.floor : 1;
    const eliteChance = 0.05 + dungeonFloor * 0.03;
    const enemies = (0, CombatEngine_1.generateEncounter)(area.levelRange, save.stats.level, 1, 3, eliteChance);
    if (enemies.length === 0) {
        return { text: `${area.name}\n\n  You search the area but find nothing this time.` };
    }
    const session = (0, CombatEngine_1.createCombatSession)(save, enemies, areaId);
    return {
        text: `${area.name}\n\n  You explore carefully... ENCOUNTER! ${enemies.map(e => e.name).join(', ')}!\n${(0, CombatEngine_1.formatCombatState)(session)}\n${(0, CombatEngine_1.formatCombatPrompt)(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
        combatState: session,
    };
}
function handleDungeonStatus(save) {
    const areaId = save.worldState.currentArea;
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const info = (0, dungeons_1.getDungeonFloor)(areaId);
    if (!info)
        return { text: 'Unknown dungeon.' };
    const { dungeon, floor } = info;
    const total = dungeon.floors.length;
    const isBoss = info.dungeon.floors[floor - 1]?.bossFloor;
    return {
        text: `  ═══════════ DUNGEON STATUS ═══════════\n  ${dungeon.name}\n  Floor: ${floor}/${total}${isBoss ? '  [BOSS]' : ''}\n  ─────────────────────────────────────\n  Type "up" to go up, "down" to go deeper.\n  Type "explore" to seek enemies on this floor.\n  Type "leave" to exit the dungeon.`,
    };
}
function moveInDungeon(save, targetAreaId, direction) {
    const target = (0, areas_1.getArea)(targetAreaId);
    if (!target)
        return { text: 'Cannot move there.' };
    // Unlock dungeon on first visit
    const dungeonInfo = (0, dungeons_1.getDungeonForArea)(targetAreaId);
    const dungeonId = dungeonInfo?.id ?? '';
    const alreadyUnlocked = save.worldState.unlockedDungeons.includes(dungeonId);
    const newUnlockedDungeons = alreadyUnlocked
        ? save.worldState.unlockedDungeons
        : [...save.worldState.unlockedDungeons, dungeonId];
    const newSave = {
        ...save,
        worldState: {
            ...save.worldState,
            currentArea: targetAreaId,
            unlockedDungeons: newUnlockedDungeons,
        },
        regenState: target.safeZone ? 'city' : 'exploring',
    };
    const dungeonInfo2 = (0, dungeons_1.getDungeonFloor)(targetAreaId);
    const floorNote = dungeonInfo2
        ? `  [Dungeon: ${dungeonInfo2.dungeon.name} — Floor ${dungeonInfo2.floor}/${dungeonInfo2.dungeon.floors.length}]`
        : '';
    return {
        text: (0, areas_1.describeArea)(targetAreaId) + `\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [${(0, RegenEngine_1.regenStateLabel)(newSave.regenState)}]\n${floorNote}`,
        newSave,
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
function formatMap(save) {
    return `
  ══════════════════════════════════════════════════════════════════════
   WORLD MAP  [${(0, areas_1.getArea)(save.worldState.currentArea)?.name ?? 'Unknown'}]
  ══════════════════════════════════════════════════════════════════════
  DUNGEONS (enter via go <dir> from nearby areas):
    Goblin Warren F3    north of Ashford       | Thornwick Ruins F3  east of Thornwick
    Sunken Mines F5     west of Irongate       | Mirefen Catacombs F3 west of Mirefen
    Dragon's Lair F5   north of Cinderpeak    | Boss on final floor of each!

  CITIES (type 'travel <name>' to fast travel):
    Ashford · Irongate · Thornwick · Millhaven · Crystalmere · Emberveil
    Duskhollow · Stormspire · Veilreach · Cinderpeak · Ashenmoor
    Wraithgate · Obsidian Keep · The Sanctum
  ══════════════════════════════════════════════════════════════════════
  Type 'go <dir>' to move. Type 'travel' for a list of unlocked cities.
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
    travel [city]           — fast travel to unlocked city
    rest                    — rest in safe zone (fast regen)
    map                     — show world map

  CITIES & TRADE
    shop                    — view city shop inventory
    buy <n>                 — buy item n from shop
    sell <n>                — sell item n from inventory
    inn                     — rent room (restores HP/MP, saves game)

  DUNGEONS (enter via go <dir> from nearby areas)
    explore                 — seek enemies on current dungeon floor
    up                      — go to previous dungeon floor
    down                    — go to next dungeon floor
    leave                   — exit dungeon to surface
    dungeon_status          — show dungeon progress

  CHARACTER
    stats                  — view all stats
    inventory / inv [N]    — show inventory (page N)
    equip <n>               — equip item
    unequip <slot>          — unequip slot
    use <n>                 — use consumable
    drop <n>                — drop item
    skills                  — list learned skills
    skill <type> <n>        — use skill in combat (type: physical/magic/support)
    learn <n>               — learn skill from scroll (in inv)
    gold                   — show gold balance

  CRAFTING & GATHERING
    craft                   — show crafting recipes
    craft <n>              — craft item by recipe number
    gather / mine / chop / pick / fill / sift / attune
                          — gather resources from area nodes
    look                    — area description also shows resource nodes

  LOOT
    loot                    — claim pending loot after combat
    pending_loot            — view pending loot
    pending_loot claim      — claim all pending loot
    chest                   — open dungeon chest (after boss kill)

  COMBAT
    attack [n]              — attack enemy n (default: 1)
    flee                    — attempt to escape
    skill <type> <n>        — use skill (physical/magic/support)
    item <n>                — use consumable during combat
    log                     — show combat log

  SOCIAL
    who / nearby            — see players in your area
    say <text>             — chat to players in your area
    p <text>               — party chat (must be in a party)
    msg <name> <text>       — whisper another player
    shout <text>           — server-wide (60s cooldown)
    party [info]           — show party members
    party invite <name>    — invite a player to party
    party leave            — leave your party
    party disband          — leader: disband party
    party kick <name>      — leader: kick a member
    party accept/decline   — respond to party invite

  PARTY COMBAT
    party_start            — start shared party combat (min 2 members same area)
    attack <n>             — attack enemy n (shared turn order)
    flee                   — party flee attempt
    heal <ally>            — heal a party member (during your turn)
    buff <ally>            — buff a party member (during your turn)
    revive <name>          — revive downed ally (50 MP)
    log                    — show party combat status

  TRADE
    trade offer <player> "<item>" <price>
                          — offer item for gold to a player
    trade view             — view active trade
    trade accept           — buyer: accept offer
    trade confirm          — seller: complete trade
    trade counter <price>  — counter-offer
    trade decline/cancel   — cancel trade

  PvP
    pvp status            — show your PvP status
    pvp on                — enable PvP (outside safe zones)
    pvp off               — disable PvP
    pvp area              — check current area PvP rules

  ACHIEVEMENTS
    achievements          — view all achievements and progress

  WORLD BOSS
    worldboss             — check active world boss
    worldboss status      — active boss status and HP
    worldboss join        — travel to the active world boss location

  SYSTEM
    save                    — save game (at Inn)
    help                    — show this help
    quit                    — quit (auto-saves)
  ════════════════════════════════════════════════════════════════════`;
}
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
        const manaCost = (0, skills_1.getSkillManaCost)(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = (0, CombatEngine_1.playerSkill)(combatState, 'physical', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.session };
    }
    if (skillType === 'magic' || skillType === 'mag') {
        if (idx < 0 || idx >= save.skills.magic.length) {
            return { text: 'Invalid magic number. Type "skills" to see your magic skills.' };
        }
        const skill = save.skills.magic[idx];
        const manaCost = (0, skills_1.getSkillManaCost)(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = (0, CombatEngine_1.playerSkill)(combatState, 'magic', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.session };
    }
    if (skillType === 'support' || skillType === 'sup') {
        if (idx < 0 || idx >= save.skills.support.length) {
            return { text: 'Invalid support skill number.' };
        }
        const skill = save.skills.support[idx];
        const manaCost = (0, skills_1.getSkillManaCost)(skill.level, skill.manaCost);
        if (save.stats.mana < manaCost) {
            return { text: `Not enough mana. ${skill.name} costs ${manaCost} MP.` };
        }
        const result = (0, CombatEngine_1.playerSkill)(combatState, 'support', idx, save);
        return { text: result.text, newSave: result.newSave, combatState: result.session };
    }
    return { text: 'Usage: skill physical/magic/support <n>' };
}
// ─── Learn Skill ──────────────────────────────────────────────────────────────
function handleLearn(args, save) {
    const raw = args[0];
    if (!raw) {
        const scrolls = save.inventory.filter(slot => {
            const item = (0, items_1.getItem)(slot.itemId);
            return item?.type === 'scroll';
        });
        if (scrolls.length === 0) {
            return { text: 'No skill scrolls in inventory. Find scrolls in dungeons or buy them from shops.' };
        }
        const lines = ['  ══════════ SKILL SCROLLS ══════════', '  Scrolls in inventory (use "learn <n>"):'];
        scrolls.forEach((slot, i) => {
            const item = (0, items_1.getItem)(slot.itemId);
            lines.push(`  [${i + 1}] ${item?.name ?? slot.itemId} — ${item?.description ?? ''}`);
        });
        lines.push('  ─────────────────────────────────────');
        lines.push('  Use "learn <n>" to learn the skill from scroll N.');
        return { text: lines.join('\n') };
    }
    const page = parseInventoryPageIndex(raw, save);
    const scrolls = save.inventory.filter(slot => {
        const item = (0, items_1.getItem)(slot.itemId);
        return item?.type === 'scroll';
    });
    if (page < 0 || page >= scrolls.length) {
        return { text: 'Invalid scroll number. Type "learn" to see your scrolls.' };
    }
    const slot = scrolls[page];
    const result = (0, skills_1.getSkillByItemId)(slot.itemId);
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
    s = (0, InventoryManager_1.inventoryRemove)(s, slot.slotId);
    const skillName = skill.name;
    return {
        text: `  ★ You learned ${skillName}!\n  "${skill.description}"\n  Use "skill ${type === 'magic' ? 'magic' : type === 'support' ? 'support' : 'physical'} <n>" to activate it in combat.`,
        newSave: s,
    };
}
// ─── Crafting ────────────────────────────────────────────────────────────────
function handleCraft(args, save) {
    if (args.length === 0) {
        return { text: (0, CraftingManager_1.formatCraftingMenu)(save) };
    }
    const idx = parseInt(args[0]) - 1;
    if (isNaN(idx) || idx < 0) {
        return { text: 'Usage: craft [n] — type "craft" without args to see recipes.' };
    }
    const result = (0, CraftingManager_1.craftItem)(save, idx);
    return { text: result.text, newSave: result.newSave };
}
// ─── Gathering ────────────────────────────────────────────────────────────────
function handleGather(verb, save) {
    const result = (0, CraftingManager_1.gatherFromNode)(save, save.worldState.currentArea, verb);
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
        const item = (0, items_1.getItem)(drop.itemId);
        const qty = drop.quantity > 1 ? ` x${drop.quantity}` : '';
        const col = item ? (0, items_1.rarityColor)(item.rarity) : '';
        const r = items_1.RARITY_RESET;
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
                const result2 = (0, InventoryManager_1.inventoryAdd)(s, drop.itemId, drop.quantity);
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
    if (!(0, areas_1.isDungeonArea)(areaId)) {
        return { text: 'You are not in a dungeon.' };
    }
    const dungeonInfo = (0, dungeons_1.getDungeonForArea)(areaId);
    if (!dungeonInfo)
        return { text: 'Unknown dungeon.' };
    const existing = save.worldState.dungeonChests?.find(c => c.areaId === areaId);
    if (existing?.opened) {
        return { text: 'You already opened this floor chest.' };
    }
    const chestLoot = (0, LootEngine_1.getDungeonChestLoot)(dungeonInfo.id);
    const lines = ['  ══════════ DUNGEON CHEST ══════════'];
    for (const drop of chestLoot) {
        const item = (0, items_1.getItem)(drop.itemId);
        if (drop.itemId === 'gold') {
            lines.push(`  + ${drop.quantity}g`);
        }
        else {
            const col = item ? (0, items_1.rarityColor)(item.rarity) : '';
            const r = items_1.RARITY_RESET;
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
    const nodes = crafting_1.GATHERING_NODES[areaId] ?? [];
    if (nodes.length === 0)
        return '';
    const lines = ['  Resource Nodes:'];
    for (const node of nodes) {
        lines.push(`    ► ${node.name}  [${node.verb}]${node.requiresTool ? ` (${node.requiresTool})` : ''}`);
    }
    return lines.join('\n');
}
// ════════════════════════════════════════════════════════════════════════════
//  PHASE 5 — MULTIPLAYER COMBAT & TURN TIMER
// ════════════════════════════════════════════════════════════════════════════
// ─── Start Party Combat ───────────────────────────────────────────────────────
function handlePartyStart(save) {
    if (!save.partyId) {
        return { text: 'You must be in a party to start party combat. Use "party invite <name>" first.' };
    }
    // Check if already in combat
    const existing = (0, PartyCombatManager_1.getPartyCombat)(save.partyId);
    if (existing) {
        return { text: 'Your party is already in combat!' };
    }
    // Players must be in same area for party combat
    const areaId = save.worldState.currentArea;
    const areaPlayers = PresenceManager_1.presenceManager.getPlayersInArea(areaId);
    const partyMembers = areaPlayers.filter(p => PartyManager_1.partyManager.isInParty(p.playerId) && PartyManager_1.partyManager.getPartyOf(p.playerId)?.partyId === save.partyId);
    if (partyMembers.length < 2) {
        return { text: 'You need at least 2 party members in the same area to start party combat.' };
    }
    // Trigger combat start via server (this returns a stub — actual start is in index.ts)
    return {
        text: `  ⚔ Party combat starting...\n  Enemies appear! All party members will enter combat together.\n  Use "attack <n>", "flee", "heal <name>", "buff <name>", or "log" during combat.\n  NOTE: Start combat by having any party member explore or encounter enemies.`,
    };
}
// ─── Revive downed ally ───────────────────────────────────────────────────────
function handleRevive(args, save) {
    if (!save.partyId) {
        return { text: 'You must be in a party to revive a downed ally.' };
    }
    const targetName = args[0];
    if (!targetName) {
        // List downed members
        const party = PartyManager_1.partyManager.getPartyOf(save.playerId);
        if (!party)
            return { text: 'Party not found.' };
        const downed = party.members.filter(m => m.isDowned);
        if (downed.length === 0)
            return { text: 'No downed party members.' };
        const lines = ['  ══════════ DOWED MEMBERS ══════════'];
        for (const m of downed) {
            lines.push(`  ${m.playerName} — [DOWNED]`);
        }
        lines.push('  ─────────────────────────────────────');
        lines.push('  Use "revive <name>" to attempt revival.');
        return { text: lines.join('\n') };
    }
    // Find target
    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
    if (!targetSession)
        return { text: `Player "${targetName}" is not online.` };
    const manaCost = 50;
    if (save.stats.mana < manaCost) {
        return { text: `Not enough mana to revive. Reviving costs ${manaCost} MP, you have ${save.stats.mana} MP.` };
    }
    const targetPartyId = targetSession.currentState.partyId;
    if (targetPartyId !== save.partyId) {
        return { text: `${targetName} is not in your party.` };
    }
    const newSave = {
        ...save,
        stats: { ...save.stats, mana: save.stats.mana - manaCost },
    };
    return {
        text: `  ✚ You begin the revival ritual on ${targetName}...\n  The resurrection requires a support skill or waiting for combat to end.\n  (Mana: -${manaCost})`,
        newSave,
    };
}
// ─── Party Heal ───────────────────────────────────────────────────────────────
function handlePartyHeal(args, save) {
    if (!save.partyId) {
        return { text: 'You must be in a party to heal an ally.' };
    }
    const targetName = args[0];
    if (!targetName) {
        // Show party members with HP
        const party = PartyManager_1.partyManager.getPartyOf(save.playerId);
        if (!party)
            return { text: 'Party not found.' };
        const lines = ['  ══════════ PARTY HP ══════════'];
        for (const m of party.members) {
            const hpPct = Math.round((m.hp / m.maxHp) * 100);
            const bar = '[' + '█'.repeat(Math.round(hpPct / 10)) + '░'.repeat(10 - Math.round(hpPct / 10)) + ']';
            lines.push(`  ${m.playerName.padEnd(14)} HP: ${String(m.hp).padStart(4)}/${m.maxHp} ${bar}`);
        }
        lines.push('  ─────────────────────────────────────');
        lines.push('  Use "heal <name>" to heal an ally with a support skill.');
        return { text: lines.join('\n') };
    }
    // Check if target is in same area
    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
    if (!targetSession)
        return { text: `Player "${targetName}" is not online.` };
    if (targetSession.currentState.worldState.currentArea !== save.worldState.currentArea) {
        return { text: `${targetName} is not in your area. Move to the same area first.` };
    }
    return {
        text: `  Use "skill support <n>" during your turn in party combat to heal ${targetName}.\n  Available support healing skills: healing_touch, healing_light, greater_heal, full_restore`,
    };
}
// ─── Party Buff ────────────────────────────────────────────────────────────────
function handlePartyBuff(args, save) {
    if (!save.partyId) {
        return { text: 'You must be in a party to buff an ally.' };
    }
    const targetName = args[0];
    if (!targetName) {
        const lines = ['  ══════════ PARTY BUFFS ══════════', '  Support buff skills:'];
        const supportSkills = save.skills.support;
        if (supportSkills.length === 0) {
            lines.push('  (no support skills learned — find buff scrolls in dungeons)');
        }
        else {
            supportSkills.forEach((sk, i) => {
                lines.push(`    [${i + 1}] ${sk.name} — ${sk.effectType} (+${sk.effectValue} for ${sk.duration ?? 3} turns)`);
            });
        }
        lines.push('  ─────────────────────────────────────');
        lines.push('  Use "skill support <n>" during your turn to buff an ally.');
        return { text: lines.join('\n') };
    }
    return {
        text: `  Use "skill support <n>" during your turn in party combat to buff ${targetName}.\n  Available support buffs: haste, iron_guard, empower, arcane_infuse`,
    };
}
// ─── Share Loot (Party) ────────────────────────────────────────────────────────
function handleShareLoot(args, save) {
    if (!save.partyId) {
        return { text: 'You must be in a party to share loot. Use "pending_loot" to claim your own loot.' };
    }
    const loot = save.pendingLoot;
    if (loot.length === 0) {
        return { text: 'You have no pending loot to share.' };
    }
    const subcmd = args[0]?.toLowerCase();
    if (!subcmd || subcmd === 'list') {
        const lines = ['  ══════════ PENDING LOOT ══════════'];
        loot.forEach((drop, i) => {
            const item = (0, items_1.getItem)(drop.itemId);
            const qty = drop.quantity > 1 ? ` x${drop.quantity}` : '';
            const col = item ? (0, items_1.rarityColor)(item.rarity) : '';
            const r = items_1.RARITY_RESET;
            lines.push(`  [${i + 1}] ${col}${drop.name}${r}${qty}  (${drop.rarity})`);
        });
        lines.push('  ─────────────────────────────────────');
        lines.push('  pending_loot claim   — claim all to your inventory');
        lines.push('  share_loot give <n> <player> — give item n to party member');
        return { text: lines.join('\n') };
    }
    if (subcmd === 'give' || subcmd === 'share') {
        const itemIdx = parseInt(args[1] ?? '') - 1;
        const targetName = args[2];
        if (isNaN(itemIdx) || itemIdx < 0 || itemIdx >= loot.length) {
            return { text: 'Invalid item number. Use "share_loot list" to see your loot.' };
        }
        if (!targetName) {
            return { text: 'Usage: share_loot give <item-n> <player-name>' };
        }
        const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
        if (!targetSession)
            return { text: `Player "${targetName}" is not online.` };
        if (targetSession.playerId === save.playerId)
            return { text: 'You cannot share loot with yourself.' };
        if (targetSession.currentState.partyId !== save.partyId) {
            return { text: `${targetName} is not in your party.` };
        }
        const drop = loot[itemIdx];
        if (drop.itemId === 'gold') {
            const shareAmount = Math.floor(drop.quantity / 2);
            const newSave = {
                ...save,
                stats: { ...save.stats, gold: save.stats.gold - shareAmount },
                pendingLoot: save.pendingLoot.filter((_, i) => i !== itemIdx),
            };
            const targetGold = targetSession.currentState.stats.gold + shareAmount;
            targetSession.currentState = {
                ...targetSession.currentState,
                stats: { ...targetSession.currentState.stats, gold: targetGold },
            };
            return {
                text: `  You shared ${shareAmount}g with ${targetName}. (Half of your gold loot)`,
                newSave,
            };
        }
        // Give item — add directly to target's inventory, remove from pendingLoot
        const { inventoryAdd: ia } = require('../items/InventoryManager');
        const dropItem = (0, items_1.getItem)(drop.itemId);
        if (dropItem) {
            const result = ia(targetSession.currentState, drop.itemId, drop.quantity);
            targetSession.currentState = result.save;
        }
        const newSave3 = { ...save, pendingLoot: save.pendingLoot.filter((_, i) => i !== itemIdx) };
        return {
            text: `  You gave ${drop.name} to ${targetName}.`,
            newSave: newSave3,
        };
    }
    return { text: 'Usage: share_loot [list|give <n> <player>]' };
}
// ─── PvP ───────────────────────────────────────────────────────────────────────────
function handlePvp(args, save) {
    const subcmd = args[0]?.toLowerCase();
    const area = (0, areas_1.getArea)(save.worldState.currentArea);
    if (!subcmd || subcmd === 'status') {
        const lines = ['  ══════════ PvP STATUS ══════════'];
        lines.push(`  PvP Mode:     ${save.pvp.enabled ? '[ON] — You can attack and be attacked' : '[OFF] — You are safe'}`);
        lines.push(`  Current Area: ${save.pvp.safeZone ? '[SAFE] PvP is disabled here' : '[PvP ZONE] PvP is enabled here'}`);
        lines.push('  ─────────────────────────────────────');
        lines.push('  pvp on        — enable PvP (you can attack and be attacked)');
        lines.push('  pvp off       — disable PvP (safe from other players)');
        lines.push('  pvp area      — check current area PvP status');
        lines.push('  ─────────────────────────────────────');
        lines.push('  NOTE: Safe zones (city squares) always block PvP.');
        return { text: lines.join('\n') };
    }
    if (subcmd === 'on') {
        if (save.pvp.safeZone) {
            return { text: 'You cannot enable PvP in a safe zone. Leave the city square first.' };
        }
        const newSave = { ...save, pvp: { ...save.pvp, enabled: true } };
        return {
            text: `  ⚔ PvP ENABLED. Other players can now attack you.\n  You can attack other players who have PvP enabled.\n  Type "pvp off" to return to safe mode.`,
            newSave,
        };
    }
    if (subcmd === 'off') {
        const newSave = { ...save, pvp: { ...save.pvp, enabled: false } };
        return {
            text: `  🛡 PvP DISABLED. You are now safe from other players.\n  You cannot attack other players while PvP is off.\n  Type "pvp on" to enable PvP.`,
            newSave,
        };
    }
    if (subcmd === 'area') {
        const safeTag = area?.safeZone ? '[SAFE ZONE]' : '[PvP ZONE]';
        return {
            text: `  Current area: ${area?.name ?? save.worldState.currentArea}\n  ${safeTag} ${area?.safeZone ? 'PvP is blocked here.' : 'PvP is allowed here.'}`,
        };
    }
    return { text: 'Usage: pvp [on|off|status|area]' };
}
// ════════════════════════════════════════════════════════════════════════════
//  PHASE 7 — ACHIEVEMENTS & WORLD BOSS HANDLERS
// ════════════════════════════════════════════════════════════════════════════
// ─── Achievements ──────────────────────────────────────────────────────────────
function handleAchievements(save) {
    const stats = save.achievementStats;
    const achievementStats = {
        totalKills: stats.totalKills,
        bossKills: stats.bossKills,
        tradesCompleted: stats.tradesCompleted,
        itemsCrafted: stats.itemsCrafted,
        resourcesGathered: stats.resourcesGathered,
        pvpKills: stats.pvpKills,
        worldBossKills: stats.worldBossKills,
        dungeonsCleared: new Set(stats.dungeonsCleared),
        deepestFloors: stats.deepestFloors,
        visitedAreas: new Set(stats.visitedAreas),
    };
    return { text: (0, AchievementEngine_1.formatAchievements)(save, achievementStats) };
}
// ─── World Boss ───────────────────────────────────────────────────────────────
function handleWorldBoss(args, save) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'status' || !sub) {
        return { text: WorldBossEngine_1.worldBossEngine.formatWorldBossStatus() };
    }
    if (sub === 'join') {
        const active = WorldBossEngine_1.worldBossEngine.getAllActiveEvents();
        if (active.length === 0) {
            return { text: 'No world boss is currently active.' };
        }
        const bossId = active[0].bossId;
        const targetAreaId = WorldBossEngine_1.WORLD_BOSS_SPAWNS[bossId] ?? 'ashford_village_square';
        const target = (0, areas_1.getArea)(targetAreaId);
        const isCity = target?.regenState === 'city';
        const newSave = {
            ...save,
            worldState: {
                ...save.worldState,
                currentArea: targetAreaId,
                currentCity: isCity ? targetAreaId : save.worldState.currentCity,
                unlockedCities: save.worldState.unlockedCities.includes(targetAreaId)
                    ? save.worldState.unlockedCities
                    : [...save.worldState.unlockedCities, targetAreaId],
            },
            regenState: target?.safeZone ? 'city' : 'exploring',
            pvp: { ...save.pvp, safeZone: target?.safeZone ?? false },
        };
        return {
            text: `You travel to the World Boss location: ${target?.name ?? targetAreaId}.\n${(0, areas_1.describeArea)(targetAreaId)}`,
            newSave,
        };
    }
    return { text: 'Usage: worldboss [status|join]\n  worldboss status  — check active world boss\n  worldboss join    — travel to the active world boss location' };
}
// ════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — SOCIAL & MULTIPLAYER HANDLERS
// ════════════════════════════════════════════════════════════════════════════
// ─── Who / Nearby ─────────────────────────────────────────────────────────────
function handleWho(save) {
    const areaId = save.worldState.currentArea;
    const players = PresenceManager_1.presenceManager.getPlayersInArea(areaId);
    if (players.length === 0) {
        return { text: 'You are alone here.' };
    }
    const areaName = (0, areas_1.getArea)(areaId)?.name ?? areaId;
    const lines = [
        `  Players in ${areaName} (${players.length} online):`,
        `  ${'─'.repeat(44)}`,
    ];
    for (const p of players) {
        const col = p.playerName === save.stats.name ? '\x1b[1m' : '';
        const reset = p.playerName === save.stats.name ? '\x1b[0m' : '';
        const partyTag = PartyManager_1.partyManager.isInParty(p.playerId) ? ' [Party]' : '';
        lines.push(`  ${col}${p.playerName.padEnd(14)} Lv ${String(p.level).padStart(2)}   [${p.activity}]${partyTag}${reset}`);
    }
    lines.push(`  ${'─'.repeat(44)}`);
    lines.push(`  Type 'msg <name> <text>' to whisper.`);
    lines.push(`  Type 'party invite <name>' to invite to a party.`);
    return { text: lines.join('\n') };
}
// ─── Area Chat ────────────────────────────────────────────────────────────────
function handleAreaChat(text, save) {
    const areaId = save.worldState.currentArea;
    PresenceManager_1.presenceManager.broadcastToArea(areaId, `[Area] ${save.stats.name}: ${text}`, save.playerId);
    return { text: `[You]: ${text}` };
}
// ─── Party Chat ───────────────────────────────────────────────────────────────
function handlePartyChat(text, save) {
    if (!save.partyId)
        return { text: 'You are not in a party. Use "party invite <name>" to form one.' };
    PartyManager_1.partyManager.syncMember(save.playerId);
    PartyManager_1.partyManager.notifyAllMembers(save.partyId, `[Party] ${save.stats.name}: ${text}`, save.playerId);
    return { text: `[Party]: ${text}` };
}
// ─── Whisper ─────────────────────────────────────────────────────────────────
function handleWhisper(targetName, text, save) {
    if (!text)
        return { text: 'Usage: msg <player> <text>' };
    const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
    if (!targetSession)
        return { text: `Player "${targetName}" is not online.` };
    // Deliver to target
    PresenceManager_1.presenceManager.broadcastToPlayer(targetSession.playerId, `[Whisper from ${save.stats.name}]: ${text}`);
    return { text: `[Whisper to ${targetName}]: ${text}` };
}
// ─── Shout ───────────────────────────────────────────────────────────────────
function handleShout(text, save) {
    if (!text)
        return { text: 'Usage: shout <text>' };
    // shout is routed through server/index.ts chat handler with channel=shout
    PresenceManager_1.presenceManager.broadcastToAll(`[Shout] ${save.stats.name}: ${text}`, save.playerId);
    return { text: `[Shout]: ${text} [60s cooldown]` };
}
// ─── Party ────────────────────────────────────────────────────────────────────
function handleParty(args, save) {
    const subcmd = args[0]?.toLowerCase();
    // No args → show info
    if (!subcmd || subcmd === 'info') {
        if (!save.partyId)
            return { text: 'You are not in a party. Use "party invite <name>" to create one.' };
        const party = PartyManager_1.partyManager.getParty(save.partyId);
        if (!party)
            return { text: 'Party not found.', newSave: { ...save, partyId: undefined } };
        PartyManager_1.partyManager.syncMember(save.playerId);
        return { text: PartyManager_1.partyManager.formatPartyInfo(party, save.playerId) };
    }
    // party accept
    if (subcmd === 'accept') {
        const invite = PartyManager_1.partyManager.pendingPartyInvites[save.playerId];
        if (!invite)
            return { text: 'No party invitation pending.' };
        delete PartyManager_1.partyManager.pendingPartyInvites[save.playerId];
        const party = PartyManager_1.partyManager.addMember(invite.partyId, save.playerId, save.stats.name);
        if (!party)
            return { text: 'Could not join party (it may be full or disbanded).' };
        PartyManager_1.partyManager.notifyAllMembers(invite.partyId, `[Party] ${save.stats.name} has joined! Party: ${party.members.map((m) => m.playerName).join(', ')}`);
        return { text: `You joined the party!\n${PartyManager_1.partyManager.formatPartyInfo(party, save.playerId)}`, newSave: { ...save, partyId: party.partyId } };
    }
    // party decline
    if (subcmd === 'decline') {
        delete PartyManager_1.partyManager.pendingPartyInvites[save.playerId];
        return { text: 'Party invitation declined.' };
    }
    // party invite <name>
    if (subcmd === 'invite') {
        const targetName = args[1];
        if (!targetName)
            return { text: 'Usage: party invite <player_name>' };
        const targetSession = PresenceManager_1.presenceManager.getSessionByPlayerName(targetName);
        if (!targetSession)
            return { text: `Player "${targetName}" is not online.` };
        if (targetSession.playerId === save.playerId)
            return { text: 'You cannot invite yourself.' };
        // Create or use existing party
        let partyId = save.partyId;
        if (!partyId) {
            const party = PartyManager_1.partyManager.createParty(save.playerId, save.stats.name);
            partyId = party.partyId;
            PartyManager_1.partyManager.notifyAllMembers(partyId, `[Party] ${save.stats.name} formed a party.`);
        }
        // Register pending invite so accept/decline works
        PartyManager_1.partyManager.pendingPartyInvites[targetSession.playerId] = {
            partyId: partyId,
            fromName: save.stats.name,
        };
        // Send invite to target
        PresenceManager_1.presenceManager.broadcastToPlayer(targetSession.playerId, `[Party] ${save.stats.name} invites you to a party. Type 'party accept' or 'party decline'.`);
        return { text: `Party invite sent to ${targetName}.` };
    }
    // party leave
    if (subcmd === 'leave') {
        if (!save.partyId)
            return { text: 'You are not in a party.' };
        const newParty = PartyManager_1.partyManager.removeMember(save.partyId, save.playerId);
        PartyManager_1.partyManager.notifyAllMembers(save.partyId, `[Party] ${save.stats.name} left the party.`);
        if (newParty)
            PartyManager_1.partyManager.notifyAllMembers(newParty.partyId, `[Party] Party: ${newParty.members.map((m) => m.playerName).join(', ')}`);
        return { text: 'You left the party.', newSave: { ...save, partyId: undefined } };
    }
    // party disband
    if (subcmd === 'disband') {
        if (!save.partyId)
            return { text: 'You are not in a party.' };
        if (!PartyManager_1.partyManager.isLeader(save.playerId))
            return { text: 'Only the party leader can disband.' };
        PartyManager_1.partyManager.disband(save.partyId);
        return { text: 'Party disbanded.', newSave: { ...save, partyId: undefined } };
    }
    // party kick <name>
    if (subcmd === 'kick') {
        const targetName = args[1];
        if (!save.partyId)
            return { text: 'You are not in a party.' };
        if (!PartyManager_1.partyManager.isLeader(save.playerId))
            return { text: 'Only the party leader can kick members.' };
        const targetId = PresenceManager_1.presenceManager.getPlayerIdByName(targetName);
        if (!targetId)
            return { text: `Player "${targetName}" not found.` };
        const party = PartyManager_1.partyManager.getPartyOf(save.playerId);
        if (!party?.members.find((m) => m.playerId === targetId))
            return { text: `${targetName} is not in your party.` };
        const newParty = PartyManager_1.partyManager.removeMember(save.partyId, targetId);
        PartyManager_1.partyManager.notifyAllMembers(save.partyId, `[Party] ${targetName} was kicked from the party.`);
        return { text: `Kicked ${targetName} from the party.`, newSave: newParty ? save : { ...save, partyId: undefined } };
    }
    return { text: `Usage: party [info|invite <name>|leave|disband|kick <name>|accept|decline]` };
}
// ─── Trade ───────────────────────────────────────────────────────────────────
function handleTrade(args, save) {
    const subcmd = args[0]?.toLowerCase();
    // trade view — show current active trade
    if (subcmd === 'view') {
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        return { text: TradeManager_1.tradeManager.formatTradeView(trade, save.playerId) };
    }
    // trade accept — buyer locks gold
    if (subcmd === 'accept') {
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        if (trade.sellerId === save.playerId)
            return { text: 'You cannot accept your own offer.' };
        const result = TradeManager_1.tradeManager.acceptBuyer(trade.tradeId, save.playerId);
        if (result.error)
            return { text: result.error };
        return { text: `You accepted the trade. Waiting for seller to confirm...` };
    }
    // trade confirm — seller executes
    if (subcmd === 'confirm') {
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        if (trade.buyerId === save.playerId)
            return { text: 'You are the buyer. Use "trade accept" first.' };
        if (!trade.goldEscrowed)
            return { text: 'Buyer has not accepted yet.' };
        const result = TradeManager_1.tradeManager.confirmSeller(trade.tradeId, save.playerId);
        if (result.error)
            return { text: result.error };
        // Reload saves from session
        return { text: result.error ?? `Trade complete!` };
    }
    // trade counter <price>
    if (subcmd === 'counter') {
        const newPrice = parseInt(args[1]);
        if (isNaN(newPrice) || newPrice < 0)
            return { text: 'Usage: trade counter <price>' };
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        const result = TradeManager_1.tradeManager.counter(trade.tradeId, save.playerId, newPrice);
        if (result.error)
            return { text: result.error };
        return { text: `Counter-offer sent: ${newPrice}g.` };
    }
    // trade decline
    if (subcmd === 'decline') {
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        TradeManager_1.tradeManager.cancel(trade.tradeId, save.playerId);
        return { text: 'Trade declined.' };
    }
    // trade cancel
    if (subcmd === 'cancel') {
        const trade = TradeManager_1.tradeManager.getActiveTrade(save.playerId);
        if (!trade)
            return { text: 'No active trade.' };
        TradeManager_1.tradeManager.cancel(trade.tradeId, save.playerId);
        return { text: 'Trade cancelled.' };
    }
    // trade offer <player> "<item>" <price>
    if (subcmd === 'offer') {
        if (args.length < 3) {
            return { text: 'Usage: trade offer <player_name> "<item_name>" <price>\n  Example: trade offer Kael "Void Wraith Essence" 5000' };
        }
        // Parse: offer <playerName> "<itemName>" <price>
        // args = ['offer', 'Kael', '"Void', 'Wraith', 'Essence"', '5000']
        // Find the item name (quoted or last arg before price)
        const priceRaw = args[args.length - 1];
        const price = parseInt(priceRaw);
        if (isNaN(price))
            return { text: 'Invalid price. Usage: trade offer <player> "<item>" <price>' };
        // The player name is args[1]
        const targetName = args[1];
        // Reconstruct item name from args 2..-2 (strip any quotes)
        const itemParts = args.slice(2, args.length - 1).map(s => s.replace(/^"|"$/g, ''));
        const itemName = itemParts.join(' ');
        // Find item in inventory
        const unequipped = save.inventory.filter(s => !s.equipped);
        const slot = unequipped.find(s => {
            const item = (0, items_1.getItem)(s.itemId);
            return item?.name.toLowerCase().includes(itemName.toLowerCase());
        });
        if (!slot)
            return { text: `You don't have an item matching "${itemName}". Check your inventory.` };
        const itemDef = (0, items_1.getItem)(slot.itemId);
        if (itemDef?.tradelock)
            return { text: 'That item cannot be traded.' };
        const result = TradeManager_1.tradeManager.offer(save.playerId, targetName, slot.itemId, itemDef?.name ?? slot.itemId, itemDef?.rarity ?? 'common', itemDef?.description ?? '', price);
        if ('error' in result)
            return { text: result.error };
        return { text: `Offer sent to ${targetName} for ${itemDef?.name} at ${price}g.` };
    }
    // No subcommand — show help
    return { text: `  Trade Commands:
    who                    — see players in your area
    trade offer <player> "<item>" <price>  — offer item for gold
    trade view             — view active trade details
    trade accept           — buyer: accept and lock gold
    trade confirm         — seller: finalize trade
    trade counter <price>  — counter-offer
    trade decline/cancel   — cancel trade
  NOTE: Both players must be in the same area. Trading unavailable in combat.` };
}
//# sourceMappingURL=CommandParser.js.map