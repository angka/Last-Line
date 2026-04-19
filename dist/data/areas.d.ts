export interface Area {
    id: string;
    name: string;
    biome: string;
    levelRange: [number, number];
    description: string;
    exits: Record<string, string>;
    baseEncounterChance: number;
    safeZone: boolean;
    regenState: 'exploring' | 'safe_area' | 'city';
}
export declare const AREAS: Record<string, Area>;
export declare function getArea(id: string): Area | undefined;
export declare function describeArea(areaId: string): string;
//# sourceMappingURL=areas.d.ts.map