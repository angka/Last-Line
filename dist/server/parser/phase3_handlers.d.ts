declare function handleSkill(args: string[], save: SaveFile, combatState: any): ParseResult;
declare function handleCombatSkill(args: string[], save: SaveFile, combatState: any): ParseResult;
declare function handleLearn(args: string[], save: SaveFile): ParseResult;
declare function handleCraft(args: string[], save: SaveFile): ParseResult;
declare function handleGather(verb: string, save: SaveFile): ParseResult;
declare function handlePendingLoot(save: SaveFile, subargs?: string[]): ParseResult;
declare function handleDungeonChest(save: SaveFile): ParseResult;
declare function formatSkills(save: SaveFile): string;
declare function formatAreaNodesDisplay(areaId: string): string;
//# sourceMappingURL=phase3_handlers.d.ts.map