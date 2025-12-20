// Example: How to swap persistence adapters
// This demonstrates that the persistence layer can be swapped

import { Persistence } from './index.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

/**
 * Example: Mock adapter for testing or URL-based persistence
 */
const MockAdapter = {
    _state: null,
    _items: [],
    
    loadState() {
        return this._state;
    },
    
    saveState(state) {
        this._state = state;
        console.log('MockAdapter: State saved', state);
    },
    
    loadItems() {
        return this._items;
    },
    
    saveItems(items) {
        this._items = items;
        console.log('MockAdapter: Items saved', items.length, 'items');
    },
    
    clear() {
        this._state = null;
        this._items = [];
    },
    
    clearItems() {
        this._items = [];
    },
    
    clearState() {
        this._state = null;
    }
};

/**
 * Example: URL-based adapter (for URL state sharing)
 */
const URLAdapter = {
    loadState() {
        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        if (stateParam) {
            try {
                return JSON.parse(decodeURIComponent(stateParam));
            } catch (e) {
                console.error('Error parsing URL state:', e);
                return null;
            }
        }
        return null;
    },
    
    saveState(state) {
        const encoded = encodeURIComponent(JSON.stringify(state));
        const url = new URL(window.location);
        url.searchParams.set('state', encoded);
        window.history.replaceState({}, '', url);
    },
    
    loadItems() {
        // Items could be in state or separate param
        return [];
    },
    
    saveItems(items) {
        // Items could be saved to state or separate param
    },
    
    clear() {
        const url = new URL(window.location);
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url);
    },
    
    clearItems() {
        // Clear items from URL
    },
    
    clearState() {
        this.clear();
    }
};

// Example usage:
// Persistence.setAdapter(MockAdapter);  // Use mock for testing
// Persistence.setAdapter(URLAdapter);   // Use URL for sharing
// Persistence.setAdapter(LocalStorageAdapter); // Back to localStorage (default)

export { MockAdapter, URLAdapter };

