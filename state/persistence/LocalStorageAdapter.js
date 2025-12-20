// LocalStorageAdapter - localStorage persistence adapter
// Handles only localStorage operations, no state management or migration

import { APP_STATE_KEY, STORAGE_KEY } from '../../models/constants.js';

/**
 * LocalStorageAdapter provides localStorage persistence operations.
 * This is a concrete implementation that can be swapped for other adapters
 * (URL adapter, server adapter, etc.)
 */
export const LocalStorageAdapter = {
    /**
     * Load application state from localStorage
     * @returns {Object|null} Parsed state object or null if not found
     */
    loadState() {
        try {
            const stored = localStorage.getItem(APP_STATE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error loading state from localStorage:', error);
            return null;
        }
    },
    
    /**
     * Save application state to localStorage
     * @param {Object} state - State object to save
     */
    saveState(state) {
        try {
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving state to localStorage:', error);
            throw error;
        }
    },
    
    /**
     * Load items from localStorage
     * @returns {Array} Parsed items array or empty array if not found
     */
    loadItems() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading items from localStorage:', error);
            return [];
        }
    },
    
    /**
     * Save items to localStorage
     * @param {Array} items - Items array to save
     */
    saveItems(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Error saving items to localStorage:', error);
            throw error;
        }
    },
    
    /**
     * Clear all data from localStorage
     */
    clear() {
        try {
            localStorage.removeItem(APP_STATE_KEY);
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    },
    
    /**
     * Clear only items from localStorage
     */
    clearItems() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing items from localStorage:', error);
        }
    },
    
    /**
     * Clear only state from localStorage
     */
    clearState() {
        try {
            localStorage.removeItem(APP_STATE_KEY);
        } catch (error) {
            console.error('Error clearing state from localStorage:', error);
        }
    }
};

