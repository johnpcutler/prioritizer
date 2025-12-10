import { APP_STATE_KEY, STORAGE_KEY } from '../models/constants.js';
import { initializeBuckets, normalizeBuckets, updateBuckets } from '../models/buckets.js';
import { STAGE_ORDER, STAGE_CONTROLLER } from '../models/stages.js';
import { normalizeItem, recomputeItemMetrics } from '../models/items.js';

// State Store (Redux-like pattern)
export const Store = {
    state: null,
    subscribers: [],
    
    init() {
        Store.state = Store.load();
        return Store.state;
    },
    
    load() {
        const stored = localStorage.getItem(APP_STATE_KEY);
        let state;
        
        if (stored) {
            state = JSON.parse(stored);
            
            // Migrate entryStage to currentStage if needed
            if (state.entryStage && !state.currentStage) {
                state.currentStage = state.entryStage;
                delete state.entryStage;
            }
            
            // Ensure currentStage is valid
            if (!state.currentStage || !STAGE_ORDER.includes(state.currentStage)) {
                state.currentStage = 'Item Listing';
            }
        } else {
            state = {
                currentStage: 'Item Listing',
                visitedStages: ['Item Listing'],
                buckets: initializeBuckets(),
                locked: true
            };
        }
        
        // Initialize visitedStages if it doesn't exist (migration for existing appState)
        if (!state.visitedStages || !Array.isArray(state.visitedStages)) {
            // If we have a currentStage, assume it and all previous stages have been visited
            const currentIndex = STAGE_ORDER.indexOf(state.currentStage);
            if (currentIndex >= 0) {
                state.visitedStages = STAGE_ORDER.slice(0, currentIndex + 1);
            } else {
                state.visitedStages = ['Item Listing'];
            }
        }
        
        // Ensure locked property exists
        if (state.locked === undefined || state.locked === null) {
            state.locked = true;
        }
        
        // Normalize buckets
        state.buckets = normalizeBuckets(state.buckets);
        
        // Migrate items and update buckets
        const items = Store.loadItems();
        state = updateBuckets(state, items);
        
        // Recompute item metrics for existing items
        items.forEach(item => {
            normalizeItem(item);
            recomputeItemMetrics(item, state.buckets);
        });
        Store.saveItems(items);
        
        return state;
    },
    
    save(state) {
        Store.state = state;
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
        Store.notifySubscribers();
    },
    
    update(mutator) {
        if (!Store.state) {
            Store.state = Store.load();
        }
        mutator(Store.state);
        Store.save(Store.state);
    },
    
    subscribe(callback) {
        Store.subscribers.push(callback);
    },
    
    notifySubscribers() {
        Store.subscribers.forEach(callback => callback(Store.state));
    },
    
    loadItems() {
        const stored = localStorage.getItem(STORAGE_KEY);
        const items = stored ? JSON.parse(stored) : [];
        const normalizedItems = items.map(item => normalizeItem(item));
        
        // Fix duplicate IDs - ensure all items have unique IDs
        const idMap = new Map();
        const fixedItems = normalizedItems.map(item => {
            if (idMap.has(item.id)) {
                // Generate new unique ID for duplicate
                const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                item.id = newId;
            }
            idMap.set(item.id, true);
            return item;
        });
        
        // Save fixed items if any duplicates were found
        if (fixedItems.length !== normalizedItems.length || fixedItems.some((item, idx) => item.id !== normalizedItems[idx].id)) {
            Store.saveItems(fixedItems);
        }
        
        return fixedItems;
    },
    
    saveItems(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    },
    
    getAppState() {
        // Always reload from storage to get fresh state (don't cache)
        Store.state = Store.load();
        return Store.state;
    },
    
    getItems() {
        return Store.loadItems();
    },
    
    clearCache() {
        Store.state = null;
    }
};

// Legacy functions for backward compatibility
export function getAppState() {
    return Store.getAppState();
}

export function saveAppState(state) {
    Store.save(state);
}

export function getItems() {
    return Store.getItems();
}

export function saveItems(items) {
    Store.saveItems(items);
}

// Ensure buckets exist and are normalized
export function ensureBuckets(state) {
    if (!state.buckets) {
        state.buckets = initializeBuckets();
    } else {
        state.buckets = normalizeBuckets(state.buckets);
    }
}

// Persist and refresh (updates buckets and saves)
export function persistAndRefresh(appState, items = null) {
    if (items === null) {
        items = Store.getItems();
    }
    updateBuckets(appState, items);
    Store.save(appState);
    return appState;
}

