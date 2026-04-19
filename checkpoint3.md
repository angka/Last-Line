# Last Line — Phase 3: Skills, Crafting & Economy

## What Was Built

Phase 3 adds skill progression, crafting, gathering, and a full economic loop to the game. All TypeScript compiles clean (`npx tsc` → 0 errors).

---

## Core Systems

### 1. Skill System (`src/data/skills.ts`)

**30 skills** across three categories:

- **Physical (10):** power_strike → quick_slash → cleave → bash → execute → bleed_blade → iron_swing → whirlwind → rally_strike → crushing_blow
- **Magic (15):** 5 tiers each for Fire, Ice, Thunder, Shadow, Holy, Arcane, Void, Wind, Earth — with 8 elements: fire, ice, thunder, shadow, holy, arcane, void, wind, earth
- **Support (5):** healing_touch/healing_light/greater_heal/full_restore, haste/iron_guard/empower/arcane_infuse, cleanse, barrier, resurrection, rally

**Skill leveling:** Each skill levels up via kill counts:
- Physical/Magic: kill-linked progression through 5 tiers
- Support: linked kills (heal on wounded ally, buff near death, etc.)
- Tiers tracked by `SKILL_LEVEL_THRESHOLDS` in `types.ts`

**Helpers:**
- `getSkillLevelMultiplier(level)` — +10% damage/effect per level, cap 2.0×
- `getSkillManaCost(level, baseCost)` — −5% mana cost per level, floor 30%
- `getSkillByItemId(itemId)` — resolve scroll itemId → skill type + definition

**Scroll item → skill mapping:** PHYSICAL_SCROLL_DROPS, MAGIC_SCROLL_DROPS, SUPPORT_SCROLL_DROPS (dungeon-tier → scroll IDs)

### 2. Scroll System

Scrolls are consumable items (type: `'scroll'`) in `src/data/items.ts`. Using `learn` in-game teaches the skill:
- `learn <n>` — learn skill from scroll in inventory
- Shows learnable scrolls if no arg, with kill/linked-kill progress bars
- Skill slots: 6 physical, 6 magic, 4 support (max)

### 3. Crafting System (`src/data/crafting.ts` + `src/server/engine/CraftingManager.ts`)

**50+ materials:** herbs, ores, wood, crystals, monster drops, essences, cloth, bone

**15 recipes** across tiers:
- Tier 1 (Lv 1+): health_potion_1, mana_potion_1
- Tier 2 (Lv 5+): iron_sword, health_potion_2, mana_potion_2
- Tier 3 (Lv 10+): steel_sword, chainmail, oak_staff, silver_ring
- Tier 4 (Lv 20+): shadow_silk, health_potion_3
- Tier 5 (Lv 30+): flame_blade, void_dagger, storm_staff

**Commands:** `craft` (menu) / `craft <n>` (craft by recipe number)

### 4. Gathering Nodes (`src/data/crafting.ts`)

Per-area resource nodes with uses, level requirements, tool requirements, and respawn timers:

| Verb | Resource | Areas |
|------|----------|-------|
| gather | Herb patches | whispering_plains, goblin_ravine_road, thornwood_edge |
| mine | Mining veins | coal_hollow_mines, crystal_badlands, void_frontier |
| chop | Lumber spots | whispering_plains, thornwood_edge, river_delta_marshland |
| pick | Fungal clusters | thornwood_edge, river_delta_marshland, emberveil_volcanic_road |
| fill | Water sources | all areas with water |
| sift | Bone piles | mirefen_swamp, abyssal_approach |
| attune | Attunement stones | void_frontier, abyssal_approach |

**Commands:** `gather` / `mine` / `chop` / `pick` / `fill` / `sift` / `attune`
- `look` command now displays resource nodes in the area description
- Nodes are in-memory (server reset = nodes reset)

### 5. Loot Engine (`src/server/engine/LootEngine.ts`)

**Boss drop tables** for 5 bosses (guaranteed + exclusive + common pool drops):
- Goblin Chieftain (Tier 1)
- Treant Ancient (Tier 2)
- Mine Wyrm (Tier 3)
- Lich Lord (Tier 4)
- Ancient Dragon (Tier 5)

**Scroll drops:** Dungeon tier-based scroll drops after boss kills and rare regular kills

**Dungeon chests:** Loot tables per dungeon, opened after boss kill (`chest` command)

**Pending loot buffer:** `pendingLoot` array in `SaveFile` stores loot from combat wins until player runs `loot` or `pending_loot claim`. Merges identical item types. Prevents inventory overflow.

### 6. Combat Integration

**`playerSkill()` in CombatEngine:** Full skill usage in combat — damage (physical/magic) and effects (support). Handles mana costs, crits, dodge, damage scaling, and combat resolution after each skill use.

**Commands added:**
- `skill <type> <n>` — use physical/magic/support skill in combat
- `loot` / `pending_loot` — claim pending loot
- `pending_loot claim` — claim all pending loot
- `chest` — open dungeon chest after boss kill

### 7. Help Text

`formatHelp()` in `CommandParser.ts` updated with new command sections: Crafting & Gathering, Loot, and skill/magic/attune commands.

---

## File Inventory

### New Files
- `src/data/skills.ts` — All skill definitions, scroll tables, helpers
- `src/data/crafting.ts` — Materials catalog, gathering nodes, recipes
- `src/server/engine/LootEngine.ts` — Boss/scroll/chest/regular loot rolling
- `src/server/engine/CraftingManager.ts` — Craft and gather logic

### Modified Files
- `src/types.ts` — Added: SupportSkill, Material, GatheringNode, CraftingRecipe, LootEntry, BossDropTable, DungeonChestLoot, SKILL_LEVEL_THRESHOLDS, isBoss on CombatParticipant
- `src/data/items.ts` — Added: tools (pickaxe, wood_axe, water_flask), epic/legendary weapons & armor, ALL 40+ scroll items
- `src/data/shops.ts` — Phase 3 items added to shop catalogs
- `src/server/engine/CombatEngine.ts` — `resolveVictory` rewritten with loot, `resolveDefeat` re-added, `playerSkill()` added
- `src/server/engine/PlayerEngine.ts` — `dungeonChests: []` added to `createDefaultSave().worldState`
- `src/server/parser/CommandParser.ts` — Phase 3 commands and handlers, help text updated, `look` shows gathering nodes

---

## Build Status

- `npx tsc` → **0 errors**
- All imports use correct relative paths (`../../data/` for server-side data, `../../types`)
- No orphaned temp files

---

## Phase 4 Planning

Potential next phases (from `last line.md`):
- **Phase 4:** Towns, Housing & Social — player housing, global chat channels (/say, /shout, /party), party system, NPC reputation, player-to-player trading, guilds
- **Phase 5:** Endgame & Meta — procedural dungeons (infinite floors), world bosses, seasonal events, achievement system, leaderboards
- **Phase 6:** Editor & Tools — map editor, NPC dialogue editor, quest editor, loot table editor

See `last line.md` for full project blueprint.
