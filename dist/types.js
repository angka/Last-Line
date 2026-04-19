"use strict";
// ─── Core Types ─────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_LEVEL_THRESHOLDS = void 0;
exports.getNextSkillLevelThreshold = getNextSkillLevelThreshold;
// ─── Skill Level Thresholds ─────────────────────────────────────────
exports.SKILL_LEVEL_THRESHOLDS = [
    0, // Lv 1
    10, // Lv 2
    25, // Lv 3
    50, // Lv 4
    100, // Lv 5
    200, // Lv 6
    400, // Lv 7
    750, // Lv 8
    1500, // Lv 9
    3000, // Lv 10
];
function getNextSkillLevelThreshold(currentLevel) {
    return exports.SKILL_LEVEL_THRESHOLDS[currentLevel] ?? 3000;
}
//# sourceMappingURL=types.js.map