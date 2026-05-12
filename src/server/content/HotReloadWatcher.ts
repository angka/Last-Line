import * as fs from 'fs';
import * as path from 'path';
import { reloadAll, reloadCatalog } from './ContentManager';

const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');

let watcher: fs.FSWatcher | null = null;
let isReloading = false;

export function startWatcher(devMode = false): void {
  if (watcher) return;
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('[HotReloadWatcher] content/ not found, skipping watcher');
    return;
  }

  if (!devMode) {
    console.log('[HotReloadWatcher] Skipping watcher in production mode');
    return;
  }

  watcher = fs.watch(CONTENT_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;
    if (isReloading) return;
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
      isReloading = true;
      try {
        reloadCatalog(catalog as any);
      } finally {
        isReloading = false;
      }
    }
  });

  watcher.on('error', (err) => {
    console.error('[HotReloadWatcher] Watcher error:', err);
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
  if (isReloading) {
    return { success: false, message: 'Reload already in progress' };
  }
  try {
    isReloading = true;
    reloadAll();
    return { success: true, message: 'All catalogs reloaded successfully' };
  } catch (err) {
    return { success: false, message: `Reload failed: ${err}` };
  } finally {
    isReloading = false;
  }
}
