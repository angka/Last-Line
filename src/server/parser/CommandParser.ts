import type { SaveFile, CommandResult, RegenState, EquipSlot } from '../../types';
import { AREAS, describeArea, getArea, CITIES, getCityById, isDungeonArea, isBossFloor } from '../../data/areas';
import { inventoryAdd, inventoryRemove, inventoryEquip, inventoryUse, formatInventoryPage, inventoryUnequip } from '../items/InventoryManager';
import { getItem, rarityColor, rarityName, RARITY_RESET } from '../../data/items';
import { regenStateLabel } from '../engine/RegenEngine';
import { generateEncounter, createCombatSession, playerAttack, playerFlee, enemyTurn, checkVictory, advanceTurn, formatCombatState, formatCombatPrompt, resolveVictory, resolveDefeat, tickStatusEffects } from '../engine/CombatEngine';
import { getShopCatalog } from '../../data/shops';
import { getDungeonForArea, getDungeonFloor, getNextFloorArea, getPrevFloorArea } from '../../data/dungeons';
import { generateBossEncounter } from '../engine/CombatEngine';

export interface ParseResult {
  text: string;
  newSave?: SaveFile;
  combatState?: any;
  menuState?: any;
  action?: 'quit' | 'save' | 'none' | 'levelup';
  levelUps?: string[];
}

export function parseCommand(cmd: string, save: SaveFile, combatState?: any): ParseResult {
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
      return { text: formatCombatState(combatState) };
    }
    return { text: `${formatCombatPrompt(combatState, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}\n  Unknown command. Type 'attack', 'item', or 'flee'.` };
  }

  switch (verb) {
    case 'look':
    case 'l': {
      const areaDesc = describeArea(save.worldState.currentArea);
      const hpPct = Math.round((save.stats.hp / save.stats.maxHp) * 100);
      const mpPct = Math.round((save.stats.mana / save.stats.maxMana) * 100);
      return {
        text: `${areaDesc}\n\n  HP: ${save.stats.hp}/${save.stats.maxHp} (${hpPct}%)  |  MP: ${save.stats.mana}/${save.stats.maxMana} (${mpPct}%)  |  Gold: ${save.stats.gold}g\n  [${regenStateLabel(save.regenState)}]`,
      };
    }

    case 'go':
    case 'move': {
      const dir = args[0]?.toLowerCase();
      if (!dir) return { text: 'Go where? Usage: go <north|south|east|west>' };
      return handleMove(dir, save);
    }

    case 'stats': {
      const s = save.stats;
      return { text: formatStats(s) };
    }

    case 'inventory':
    case 'inv': {
      const page = Math.max(0, (parseInt(args[0] ?? '1') - 1));
      return { text: formatInventoryPage(save, page) };
    }

    case 'equip': {
      const unequipped = save.inventory.filter(s => !s.equipped);
      const page = parseInventoryPageIndex(args[0], save);
      if (page === -1 || page >= unequipped.length) return { text: 'Invalid slot number.' };
      const item = unequipped[page];
      const newSave = inventoryEquip(save, item.slotId);
      return {
        text: `You equipped ${getItem(item.itemId)?.name ?? item.itemId}.`,
        newSave,
      };
    }

    case 'unequip': {
      const slotMap: Record<string, EquipSlot> = { weapon: 'weapon', armor: 'armor', accessory: 'accessory1', ring: 'accessory1' };
      const slot = slotMap[args[0]?.toLowerCase() as keyof typeof slotMap] ?? 'weapon';
      const newSave = inventoryUnequipBySlot(save, slot);
      return { text: `You unequipped your ${slot}.`, newSave };
    }

    case 'use': {
      const unequipped = save.inventory.filter(s => !s.equipped);
      const page = parseInventoryPageIndex(args[0], save);
      if (page === -1 || page >= unequipped.length) return { text: 'Invalid slot number.' };
      const item = unequipped[page];
      const newSave = inventoryUse(save, item.slotId);
      const used = getItem(item.itemId);
      return {
        text: `You used ${used?.name ?? item.itemId}. HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}`,
        newSave,
      };
    }

    case 'drop': {
      const unequipped = save.inventory.filter(s => !s.equipped);
      const page = parseInventoryPageIndex(args[0], save);
      if (page === -1 || page >= unequipped.length) return { text: 'Invalid slot number.' };
      const item = unequipped[page];
      const newSave = inventoryRemove(save, item.slotId);
      return { text: `You dropped ${getItem(item.itemId)?.name ?? item.itemId}.`, newSave };
    }

    case 'skills': {
      return { text: formatSkills(save) };
    }

    case 'gold': {
      return { text: `Gold: ${save.stats.gold}g` };
    }

    case 'rest': {
      const area = getArea(save.worldState.currentArea);
      if (area && area.safeZone) {
        const newSave = { ...save, regenState: 'safe_area' as RegenState };
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

    default: {
      return { text: `Unknown command: "${verb}". Type 'help' for a list of commands.` };
    }
  }
}

// ─── Movement ──────────────────────────────────────────────────────────

function handleMove(dir: string, save: SaveFile): ParseResult {
  const area = getArea(save.worldState.currentArea);
  if (!area) return { text: 'Unknown area.' };

  const targetId = area.exits[dir];
  if (!targetId) {
    const validDirs = Object.keys(area.exits).join(', ');
    return { text: `Cannot go "${dir}". Available exits: ${validDirs}` };
  }

  const target = getArea(targetId);

  // Auto-unlock city on first visit
  const isCity = target?.regenState === 'city';
  const alreadyUnlockedCity = save.worldState.unlockedCities.includes(targetId);
  const newUnlockedCities = (isCity && !alreadyUnlockedCity)
    ? [...save.worldState.unlockedCities, targetId]
    : save.worldState.unlockedCities;

  // Auto-unlock dungeon on first visit
  const dungeonInfo = getDungeonForArea(targetId);
  const dungeonId = dungeonInfo?.id ?? '';
  const alreadyUnlockedDungeon = save.worldState.unlockedDungeons.includes(dungeonId);
  const newUnlockedDungeons = (!alreadyUnlockedDungeon && dungeonId)
    ? [...save.worldState.unlockedDungeons, dungeonId]
    : save.worldState.unlockedDungeons;

  const newSave: SaveFile = {
    ...save,
    worldState: {
      ...save.worldState,
      currentArea: targetId,
      currentCity: isCity ? targetId : save.worldState.currentCity,
      unlockedCities: newUnlockedCities,
      unlockedDungeons: newUnlockedDungeons,
    },
    regenState: target?.safeZone ? 'city' : 'exploring',
  };

  const unlockMsg = (!alreadyUnlockedCity && isCity)
    ? `\n\n  ★ New city discovered: ${target?.name} — type "travel" to fast travel here later!`
    : '';

  // Try encounter
  if (target && !target.safeZone && target.baseEncounterChance > 0) {
    if (Math.random() < target.baseEncounterChance) {
      const enemies = generateEncounter(
        target.levelRange as [number, number],
        save.stats.level,
        1, 2, 0.08,
      );
      if (enemies.length > 0) {
        const session = createCombatSession(newSave, enemies, targetId);
        return {
          text: `${describeArea(targetId)}\n\n  ENCOUNTER! ${enemies.map(e => e.name).join(', ')} blocks your path!\n${formatCombatState(session)}\n${formatCombatPrompt(session, newSave.stats.hp, newSave.stats.maxHp, newSave.stats.mana, newSave.stats.maxMana)}`,
          newSave,
          combatState: session,
        };
      }
    }
  }

  const dungeonInfo2 = getDungeonFloor(targetId);
  const floorNote = dungeonInfo2
    ? `\n  [Dungeon: ${dungeonInfo2.dungeon.name} — Floor ${dungeonInfo2.floor}/${dungeonInfo2.dungeon.floors.length}]`
    : '';

  return {
    text: describeArea(targetId) + `\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [${regenStateLabel(newSave.regenState)}]${floorNote}${unlockMsg}`,
    newSave,
  };
}

// ─── Combat ───────────────────────────────────────────────────────────────

function handleAttack(args: string[], save: SaveFile, combatState: any): ParseResult {
  const enemies = combatState.participants.filter((p: any) => p.type === 'enemy' && p.hp > 0);
  let targetIdx = parseInt(args[0] ?? '1') - 1;
  if (targetIdx < 0 || targetIdx >= enemies.length) targetIdx = 0;

  let session = playerAttack(combatState, targetIdx);
  session = enemyTurn(session);
  session = tickStatusEffects(session);
  session = checkVictory(session);

  let result: ParseResult;

  if (session.winner === 'player') {
    const newSave = resolveVictory(save, session);
    result = {
      text: `${formatCombatState(session)}\n\n  Victory!`,
      newSave,
      combatState: undefined,
    };
  } else if (session.winner === 'enemy') {
    const newSave = resolveDefeat(save);
    result = {
      text: `${formatCombatState(session)}\n\n  You have been defeated...`,
      newSave,
      combatState: undefined,
    };
  } else {
    // Advance turn
    session = advanceTurn(session);
    result = {
      text: `${formatCombatState(session)}\n${formatCombatPrompt(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
      combatState: session,
    };
  }

  return result;
}

function handleFlee(save: SaveFile, combatState: any): ParseResult {
  const enemies = combatState.participants.filter((p: any) => p.type === 'enemy' && p.hp > 0);
  const fastestEnemy = enemies.reduce((a: any, b: any) => a.agility > b.agility ? a : b);

  const { session, fled } = playerFlee(combatState, save.stats.level, fastestEnemy.agility);
  if (fled) {
    return {
      text: `${formatCombatState(session)}\n\n  You fled from battle! No rewards gained.`,
      newSave: save,
      combatState: undefined,
    };
  }

  // Failed flee — enemy gets free attack
  let session2 = enemyTurn(session);
  session2 = tickStatusEffects(session2);
  session2 = checkVictory(session2);

  if (session2.winner === 'enemy') {
    const newSave = resolveDefeat(save);
    return {
      text: `${formatCombatState(session2)}\n\n  You have been defeated...`,
      newSave,
      combatState: undefined,
    };
  }

  session2 = advanceTurn(session2);
  return {
    text: `${formatCombatState(session2)}\n${formatCombatPrompt(session2, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
    combatState: session2,
  };
}

function handleCombatItem(args: string[], save: SaveFile, combatState: any): ParseResult {
  const unequipped = save.inventory.filter(s => !s.equipped);
  const page = parseInventoryPageIndex(args[0], save);
  if (page === -1 || page >= unequipped.length) return { text: 'Invalid slot number.', combatState };
  const item = unequipped[page];
  const newSave = inventoryUse(save, item.slotId);
  let session = enemyTurn(combatState);
  session = tickStatusEffects(session);
  session = checkVictory(session);

  if (session.winner === 'enemy') {
    return {
      text: `${formatCombatState(session)}\n\n  You have been defeated...`,
      newSave,
      combatState: undefined,
    };
  }

  session = advanceTurn(session);
  return {
    text: `${formatCombatState(session)}\n${formatCombatPrompt(session, newSave.stats.hp, newSave.stats.maxHp, newSave.stats.mana, newSave.stats.maxMana)}`,
    newSave,
    combatState: session,
  };
}

// ─── Travel ─────────────────────────────────────────────────────────────

function handleTravel(cityName: string | undefined, save: SaveFile): ParseResult {
  if (!cityName) {
    const unlocked = CITIES.filter(c => save.worldState.unlockedCities.includes(c.id));
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

  const target = CITIES.find(c =>
    c.name.toLowerCase() === cityName.toLowerCase() ||
    c.id === cityName.toLowerCase()
  );

  if (!target) {
    return { text: `Unknown city "${cityName}". Type 'travel' to see unlocked cities.` };
  }

  if (!save.worldState.unlockedCities.includes(target.id)) {
    return { text: `"${target.name}" is not yet discovered. Explore to find it.` };
  }

  const newSave: SaveFile = {
    ...save,
    worldState: {
      ...save.worldState,
      currentArea: target.id,
      currentCity: target.id,
    },
    regenState: 'city',
  };

  return {
    text: `  You arrive at ${target.name}.\n\n${describeArea(target.id)}\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [city — fast regen]` ,
    newSave,
  };
}

// ─── Shop ────────────────────────────────────────────────────────────────

function handleShop(save: SaveFile): ParseResult {
  const cityId = save.worldState.currentCity || save.worldState.currentArea;
  const catalog = getShopCatalog(cityId);

  if (!catalog) {
    return { text: 'There is no shop here.' };
  }

  const lines = ['  ═══════════════ CITY SHOP ═══════════════'];
  lines.push(`  ${getArea(cityId)?.name ?? cityId} General Store`);
  lines.push('  ─────────────────────────────────────────────');
  lines.push(`  Your gold: ${save.stats.gold}g`);
  lines.push('  ─────────────────────────────────────────────');
  lines.push('  [N]  Item                           Price');
  lines.push('  ─────────────────────────────────────────────');

  catalog.items.forEach((itemId, idx) => {
    const item = getItem(itemId);
    if (!item) return;
    const col = rarityColor(item.rarity);
    const r   = RARITY_RESET;
    const price = Math.round(item.buyPrice * 1.1); // 10% markup
    lines.push(`  [${String(idx + 1).padStart(2)}]  ${col}${item.name}${r.padEnd(30 - item.name.length)} ${price}g`);
  });

  lines.push('  ─────────────────────────────────────────────');
  lines.push('  Type "buy <n>" to purchase, "sell <n>" to sell items.');
  return { text: lines.join('\n') };
}

function handleBuy(rawIdx: string | undefined, save: SaveFile): ParseResult {
  const cityId = save.worldState.currentCity || save.worldState.currentArea;
  const catalog = getShopCatalog(cityId);

  if (!catalog) return { text: 'There is no shop here.' };
  if (!rawIdx) return { text: 'Usage: buy <number>  — type "shop" to see items.' };

  const idx = parseInt(rawIdx) - 1;
  if (isNaN(idx) || idx < 0 || idx >= catalog.items.length) {
    return { text: `Invalid selection. Type "shop" to see available items.` };
  }

  const itemId = catalog.items[idx];
  const item = getItem(itemId);
  if (!item) return { text: 'Item not found.' };

  const price = Math.round(item.buyPrice * 1.1);
  if (save.stats.gold < price) {
    return { text: `Not enough gold. ${item.name} costs ${price}g, you have ${save.stats.gold}g.` };
  }

  const { save: newSave } = inventoryAdd({ ...save, stats: { ...save.stats, gold: save.stats.gold - price } }, itemId, 1);
  return {
    text: `  You purchased ${item.name} for ${price}g. Gold: ${newSave.stats.gold}g`,
    newSave,
  };
}

function handleSell(rawIdx: string | undefined, save: SaveFile): ParseResult {
  const cityId = save.worldState.currentCity || save.worldState.currentArea;
  if (!getShopCatalog(cityId)) return { text: 'There is no shop here to sell to.' };

  if (!rawIdx) return { text: 'Usage: sell <inventory-slot>  — type "inv" to see your items.' };

  const unequipped = save.inventory.filter(s => !s.equipped);
  const idx = parseInt(rawIdx) - 1;
  if (isNaN(idx) || idx < 0 || idx >= unequipped.length) {
    return { text: `Invalid slot. Type "inv" to see your inventory.` };
  }

  const slot = unequipped[idx];
  const item = getItem(slot.itemId);
  if (!item) return { text: 'Item not found.' };

  const sellPrice = item.sellPrice;
  const newSave = inventoryRemove(save, slot.slotId);
  const finalSave: SaveFile = { ...newSave, stats: { ...newSave.stats, gold: newSave.stats.gold + sellPrice } };
  return {
    text: `  You sold ${item.name} for ${sellPrice}g. Gold: ${finalSave.stats.gold}g`,
    newSave: finalSave,
  };
}

// ─── Inn ─────────────────────────────────────────────────────────────────

const INN_PRICES: Record<number, { hpPct: number; manaPct: number; price: number }> = {
  // tier 1
  1: { hpPct: 0.50, manaPct: 0.50, price: 10 },
  2: { hpPct: 0.75, manaPct: 0.75, price: 30 },
  3: { hpPct: 1.00, manaPct: 1.00, price: 75 },
  4: { hpPct: 1.00, manaPct: 1.00, price: 150 },
  5: { hpPct: 1.00, manaPct: 1.00, price: 300 },
  6: { hpPct: 1.00, manaPct: 1.00, price: 500 },
};

function innTierForCity(cityId: string): number {
  const tierMap: Record<string, number> = {
    ashford_village_square:     1,
    iron_gate_town_square:       2,
    thornwick_square:            2,
    millhaven_square:            2,
    crystalmere_city_square:     3,
    emberveil_square:            3,
    duskhollow_square:           4,
    stormspire_citadel_square:   4,
    veilreach_square:            5,
    cinderpeak_square:           5,
    ashenmoor_square:           5,
    wraithgate_square:          6,
    obsidian_keep_square:       6,
    the_sanctum_square:         6,
  };
  return tierMap[cityId] ?? 1;
}

function handleInn(save: SaveFile): ParseResult {
  const cityId = save.worldState.currentCity || save.worldState.currentArea;
  const area = getArea(cityId);
  if (!area?.safeZone || area.regenState !== 'city') {
    return { text: 'There is no inn here. Find a city to rest.' };
  }

  const tier = innTierForCity(cityId);
  const tierData = INN_PRICES[tier];
  const { hpPct, manaPct, price } = tierData;

  if (save.stats.gold < price) {
    return { text: `Not enough gold for the inn. Room costs ${price}g, you have ${save.stats.gold}g.` };
  }

  const newHp   = Math.round(save.stats.maxHp   * hpPct);
  const newMana = Math.round(save.stats.maxMana * manaPct);
  const newSave: SaveFile = {
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

function handleDungeonUp(save: SaveFile): ParseResult {
  const areaId = save.worldState.currentArea;
  if (!isDungeonArea(areaId)) {
    return { text: 'You are not in a dungeon.' };
  }
  const prevAreaId = getPrevFloorArea(areaId);
  if (!prevAreaId) {
    return { text: 'You are already at the dungeon entrance. Use "leave" to exit.' };
  }
  return moveInDungeon(save, prevAreaId, 'up');
}

function handleDungeonDown(save: SaveFile): ParseResult {
  const areaId = save.worldState.currentArea;
  if (!isDungeonArea(areaId)) {
    return { text: 'You are not in a dungeon.' };
  }
  const nextAreaId = getNextFloorArea(areaId);
  if (!nextAreaId) {
    return { text: 'You are at the deepest floor. Prepare for the boss!' };
  }
  return moveInDungeon(save, nextAreaId, 'down');
}

function handleDungeonLeave(save: SaveFile): ParseResult {
  const areaId = save.worldState.currentArea;
  if (!isDungeonArea(areaId)) {
    return { text: 'You are not in a dungeon.' };
  }
  const info = getDungeonFloor(areaId);
  if (!info) return { text: 'Unknown dungeon.' };
  const entrance = info.dungeon.entrance;
  const entranceArea = getArea(entrance);
  const newSave: SaveFile = {
    ...save,
    worldState: {
      ...save.worldState,
      currentArea: entrance,
      currentCity: entranceArea?.regenState === 'city' ? entrance : save.worldState.currentCity,
    },
    regenState: entranceArea?.safeZone ? 'city' : 'exploring',
  };
  return {
    text: `  You leave the ${info.dungeon.name} and return to ${entranceArea?.name ?? entrance}.\n\n${describeArea(entrance)}\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g`,
    newSave,
  };
}

function handleDungeonExplore(save: SaveFile): ParseResult {
  const areaId = save.worldState.currentArea;
  if (!isDungeonArea(areaId)) {
    return { text: 'You are not in a dungeon. Explore the wilderness with "go <dir>".' };
  }
  const area = getArea(areaId);
  if (!area || area.baseEncounterChance === 0) {
    return { text: 'Nothing to explore here.' };
  }

  // Check if this is a boss floor
  const dungeonInfo2 = getDungeonFloor(areaId);
  const isBossFloor = dungeonInfo2 ? dungeonInfo2.dungeon.floors[dungeonInfo2.floor - 1]?.bossFloor : false;

  if (isBossFloor && dungeonInfo2) {
    const boss = generateBossEncounter(dungeonInfo2.dungeon.bossId);
    if (boss) {
      const session = createCombatSession(save, [boss], areaId);
      return {
        text: `${area.name}\n\n  ⚔ BOSS BATTLE! ${boss.name} rises to meet you!\n${formatCombatState(session)}\n${formatCombatPrompt(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
        combatState: session,
      };
    }
  }

  // Normal dungeon floor — 100% encounter on explore
  const dungeonFloor = dungeonInfo2 ? dungeonInfo2.floor : 1;
  const eliteChance = 0.05 + dungeonFloor * 0.03;
  const enemies = generateEncounter(
    area.levelRange as [number, number],
    save.stats.level,
    1, 3, eliteChance,
  );
  if (enemies.length === 0) {
    return { text: `${area.name}\n\n  You search the area but find nothing this time.` };
  }
  const session = createCombatSession(save, enemies, areaId);
  return {
    text: `${area.name}\n\n  You explore carefully... ENCOUNTER! ${enemies.map(e => e.name).join(', ')}!\n${formatCombatState(session)}\n${formatCombatPrompt(session, save.stats.hp, save.stats.maxHp, save.stats.mana, save.stats.maxMana)}`,
    combatState: session,
  };
}

function handleDungeonStatus(save: SaveFile): ParseResult {
  const areaId = save.worldState.currentArea;
  if (!isDungeonArea(areaId)) {
    return { text: 'You are not in a dungeon.' };
  }
  const info = getDungeonFloor(areaId);
  if (!info) return { text: 'Unknown dungeon.' };
  const { dungeon, floor } = info;
  const total = dungeon.floors.length;
  const isBoss = info.dungeon.floors[floor - 1]?.bossFloor;
  return {
    text: `  ═══════════ DUNGEON STATUS ═══════════\n  ${dungeon.name}\n  Floor: ${floor}/${total}${isBoss ? '  [BOSS]' : ''}\n  ─────────────────────────────────────\n  Type "up" to go up, "down" to go deeper.\n  Type "explore" to seek enemies on this floor.\n  Type "leave" to exit the dungeon.`,
  };
}

function moveInDungeon(save: SaveFile, targetAreaId: string, direction: 'up' | 'down'): ParseResult {
  const target = getArea(targetAreaId);
  if (!target) return { text: 'Cannot move there.' };

  // Unlock dungeon on first visit
  const dungeonInfo = getDungeonForArea(targetAreaId);
  const dungeonId = dungeonInfo?.id ?? '';
  const alreadyUnlocked = save.worldState.unlockedDungeons.includes(dungeonId);
  const newUnlockedDungeons = alreadyUnlocked
    ? save.worldState.unlockedDungeons
    : [...save.worldState.unlockedDungeons, dungeonId];

  const newSave: SaveFile = {
    ...save,
    worldState: {
      ...save.worldState,
      currentArea: targetAreaId,
      unlockedDungeons: newUnlockedDungeons,
    },
    regenState: target.safeZone ? 'city' : 'exploring',
  };

  const dungeonInfo2 = getDungeonFloor(targetAreaId);
  const floorNote = dungeonInfo2
    ? `  [Dungeon: ${dungeonInfo2.dungeon.name} — Floor ${dungeonInfo2.floor}/${dungeonInfo2.dungeon.floors.length}]`
    : '';

  return {
    text: describeArea(targetAreaId) + `\n\n  HP: ${newSave.stats.hp}/${newSave.stats.maxHp}  |  MP: ${newSave.stats.mana}/${newSave.stats.maxMana}  |  Gold: ${newSave.stats.gold}g\n  [${regenStateLabel(newSave.regenState)}]\n${floorNote}`,
    newSave,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseInventoryPageIndex(raw: string | undefined, save: SaveFile): number {
  if (!raw) return -1;
  const n = parseInt(raw) - 1;
  if (isNaN(n) || n < 0 || n >= save.inventory.filter(s => !s.equipped).length) return -1;
  return n;
}

function inventoryUnequipBySlot(save: SaveFile, slot: EquipSlot): SaveFile {
  return inventoryUnequip(save, slot);
}

function formatStats(s: SaveFile['stats']): string {
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

function formatSkills(save: SaveFile): string {
  const lines = ['  ──────────── SKILLS ────────────'];
  if (save.skills.physical.length === 0 && save.skills.magic.length === 0) {
    lines.push('  (no skills learned — find scrolls in dungeons)');
  } else {
    save.skills.physical.forEach((sk, i) => {
      lines.push(`  [${i+1}] ${sk.name} Lv${sk.level}  DMG:${sk.baseDamage}  MP:${sk.manaCost}`);
    });
    save.skills.magic.forEach((sk, i) => {
      lines.push(`  [${i+1}] ${sk.name} Lv${sk.level}  ${sk.element}  DMG:${sk.baseDamage}  MP:${sk.manaCost}`);
    });
  }
  return lines.join('\n');
}

function formatMap(save: SaveFile): string {
  return `
  ══════════════════════════════════════════════════════════════════════
   WORLD MAP  [${getArea(save.worldState.currentArea)?.name ?? 'Unknown'}]
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

function formatHelp(): string {
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
