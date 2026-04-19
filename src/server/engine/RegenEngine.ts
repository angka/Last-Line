import type { RegenState, RegenTickResult, SaveFile } from '../../types';

const TICK_MS = 5000;

export function getTickMs(): number {
  return TICK_MS;
}

export function calcRegenTick(save: SaveFile, state: RegenState): RegenTickResult {
  if (state === 'combat') {
    return { hpGain: 0, manaGain: 0, newHp: save.stats.hp, newMana: save.stats.mana };
  }

  const hpTick = regenHpRate(save.stats.maxHp, state);
  const mpTick = regenManaRate(save.stats.maxMana, state);

  const newHp   = Math.min(save.stats.maxHp,   save.stats.hp   + hpTick);
  const newMana = Math.min(save.stats.maxMana, save.stats.mana + mpTick);

  return { hpGain: newHp - save.stats.hp, manaGain: newMana - save.stats.mana, newHp, newMana };
}

function regenHpRate(maxHp: number, state: RegenState): number {
  switch (state) {
    case 'exploring':  return Math.ceil(maxHp * 0.005);
    case 'safe_area':  return Math.ceil(maxHp * 0.02);
    case 'city':       return Math.ceil(maxHp * 0.01);
    case 'inn':        return maxHp;
    default:           return 0;
  }
}

function regenManaRate(maxMana: number, state: RegenState): number {
  switch (state) {
    case 'exploring':  return Math.ceil(maxMana * 0.005);
    case 'safe_area':  return Math.ceil(maxMana * 0.02);
    case 'city':       return Math.ceil(maxMana * 0.01);
    case 'inn':        return maxMana;
    default:           return 0;
  }
}

export function regenStateLabel(state: RegenState): string {
  switch (state) {
    case 'exploring':  return 'Exploring';
    case 'safe_area':  return 'Resting';
    case 'city':       return 'In City';
    case 'inn':        return 'At Inn';
    case 'combat':     return 'In Combat';
  }
}
