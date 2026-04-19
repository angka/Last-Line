export interface PlayerStats {
    name: string;
    level: number;
    exp: number;
    expToNext: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    gold: number;
    strength: number;
    agility: number;
    defense: number;
    luck: number;
    attack: number;
    critRate: number;
    critDamage: number;
    freeStatPoints: number;
    perkSlots: number;
}
export interface InventorySlot {
    slotId: string;
    itemId: string;
    quantity: number;
    equipped: boolean;
}
export interface Item {
    id: string;
    name: string;
    type: ItemType;
    rarity: Rarity;
    description: string;
    damage?: number;
    defense?: number;
    accuracy?: number;
    strengthBonus?: number;
    agilityBonus?: number;
    defenseBonus?: number;
    luckBonus?: number;
    critRateBonus?: number;
    critDamageBonus?: number;
    hpBonus?: number;
    manaBonus?: number;
    effect?: ItemEffect;
    consumable?: boolean;
    healAmount?: number;
    manaRestore?: number;
    stackable: boolean;
    buyPrice: number;
    sellPrice: number;
    tradelock: boolean;
    equipSlot?: EquipSlot;
}
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'scroll' | 'quest' | 'key';
export type EquipSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type ItemEffect = 'heal' | 'mana_restore' | 'poison' | 'burn' | 'cleanse' | 'buff';
export interface PhysicalSkill {
    id: string;
    name: string;
    level: number;
    killCount: number;
    manaCost: number;
    baseDamage: number;
    scalingStat: 'strength';
    description: string;
}
export interface MagicSkill {
    id: string;
    name: string;
    level: number;
    killCount: number;
    manaCost: number;
    baseDamage: number;
    scalingStat: 'mana';
    element: Element;
    description: string;
}
export type Element = 'fire' | 'ice' | 'thunder' | 'shadow' | 'light' | 'earth' | 'wind' | 'arcane' | 'void';
export type SupportSkill = Record<string, never>;
export interface StatusEffect {
    id: string;
    name: string;
    type: StatusType;
    remainingTurns: number;
    value: number;
}
export type StatusType = 'poison' | 'burn' | 'stun' | 'freeze' | 'bleed' | 'weaken' | 'shield' | 'regen' | 'curse' | 'silence';
export interface SaveFile {
    saveId: string;
    playerName: string;
    savedAt: string;
    playtime: number;
    stats: PlayerStats;
    inventory: InventorySlot[];
    equipped: Record<EquipSlot, string | null>;
    skills: {
        physical: PhysicalSkill[];
        magic: MagicSkill[];
        support: SupportSkill[];
    };
    worldState: {
        currentArea: string;
        currentCity: string;
        unlockedCities: string[];
        unlockedDungeons: string[];
        defeatedBosses: string[];
        dungeonProgress: DungeonProgress[];
    };
    pendingLoot: LootDrop[];
    socialPrefs: SocialPrefs;
    regenState: RegenState;
}
export interface DungeonProgress {
    dungeonId: string;
    currentFloor: number;
}
export interface SocialPrefs {
    chatVisible: boolean;
    nearbyVisible: boolean;
    chatArea: boolean;
    chatParty: boolean;
    chatShout: boolean;
}
export type RegenState = 'exploring' | 'safe_area' | 'city' | 'inn' | 'combat';
export interface LootDrop {
    itemId: string;
    name: string;
    rarity: Rarity;
    quantity: number;
}
export interface CombatParticipant {
    id: string;
    type: 'player' | 'enemy';
    name: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    strength: number;
    agility: number;
    defense: number;
    critRate: number;
    critDamage: number;
    statusEffects: StatusEffect[];
    agiRoll: number;
    isPlayer?: boolean;
    playerId?: string;
    isElite?: boolean;
    level?: number;
}
export interface CombatSession {
    sessionId: string;
    participants: CombatParticipant[];
    turnIndex: number;
    round: number;
    areaId: string;
    log: CombatLogEntry[];
    turnTimer?: NodeJS.Timeout;
    turnStartedAt: number;
    turnTimeoutMs: number;
    timedOutCount: Map<string, number>;
    winner?: 'player' | 'enemy';
}
export interface CombatLogEntry {
    round: number;
    text: string;
}
export interface Enemy {
    id: string;
    name: string;
    level: number;
    maxHp: number;
    attack: number;
    strength: number;
    agility: number;
    defense: number;
    expReward: number;
    goldReward: number;
    statusEffects?: StatusEffect[];
    isBoss?: boolean;
    isElite?: boolean;
    dropTableId?: string;
    element?: Element;
}
export interface RegenTickResult {
    hpGain: number;
    manaGain: number;
    newHp: number;
    newMana: number;
}
export interface GameSession {
    sessionId: string;
    socket: import('ws').WebSocket;
    playerId: string;
    saveSlot: number;
    currentState: SaveFile;
    combatState?: CombatSession;
    regenInterval?: NodeJS.Timeout;
    regenState: RegenState;
    connectedAt: Date;
    lastActivity: Date;
}
export type MenuState = {
    type: 'main';
} | {
    type: 'save_select';
} | {
    type: 'char_create';
} | {
    type: 'gameplay';
} | {
    type: 'combat';
} | {
    type: 'inn';
} | {
    type: 'shop';
};
export interface CommandResult {
    text: string;
    clear?: boolean;
}
//# sourceMappingURL=types.d.ts.map