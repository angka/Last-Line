import * as fs from 'fs';
import * as path from 'path';
import type { Area } from '../../types_content';
import type { Enemy } from '../../types_content';
import type { Item } from '../../types_content';
import type { Skill } from '../../types_content';
import type { Material, CraftingRecipe } from '../../types_content';
import type { DungeonDef } from '../../types_content';
import type { ShopCatalog } from '../../types_content';

const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');

interface CatalogCache {
  areas: Record<string, Area>;
  enemies: Record<string, Enemy>;
  items: Record<string, Item>;
  skills: Record<string, Skill>;
  materials: Record<string, Material>;
  recipes: Record<string, CraftingRecipe>;
  dungeons: Record<string, DungeonDef>;
  shops: Record<string, ShopCatalog>;
  loaded: boolean;
  loadedAt: number;
}

const cache: CatalogCache = {
  areas: {},
  enemies: {},
  items: {},
  skills: {},
  materials: {},
  recipes: {},
  dungeons: {},
  shops: {},
  loaded: false,
  loadedAt: 0,
};

function loadJson<T>(filename: string): T {
  const filePath = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[ContentManager] File not found: ${filePath}`);
    return {} as T;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`[ContentManager] Failed to parse ${filename}: ${err}`);
    return {} as T;
  }
}

export function loadAllCatalogs(): void {
  cache.areas = loadJson<Record<string, Area>>('areas.json');
  cache.enemies = loadJson<Record<string, Enemy>>('enemies.json');
  cache.items = loadJson<Record<string, Item>>('items.json');
  cache.skills = loadJson<Record<string, Skill>>('skills.json');
  const craftingData = loadJson<{ materials: Record<string, Material>; recipes: Record<string, CraftingRecipe> }>('crafting.json');
  cache.materials = craftingData.materials || {};
  cache.recipes = craftingData.recipes || {};
  cache.dungeons = loadJson<Record<string, DungeonDef>>('dungeons.json');
  cache.shops = loadJson<Record<string, ShopCatalog>>('shops.json');
  cache.loaded = true;
  cache.loadedAt = Date.now();
  console.log(`[ContentManager] Loaded catalogs at ${new Date().toISOString()}`);
}

export function reloadCatalog(name: keyof Omit<CatalogCache, 'loaded' | 'loadedAt'>): boolean {
  const mapping: Record<string, string> = {
    areas: 'areas.json',
    enemies: 'enemies.json',
    items: 'items.json',
    skills: 'skills.json',
    dungeons: 'dungeons.json',
    shops: 'shops.json',
  };

  if (name === 'materials' || name === 'recipes') {
    const data = loadJson<{ materials: Record<string, Material>; recipes: Record<string, CraftingRecipe> }>('crafting.json');
    if (name === 'materials') cache.materials = data.materials || {};
    else cache.recipes = data.recipes || {};
    console.log(`[ContentManager] Reloaded ${name} from crafting.json`);
    return true;
  }

  const file = mapping[name];
  if (!file) return false;

  if (name === 'areas') cache.areas = loadJson<Record<string, Area>>(file);
  else if (name === 'enemies') cache.enemies = loadJson<Record<string, Enemy>>(file);
  else if (name === 'items') cache.items = loadJson<Record<string, Item>>(file);
  else if (name === 'skills') cache.skills = loadJson<Record<string, Skill>>(file);
  else if (name === 'dungeons') cache.dungeons = loadJson<Record<string, DungeonDef>>(file);
  else if (name === 'shops') cache.shops = loadJson<Record<string, ShopCatalog>>(file);

  console.log(`[ContentManager] Reloaded ${name} from ${file}`);
  return true;
}

export function reloadAll(): void {
  loadAllCatalogs();
}

export function getArea(id: string): Area | undefined {
  return cache.areas[id];
}

export function getEnemy(id: string): Enemy | undefined {
  return cache.enemies[id];
}

export function getItem(id: string): Item | undefined {
  return cache.items[id];
}

export function getSkill(id: string): Skill | undefined {
  return cache.skills[id];
}

export function getMaterial(id: string): Material | undefined {
  return cache.materials[id];
}

export function getRecipe(id: string): CraftingRecipe | undefined {
  return cache.recipes[id];
}

export function getDungeon(id: string): DungeonDef | undefined {
  return cache.dungeons[id];
}

export function getShop(cityId: string): ShopCatalog | undefined {
  return cache.shops[cityId];
}

export function getAllAreas(): Record<string, Area> {
  return cache.areas;
}

export function getAllEnemies(): Record<string, Enemy> {
  return cache.enemies;
}

export function getAllItems(): Record<string, Item> {
  return cache.items;
}

export function getAllMaterials(): Record<string, Material> {
  return cache.materials;
}

export function getAllRecipes(): Record<string, CraftingRecipe> {
  return cache.recipes;
}

export function isLoaded(): boolean {
  return cache.loaded;
}

export function getLoadedAt(): number {
  return cache.loadedAt;
}