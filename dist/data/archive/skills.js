"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_SCROLL_DROPS = exports.MAGIC_SCROLL_DROPS = exports.PHYSICAL_SCROLL_DROPS = exports.SUPPORT_SKILLS = exports.MAGIC_SKILLS = exports.PHYSICAL_SKILLS = void 0;
exports.getScrollDropsForTier = getScrollDropsForTier;
exports.getPhysicalSkill = getPhysicalSkill;
exports.getMagicSkill = getMagicSkill;
exports.getSupportSkill = getSupportSkill;
exports.getSkillByItemId = getSkillByItemId;
exports.getSkillLevelMultiplier = getSkillLevelMultiplier;
exports.getSkillManaCost = getSkillManaCost;
// ─── Physical Skills ───────────────────────────────────────────────────────────
exports.PHYSICAL_SKILLS = {
    power_strike: {
        id: 'power_strike',
        name: 'Power Strike',
        level: 1,
        killCount: 0,
        manaCost: 8,
        baseDamage: 45,
        scalingStat: 'strength',
        description: 'A heavy blow that deals increased damage.',
    },
    quick_slash: {
        id: 'quick_slash',
        name: 'Quick Slash',
        level: 1,
        killCount: 0,
        manaCost: 5,
        baseDamage: 25,
        scalingStat: 'strength',
        description: 'A swift strike with a chance to attack twice.',
    },
    cleave: {
        id: 'cleave',
        name: 'Cleave',
        level: 1,
        killCount: 0,
        manaCost: 15,
        baseDamage: 60,
        scalingStat: 'strength',
        description: 'Damages all enemies in front of you.',
    },
    bash: {
        id: 'bash',
        name: 'Bash',
        level: 1,
        killCount: 0,
        manaCost: 10,
        baseDamage: 35,
        scalingStat: 'strength',
        description: 'A stunning blow that may stagger the enemy.',
    },
    execute: {
        id: 'execute',
        name: 'Execute',
        level: 1,
        killCount: 0,
        manaCost: 20,
        baseDamage: 80,
        scalingStat: 'strength',
        description: 'Deals massive damage to weakened foes.',
    },
    bleed_blade: {
        id: 'bleed_blade',
        name: 'Bleed Blade',
        level: 1,
        killCount: 0,
        manaCost: 12,
        baseDamage: 30,
        scalingStat: 'strength',
        description: 'Leaves a bleeding wound on the target.',
    },
    iron_swing: {
        id: 'iron_swing',
        name: 'Iron Swing',
        level: 1,
        killCount: 0,
        manaCost: 18,
        baseDamage: 95,
        scalingStat: 'strength',
        description: 'A heavy overhead swing with crushing force.',
    },
    whirlwind: {
        id: 'whirlwind',
        name: 'Whirlwind',
        level: 1,
        killCount: 0,
        manaCost: 30,
        baseDamage: 120,
        scalingStat: 'strength',
        description: 'Spins and strikes all surrounding enemies.',
    },
    rally_strike: {
        id: 'rally_strike',
        name: 'Rally Strike',
        level: 1,
        killCount: 0,
        manaCost: 25,
        baseDamage: 150,
        scalingStat: 'strength',
        description: 'A rallying blow that inspires allies — bonus damage if party is nearby.',
    },
    crushing_blow: {
        id: 'crushing_blow',
        name: 'Crushing Blow',
        level: 1,
        killCount: 0,
        manaCost: 35,
        baseDamage: 200,
        scalingStat: 'strength',
        description: 'An earth-shattering strike that ignores some defense.',
    },
};
// ─── Magic Skills ──────────────────────────────────────────────────────────────
exports.MAGIC_SKILLS = {
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        level: 1,
        killCount: 0,
        manaCost: 15,
        baseDamage: 55,
        scalingStat: 'mana',
        element: 'fire',
        description: 'Hurls a ball of fire at the enemy.',
    },
    inferno: {
        id: 'inferno',
        name: 'Inferno',
        level: 1,
        killCount: 0,
        manaCost: 25,
        baseDamage: 90,
        scalingStat: 'mana',
        element: 'fire',
        description: 'Engulfs enemies in searing flames.',
    },
    blaze_storm: {
        id: 'blaze_storm',
        name: 'Blaze Storm',
        level: 1,
        killCount: 0,
        manaCost: 40,
        baseDamage: 140,
        scalingStat: 'mana',
        element: 'fire',
        description: 'A devastating firestorm across all enemies.',
    },
    ice_shard: {
        id: 'ice_shard',
        name: 'Ice Shard',
        level: 1,
        killCount: 0,
        manaCost: 10,
        baseDamage: 40,
        scalingStat: 'mana',
        element: 'ice',
        description: 'Launches a piercing shard of ice.',
    },
    frost_nova: {
        id: 'frost_nova',
        name: 'Frost Nova',
        level: 1,
        killCount: 0,
        manaCost: 20,
        baseDamage: 65,
        scalingStat: 'mana',
        element: 'ice',
        description: 'Freezes enemies with a burst of cold.',
    },
    glacial_spike: {
        id: 'glacial_spike',
        name: 'Glacial Spike',
        level: 1,
        killCount: 0,
        manaCost: 35,
        baseDamage: 110,
        scalingStat: 'mana',
        element: 'ice',
        description: 'Summons a massive spike of ice. Slows enemies.',
    },
    thunder_bolt: {
        id: 'thunder_bolt',
        name: 'Thunder Bolt',
        level: 1,
        killCount: 0,
        manaCost: 12,
        baseDamage: 50,
        scalingStat: 'mana',
        element: 'thunder',
        description: 'Strikes with a bolt of lightning.',
    },
    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        level: 1,
        killCount: 0,
        manaCost: 28,
        baseDamage: 85,
        scalingStat: 'mana',
        element: 'thunder',
        description: 'Lightning that chains between multiple enemies.',
    },
    storm_urge: {
        id: 'storm_urge',
        name: 'Storm Urge',
        level: 1,
        killCount: 0,
        manaCost: 45,
        baseDamage: 160,
        scalingStat: 'mana',
        element: 'thunder',
        description: 'Unleashes a catastrophic storm upon all enemies.',
    },
    shadow_strike: {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        level: 1,
        killCount: 0,
        manaCost: 18,
        baseDamage: 70,
        scalingStat: 'mana',
        element: 'shadow',
        description: 'Attacks from the shadows, bypassing some defense.',
    },
    soul_drain: {
        id: 'soul_drain',
        name: 'Soul Drain',
        level: 1,
        killCount: 0,
        manaCost: 30,
        baseDamage: 80,
        scalingStat: 'mana',
        element: 'shadow',
        description: 'Drains enemy life force and heals the caster.',
    },
    void_blast: {
        id: 'void_blast',
        name: 'Void Blast',
        level: 1,
        killCount: 0,
        manaCost: 40,
        baseDamage: 130,
        scalingStat: 'mana',
        element: 'shadow',
        description: 'Channels the void to devastate enemies.',
    },
    holy_light: {
        id: 'holy_light',
        name: 'Holy Light',
        level: 1,
        killCount: 0,
        manaCost: 14,
        baseDamage: 48,
        scalingStat: 'mana',
        element: 'light',
        description: 'Smites enemies with divine light.',
    },
    divine_smite: {
        id: 'divine_smite',
        name: 'Divine Smite',
        level: 1,
        killCount: 0,
        manaCost: 30,
        baseDamage: 100,
        scalingStat: 'mana',
        element: 'light',
        description: 'A powerful holy judgment.',
    },
    arcane_surge: {
        id: 'arcane_surge',
        name: 'Arcane Surge',
        level: 1,
        killCount: 0,
        manaCost: 35,
        baseDamage: 115,
        scalingStat: 'mana',
        element: 'arcane',
        description: 'Channels raw arcane energy into a surge of power.',
    },
    void_collapse: {
        id: 'void_collapse',
        name: 'Void Collapse',
        level: 1,
        killCount: 0,
        manaCost: 50,
        baseDamage: 200,
        scalingStat: 'mana',
        element: 'void',
        description: 'Collapses void energy into a singular devastating blast.',
    },
    null_zone: {
        id: 'null_zone',
        name: 'Null Zone',
        level: 1,
        killCount: 0,
        manaCost: 45,
        baseDamage: 150,
        scalingStat: 'mana',
        element: 'void',
        description: 'Creates a zone of anti-magic that drains enemies.',
    },
    wind_blade: {
        id: 'wind_blade',
        name: 'Wind Blade',
        level: 1,
        killCount: 0,
        manaCost: 15,
        baseDamage: 55,
        scalingStat: 'mana',
        element: 'wind',
        description: 'Cuts with razor-sharp wind.',
    },
    gale_force: {
        id: 'gale_force',
        name: 'Gale Force',
        level: 1,
        killCount: 0,
        manaCost: 28,
        baseDamage: 95,
        scalingStat: 'mana',
        element: 'wind',
        description: 'A violent gust that strikes all enemies.',
    },
    earthquake: {
        id: 'earthquake',
        name: 'Earthquake',
        level: 1,
        killCount: 0,
        manaCost: 32,
        baseDamage: 105,
        scalingStat: 'mana',
        element: 'earth',
        description: 'Shatters the ground beneath your enemies.',
    },
    stone_shatter: {
        id: 'stone_shatter',
        name: 'Stone Shatter',
        level: 1,
        killCount: 0,
        manaCost: 38,
        baseDamage: 135,
        scalingStat: 'mana',
        element: 'earth',
        description: 'Calls upon ancient stone to crush foes.',
    },
};
// ─── Support Skills ───────────────────────────────────────────────────────────
exports.SUPPORT_SKILLS = {
    healing_touch: {
        id: 'healing_touch',
        name: 'Healing Touch',
        level: 1,
        linkedKills: 0,
        manaCost: 15,
        targetType: 'ally',
        effectType: 'heal',
        effectValue: 100,
        description: 'Restores 100 HP to a single ally.',
    },
    healing_light: {
        id: 'healing_light',
        name: 'Healing Light',
        level: 1,
        linkedKills: 0,
        manaCost: 30,
        targetType: 'ally',
        effectType: 'heal',
        effectValue: 280,
        description: 'Restores 280 HP to a single ally.',
    },
    greater_heal: {
        id: 'greater_heal',
        name: 'Greater Heal',
        level: 1,
        linkedKills: 0,
        manaCost: 60,
        targetType: 'ally',
        effectType: 'heal',
        effectValue: 600,
        description: 'Restores 600 HP to a single ally.',
    },
    full_restore: {
        id: 'full_restore',
        name: 'Full Restore',
        level: 1,
        linkedKills: 0,
        manaCost: 120,
        targetType: 'ally',
        effectType: 'heal',
        effectValue: 9999,
        description: 'Fully restores HP and clears all status effects on an ally.',
    },
    haste: {
        id: 'haste',
        name: 'Haste',
        level: 1,
        linkedKills: 0,
        manaCost: 25,
        targetType: 'ally',
        effectType: 'buff_stat',
        effectValue: 20,
        duration: 3,
        description: 'Grants +20 agility to an ally for 3 turns.',
    },
    iron_guard: {
        id: 'iron_guard',
        name: 'Iron Guard',
        level: 1,
        linkedKills: 0,
        manaCost: 25,
        targetType: 'ally',
        effectType: 'buff_stat',
        effectValue: 30,
        duration: 3,
        description: 'Grants +30 defense to an ally for 3 turns.',
    },
    empower: {
        id: 'empower',
        name: 'Empower',
        level: 1,
        linkedKills: 0,
        manaCost: 30,
        targetType: 'ally',
        effectType: 'buff_stat',
        effectValue: 25,
        duration: 3,
        description: 'Grants +25% attack power to an ally for 3 turns.',
    },
    arcane_infuse: {
        id: 'arcane_infuse',
        name: 'Arcane Infuse',
        level: 1,
        linkedKills: 0,
        manaCost: 35,
        targetType: 'ally',
        effectType: 'buff_stat',
        effectValue: 30,
        duration: 3,
        description: 'Grants +30% magic damage to an ally for 3 turns.',
    },
    cleanse: {
        id: 'cleanse',
        name: 'Cleanse',
        level: 1,
        linkedKills: 0,
        manaCost: 20,
        targetType: 'ally',
        effectType: 'cleanse',
        effectValue: 0,
        description: 'Removes all negative status effects from an ally.',
    },
    barrier: {
        id: 'barrier',
        name: 'Barrier',
        level: 1,
        linkedKills: 0,
        manaCost: 40,
        targetType: 'ally',
        effectType: 'shield',
        effectValue: 1,
        duration: 3,
        description: 'Creates a shield absorbing damage for 3 turns.',
    },
    resurrection: {
        id: 'resurrection',
        name: 'Resurrection',
        level: 1,
        linkedKills: 0,
        manaCost: 150,
        targetType: 'ally',
        effectType: 'revive',
        effectValue: 30,
        description: 'Revives a downed ally at 30% HP. One use per combat.',
    },
    rally: {
        id: 'rally',
        name: 'Rally',
        level: 1,
        linkedKills: 0,
        manaCost: 80,
        targetType: 'all_allies',
        effectType: 'buff_stat',
        effectValue: 10,
        duration: 2,
        description: 'Grants +10% all stats to ALL allies for 2 turns.',
    },
};
// ─── Skill Scroll Definitions ────────────────────────────────────────────────
// These are items the player can find. Use 'learn' while holding a scroll to gain the skill.
exports.PHYSICAL_SCROLL_DROPS = {
    power_strike_scroll: { itemId: 'power_strike_scroll', skillId: 'power_strike' },
    quick_slash_scroll: { itemId: 'quick_slash_scroll', skillId: 'quick_slash' },
    cleave_scroll: { itemId: 'cleave_scroll', skillId: 'cleave' },
    bash_scroll: { itemId: 'bash_scroll', skillId: 'bash' },
    execute_scroll: { itemId: 'execute_scroll', skillId: 'execute' },
    bleed_blade_scroll: { itemId: 'bleed_blade_scroll', skillId: 'bleed_blade' },
    iron_swing_scroll: { itemId: 'iron_swing_scroll', skillId: 'iron_swing' },
    whirlwind_scroll: { itemId: 'whirlwind_scroll', skillId: 'whirlwind' },
    crushing_blow_scroll: { itemId: 'crushing_blow_scroll', skillId: 'crushing_blow' },
};
exports.MAGIC_SCROLL_DROPS = {
    fireball_scroll: { itemId: 'fireball_scroll', skillId: 'fireball' },
    inferno_scroll: { itemId: 'inferno_scroll', skillId: 'inferno' },
    blaze_storm_scroll: { itemId: 'blaze_storm_scroll', skillId: 'blaze_storm' },
    ice_shard_scroll: { itemId: 'ice_shard_scroll', skillId: 'ice_shard' },
    frost_nova_scroll: { itemId: 'frost_nova_scroll', skillId: 'frost_nova' },
    glacial_spike_scroll: { itemId: 'glacial_spike_scroll', skillId: 'glacial_spike' },
    thunder_bolt_scroll: { itemId: 'thunder_bolt_scroll', skillId: 'thunder_bolt' },
    chain_lightning_scroll: { itemId: 'chain_lightning_scroll', skillId: 'chain_lightning' },
    storm_urge_scroll: { itemId: 'storm_urge_scroll', skillId: 'storm_urge' },
    shadow_strike_scroll: { itemId: 'shadow_strike_scroll', skillId: 'shadow_strike' },
    soul_drain_scroll: { itemId: 'soul_drain_scroll', skillId: 'soul_drain' },
    void_blast_scroll: { itemId: 'void_blast_scroll', skillId: 'void_blast' },
    holy_light_scroll: { itemId: 'holy_light_scroll', skillId: 'holy_light' },
    divine_smite_scroll: { itemId: 'divine_smite_scroll', skillId: 'divine_smite' },
    arcane_surge_scroll: { itemId: 'arcane_surge_scroll', skillId: 'arcane_surge' },
    void_collapse_scroll: { itemId: 'void_collapse_scroll', skillId: 'void_collapse' },
    null_zone_scroll: { itemId: 'null_zone_scroll', skillId: 'null_zone' },
    wind_blade_scroll: { itemId: 'wind_blade_scroll', skillId: 'wind_blade' },
    gale_force_scroll: { itemId: 'gale_force_scroll', skillId: 'gale_force' },
    earthquake_scroll: { itemId: 'earthquake_scroll', skillId: 'earthquake' },
    stone_shatter_scroll: { itemId: 'stone_shatter_scroll', skillId: 'stone_shatter' },
};
exports.SUPPORT_SCROLL_DROPS = {
    healing_touch_scroll: { itemId: 'healing_touch_scroll', skillId: 'healing_touch' },
    healing_light_scroll: { itemId: 'healing_light_scroll', skillId: 'healing_light' },
    greater_heal_scroll: { itemId: 'greater_heal_scroll', skillId: 'greater_heal' },
    full_restore_scroll: { itemId: 'full_restore_scroll', skillId: 'full_restore' },
    haste_scroll: { itemId: 'haste_scroll', skillId: 'haste' },
    iron_guard_scroll: { itemId: 'iron_guard_scroll', skillId: 'iron_guard' },
    empower_scroll: { itemId: 'empower_scroll', skillId: 'empower' },
    arcane_infuse_scroll: { itemId: 'arcane_infuse_scroll', skillId: 'arcane_infuse' },
    cleanse_scroll: { itemId: 'cleanse_scroll', skillId: 'cleanse' },
    barrier_scroll: { itemId: 'barrier_scroll', skillId: 'barrier' },
    resurrection_scroll: { itemId: 'resurrection_scroll', skillId: 'resurrection' },
    rally_scroll: { itemId: 'rally_scroll', skillId: 'rally' },
};
// ─── Scroll Drop Tables by Dungeon Tier ──────────────────────────────────────
// Returns a list of possible scroll item IDs for a given dungeon tier (1-5)
function getScrollDropsForTier(tier) {
    const physicalScrolls = Object.values(exports.PHYSICAL_SCROLL_DROPS).map(s => s.itemId);
    const magicScrolls = Object.values(exports.MAGIC_SCROLL_DROPS).map(s => s.itemId);
    const supportScrolls = Object.values(exports.SUPPORT_SCROLL_DROPS).map(s => s.itemId);
    if (tier === 1) {
        // Goblin Warren: basic physical + fire/ice
        return [
            'power_strike_scroll', 'quick_slash_scroll', 'bash_scroll',
            'fireball_scroll', 'ice_shard_scroll',
            'healing_touch_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 2) {
        // Thornwick Ruins: more physical, thunder
        return [
            'power_strike_scroll', 'quick_slash_scroll', 'cleave_scroll', 'bash_scroll',
            'thunder_bolt_scroll', 'ice_shard_scroll', 'frost_nova_scroll',
            'healing_touch_scroll', 'healing_light_scroll', 'haste_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 3) {
        // Sunken Mines: shadow magic, iron guard
        return [
            'cleave_scroll', 'bash_scroll', 'execute_scroll', 'bleed_blade_scroll',
            'shadow_strike_scroll', 'thunder_bolt_scroll', 'chain_lightning_scroll',
            'holy_light_scroll', 'iron_guard_scroll', 'cleanse_scroll',
        ];
    }
    if (tier === 4) {
        // Mirefen Catacombs: strong magic, barrier, empower
        return [
            'execute_scroll', 'bleed_blade_scroll', 'iron_swing_scroll',
            'soul_drain_scroll', 'void_blast_scroll', 'chain_lightning_scroll',
            'divine_smite_scroll', 'arcane_surge_scroll',
            'healing_light_scroll', 'empower_scroll', 'iron_guard_scroll', 'barrier_scroll',
        ];
    }
    // Tier 5: Dragon's Lair — best scrolls
    return [
        'iron_swing_scroll', 'whirlwind_scroll', 'crushing_blow_scroll',
        'blaze_storm_scroll', 'glacial_spike_scroll', 'storm_urge_scroll',
        'void_blast_scroll', 'divine_smite_scroll', 'arcane_surge_scroll',
        'greater_heal_scroll', 'full_restore_scroll', 'empower_scroll',
        'arcane_infuse_scroll', 'barrier_scroll', 'resurrection_scroll', 'rally_scroll',
        'null_zone_scroll', 'void_collapse_scroll',
    ];
}
// ─── Skill Lookup Helpers ────────────────────────────────────────────────────
function getPhysicalSkill(skillId) {
    return exports.PHYSICAL_SKILLS[skillId];
}
function getMagicSkill(skillId) {
    return exports.MAGIC_SKILLS[skillId];
}
function getSupportSkill(skillId) {
    return exports.SUPPORT_SKILLS[skillId];
}
function getSkillByItemId(itemId) {
    for (const [sid, entry] of Object.entries(exports.PHYSICAL_SCROLL_DROPS)) {
        if (entry.itemId === itemId) {
            const skill = exports.PHYSICAL_SKILLS[entry.skillId];
            return skill ? { type: 'physical', skill } : undefined;
        }
    }
    for (const [sid, entry] of Object.entries(exports.MAGIC_SCROLL_DROPS)) {
        if (entry.itemId === itemId) {
            const skill = exports.MAGIC_SKILLS[entry.skillId];
            return skill ? { type: 'magic', skill } : undefined;
        }
    }
    for (const [sid, entry] of Object.entries(exports.SUPPORT_SCROLL_DROPS)) {
        if (entry.itemId === itemId) {
            const skill = exports.SUPPORT_SKILLS[entry.skillId];
            return skill ? { type: 'support', skill } : undefined;
        }
    }
    return undefined;
}
function getSkillLevelMultiplier(skillLevel) {
    // +10% damage per level, cap at 2.0 (2x at level 10)
    return 1 + (skillLevel - 1) * 0.10;
}
function getSkillManaCost(skillLevel, baseCost) {
    // -5% mana cost per level, floor at 30% of base
    return Math.max(Math.floor(baseCost * Math.max(0.30, 1 - (skillLevel - 1) * 0.05)), 1);
}
//# sourceMappingURL=skills.js.map