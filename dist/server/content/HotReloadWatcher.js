"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatcher = startWatcher;
exports.stopWatcher = stopWatcher;
exports.manualReload = manualReload;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ContentManager_1 = require("./ContentManager");
const CONTENT_DIR = path.join(__dirname, '..', '..', '..', 'content');
let watcher = null;
let isReloading = false;
function startWatcher(devMode = false) {
    if (watcher)
        return;
    if (!fs.existsSync(CONTENT_DIR)) {
        console.log('[HotReloadWatcher] content/ not found, skipping watcher');
        return;
    }
    if (!devMode) {
        console.log('[HotReloadWatcher] Skipping watcher in production mode');
        return;
    }
    watcher = fs.watch(CONTENT_DIR, (eventType, filename) => {
        if (!filename || !filename.endsWith('.json'))
            return;
        if (isReloading)
            return;
        console.log(`[HotReloadWatcher] Detected change: ${filename}`);
        const catalogMap = {
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
                (0, ContentManager_1.reloadCatalog)(catalog);
            }
            finally {
                isReloading = false;
            }
        }
    });
    watcher.on('error', (err) => {
        console.error('[HotReloadWatcher] Watcher error:', err);
    });
    console.log('[HotReloadWatcher] Started watching content/ directory');
}
function stopWatcher() {
    if (watcher) {
        watcher.close();
        watcher = null;
        console.log('[HotReloadWatcher] Stopped');
    }
}
function manualReload() {
    if (isReloading) {
        return { success: false, message: 'Reload already in progress' };
    }
    try {
        isReloading = true;
        (0, ContentManager_1.reloadAll)();
        return { success: true, message: 'All catalogs reloaded successfully' };
    }
    catch (err) {
        return { success: false, message: `Reload failed: ${err}` };
    }
    finally {
        isReloading = false;
    }
}
//# sourceMappingURL=HotReloadWatcher.js.map