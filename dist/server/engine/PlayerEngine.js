"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcExpToNext = calcExpToNext;
exports.calcDodgeChance = calcDodgeChance;
exports.calcAccuracy = calcAccuracy;
exports.calcCritRate = calcCritRate;
exports.calcCritDamage = calcCritDamage;
exports.levelUp = levelUp;
exports.applyStatPoint = applyStatPoint;
exports.createDefaultStats = createDefaultStats;
exports.createDefaultSave = createDefaultSave;
exports.computeAttack = computeAttack;
const uuid_1 = require("uuid");
// ─── Stat Helpers ──────────────────────────────────────────────────────────────
function calcExpToNext(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}
function calcDodgeChance(agility) {
    return agility / (agility + 150);
}
function calcAccuracy(agility, weaponAccuracy = 70) {
    return agility * 0.5 + weaponAccuracy;
}
function calcCritRate(level, baseLuck) {
    return Math.min(0.75, 0.05 + level * 0.005 + baseLuck * 0.003);
}
function calcCritDamage(level) {
    return 1.5 + level * 0.01;
}
// ─── Level Up ─────────────────────────────────────────────────────────────────
function levelUp(stats) {
    const s = { ...stats };
    s.level += 1;
    s.maxHp += 10;
    s.maxMana += 5;
    s.strength += 2;
    s.agility += 1;
    s.defense += 2;
    s.luck += 1;
    s.critRate = Math.min(0.75, s.critRate + 0.005);
    s.critDamage += 0.1;
    s.hp = s.maxHp;
    s.mana = s.maxMana;
    s.exp -= s.expToNext;
    s.expToNext = calcExpToNext(s.level);
    if (s.level % 5 === 0)
        s.freeStatPoints += 1;
    if (s.level % 10 === 0)
        s.perkSlots += 1;
    return s;
}
function applyStatPoint(stats, stat) {
    if (stats.freeStatPoints <= 0)
        return stats;
    const s = { ...stats };
    s.freeStatPoints -= 1;
    s[stat] += 1;
    return s;
}
// ─── Default Stats ────────────────────────────────────────────────────────────
function createDefaultStats(name) {
    return {
        name,
        level: 1,
        exp: 0,
        expToNext: 100,
        hp: 100,
        maxHp: 100,
        mana: 50,
        maxMana: 50,
        gold: 50,
        strength: 5,
        agility: 5,
        defense: 5,
        luck: 3,
        attack: 5,
        critRate: 0.05,
        critDamage: 1.5,
        freeStatPoints: 0,
        perkSlots: 0,
    };
}
// ─── Default SaveFile ──────────────────────────────────────────────────────────
function createDefaultSave(playerName) {
    return {
        saveId: (0, uuid_1.v4)(),
        playerId: '', // populated at registration time
        playerName,
        savedAt: new Date().toISOString(),
        playtime: 0,
        stats: createDefaultStats(playerName),
        inventory: [],
        equipped: {
            weapon: null,
            armor: null,
            accessory1: null,
            accessory2: null,
        },
        skills: { physical: [], magic: [], support: [] },
        worldState: {
            currentArea: 'ashford_village_square',
            currentCity: 'ashford_village',
            unlockedCities: ['ashford_village'],
            unlockedDungeons: [],
            defeatedBosses: [],
            dungeonProgress: [],
            dungeonChests: [],
        },
        pendingLoot: [],
        socialPrefs: {
            chatVisible: true,
            nearbyVisible: true,
            chatArea: true,
            chatParty: true,
            chatShout: true,
        },
        pvp: { enabled: false, safeZone: true },
        regenState: 'city',
        achievements: [],
        achievementStats: {
            totalKills: 0,
            bossKills: 0,
            tradesCompleted: 0,
            itemsCrafted: 0,
            resourcesGathered: 0,
            pvpKills: 0,
            worldBossKills: 0,
            dungeonsCleared: [],
            deepestFloors: {},
            visitedAreas: ['ashford_village_square'],
        },
        pvpStats: {
            kills: 0,
            deaths: 0,
            winStreak: 0,
            bestStreak: 0,
            seasonWins: 0,
            seasonPoints: 1000, // starting ELO
        },
    };
}
// ─── Combat Stats ───────────────────────────────────────────────────────────────
function computeAttack(stats, weaponDamage = 0) {
    const wpn = weaponDamage;
    const strBonus = stats.strength * 0.5;
    return Math.floor(stats.attack + wpn + strBonus);
}
//# sourceMappingURL=PlayerEngine.js.map