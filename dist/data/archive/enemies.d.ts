import type { Enemy } from '../types';
export declare const ENEMIES: Record<string, Enemy>;
export declare function getEnemy(id: string): Enemy | undefined;
export declare function getEnemyPool(levelRange: [number, number]): Enemy[];
export declare function scaleEnemy(enemy: Enemy, isElite?: boolean): Enemy;
//# sourceMappingURL=enemies.d.ts.map