import type { SaveFile, CraftingRecipe, LootDrop } from '../../types';
import { getAllRecipes, getToolRequirementLabel, canCraftRecipe, countMaterialsInInventory, getGatheringNodesForArea } from '../content/ContentManager';
import { getItem } from '../content/ContentManager';
import { inventoryAdd, inventoryRemove } from '../items/InventoryManager';

// ─── Crafting Interface ───────────────────────────────────────────────────────

export interface CraftableItem {
  index: number;
  recipe: CraftingRecipe;
  hasMaterials: boolean;
}

export interface CraftResult {
  text: string;
  newSave?: SaveFile;
  action?: 'none';
}

// ─── List craftable items ─────────────────────────────────────────────────────

export function listCraftableItems(save: SaveFile): CraftableItem[] {
  const recipes = getAllRecipes();
  return Object.values(recipes).map((recipe, idx) => ({
    index: idx,
    recipe,
    hasMaterials: canCraftRecipe(recipe, save.inventory),
  }));
}

// ─── Craft an item ────────────────────────────────────────────────────────────

export function craftItem(save: SaveFile, recipeIndex: number): CraftResult {
  const recipes = getAllRecipes();
  const recipeList = Object.values(recipes);
  if (recipeIndex < 0 || recipeIndex >= recipeList.length) {
    return { text: 'Invalid recipe number. Type "craft" to see available recipes.' };
  }

  const recipe = recipeList[recipeIndex];

  if (save.stats.level < recipe.skillLevelRequired) {
    return { text: `You need to be level ${recipe.skillLevelRequired} to craft ${recipe.name}.` };
  }

  if (!canCraftRecipe(recipe, save.inventory)) {
    // Show missing materials
    const missing: string[] = [];
    for (const mat of recipe.materials) {
      const have = countMaterialsInInventory(save.inventory, mat.itemId);
      if (have < mat.qty) {
        const item = getItem(mat.itemId);
        missing.push(`  ${item?.name ?? mat.itemId}: have ${have} / need ${mat.qty}`);
      }
    }
    return {
      text: `Missing materials for ${recipe.name}:\n${missing.join('\n')}`,
    };
  }

  // Consume materials
  let s = save;
  for (const mat of recipe.materials) {
    for (let i = 0; i < mat.qty; i++) {
      const slot = s.inventory.find(slot => slot.itemId === mat.itemId && !slot.equipped);
      if (slot) {
        const result = inventoryRemove(s, slot.slotId);
        if (result) s = result;
      }
    }
  }

  // Add output item(s)
  const result = inventoryAdd(s, recipe.outputItemId, recipe.outputQty);
  s = result.save;

  const item = getItem(recipe.outputItemId);
  return {
    text: `  ✓ Crafted ${recipe.outputQty}x ${item?.name ?? recipe.outputItemId}!\n  Materials consumed.`,
    newSave: s,
    action: 'none',
  };
}

// ─── Format crafting menu ─────────────────────────────────────────────────────

export function formatCraftingMenu(save: SaveFile): string {
  const items = listCraftableItems(save);
  const lines = [
    '  ════════════════ CRAFTING ═══════════════',
    `  ${save.stats.name}  |  Crafting Skill Level: ${save.stats.level}`,
    '  ─────────────────────────────────────────',
  ];

  if (items.length === 0) {
    lines.push('  (no recipes available)');
    return lines.join('\n');
  }

  lines.push('  [N]  Item                     Materials');
  lines.push('  ─────────────────────────────────────────');

  for (const { recipe, hasMaterials, index } of items) {
    const matSummary = recipe.materials.map(m => {
      const have = countMaterialsInInventory(save.inventory, m.itemId);
      const item = getItem(m.itemId);
      const name = item?.name ?? m.itemId;
      const ok = have >= m.qty;
      return `${ok ? '✓' : '✗'}${name}×${m.qty}`;
    }).join(', ');

    const mark = hasMaterials ? '►' : ' ';
    lines.push(`  ${mark}[${String(index + 1).padStart(2)}]  ${recipe.name.padEnd(24)} ${matSummary}`);
  }

  lines.push('  ─────────────────────────────────────────');
  lines.push('  ► = you have all materials');
  lines.push('  Type "craft <n>" to craft item N.');
  return lines.join('\n');
}

// ─── Gathering Manager ────────────────────────────────────────────────────────

export interface GatherResult {
  text: string;
  newSave?: SaveFile;
  gathered?: LootDrop[];
  nodeDepleted?: boolean;
}

// In-memory node state (server-side, resets on restart)
// This is kept in memory — on server restart nodes reset to full uses.
// For persistence across restarts, node state would need to be saved to SQL.
const nodeState: Record<string, number> = {}; // nodeId → uses remaining

function getNodeUsesRemaining(nodeId: string, maxUses: number): number {
  if (!(nodeId in nodeState)) {
    nodeState[nodeId] = maxUses;
  }
  return nodeState[nodeId];
}

export function gatherFromNode(
  save: SaveFile,
  areaId: string,
  verb: 'gather' | 'mine' | 'chop' | 'pick' | 'fill' | 'sift' | 'attune',
): GatherResult {
  const nodes = getGatheringNodesForArea(areaId);
  const node = nodes.find(n => n.verb === verb);

  if (!node) {
    return { text: `There is nothing to ${verb} here.` };
  }

  const usesRemaining = getNodeUsesRemaining(node.nodeId, node.maxUses);
  if (usesRemaining <= 0) {
    return {
      text: `The ${node.name} has been depleted. It will regrow in a while.`,
    };
  }

  if (save.stats.level < node.minPlayerLevel) {
    return {
      text: `You need to be level ${node.minPlayerLevel} to gather here.`,
    };
  }

  // Check tool requirement
  if (node.requiresTool) {
    const hasTool = save.inventory.some(slot => slot.itemId === node.requiresTool);
    if (!hasTool) {
      return {
        text: `You need a ${node.requiresTool} to ${verb} here. Buy one at a blacksmith.`,
      };
    }
  }

  // Roll loot from table
  const gathered: LootDrop[] = [];
  for (const entry of node.lootTable) {
    let chance = entry.chance;
    chance = Math.min(1.0, chance + Math.min(0.08, (save.stats.luck / 10) * 0.005));
    if (Math.random() < chance) {
      const qty = entry.qtyMin + Math.floor(Math.random() * (entry.qtyMax - entry.qtyMin + 1));
      const item = getItem(entry.itemId);
      if (item) {
        gathered.push({ itemId: entry.itemId, name: item.name, rarity: item.rarity, quantity: qty });
      }
    }
  }

  // Consume uses
  nodeState[node.nodeId] = usesRemaining - 1;

  // Add items to inventory
  let s = save;
  for (const drop of gathered) {
    if (drop.itemId === 'gold') {
      s = { ...s, stats: { ...s.stats, gold: s.stats.gold + drop.quantity } };
    } else {
      const result = inventoryAdd(s, drop.itemId, drop.quantity);
      s = result.save;
    }
  }

  const depleted = usesRemaining <= 1;
  const lines = [`  You ${verb === 'fill' ? 'fill the flask' : verb === 'sift' ? 'sift through the pile' : `harvest the ${node.name}`}...`];

  if (gathered.length === 0) {
    lines.push('  Nothing useful found.');
  } else {
    lines.push('  ─────────────────────────────────────────');
    for (const drop of gathered) {
      const qty = drop.quantity > 1 ? ` x${drop.quantity}` : '';
      lines.push(`  + ${drop.name}${qty}`);
    }
    lines.push('  ─────────────────────────────────────────');
  }

  if (depleted) {
    lines.push(`  Node depleted! It will respawn in ~${node.respawnMinutes} minutes.`);
  } else {
    lines.push(`  Node uses remaining: ${usesRemaining - 1} / ${node.maxUses}`);
  }

  return {
    text: lines.join('\n'),
    newSave: s,
    gathered,
    nodeDepleted: depleted,
  };
}

// ─── Format area nodes for 'look' display ────────────────────────────────────

export function formatAreaNodes(areaId: string): string {
  const nodes = getGatheringNodesForArea(areaId);
  if (nodes.length === 0) return '';

  const lines: string[] = ['  Resource Nodes:'];
  for (const node of nodes) {
    const uses = getNodeUsesRemaining(node.nodeId, node.maxUses);
    const status = uses > 0 ? `${uses}/${node.maxUses}` : 'DEPLETED';
    const toolHint = node.requiresTool ? ` (${node.requiresTool})` : '';
    const lvlHint = node.minPlayerLevel > 1 ? ` [Lv ${node.minPlayerLevel}+]` : '';
    lines.push(`    ► ${node.name} [${node.verb}]${lvlHint} — ${status}${toolHint}`);
  }

  return lines.join('\n');
}
