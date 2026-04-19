"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTickMs = getTickMs;
exports.calcRegenTick = calcRegenTick;
exports.regenStateLabel = regenStateLabel;
const TICK_MS = 5000;
function getTickMs() {
    return TICK_MS;
}
function calcRegenTick(save, state) {
    if (state === 'combat') {
        return { hpGain: 0, manaGain: 0, newHp: save.stats.hp, newMana: save.stats.mana };
    }
    const hpTick = regenHpRate(save.stats.maxHp, state);
    const mpTick = regenManaRate(save.stats.maxMana, state);
    const newHp = Math.min(save.stats.maxHp, save.stats.hp + hpTick);
    const newMana = Math.min(save.stats.maxMana, save.stats.mana + mpTick);
    return { hpGain: newHp - save.stats.hp, manaGain: newMana - save.stats.mana, newHp, newMana };
}
function regenHpRate(maxHp, state) {
    switch (state) {
        case 'exploring': return Math.ceil(maxHp * 0.005);
        case 'safe_area': return Math.ceil(maxHp * 0.02);
        case 'city': return Math.ceil(maxHp * 0.01);
        case 'inn': return maxHp;
        default: return 0;
    }
}
function regenManaRate(maxMana, state) {
    switch (state) {
        case 'exploring': return Math.ceil(maxMana * 0.005);
        case 'safe_area': return Math.ceil(maxMana * 0.02);
        case 'city': return Math.ceil(maxMana * 0.01);
        case 'inn': return maxMana;
        default: return 0;
    }
}
function regenStateLabel(state) {
    switch (state) {
        case 'exploring': return 'Exploring';
        case 'safe_area': return 'Resting';
        case 'city': return 'In City';
        case 'inn': return 'At Inn';
        case 'combat': return 'In Combat';
    }
}
//# sourceMappingURL=RegenEngine.js.map