// Persistence abstraction layer
// Provides a unified interface for persistence operations
// Can swap adapters (localStorage, URL, server, etc.)

import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { Migrator } from '../migration/Migrator.js';

/**
 * Persistence provides a unified interface for persistence operations.
 * It wraps a concrete adapter (currently LocalStorageAdapter) and handles
 * migration on load.
 */
export const Persistence = {
    /**
     * Current adapter (can be swapped)
     */
    adapter: LocalStorageAdapter,
    
    /**
     * Set a new persistence adapter
     * @param {Object} adapter - Adapter object with loadState, saveState, loadItems, saveItems methods
     */
    setAdapter(adapter) {
        Persistence.adapter = adapter;
    },
    
    /**
     * Load state from persistence and migrate it
     * @returns {Object} Migrated and normalized state
     */
    loadState() {
        const rawState = Persistence.adapter.loadState();
        return Migrator.migrate(rawState);
    },
    
    /**
     * Save state to persistence
     * @param {Object} state - State object to save
     */
    saveState(state) {
        Persistence.adapter.saveState(state);
    },
    
    /**
     * Load items from persistence
     * @returns {Array} Items array
     */
    loadItems() {
        return Persistence.adapter.loadItems();
    },
    
    /**
     * Save items to persistence
     * @param {Array} items - Items array to save
     */
    saveItems(items) {
        Persistence.adapter.saveItems(items);
    },
    
    /**
     * Clear all data from persistence
     */
    clear() {
        Persistence.adapter.clear();
    },
    
    /**
     * Clear only items from persistence
     */
    clearItems() {
        Persistence.adapter.clearItems();
    },
    
    /**
     * Clear only state from persistence
     */
    clearState() {
        Persistence.adapter.clearState();
    }
};

