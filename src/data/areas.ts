import type { Item, Rarity, ItemType } from '../types';

// ─── Area Definitions ────────────────────────────────────────────────────────

export interface Area {
  id: string;
  name: string;
  biome: string;
  levelRange: [number, number];
  description: string;
  exits: Record<string, string>; // direction → areaId
  baseEncounterChance: number;
  safeZone: boolean;
  regenState: 'exploring' | 'safe_area' | 'city';
}

export const AREAS: Record<string, Area> = {
  ashford_village_square: {
    id: 'ashford_village_square', name: 'Ashford Village Square', biome: 'village',
    levelRange: [1, 5], safeZone: true, regenState: 'city',
    description: 'A humble village square. Cobblestones worn smooth by generations of feet. A stone fountain trickles quietly at the center.',
    exits: { north: 'whispering_plains' },
    baseEncounterChance: 0,
  },
  whispering_plains: {
    id: 'whispering_plains', name: 'Whispering Plains', biome: 'grassland',
    levelRange: [1, 8],
    description: 'Tall grasses sway in the breeze. The wind makes a soft, rhythmic sound as it threads through the blades.',
    exits: {
      south: 'ashford_village_square',
      east: 'goblin_ravine_road',
      west: 'thornwood_edge',
      north: 'goblin_warren_entrance',
    },
    baseEncounterChance: 0.20,
    safeZone: false, regenState: 'exploring',
  },
  goblin_ravine_road: {
    id: 'goblin_ravine_road', name: 'Goblin Ravine Road', biome: 'ravine',
    levelRange: [3, 10],
    description: 'A rocky ravine path winding between ridges. The smell of iron ore lingers in the dry air.',
    exits: {
      west: 'whispering_plains',
      east: 'iron_gate_town_square',
    },
    baseEncounterChance: 0.18,
    safeZone: false, regenState: 'exploring',
  },
  thornwood_edge: {
    id: 'thornwood_edge', name: 'Thornwood Edge', biome: 'forest',
    levelRange: [5, 14],
    description: 'Dense forest with twisted branches overhead. Thorns scrape at your sleeves. Something rustles in the undergrowth.',
    exits: {
      east: 'whispering_plains',
      north: 'thornwick_square',
    },
    baseEncounterChance: 0.32,
    safeZone: false, regenState: 'exploring',
  },
  iron_gate_town_square: {
    id: 'iron_gate_town_square', name: 'Irongate Town Square', biome: 'town',
    levelRange: [5, 12], safeZone: true, regenState: 'city',
    description: 'A busy industrial town square. The clang of hammers on anvil echoes from the smithy district. Smoke drifts lazily from forge chimneys.',
    exits: {
      west: 'goblin_ravine_road',
      north: 'coal_hollow_mines',
      south: 'river_delta_marshland',
      east: 'amber_savanna',
      north_west: 'sunken_mines_entrance',
    },
    baseEncounterChance: 0,
  },
  coal_hollow_mines: {
    id: 'coal_hollow_mines', name: 'Coal Hollow Mines', biome: 'cave',
    levelRange: [6, 15],
    description: 'Dark mine tunnels carved into the rock. The air is thick with coal dust. Pickaxes lie abandoned near collapsed passages.',
    exits: {
      south: 'iron_gate_town_square',
    },
    baseEncounterChance: 0.45,
    safeZone: false, regenState: 'exploring',
  },
  river_delta_marshland: {
    id: 'river_delta_marshland', name: 'River Delta Marshland', biome: 'swamp',
    levelRange: [10, 20],
    description: 'Water pools in every hollow. Reeds choke the channels. The ground gives slightly underfoot. Insects drone in deafening clouds.',
    exits: {
      north: 'iron_gate_town_square',
      east: 'millhaven_square',
      south: 'thornwick_deep_forest',
    },
    baseEncounterChance: 0.42,
    safeZone: false, regenState: 'exploring',
  },
  millhaven_square: {
    id: 'millhaven_square', name: 'Millhaven Square', biome: 'town',
    levelRange: [10, 18], safeZone: true, regenState: 'city',
    description: 'A riverside trading post. Market stalls line the cobbled waterfront. The smell of fresh bread mingles with river mud.',
    exits: {
      west: 'river_delta_marshland',
      north: 'amber_savanna',
      east: 'crystal_badlands',
      south: 'arashiyama_bamboo_grove',
    },
    baseEncounterChance: 0,
  },
  thornwick_square: {
    id: 'thornwick_square', name: 'Thornwick Square', biome: 'town',
    levelRange: [15, 25], safeZone: true, regenState: 'city',
    description: 'A forest ranger town built around an ancient oak. The canopy overhead filters the sun into dappled light.',
    exits: {
      south: 'thornwood_edge',
      north: 'arashiyama_bamboo_grove',
      east: 'thornwick_ruins_entrance',
    },
    baseEncounterChance: 0,
  },
  arashiyama_bamboo_grove: {
    id: 'arashiyama_bamboo_grove', name: 'Arashiyama Bamboo Grove', biome: 'bamboo_forest',
    levelRange: [18, 28],
    description: 'Towering bamboo stalks create a green cathedral. Light filters through in shafts. The rustle of leaves is almost musical.',
    exits: {
      south: 'millhaven_square',
      north: 'crystal_badlands',
    },
    baseEncounterChance: 0.30,
    safeZone: false, regenState: 'exploring',
  },
  amber_savanna: {
    id: 'amber_savanna', name: 'Amber Savanna', biome: 'savanna',
    levelRange: [14, 25],
    description: 'Dry golden grasslands stretching to the horizon. Sparse trees offer little shade. The heat shimmers off the earth.',
    exits: {
      west: 'iron_gate_town_square',
      east: 'crystal_badlands',
      south: 'millhaven_square',
    },
    baseEncounterChance: 0.25,
    safeZone: false, regenState: 'exploring',
  },
  crystal_badlands: {
    id: 'crystal_badlands', name: 'Crystal Badlands', biome: 'desert',
    levelRange: [20, 32],
    description: 'A cracked plain dotted with crystal formations that catch and fracture light. The silence here feels deliberate.',
    exits: {
      west: 'amber_savanna',
      east: 'crystalmere_city_square',
      south: 'arashiyama_bamboo_grove',
      north: 'emberveil_volcanic_road',
    },
    baseEncounterChance: 0.28,
    safeZone: false, regenState: 'exploring',
  },
  crystalmere_city_square: {
    id: 'crystalmere_city_square', name: 'Crystalmere City', biome: 'city',
    levelRange: [20, 32], safeZone: true, regenState: 'city',
    description: 'A city of living crystal. Every surface refracts and glows with inner light. The air hums with ambient magic.',
    exits: {
      west: 'crystal_badlands',
      south: 'mirefen_swamp',
      east: 'emberveil_volcanic_road',
    },
    baseEncounterChance: 0,
  },
  emberveil_volcanic_road: {
    id: 'emberveil_volcanic_road', name: 'Emberveil Volcanic Road', biome: 'volcanic',
    levelRange: [28, 38],
    description: 'A road of black volcanic glass winding between ash-covered ridges. Heat radiates from the ground. Embers drift past on thermal currents.',
    exits: {
      west: 'crystal_badlands',
      south: 'crystalmere_city_square',
      east: 'emberveil_square',
    },
    baseEncounterChance: 0.42,
    safeZone: false, regenState: 'exploring',
  },
  emberveil_square: {
    id: 'emberveil_square', name: 'Emberveil', biome: 'town',
    levelRange: [28, 40], safeZone: true, regenState: 'city',
    description: 'A volcanic settlement carved from cooling lava tubes. Forge-fires burn continuously in public grates.',
    exits: {
      west: 'emberveil_volcanic_road',
      north: 'mirefen_swamp',
    },
    baseEncounterChance: 0,
  },
  mirefen_swamp: {
    id: 'mirefen_swamp', name: 'Mirefen Swamp', biome: 'swamp',
    levelRange: [28, 42],
    description: 'Murky water clings to your boots. The air smells of rot and something older. The horizon wavers in heat haze.',
    exits: {
      north: 'emberveil_square',
      east: 'shadow_thicket',
      south: 'crystalmere_city_square',
      west: 'mirefen_catacombs_entrance',
    },
    baseEncounterChance: 0.45,
    safeZone: false, regenState: 'exploring',
  },
  shadow_thicket: {
    id: 'shadow_thicket', name: 'Shadow Thicket', biome: 'dark_forest',
    levelRange: [35, 48],
    description: 'Twisted trees with bark dark as charcoal block most of the light. Shadows pool in the hollows between roots.',
    exits: {
      west: 'mirefen_swamp',
      east: 'duskhollow_square',
      north: 'saltmere_coast_road',
    },
    baseEncounterChance: 0.44,
    safeZone: false, regenState: 'exploring',
  },
  duskhollow_square: {
    id: 'duskhollow_square', name: 'Duskhollow', biome: 'town',
    levelRange: [35, 48], safeZone: true, regenState: 'city',
    description: 'A swamp-rogue city built on stilts and rope bridges. Lanthorns flicker in the damp. Murmured deals happen in every corner.',
    exits: {
      west: 'shadow_thicket',
      south: 'thunder_steppes',
      east: 'saltmere_coast_road',
    },
    baseEncounterChance: 0,
  },
  saltmere_coast_road: {
    id: 'saltmere_coast_road', name: 'Saltmere Coast Road', biome: 'coast',
    levelRange: [38, 52],
    description: 'A rocky coastline road spray-laden with salt. Waves crash against the stone seawall. The horizon stretches endless and grey.',
    exits: {
      west: 'duskhollow_square',
      east: 'saltmere_square',
      north: 'thunder_steppes',
    },
    baseEncounterChance: 0.30,
    safeZone: false, regenState: 'exploring',
  },
  thunder_steppes: {
    id: 'thunder_steppes', name: 'Thunder Steppes', biome: 'highland',
    levelRange: [45, 58],
    description: 'Rolling storm-torn highlands. Lightning arcs silently in the distant clouds. Static makes your hair stand on end.',
    exits: {
      south: 'duskhollow_square',
      east: 'storm_peaks',
      north: 'stormspire_citadel_square',
    },
    baseEncounterChance: 0.35,
    safeZone: false, regenState: 'exploring',
  },
  storm_peaks: {
    id: 'storm_peaks', name: 'Storm Peaks', biome: 'mountain',
    levelRange: [52, 65],
    description: 'Treacherous mountain paths at storm level. The wind screams through knife-edge passes. One wrong step means a very long fall.',
    exits: {
      west: 'thunder_steppes',
      north: 'skybridge_trail',
      east: 'stormspire_citadel_square',
    },
    baseEncounterChance: 0.40,
    safeZone: false, regenState: 'exploring',
  },
  stormspire_citadel_square: {
    id: 'stormspire_citadel_square', name: 'Stormspire Citadel', biome: 'city',
    levelRange: [50, 65], safeZone: true, regenState: 'city',
    description: 'A fortress at the edge of the sky. Storm-battered stone walls ring with the sound of thunder. Arc-lightning arcs between the spires.',
    exits: {
      west: 'storm_peaks',
      south: 'ashen_wastes',
      east: 'skybridge_trail',
    },
    baseEncounterChance: 0,
  },
  skybridge_trail: {
    id: 'skybridge_trail', name: 'Skybridge Trail', biome: 'floating',
    levelRange: [58, 68],
    description: 'A narrow path suspended between floating rock islands. The void yawns below. Cloud spirits drift past in the eternal twilight.',
    exits: {
      west: 'stormspire_citadel_square',
      south: 'skybridge_trail',
      east: 'veilreach_square',
    },
    baseEncounterChance: 0.38,
    safeZone: false, regenState: 'exploring',
  },
  veilreach_square: {
    id: 'veilreach_square', name: 'Veilreach', biome: 'city',
    levelRange: [58, 72], safeZone: true, regenState: 'city',
    description: 'A floating sky monastery. Stone pagodas hang suspended by invisible threads. Monks in white robes move in deliberate silence.',
    exits: {
      west: 'skybridge_trail',
      south: 'ashen_wastes',
    },
    baseEncounterChance: 0,
  },
  ashen_wastes: {
    id: 'ashen_wastes', name: 'Ashen Wastes', biome: 'desert',
    levelRange: [60, 75],
    description: 'A scorched moonscape of ash and char. The sun beats down unmercifully. Ancient bones of creatures long dead litter the cracked earth.',
    exits: {
      north: 'stormspire_citadel_square',
      south: 'dragons_spine_ridge',
      east: 'moorland_expanse',
      west: 'veilreach_square',
    },
    baseEncounterChance: 0.48,
    safeZone: false, regenState: 'exploring',
  },
  dragons_spine_ridge: {
    id: 'dragons_spine_ridge', name: "Dragon's Spine Ridge", biome: 'mountain',
    levelRange: [68, 80],
    description: "Jagged peaks cut the sky like broken teeth. Wind howls through the gaps, carrying the distant smell of smoke. Far below, the lights of Cinderpeak glow.",
    exits: {
      north: 'ashen_wastes',
      south: 'cinderpeak_square',
    },
    baseEncounterChance: 0.45,
    safeZone: false, regenState: 'exploring',
  },
  cinderpeak_square: {
    id: 'cinderpeak_square', name: 'Cinderpeak', biome: 'city',
    levelRange: [65, 78], safeZone: true, regenState: 'city',
    description: 'An ash-covered dragon-lore city. Every structure bears scorch marks and claw gouges. Dragons are worshipped here, not feared.',
    exits: {
      north: 'dragons_spine_ridge',
      east: 'moorland_expanse',
      south: 'ghostwood',
      north_east: 'dragons_lair_entrance',
    },
    baseEncounterChance: 0,
  },
  moorland_expanse: {
    id: 'moorland_expanse', name: 'Moorland Expanse', biome: 'moor',
    levelRange: [72, 82],
    description: 'Bleak moors under an overcast sky. Fog clings to the ground. The bones of old settlements jut from the black soil.',
    exits: {
      west: 'ashen_wastes',
      south: 'ashenmoor_square',
      east: 'ghostwood',
      north: 'cinderpeak_square',
    },
    baseEncounterChance: 0.50,
    safeZone: false, regenState: 'exploring',
  },
  ghostwood: {
    id: 'ghostwood', name: 'Ghostwood', biome: 'haunted',
    levelRange: [78, 88],
    description: 'A haunted forest where the boundary between life and death is thin. Pale wisps drift between the spectral trees. Whispered voices accompany you.',
    exits: {
      north: 'cinderpeak_square',
      south: 'wraithgate_square',
      east: 'obsidian_badlands',
    },
    baseEncounterChance: 0.52,
    safeZone: false, regenState: 'exploring',
  },
  ashenmoor_square: {
    id: 'ashenmoor_square', name: 'Ashenmoor', biome: 'city',
    levelRange: [72, 85], safeZone: true, regenState: 'city',
    description: 'A cursed necromancer moorland city. Dark magic saturates every stone. Necromancers trade openly in the market squares.',
    exits: {
      north: 'moorland_expanse',
      south: 'obsidian_badlands',
    },
    baseEncounterChance: 0,
  },
  obsidian_badlands: {
    id: 'obsidian_badlands', name: 'Obsidian Badlands', biome: 'void',
    levelRange: [82, 90],
    description: 'A black rock plain of obsidian shards. Reality itself feels unstable here. Void rifts crackle in the distance.',
    exits: {
      west: 'moorland_expanse',
      east: 'wraithgate_square',
      north: 'ashenmoor_square',
      south: 'sacred_highlands',
    },
    baseEncounterChance: 0.55,
    safeZone: false, regenState: 'exploring',
  },
  wraithgate_square: {
    id: 'wraithgate_square', name: 'Wraithgate', biome: 'city',
    levelRange: [80, 90], safeZone: true, regenState: 'city',
    description: 'A ghost fortress at the edge of the world. Spectral sentinels guard gates that open onto impossible vistas. The silence here is absolute.',
    exits: {
      west: 'obsidian_badlands',
      north: 'obsidian_keep_square',
      south: 'ruined_citadel_road',
    },
    baseEncounterChance: 0,
  },
  obsidian_keep_square: {
    id: 'obsidian_keep_square', name: 'Obsidian Keep', biome: 'city',
    levelRange: [85, 95], safeZone: true, regenState: 'city',
    description: 'A black fortress of fallen champions. Ghostly armor stands in eternal formation. Every shadow carries the weight of old glory.',
    exits: {
      west: 'obsidian_badlands',
      south: 'wraithgate_square',
      north: 'sacred_highlands',
    },
    baseEncounterChance: 0,
  },
  ruined_citadel_road: {
    id: 'ruined_citadel_road', name: 'Ruined Citadel Road', biome: 'ruins',
    levelRange: [85, 92],
    description: 'Crumbling ruins of a citadel that fell in some ancient war. Runes still glow faintly in the rubble. Something stirs in the depths.',
    exits: {
      north: 'wraithgate_square',
      south: 'the_sanctum_square',
    },
    baseEncounterChance: 0.58,
    safeZone: false, regenState: 'exploring',
  },
  sacred_highlands: {
    id: 'sacred_highlands', name: 'Sacred Highlands', biome: 'holy',
    levelRange: [88, 95],
    description: 'Holy mountain peaks bathed in permanent golden light. Celestial choirs are faintly audible in the wind. Ancient runes pulse with warmth.',
    exits: {
      west: 'obsidian_keep_square',
      south: 'void_frontier',
      east: 'the_sanctum_square',
    },
    baseEncounterChance: 0.50,
    safeZone: false, regenState: 'exploring',
  },
  void_frontier: {
    id: 'void_frontier', name: 'Void Frontier', biome: 'void',
    levelRange: [92, 100],
    description: 'A reality-torn plain where the void bleeds through. Rifts pulse with chaotic energy. The ground itself seems uncertain whether it wants to exist.',
    exits: {
      north: 'obsidian_keep_square',
      east: 'the_sanctum_square',
      south: 'abyssal_approach',
    },
    baseEncounterChance: 0.62,
    safeZone: false, regenState: 'exploring',
  },
  the_sanctum_square: {
    id: 'the_sanctum_square', name: 'The Sanctum', biome: 'city',
    levelRange: [90, 100], safeZone: true, regenState: 'city',
    description: 'The hidden holy divine city. Impossible architecture floats in organized chaos. Saints and angels walk the golden streets.',
    exits: {
      west: 'void_frontier',
      south: 'abyssal_approach',
      north: 'ruined_citadel_road',
    },
    baseEncounterChance: 0,
  },
  abyssal_approach: {
    id: 'abyssal_approach', name: "Abyssal Approach", biome: 'abyss',
    levelRange: [95, 105],
    description: 'The edge of the abyss. The void below has no bottom. Everything here is temporary. You feel watched by something that should not be.',
    exits: {
      north: 'the_sanctum_square',
      south: 'abyssal_maw_entrance',
    },
    baseEncounterChance: 0.65,
    safeZone: false, regenState: 'exploring',
  },
  abyssal_maw_entrance: {
    id: 'abyssal_maw_entrance', name: "The Abyssal Maw", biome: 'abyss',
    levelRange: [100, 110],
    description: 'The maw of the void itself. Reality frays at the entrance. The Nameless Void waits in the depths below.',
    exits: {
      north: 'abyssal_approach',
    },
    baseEncounterChance: 0,
    safeZone: true, regenState: 'city',
  },

  // ── Dungeon Interiors ────────────────────────────────────────────────

  // Goblin Warren (Ashford region — enter from north of Ashford Village)
  goblin_warren_entrance: {
    id: 'goblin_warren_entrance', name: "Goblin Warren — Entrance", biome: 'dungeon',
    levelRange: [1, 5],
    description: 'A foul-smelling burrow dug into the hillside. Bones and scraps litter the entrance tunnel. The chittering of goblins echoes from within.',
    exits: { south: 'whispering_plains', north: 'goblin_warren_f2' },
    baseEncounterChance: 0.35,
    safeZone: false, regenState: 'exploring',
  },
  goblin_warren_f2: {
    id: 'goblin_warren_f2', name: "Goblin Warren — Floor 2", biome: 'dungeon',
    levelRange: [2, 6],
    description: 'Deeper in the warrens. Crude torches cast flickering orange light. Goblin guards eye you from alcoves.',
    exits: { south: 'goblin_warren_entrance', north: 'goblin_warren_f3' },
    baseEncounterChance: 0.40,
    safeZone: false, regenState: 'exploring',
  },
  goblin_warren_f3: {
    id: 'goblin_warren_f3', name: "Goblin Warren — Floor 3 (Boss)", biome: 'dungeon',
    levelRange: [3, 7],
    description: 'A wide chamber lit by a massive bonfire. The Goblin Chieftain sits on a throne of bones at the far end.',
    exits: { south: 'goblin_warren_f2' },
    baseEncounterChance: 0.55,
    safeZone: false, regenState: 'exploring',
  },

  // Thornwick Ruins (Thornwick region — east of Thornwick Square)
  thornwick_ruins_entrance: {
    id: 'thornwick_ruins_entrance', name: "Thornwick Ruins — Entrance", biome: 'dungeon',
    levelRange: [15, 22],
    description: 'Crumbling stone arches overtaken by twisted roots. Old magic still hums in the broken flagstones.',
    exits: { west: 'thornwick_square', north: 'thornwick_ruins_f2' },
    baseEncounterChance: 0.38,
    safeZone: false, regenState: 'exploring',
  },
  thornwick_ruins_f2: {
    id: 'thornwick_ruins_f2', name: "Thornwick Ruins — Floor 2", biome: 'dungeon',
    levelRange: [16, 24],
    description: 'Collapsed corridors and rubble-strewn halls. Shadows move at the edge of your torchlight.',
    exits: { south: 'thornwick_ruins_entrance', north: 'thornwick_ruins_f3' },
    baseEncounterChance: 0.42,
    safeZone: false, regenState: 'exploring',
  },
  thornwick_ruins_f3: {
    id: 'thornwick_ruins_f3', name: "Thornwick Ruins — Floor 3 (Boss)", biome: 'dungeon',
    levelRange: [18, 26],
    description: 'A grand hall with a vaulted ceiling. The Treant Ancient stands guard over a sacred grove of saplings in the center.',
    exits: { south: 'thornwick_ruins_f2' },
    baseEncounterChance: 0.50,
    safeZone: false, regenState: 'exploring',
  },

  // Sunken Mines (Iron Gate region — north of Irongate, before the mines area)
  sunken_mines_entrance: {
    id: 'sunken_mines_entrance', name: "Sunken Mines — Entrance", biome: 'dungeon',
    levelRange: [6, 14],
    description: 'An abandoned mining shaft partially flooded with black water. Rusty carts sit half-submerged on corroded tracks.',
    exits: { south: 'iron_gate_town_square', north: 'sunken_mines_f2', east: 'sunken_mines_f3' },
    baseEncounterChance: 0.40,
    safeZone: false, regenState: 'exploring',
  },
  sunken_mines_f2: {
    id: 'sunken_mines_f2', name: "Sunken Mines — Floor 2", biome: 'dungeon',
    levelRange: [7, 16],
    description: 'Dripping caverns lined with dripping stalactites. The water here reaches waist height in places.',
    exits: { south: 'sunken_mines_entrance', north: 'sunken_mines_f4' },
    baseEncounterChance: 0.44,
    safeZone: false, regenState: 'exploring',
  },
  sunken_mines_f3: {
    id: 'sunken_mines_f3', name: "Sunken Mines — Floor 3", biome: 'dungeon',
    levelRange: [8, 18],
    description: 'A collapsed vein of iron ore opens into a deeper chamber. Something glints in the flooded floor.',
    exits: { west: 'sunken_mines_entrance' },
    baseEncounterChance: 0.45,
    safeZone: false, regenState: 'exploring',
  },
  sunken_mines_f4: {
    id: 'sunken_mines_f4', name: "Sunken Mines — Floor 4", biome: 'dungeon',
    levelRange: [10, 20],
    description: 'Deep shafts and rope bridges over flooded tunnels. The sound of groaning metal echoes from below.',
    exits: { south: 'sunken_mines_f2', north: 'sunken_mines_f5' },
    baseEncounterChance: 0.50,
    safeZone: false, regenState: 'exploring',
  },
  sunken_mines_f5: {
    id: 'sunken_mines_f5', name: "Sunken Mines — Floor 5 (Boss)", biome: 'dungeon',
    levelRange: [12, 22],
    description: 'A vast underground lake. The Mine Wyrm coils on a rocky island in the center, scales encrusted with gems and ore.',
    exits: { south: 'sunken_mines_f4' },
    baseEncounterChance: 0.58,
    safeZone: false, regenState: 'exploring',
  },

  // Mirefen Catacombs (Mirefen region — north of Mirefen Swamp)
  mirefen_catacombs_entrance: {
    id: 'mirefen_catacombs_entrance', name: "Mirefen Catacombs — Entrance", biome: 'dungeon',
    levelRange: [28, 38],
    description: 'Ancient stone stairs descend into the wetland. Bones are embedded in the mortar. The smell of decay rises from below.',
    exits: { south: 'mirefen_swamp', north: 'mirefen_catacombs_f2' },
    baseEncounterChance: 0.42,
    safeZone: false, regenState: 'exploring',
  },
  mirefen_catacombs_f2: {
    id: 'mirefen_catacombs_f2', name: "Mirefen Catacombs — Floor 2", biome: 'dungeon',
    levelRange: [29, 40],
    description: 'Narrow corridors lined with niches, most empty, some not. A cold draft carries whispers.',
    exits: { south: 'mirefen_catacombs_entrance', north: 'mirefen_catacombs_f3' },
    baseEncounterChance: 0.45,
    safeZone: false, regenState: 'exploring',
  },
  mirefen_catacombs_f3: {
    id: 'mirefen_catacombs_f3', name: "Mirefen Catacombs — Floor 3 (Boss)", biome: 'dungeon',
    levelRange: [30, 42],
    description: 'A ceremonial burial chamber. The Lich Lord rises from a sarcophagus as you enter, deathly light emanating from hollow eye sockets.',
    exits: { south: 'mirefen_catacombs_f2' },
    baseEncounterChance: 0.52,
    safeZone: false, regenState: 'exploring',
  },

  // Dragon's Lair (endgame — north of Cinderpeak)
  dragons_lair_entrance: {
    id: 'dragons_lair_entrance', name: "Dragon's Lair — Entrance", biome: 'dungeon',
    levelRange: [65, 78],
    description: 'A cave mouth wide enough to fly a dragon through. Scorch marks blacken the rock. The ground vibrates with slow, deep breathing.',
    exits: { south: 'cinderpeak_square', north: 'dragons_lair_f2' },
    baseEncounterChance: 0.50,
    safeZone: false, regenState: 'exploring',
  },
  dragons_lair_f2: {
    id: 'dragons_lair_f2', name: "Dragon's Lair — Floor 2", biome: 'dungeon',
    levelRange: [68, 82],
    description: 'Hoard rooms filled with mountains of gold and artifacts. Drakes sleep atop their personal piles.',
    exits: { south: 'dragons_lair_entrance', north: 'dragons_lair_f3' },
    baseEncounterChance: 0.54,
    safeZone: false, regenState: 'exploring',
  },
  dragons_lair_f3: {
    id: 'dragons_lair_f3', name: "Dragon's Lair — Floor 3", biome: 'dungeon',
    levelRange: [72, 86],
    description: 'The inner sanctum. Walls lined with the skulls of champions who fell before the dragon. Heat warps the air.',
    exits: { south: 'dragons_lair_f2', north: 'dragons_lair_f4' },
    baseEncounterChance: 0.58,
    safeZone: false, regenState: 'exploring',
  },
  dragons_lair_f4: {
    id: 'dragons_lair_f4', name: "Dragon's Lair — Floor 4", biome: 'dungeon',
    levelRange: [76, 90],
    description: 'The highest chamber. Natural light streams through a crack in the ceiling. The dragon waits on a dais of fused gold.',
    exits: { south: 'dragons_lair_f3', north: 'dragons_lair_boss' },
    baseEncounterChance: 0.62,
    safeZone: false, regenState: 'exploring',
  },
  dragons_lair_boss: {
    id: 'dragons_lair_boss', name: "Dragon's Lair — The Ancient Wyrm", biome: 'dungeon',
    levelRange: [80, 95],
    description: 'The Ancient Dragon unfurls from the dais. Its scales shimmer with molten gold. There is no escape. Only victory or death.',
    exits: { south: 'dragons_lair_f4' },
    baseEncounterChance: 0.75,
    safeZone: false, regenState: 'exploring',
  },
};

export function getArea(id: string): Area | undefined {
  return AREAS[id];
}

export function isDungeonArea(areaId: string): boolean {
  const area = AREAS[areaId];
  return area?.biome === 'dungeon';
}

export function isBossFloor(areaId: string): boolean {
  const area = AREAS[areaId];
  if (!area) return false;
  return area.name.toLowerCase().includes('boss') || area.name.toLowerCase().includes('ancient wyrm');
}

export function getDungeonId(areaId: string): string | null {
  const area = AREAS[areaId];
  if (!area || area.biome !== 'dungeon') return null;
  // Extract dungeon name from area id prefix
  const parts = areaId.split('_');
  // e.g. goblin_warren_entrance -> goblin_warren
  if (areaId.endsWith('_entrance')) return parts.slice(0, -1).join('_');
  if (areaId.includes('_f')) return parts.slice(0, -1).join('_').replace(/_f\d+$/, '');
  if (areaId.includes('_boss')) return parts.slice(0, -1).join('_');
  return parts.slice(0, -1).join('_');
}

// All cities available for fast travel (sorted by unlock order / level)
export const CITIES: { id: string; name: string; minLevel?: number; tier: number }[] = [
  { id: 'ashford_village_square',      name: 'Ashford',       minLevel: 1,  tier: 1 },
  { id: 'iron_gate_town_square',        name: 'Irongate',      minLevel: 5,  tier: 1 },
  { id: 'thornwick_square',             name: 'Thornwick',     minLevel: 10, tier: 2 },
  { id: 'millhaven_square',             name: 'Millhaven',     minLevel: 10, tier: 2 },
  { id: 'crystalmere_city_square',      name: 'Crystalmere',   minLevel: 18, tier: 3 },
  { id: 'emberveil_square',            name: 'Emberveil',      minLevel: 25, tier: 3 },
  { id: 'duskhollow_square',            name: 'Duskhollow',    minLevel: 30, tier: 4 },
  { id: 'stormspire_citadel_square',   name: 'Stormspire',    minLevel: 40, tier: 4 },
  { id: 'veilreach_square',             name: 'Veilreach',     minLevel: 50, tier: 5 },
  { id: 'cinderpeak_square',            name: 'Cinderpeak',    minLevel: 55, tier: 5 },
  { id: 'ashenmoor_square',             name: 'Ashenmoor',     minLevel: 60, tier: 5 },
  { id: 'wraithgate_square',            name: 'Wraithgate',    tier: 6 },
  { id: 'obsidian_keep_square',         name: 'Obsidian Keep', tier: 6 },
  { id: 'the_sanctum_square',           name: 'The Sanctum',    tier: 6 },
];

export function getCityById(id: string) {
  return CITIES.find(c => c.id === id);
}

export function describeArea(areaId: string): string {
  const area = AREAS[areaId];
  if (!area) return 'Unknown area.';
  const isDungeon = area.biome === 'dungeon';
  const isBossFloor = area.name.toLowerCase().includes('boss') || area.name.toLowerCase().includes('ancient wyrm');
  let out = `\n  ${area.name}  [Lv ${area.levelRange[0]}–${area.levelRange[1]}, ${area.biome}]`;
  if (isBossFloor) out += '  ⚔ BOSS FLOOR';
  out += '\n  ──────────────────────────────────────────────────────────';
  out += '\n  ' + area.description;
  out += '\n  ──────────────────────────────────────────────────────────';
  out += '\n  Exits:';
  for (const [dir, target] of Object.entries(area.exits)) {
    const targetArea = AREAS[target];
    out += `\n    [${dir}] ${targetArea?.name ?? target}`;
  }
  if (isDungeon) {
    out += '\n  [DUNGEON] Use "enter" to explore this floor for encounters.';
    out += '\n            Use "up" to go to previous floor, "down" to go deeper.';
  }
  if (area.baseEncounterChance > 0) {
    const pct = Math.round(area.baseEncounterChance * 100);
    out += `\n  Enemies patrol this area. [encounter chance: ${pct}%]`;
  } else {
    out += '\n  This is a safe area. No enemies will spawn here.';
  }
  return out;
}
