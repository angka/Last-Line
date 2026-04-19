import type { PlayerStats, SaveFile } from '../../types';
export declare function calcExpToNext(level: number): number;
export declare function calcDodgeChance(agility: number): number;
export declare function calcAccuracy(agility: number, weaponAccuracy?: number): number;
export declare function calcCritRate(level: number, baseLuck: number): number;
export declare function calcCritDamage(level: number): number;
export declare function levelUp(stats: PlayerStats): PlayerStats;
export declare function applyStatPoint(stats: PlayerStats, stat: 'strength' | 'agility' | 'defense' | 'luck'): PlayerStats;
export declare function createDefaultStats(name: string): PlayerStats;
export declare function createDefaultSave(playerName: string): SaveFile;
export declare function computeAttack(stats: PlayerStats, weaponDamage?: number): number;
//# sourceMappingURL=PlayerEngine.d.ts.map