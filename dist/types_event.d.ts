export type EventType = 'area_spawn' | 'drop_modifier' | 'bonus_exp' | 'enemy_spawn' | 'treasure_spawn';
export interface GameEvent {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    type: EventType;
    effects: EventEffects;
    icon?: string;
    priority?: number;
}
export interface EventEffects {
    expMultiplier?: number;
    goldMultiplier?: number;
    dropMultiplier?: number;
    affectedItems?: string[];
    affectedEnemies?: string[];
    affectedAreas?: string[];
    spawnEnemyId?: string;
    spawnAreaId?: string;
    treasureAreaIds?: string[];
    bonusLoot?: Record<string, number>;
}
export interface ActiveEvent extends GameEvent {
    isActive: boolean;
    timeRemaining: number;
}
//# sourceMappingURL=types_event.d.ts.map