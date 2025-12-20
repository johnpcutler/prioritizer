// Migrator - Versioned schema migrations and normalization
// Handles all data transformations and migrations

import { STAGE_ORDER } from '../../models/stages.js';
import { initializeBuckets, normalizeBuckets } from '../../models/buckets.js';
import { normalizeItem, recomputeItemMetrics } from '../../models/items.js';
import { updateBuckets } from '../../models/buckets.js';

/**
 * Migrator handles versioned schema migrations and data normalization.
 * This separates migration logic from state management and persistence.
 */
export const Migrator = {
    /**
     * Current schema version
     */
    currentVersion: 1,
    
    /**
     * Default state structure
     */
    getDefaultState() {
        return {
            currentStage: 'Item Listing',
            visitedStages: ['Item Listing'],
            buckets: initializeBuckets(),
            locked: true,
            resultsManuallyReordered: false,
            confidenceWeights: {
                1: 0.30,
                2: 0.50,
                3: 0.70,
                4: 0.90
            },
            confidenceLevelLabels: {
                1: "Not Confident (rarely, unlikely, low probability)",
                2: "Somewhat Confident (maybe, possibly, moderate probability)",
                3: "Confident (likely, probably, high probability)",
                4: "Very Confident (almost certainly, almost always, certainly)"
            }
        };
    },
    
    /**
     * Migrate state from old schema versions to current
     * @param {Object} state - State object to migrate
     * @param {number} fromVersion - Version to migrate from (optional, auto-detect)
     * @param {number} toVersion - Version to migrate to (defaults to currentVersion)
     * @returns {Object} Migrated state
     */
    migrate(state, fromVersion = null, toVersion = Migrator.currentVersion) {
        if (!state) {
            return Migrator.getDefaultState();
        }
        
        // Detect version if not provided
        if (fromVersion === null) {
            fromVersion = state._version || 0;
        }
        
        // If already at target version, just normalize
        if (fromVersion >= toVersion) {
            return Migrator.normalizeState(state);
        }
        
        // Apply migrations in order
        let migratedState = { ...state };
        
        // Migration 0 → 1: entryStage → currentStage
        if (fromVersion < 1) {
            if (migratedState.entryStage && !migratedState.currentStage) {
                migratedState.currentStage = migratedState.entryStage;
                delete migratedState.entryStage;
            }
        }
        
        // Set version
        migratedState._version = toVersion;
        
        // Normalize after migration
        return Migrator.normalizeState(migratedState);
    },
    
    /**
     * Normalize state structure (ensure all required properties exist)
     * @param {Object} state - State object to normalize
     * @returns {Object} Normalized state
     */
    normalizeState(state) {
        if (!state) {
            return Migrator.getDefaultState();
        }
        
        const normalized = { ...state };
        
        // Ensure currentStage is valid
        if (!normalized.currentStage || !STAGE_ORDER.includes(normalized.currentStage)) {
            normalized.currentStage = 'Item Listing';
        }
        
        // Initialize visitedStages if it doesn't exist
        if (!normalized.visitedStages || !Array.isArray(normalized.visitedStages)) {
            const currentIndex = STAGE_ORDER.indexOf(normalized.currentStage);
            if (currentIndex >= 0) {
                normalized.visitedStages = STAGE_ORDER.slice(0, currentIndex + 1);
            } else {
                normalized.visitedStages = ['Item Listing'];
            }
        }
        
        // Ensure locked property exists
        if (normalized.locked === undefined || normalized.locked === null) {
            normalized.locked = true;
        }
        
        // Ensure resultsManuallyReordered property exists
        if (normalized.resultsManuallyReordered === undefined || normalized.resultsManuallyReordered === null) {
            normalized.resultsManuallyReordered = false;
        }
        
        // Initialize confidence weights if missing
        if (!normalized.confidenceWeights) {
            normalized.confidenceWeights = {
                1: 0.30,
                2: 0.50,
                3: 0.70,
                4: 0.90
            };
        }
        
        // Initialize confidence level labels if missing
        if (!normalized.confidenceLevelLabels) {
            normalized.confidenceLevelLabels = {
                1: "Not Confident (rarely, unlikely, low probability)",
                2: "Somewhat Confident (maybe, possibly, moderate probability)",
                3: "Confident (likely, probably, high probability)",
                4: "Very Confident (almost certainly, almost always, certainly)"
            };
        }
        
        // Normalize buckets
        normalized.buckets = normalizeBuckets(normalized.buckets);
        
        return normalized;
    },
    
    /**
     * Normalize items array
     * @param {Array} items - Items array to normalize
     * @param {Object} state - Current state (for bucket updates)
     * @returns {Array} Normalized items array
     */
    normalizeItems(items, state) {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        
        // Normalize each item
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
        
        // Recompute item metrics if state is provided
        if (state && state.buckets) {
            fixedItems.forEach(item => {
                recomputeItemMetrics(item, state.buckets);
            });
        }
        
        return fixedItems;
    },
    
    /**
     * Normalize state and items together (updates buckets based on items)
     * @param {Object} state - State object
     * @param {Array} items - Items array
     * @returns {Object} Object with normalized state and items
     */
    normalize(state, items) {
        // First normalize state
        const normalizedState = Migrator.normalizeState(state);
        
        // Then normalize items
        const normalizedItems = Migrator.normalizeItems(items, normalizedState);
        
        // Update buckets based on items
        const finalState = updateBuckets(normalizedState, normalizedItems);
        
        return {
            state: finalState,
            items: normalizedItems
        };
    }
};

