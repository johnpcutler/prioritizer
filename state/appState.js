import { updateBuckets, initializeBuckets, normalizeBuckets } from '../models/buckets.js';
import { StateStore } from './StateStore.js';
import { Persistence } from './persistence/index.js';
import { Migrator } from './migration/Migrator.js';

/**
 * Store - Facade for state management, persistence, and migration
 * Maintains backward-compatible API while using separated concerns internally
 */
export const Store = {
    /**
     * Reload policy: 'always', 'on-demand', or 'never'
     * 'always' - Reload on every getAppState() call (old behavior)
     * 'on-demand' - Cache reads, use reload() for explicit reloads (new default)
     * 'never' - Never reload, only on init
     */
    reloadPolicy: 'on-demand',
    
    /**
     * Initialize Store: Load from persistence, migrate, normalize, and set in StateStore
     */
    init() {
        const rawState = Persistence.loadState();
        const rawItems = Persistence.loadItems();
        
        // Normalize state and items together (handles bucket updates)
        const { state, items } = Migrator.normalize(rawState, rawItems);
        
        // Initialize StateStore with normalized data
        StateStore.init(state, items);
        
        // Save normalized items back if they were fixed
        Persistence.saveItems(items);
        
        return StateStore.getState();
    },
    
    /**
     * Load state and items (used internally, public for backward compatibility)
     * @deprecated Use init() or reload() instead
     */
    load() {
        const rawState = Persistence.loadState();
        const rawItems = Persistence.loadItems();
        const { state, items } = Migrator.normalize(rawState, rawItems);
        return state;
    },
    
    /**
     * Save state to StateStore and persistence
     * @param {Object} state - State object to save
     */
    save(state) {
        StateStore.setState(state);
        Persistence.saveState(state);
    },
    
    /**
     * Update state using a mutator function
     * @param {Function} mutator - Function that mutates state: (state) => { state.prop = value; }
     */
    update(mutator) {
        StateStore.updateState(mutator);
        Persistence.saveState(StateStore.getState());
    },
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function called when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        return StateStore.subscribe(callback);
    },
    
    /**
     * Notify subscribers (delegates to StateStore)
     */
    notifySubscribers() {
        StateStore.notifySubscribers();
    },
    
    /**
     * Load items from persistence and normalize
     * @returns {Array} Normalized items array
     */
    loadItems() {
        const rawItems = Persistence.loadItems();
        const state = StateStore.getState();
        return Migrator.normalizeItems(rawItems, state);
    },
    
    /**
     * Save items to StateStore and persistence
     * @param {Array} items - Items array to save
     */
    saveItems(items) {
        StateStore.setItems(items);
        Persistence.saveItems(items);
    },
    
    /**
     * Get application state (cached by default, or reload based on policy)
     * @returns {Object} Current application state
     */
    getAppState() {
        if (Store.reloadPolicy === 'always') {
            Store.reload();
        }
        return StateStore.getState();
    },
    
    /**
     * Get items (cached by default, or reload based on policy)
     * @returns {Array} Current items array
     */
    getItems() {
        if (Store.reloadPolicy === 'always') {
            Store.reload();
        }
        return StateStore.getItems();
    },
    
    /**
     * Explicitly reload state and items from persistence
     * Use this when you need fresh data (e.g., after external changes)
     */
    reload() {
        const rawState = Persistence.loadState();
        const rawItems = Persistence.loadItems();
        const { state, items } = Migrator.normalize(rawState, rawItems);
        
        StateStore.setState(state);
        StateStore.setItems(items);
        
        // Save normalized items back if they were fixed
        Persistence.saveItems(items);
    },
    
    /**
     * Clear cache (invalidate StateStore)
     */
    clearCache() {
        StateStore.clear();
    },
    
    /**
     * Get current state reference (for backward compatibility)
     * @deprecated Use getAppState() instead
     */
    get state() {
        return StateStore.getState();
    },
    
    /**
     * Set state (for backward compatibility)
     * @deprecated Use save() or setState() instead
     */
    set state(value) {
        StateStore.setState(value);
    },
    
    /**
     * Get subscribers (for backward compatibility)
     * @deprecated Use subscribe() instead
     */
    get subscribers() {
        return StateStore.subscribers;
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
        items = StateStore.getItems();
    }
    // Update buckets based on items
    const updatedState = updateBuckets(appState, items);
    // Save both state and items
    StateStore.setState(updatedState);
    StateStore.setItems(items);
    Persistence.saveState(updatedState);
    Persistence.saveItems(items);
    return updatedState;
}

