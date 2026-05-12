import * as fs from 'fs';
import * as path from 'path';
import { reloadAll, reloadCatalog } from './ContentManager';

const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');

let watcher: fs.FSWatcher | null = null;

export function startWatcher(devMode = false): void {
  if (watcher) return;
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('[HotReloadWatcher] content/ not found, skipping watcher');
    return;
  }

  watcher = fs.watch(CONTENT_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;
    console.log(`[HotReloadWatcher] Detected change: ${filename}`);
    const catalogMap: Record<string, string> = {
      'areas.json': 'areas',
      'enemies.json': 'enemies',
      'items.json': 'items',
      'skills.json': 'skills',
      'crafting.json': 'materials',
      'dungeons.json': 'dungeons',
      'shops.json': 'shops',
    };
    const catalog = catalogMap[filename];
    if (catalog) {
      reloadCatalog(catalog as any);
    }
  });

  console.log('[HotReloadWatcher] Started watching content/ directory');
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[HotReloadWatcher] Stopped');
  }
}

export function manualReload(): { success: boolean; message: string } {
  try {
    reloadAll();
    return { success: true, message: 'All catalogs reloaded successfully' };
  } catch (err) {
    return { success: false, message: `Reload failed: ${err}` };
  }
}
