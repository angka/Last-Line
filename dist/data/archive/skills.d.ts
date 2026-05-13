import type { PhysicalSkill, MagicSkill, SupportSkill } from '../types';
export declare const PHYSICAL_SKILLS: Record<string, PhysicalSkill>;
export declare const MAGIC_SKILLS: Record<string, MagicSkill>;
export declare const SUPPORT_SKILLS: Record<string, SupportSkill>;
export declare const PHYSICAL_SCROLL_DROPS: Record<string, {
    itemId: string;
    skillId: string;
}>;
export declare const MAGIC_SCROLL_DROPS: Record<string, {
    itemId: string;
    skillId: string;
}>;
export declare const SUPPORT_SCROLL_DROPS: Record<string, {
    itemId: string;
    skillId: string;
}>;
export declare function getScrollDropsForTier(tier: number): string[];
export declare function getPhysicalSkill(skillId: string): PhysicalSkill | undefined;
export declare function getMagicSkill(skillId: string): MagicSkill | undefined;
export declare function getSupportSkill(skillId: string): SupportSkill | undefined;
export declare function getSkillByItemId(itemId: string): {
    type: 'physical' | 'magic' | 'support';
    skill: PhysicalSkill | MagicSkill | SupportSkill;
} | undefined;
export declare function getSkillLevelMultiplier(skillLevel: number): number;
export declare function getSkillManaCost(skillLevel: number, baseCost: number): number;
//# sourceMappingURL=skills.d.ts.map