import { CATEGORIES, LEVELS } from './constants.js';
import { FIELD_VALIDATORS } from './buckets.js';
import { Store, ensureBuckets, persistAndRefresh } from '../state/appState.js';
import { recalculateAllCostOfDelay, recalculateAllCD3 } from './items.js';

// This will be injected from app.js to avoid circular dependency
let recalcFunctions = null;

export function setRecalcFunctions(fns) {
    recalcFunctions = fns;
}

// Generic Bucket Actions - replaces individual setter functions
export const BucketActions = {
    setLimit: (category, level, value) => {
        return updateBucketField(category, level, 'limit', value);
    },
    
    setWeight: (category, level, value) => {
        return updateBucketField(category, level, 'weight', value);
    },
    
    setTitle: (category, level, value) => {
        return updateBucketField(category, level, 'title', value);
    },
    
    setDescription: (category, level, value) => {
        return updateBucketField(category, level, 'description', value);
    }
};

// Unified bucket field update function
function updateBucketField(category, level, field, value) {
    // Validate category and level
    if (!CATEGORIES.includes(category)) {
        return { success: false, error: `Invalid category: ${category}` };
    }
    if (!LEVELS.includes(level)) {
        return { success: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
    }
    
    // Validate field value using validators
    const validator = FIELD_VALIDATORS[field];
    if (!validator) {
        return { success: false, error: `Invalid field: ${field}` };
    }
    
    const validation = validator(value);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }
    
    // Get app state and ensure buckets exist
    const appState = Store.getAppState();
    ensureBuckets(appState);
    
    // Update the field (use processed value if validator provided one)
    appState.buckets[category][level][field] = validation.processed !== undefined ? validation.processed : value;
    
    // If updating limit, we need to recalculate over-limits
    const needsRecalc = field === 'limit';
    
    // If updating weight, recalculate dependent values for all items
    let recalculatedItems = null;
    if (field === 'weight' && recalcFunctions) {
        if (category === 'urgency' || category === 'value') {
            recalculatedItems = recalcFunctions.recalculateAllCostOfDelay(appState.buckets);
        } else if (category === 'duration') {
            recalculatedItems = recalcFunctions.recalculateAllCD3(appState.buckets);
        }
    }
    
    // Persist and refresh
    persistAndRefresh(appState, recalculatedItems || (needsRecalc ? Store.getItems() : null));
    
    return { success: true };
}

