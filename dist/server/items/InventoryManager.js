"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryAdd = inventoryAdd;
exports.inventoryRemove = inventoryRemove;
exports.inventoryUse = inventoryUse;
exports.inventoryEquip = inventoryEquip;
exports.inventoryUnequip = inventoryUnequip;
exports.formatInventoryPage = formatInventoryPage;
exports.formatEquipment = formatEquipment;
const items_1 = require("../../data/items");
const uuid_1 = require("uuid");
const MAX_INVENTORY = 30;
function inventoryAdd(save, itemId, qty = 1) {
    const item = (0, items_1.getItem)(itemId);
    if (!item)
        return { save, added: 0 };
    // Try to stack
    if (item.stackable) {
        const existing = save.inventory.find(s => s.itemId === itemId && !s.equipped);
        if (existing) {
            existing.quantity += qty;
            return { save: { ...save, inventory: [...save.inventory] }, added: qty };
        }
    }
    if (save.inventory.filter(s => !s.equipped).length >= MAX_INVENTORY) {
        return { save, added: 0 };
    }
    const slot = { slotId: (0, uuid_1.v4)(), itemId, quantity: qty, equipped: false };
    return {
        save: { ...save, inventory: [...save.inventory, slot] },
        added: qty,
    };
}
function inventoryRemove(save, slotId, qty) {
    const idx = save.inventory.findIndex(s => s.slotId === slotId);
    if (idx === -1)
        return save;
    const slot = save.inventory[idx];
    const removeQty = qty ?? slot.quantity;
    if (slot.quantity <= removeQty) {
        // Unequip if needed
        const newSave = unequipIfNeeded(save, slot.itemId);
        const next = [...newSave.inventory];
        next.splice(idx, 1);
        return { ...newSave, inventory: next };
    }
    else {
        const next = [...save.inventory];
        next[idx] = { ...slot, quantity: slot.quantity - removeQty };
        return { ...save, inventory: next };
    }
}
function inventoryUse(save, slotId) {
    const idx = save.inventory.findIndex(s => s.slotId === slotId);
    if (idx === -1)
        return save;
    const slot = save.inventory[idx];
    const item = (0, items_1.getItem)(slot.itemId);
    if (!item?.consumable)
        return save;
    let s = { ...save, stats: { ...save.stats } };
    if (item.healAmount) {
        s.stats = { ...s.stats, hp: Math.min(s.stats.maxHp, s.stats.hp + item.healAmount) };
    }
    if (item.manaRestore) {
        s.stats = { ...s.stats, mana: Math.min(s.stats.maxMana, s.stats.mana + item.manaRestore) };
    }
    // Remove one
    if (slot.quantity <= 1) {
        s = unequipIfNeeded(s, slot.itemId);
        const next = [...s.inventory];
        next.splice(idx, 1);
        return { ...s, inventory: next };
    }
    else {
        const next = [...s.inventory];
        next[idx] = { ...slot, quantity: slot.quantity - 1 };
        return { ...s, inventory: next };
    }
}
function inventoryEquip(save, slotId) {
    const idx = save.inventory.findIndex(s => s.slotId === slotId);
    if (idx === -1)
        return save;
    const slot = save.inventory[idx];
    const item = (0, items_1.getItem)(slot.itemId);
    if (!item || !item.equipSlot)
        return save;
    const newInv = [...save.inventory];
    newInv[idx] = { ...slot, equipped: true };
    let newEquipped = { ...save.equipped };
    // Unequip current in that slot
    const currentEquippedId = newEquipped[item.equipSlot];
    if (currentEquippedId) {
        const currentIdx = newInv.findIndex(s => s.itemId === currentEquippedId && s.equipped);
        if (currentIdx !== -1) {
            newInv[currentIdx] = { ...newInv[currentIdx], equipped: false };
        }
    }
    newEquipped = { ...newEquipped, [item.equipSlot]: slot.itemId };
    // Update stats from bonuses
    let stats = { ...save.stats };
    stats = applyEquipmentBonuses(stats, newEquipped);
    return { ...save, inventory: newInv, equipped: newEquipped, stats };
}
function inventoryUnequip(save, equipSlot) {
    const itemId = save.equipped[equipSlot];
    if (!itemId)
        return save;
    const invIdx = save.inventory.findIndex(s => s.itemId === itemId && s.equipped);
    if (invIdx === -1)
        return save;
    const newInv = [...save.inventory];
    newInv[invIdx] = { ...newInv[invIdx], equipped: false };
    const newEquipped = { ...save.equipped, [equipSlot]: null };
    const stats = applyEquipmentBonuses({ ...save.stats }, newEquipped);
    return { ...save, inventory: newInv, equipped: newEquipped, stats };
}
function applyEquipmentBonuses(stats, equipped) {
    const s = { ...stats };
    s.attack = 5;
    s.maxHp = 100 + (s.level - 1) * 10;
    s.maxMana = 50 + (s.level - 1) * 5;
    s.strength = 5 + (s.level - 1) * 2;
    s.agility = 5 + (s.level - 1);
    s.defense = 5 + (s.level - 1) * 2;
    s.luck = 3 + (s.level - 1);
    for (const itemId of Object.values(equipped)) {
        if (!itemId)
            continue;
        const item = (0, items_1.getItem)(itemId);
        if (!item)
            continue;
        if (item.damage)
            s.attack += item.damage;
        if (item.defense)
            s.defense += item.defense;
        if (item.strengthBonus)
            s.strength += item.strengthBonus;
        if (item.agilityBonus)
            s.agility += item.agilityBonus;
        if (item.defenseBonus)
            s.defense += item.defenseBonus;
        if (item.luckBonus)
            s.luck += item.luckBonus;
        if (item.hpBonus)
            s.maxHp += item.hpBonus;
        if (item.manaBonus)
            s.maxMana += item.manaBonus;
    }
    s.hp = Math.min(s.hp, s.maxHp);
    s.mana = Math.min(s.mana, s.maxMana);
    return s;
}
function unequipIfNeeded(save, itemId) {
    const item = (0, items_1.getItem)(itemId);
    if (!item?.equipSlot)
        return save;
    const slot = save.equipped[item.equipSlot];
    if (slot !== itemId)
        return save;
    return inventoryUnequip(save, item.equipSlot);
}
// ─── Display Helpers ─────────────────────────────────────────────────────────
function formatInventoryPage(save, page) {
    const perPage = 20;
    const slots = save.inventory.filter(s => !s.equipped);
    const start = page * perPage;
    const pageSlots = slots.slice(start, start + perPage);
    const lines = [];
    lines.push(`  ╔══════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  INVENTORY  [${slots.length}/${MAX_INVENTORY}]  Gold: ${save.stats.gold}g         ║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════╣`);
    if (pageSlots.length === 0) {
        lines.push(`  ║  (empty)                                            ║`);
    }
    else {
        for (let i = 0; i < pageSlots.length; i++) {
            const slot = pageSlots[i];
            const item = (0, items_1.getItem)(slot.itemId);
            if (!item)
                continue;
            const idx = start + i + 1;
            const col = (0, items_1.rarityColor)(item.rarity);
            const r = items_1.RARITY_RESET;
            const qty = slot.quantity > 1 ? ` x${slot.quantity}` : '';
            lines.push(`  ║  [${String(idx).padStart(2)}] ${col}${item.name}${r}${qty}                     ║`);
        }
    }
    lines.push(`  ╠══════════════════════════════════════════════════════════╣`);
    lines.push(`  ║  Type 'equip <n>' to equip | 'use <n>' to consume       ║`);
    lines.push(`  ╚══════════════════════════════════════════════════════════╝`);
    const totalPages = Math.ceil(slots.length / perPage);
    if (totalPages > 1)
        lines.push(`  Page ${page + 1}/${totalPages}  —  'inventory <page>' to flip`);
    return lines.join('\n');
}
function formatEquipment(save) {
    const lines = [];
    lines.push(`  ╔══════════════════════════════════════════════════════════╗`);
    lines.push(`  ║  EQUIPPED ITEMS                                      ║`);
    lines.push(`  ╠══════════════════════════════════════════════════════════╣`);
    const slotLabels = {
        weapon: 'Weapon    ', armor: 'Armor     ', accessory1: 'Accessory ', accessory2: 'Accessory2',
    };
    for (const [slot, label] of Object.entries(slotLabels)) {
        const itemId = save.equipped[slot];
        if (itemId) {
            const item = (0, items_1.getItem)(itemId);
            if (item) {
                const col = (0, items_1.rarityColor)(item.rarity);
                const r = items_1.RARITY_RESET;
                lines.push(`  ║  ${label}: ${col}${item.name}${r}  (${item.rarity})         ║`);
            }
        }
        else {
            lines.push(`  ║  ${label}: (none)                            ║`);
        }
    }
    lines.push(`  ╚══════════════════════════════════════════════════════════╝`);
    return lines.join('\n');
}
//# sourceMappingURL=InventoryManager.js.map