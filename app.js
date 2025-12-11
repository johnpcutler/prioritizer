// ============================================================================
// REFACTORED APP.JS - Using Modular Architecture
// ============================================================================

// Import modules
import { CATEGORIES, LEVELS, PROPERTY_META, STORAGE_KEY, APP_STATE_KEY } from './models/constants.js';
import { BUCKET_DEFAULTS, FIELD_VALIDATORS, initializeBuckets, normalizeBuckets, updateBuckets, calculateBucketCounts } from './models/buckets.js';
import { STAGE_ORDER, STAGE_CONTROLLER, validateStage } from './models/stages.js';
import { Store, getAppState, saveAppState, getItems, saveItems, ensureBuckets, persistAndRefresh } from './state/appState.js';
import { 
    normalizeItem, 
    createItem, 
    calculateBoardPosition, 
    calculateCostOfDelay, 
    calculateCD3, 
    recomputeItemMetrics,
    updateItemProperty,
    validatePropertyPrerequisites,
    validatePropertyUnset,
    recalculateAllCostOfDelay,
    recalculateAllCD3,
    isValidUrl,
    removeItem as removeItemModel
} from './models/items.js';
import { BucketActions, setRecalcFunctions } from './models/bucketActions.js';
import { showForm, hideForm, renderFormField, escapeHtml } from './ui/forms.js';
import { displayJson, updateCurrentStageDisplay, updateLockedDisplay, updateStageNavigation, updateUrgencyView, updateValueView, updateDurationView, updateResultsView, updateItemListingView, resetResultsOrder, populateSettings } from './ui/display.js';
import { attachResultsViewListeners } from './events/listeners.js';

// Make functions available globally for event listeners
window.setItemProperty = null;
window.setItemActive = null;
window.setItemInactive = null;

// Initialize Store
Store.init();

// Set up recalculation functions for bucket actions
setRecalcFunctions({
    recalculateAllCostOfDelay: (buckets) => recalculateAllCostOfDelay(buckets, Store.getItems, Store.saveItems),
    recalculateAllCD3: (buckets) => recalculateAllCD3(buckets, Store.getItems, Store.saveItems)
});

// ============================================================================
// Reducer-Style Update Helper for Items
// ============================================================================

function updateItem(itemId, updater) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    updater(item);

    const appState = Store.getAppState();
    recomputeItemMetrics(item, appState.buckets);
    Store.saveItems(items);
    refreshApp();
    return { success: true };
}

// ============================================================================
// Item Operations
// ============================================================================

function addItem(name) {
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    if (currentStage !== 'Item Listing') {
        return {
            success: false,
            error: `Error: Cannot add item. Current stage is "${currentStage}". You must be on the "Item Listing" stage to add new items. Use "Back Stage" command to return to Item Listing stage.`
        };
    }
    
    const items = Store.getItems();
    const newItem = createItem(name);
    recomputeItemMetrics(newItem, appState.buckets);
    
    items.push(newItem);
    Store.saveItems(items);
    
    const appStateAfter = Store.getAppState();
    persistAndRefresh(appStateAfter, items);
    displayJson();
    updateStageNavigation();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function removeItem(itemId) {
    const items = Store.getItems();
    const result = removeItemModel(itemId, items);
    
    if (!result.success) {
        return result;
    }
    
    Store.saveItems(items);
    
    const appState = Store.getAppState();
    persistAndRefresh(appState, items);
    displayJson();
    updateStageNavigation();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function bulkAddItems(itemNamesText) {
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    if (currentStage !== 'Item Listing') {
        return {
            success: false,
            error: `Error: Cannot bulk add items. Current stage is "${currentStage}". You must be on the "Item Listing" stage to add new items. Use "Back Stage" command to return to Item Listing stage.`
        };
    }
    
    if (!itemNamesText || typeof itemNamesText !== 'string') {
        return {
            success: false,
            error: 'Error: Invalid input. Please provide item names separated by newlines.'
        };
    }
    
    const lines = itemNamesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (lines.length === 0) {
        return {
            success: false,
            error: 'Error: No valid item names found. Please enter at least one item name.'
        };
    }
    
    const items = Store.getItems();
    let added = 0;
    const errors = [];
    
    lines.forEach((line, index) => {
        // Parse line: "Item Name, https://example.com" or just "Item Name"
        let itemName = line;
        let itemLink = null;
        
        // Check if line contains a comma (potential separator for link)
        const commaIndex = line.lastIndexOf(',');
        if (commaIndex > 0) {
            // Split on last comma to handle item names that might contain commas
            const potentialName = line.substring(0, commaIndex).trim();
            const potentialLink = line.substring(commaIndex + 1).trim();
            
            // If the part after comma looks like a URL, treat it as a link
            if (potentialLink && isValidUrl(potentialLink)) {
                itemName = potentialName;
                itemLink = potentialLink;
            }
            // Otherwise, treat the whole line as the item name
        }
        
        if (itemName.length === 0) {
            errors.push(`Line ${index + 1}: Empty item name`);
            return;
        }
        
        const newItem = createItem(itemName, itemLink);
        recomputeItemMetrics(newItem, appState.buckets);
        items.push(newItem);
        added++;
    });
    
    Store.saveItems(items);
    const appStateAfter = Store.getAppState();
    persistAndRefresh(appStateAfter, items);
    displayJson();
    updateStageNavigation();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return {
        success: true,
        added: added,
        total: lines.length,
        errors: errors
    };
}

// Reducer-style item property setter
function setItemProperty(itemId, property, value) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    const meta = PROPERTY_META[property];
    if (!meta) {
        return { success: false, error: `Invalid property: ${property}` };
    }
    
    // Check current stage and locked setting
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const isLocked = appState.locked !== false;
    
    if (isLocked) {
        if (currentStage !== meta.stage) {
            return {
                success: false,
                error: `Error: Cannot set ${property.charAt(0).toUpperCase() + property.slice(1)}. Current stage is "${currentStage}". You must be on the "${meta.stage}" stage to set ${property} values. Use "Advance Stage" or "Back Stage" commands to navigate.`
            };
        }
    } else {
        const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
        const propertyStageIndex = STAGE_ORDER.indexOf(meta.stage);
        if (propertyStageIndex > currentStageIndex) {
            return {
                success: false,
                error: `Error: Cannot set ${property.charAt(0).toUpperCase() + property.slice(1)}. Current stage is "${currentStage}". You must be on the "${meta.stage}" stage or later to set ${property} values. Use "Advance Stage" command to navigate.`
            };
        }
    }
    
    // Use unified update function
    const result = updateItemProperty(item, property, value, appState.buckets);
    if (!result.valid) {
        return { success: false, error: result.error };
    }
    
    Store.saveItems(items);
    persistAndRefresh(appState, items);
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function setItemActive(itemId) {
    return updateItem(itemId, (item) => {
        item.active = true;
    });
}

function setItemInactive(itemId) {
    return updateItem(itemId, (item) => {
        item.active = false;
    });
}

// ============================================================================
// Stage Operations
// ============================================================================

// Navigate to a specific stage
function navigateToStage(targetStage) {
    const appState = Store.getAppState();
    const items = Store.getItems();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const visitedStages = appState.visitedStages || ['Item Listing'];
    
    // Use navigation function to validate and update visitedStages
    const navigationResult = STAGE_CONTROLLER.navigateToStage(targetStage, currentStage, visitedStages, items);
    
    if (!navigationResult.success) {
        return {
            success: false,
            error: navigationResult.error || 'Cannot navigate to this stage'
        };
    }
    
    // Update stage and visitedStages
    STAGE_CONTROLLER.setCurrentStage(appState, targetStage);
    if (navigationResult.visitedStages) {
        appState.visitedStages = navigationResult.visitedStages;
    }
    Store.save(appState);
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function advanceStage() {
    const appState = Store.getAppState();
    const items = Store.getItems();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    const validation = STAGE_CONTROLLER.canAdvance(currentStage, items);
    if (!validation.canAdvance) {
        return {
            success: false,
            error: `Error: Cannot advance stage. ${validation.reason}`
        };
    }
    
    const nextStage = STAGE_CONTROLLER.getNextStage(currentStage);
    if (!nextStage) {
        return {
            success: false,
            error: 'Error: Already at the final stage (CD3). Cannot advance further.'
        };
    }
    
    STAGE_CONTROLLER.setCurrentStage(appState, nextStage);
    Store.save(appState);
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function backStage() {
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    const canGoBackResult = STAGE_CONTROLLER.canGoBack(currentStage);
    if (!canGoBackResult.canGoBack) {
        return {
            success: false,
            error: `Error: Already at the first stage (Item Listing). Cannot go back further.`
        };
    }
    
    const previousStage = STAGE_CONTROLLER.getPreviousStage(currentStage);
    STAGE_CONTROLLER.setCurrentStage(appState, previousStage);
    Store.save(appState);
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    
    return { success: true };
}

function setCurrentStage(stage) {
    if (!STAGE_ORDER.includes(stage)) {
        return {
            success: false,
            error: `Invalid stage: ${stage}. Must be one of: ${STAGE_ORDER.join(', ')}`
        };
    }
    
    const items = Store.getItems();
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const visitedStages = appState.visitedStages || ['Item Listing'];
    
    // Use navigation function to validate and update visitedStages
    const navigationResult = STAGE_CONTROLLER.navigateToStage(stage, currentStage, visitedStages, items);
    
    if (!navigationResult.success) {
        return {
            success: false,
            error: navigationResult.error || 'Cannot navigate to this stage'
        };
    }
    
    // Update stage and visitedStages
    STAGE_CONTROLLER.setCurrentStage(appState, stage);
    if (navigationResult.visitedStages) {
        appState.visitedStages = navigationResult.visitedStages;
    }
    Store.save(appState);
    displayJson();
    
    return { success: true };
}

// ============================================================================
// Bucket Operations (using generic BucketActions)
// ============================================================================

function setUrgencyLimit(level, limit) {
    return BucketActions.setLimit('urgency', level, limit);
}

function setValueLimit(level, limit) {
    return BucketActions.setLimit('value', level, limit);
}

function setUrgencyWeight(level, weight) {
    return BucketActions.setWeight('urgency', level, weight);
}

function setValueWeight(level, weight) {
    return BucketActions.setWeight('value', level, weight);
}

function setDurationWeight(level, weight) {
    return BucketActions.setWeight('duration', level, weight);
}

function setUrgencyTitle(level, title) {
    return BucketActions.setTitle('urgency', level, title);
}

function setUrgencyDescription(level, description) {
    return BucketActions.setDescription('urgency', level, description);
}

function setValueTitle(level, title) {
    return BucketActions.setTitle('value', level, title);
}

function setValueDescription(level, description) {
    return BucketActions.setDescription('value', level, description);
}

function setDurationTitle(level, title) {
    return BucketActions.setTitle('duration', level, title);
}

function setDurationDescription(level, description) {
    return BucketActions.setDescription('duration', level, description);
}

// ============================================================================
// App Lifecycle
// ============================================================================

function startApp() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(APP_STATE_KEY);
    
    const appState = {
        currentStage: 'Item Listing',
        buckets: initializeBuckets(),
        locked: true
    };
    Store.save(appState);
    
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    
    console.log('App started - all data cleared');
}

function clearItemDataOnly() {
    // Clear items but preserve settings
    localStorage.removeItem(STORAGE_KEY);
    
    // Get current app state
    const appState = Store.getAppState();
    if (appState) {
        // Reset stage and visited stages, but keep buckets
        appState.currentStage = 'Item Listing';
        appState.visitedStages = ['Item Listing'];
        Store.save(appState);
    } else {
        // If no state exists, create minimal state with current buckets
        const newState = {
            currentStage: 'Item Listing',
            buckets: initializeBuckets(),
            locked: true,
            visitedStages: ['Item Listing']
        };
        Store.save(newState);
    }
    
    // Refresh UI
    populateSettings();
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    console.log('Item data cleared, settings preserved');
}

function clearAllData(clearSettings = false) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(APP_STATE_KEY);
    
    // Reinitialize app state
    const appState = {
        currentStage: 'Item Listing',
        buckets: clearSettings ? initializeBuckets() : (Store.getAppState()?.buckets || initializeBuckets()),
        locked: true,
        visitedStages: ['Item Listing']
    };
    Store.save(appState);
    
    // Refresh UI
    populateSettings();
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    console.log('All data cleared');
}

// ============================================================================
// Declarative Command System
// ============================================================================

const COMMANDS = {
    startApp: {
        fields: [],
        handler: () => {
            startApp();
            return true;
        }
    },
    advanceStage: {
        fields: [],
        handler: () => {
            const result = advanceStage();
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    backStage: {
        fields: [],
        handler: () => {
            const result = backStage();
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    addItem: {
        fields: [
            { name: 'name', label: 'Item Name', type: 'text', required: true, placeholder: 'Enter item name' }
        ],
        handler: (formData) => {
            const result = addItem(formData.name);
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    bulkAddItems: {
        fields: [
            { name: 'itemNames', label: 'Item Names (one per line)', type: 'textarea', required: true, placeholder: 'Enter item names, one per line:\nItem 1\nItem 2\nItem 3' }
        ],
        handler: (formData) => {
            const result = bulkAddItems(formData.itemNames);
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    setBucketField: {
        fields: [
            { name: 'category', label: 'Category', type: 'select', required: true, options: () => CATEGORIES.map(c => ({ value: c, label: c })) },
            { name: 'level', label: 'Level', type: 'select', required: true, options: () => LEVELS.map(l => ({ value: l.toString(), label: l.toString() })) },
            { name: 'field', label: 'Field', type: 'select', required: true, options: () => ['limit', 'weight', 'title', 'description'].map(f => ({ value: f, label: f })) },
            { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Enter value' }
        ],
        handler: (formData) => {
            const category = formData.category;
            const level = parseInt(formData.level);
            const field = formData.field;
            let value = formData.value;
            
            // Parse value based on field type
            if (field === 'limit' || field === 'weight') {
                value = field === 'limit' ? parseInt(value) : parseFloat(value);
            }
            
            let result;
            if (field === 'limit') {
                result = BucketActions.setLimit(category, level, value);
            } else if (field === 'weight') {
                result = BucketActions.setWeight(category, level, value);
            } else if (field === 'title') {
                result = BucketActions.setTitle(category, level, value);
            } else if (field === 'description') {
                result = BucketActions.setDescription(category, level, value);
            } else {
                alert('Invalid field');
                return false;
            }
            
            if (!result.success) {
                alert(result.error);
                return false;
            }
            
            displayJson();
            return true;
        }
    },
    setUrgency: {
        fields: [
            { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
            { name: 'urgency', label: 'Urgency', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
        ],
        handler: (formData) => {
            const result = setItemProperty(formData.itemId, 'urgency', parseInt(formData.urgency));
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    setValue: {
        fields: [
            { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
            { name: 'value', label: 'Value', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
        ],
        handler: (formData) => {
            const result = setItemProperty(formData.itemId, 'value', parseInt(formData.value));
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    setDuration: {
        fields: [
            { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
            { name: 'duration', label: 'Duration', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
        ],
        handler: (formData) => {
            const result = setItemProperty(formData.itemId, 'duration', parseInt(formData.duration));
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    setItemActive: {
        fields: [
            { name: 'itemId', label: 'Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: `${item.name} (${item.active !== false ? 'Active' : 'Inactive'})` })) }
        ],
        handler: (formData) => {
            const result = setItemActive(formData.itemId);
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    },
    setItemInactive: {
        fields: [
            { name: 'itemId', label: 'Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: `${item.name} (${item.active !== false ? 'Active' : 'Inactive'})` })) }
        ],
        handler: (formData) => {
            const result = setItemInactive(formData.itemId);
            if (!result.success) {
                alert(result.error);
                return false;
            }
            return true;
        }
    }
};

// Legacy command forms for backward compatibility
const COMMAND_FORMS = {
    ...COMMANDS,
    // Keep individual bucket commands for backward compatibility
    setUrgencyLimit: {
        fields: [
            { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'limit', label: 'New Limit', type: 'number', required: true, placeholder: 'Enter limit (e.g., 30)', min: 0 }
        ],
        handler: (formData) => {
            const result = setUrgencyLimit(parseInt(formData.urgencyLevel), parseInt(formData.limit));
            return result.success;
        }
    },
    setValueLimit: {
        fields: [
            { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'limit', label: 'New Limit', type: 'number', required: true, placeholder: 'Enter limit (e.g., 30)', min: 0 }
        ],
        handler: (formData) => {
            const result = setValueLimit(parseInt(formData.valueLevel), parseInt(formData.limit));
            return result.success;
        }
    },
    setUrgencyWeight: {
        fields: [
            { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
        ],
        handler: (formData) => {
            const result = setUrgencyWeight(parseInt(formData.urgencyLevel), parseFloat(formData.weight));
            return result.success;
        }
    },
    setValueWeight: {
        fields: [
            { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
        ],
        handler: (formData) => {
            const result = setValueWeight(parseInt(formData.valueLevel), parseFloat(formData.weight));
            return result.success;
        }
    },
    setDurationWeight: {
        fields: [
            { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
        ],
        handler: (formData) => {
            const result = setDurationWeight(parseInt(formData.durationLevel), parseFloat(formData.weight));
            return result.success;
        }
    },
    setUrgencyTitle: {
        fields: [
            { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., WHENEVER)' }
        ],
        handler: (formData) => {
            const result = setUrgencyTitle(parseInt(formData.urgencyLevel), formData.title);
            return result.success;
        }
    },
    setUrgencyDescription: {
        fields: [
            { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
        ],
        handler: (formData) => {
            const result = setUrgencyDescription(parseInt(formData.urgencyLevel), formData.description);
            return result.success;
        }
    },
    setValueTitle: {
        fields: [
            { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., MEH)' }
        ],
        handler: (formData) => {
            const result = setValueTitle(parseInt(formData.valueLevel), formData.title);
            return result.success;
        }
    },
    setValueDescription: {
        fields: [
            { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
        ],
        handler: (formData) => {
            const result = setValueDescription(parseInt(formData.valueLevel), formData.description);
            return result.success;
        }
    },
    setDurationTitle: {
        fields: [
            { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., 1-3d)' }
        ],
        handler: (formData) => {
            const result = setDurationTitle(parseInt(formData.durationLevel), formData.title);
            return result.success;
        }
    },
    setDurationDescription: {
        fields: [
            { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
            { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
        ],
        handler: (formData) => {
            const result = setDurationDescription(parseInt(formData.durationLevel), formData.description);
            return result.success;
        }
    }
};

// ============================================================================
// UI Refresh Helper
// ============================================================================

function refreshApp() {
    displayJson();
    updateStageNavigation();
    updateLockedDisplay();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

function setupEventListeners() {
    // Helper function to hide all stage views
    const hideAllStageViews = () => {
        const views = [
            'itemListingViewSection',
            'urgencyViewSection',
            'valueViewSection',
            'durationViewSection',
            'resultsViewSection'
        ];
        views.forEach(viewId => {
            const view = document.getElementById(viewId);
            if (view) view.style.display = 'none';
        });
    };
    
    // Helper function to show current stage view
    const updateCurrentStageView = () => {
        const appState = Store.getAppState();
        const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
        
        // Hide all views first
        hideAllStageViews();
        
        // Show appropriate view based on current stage
        if (currentStage === 'Item Listing') {
            updateItemListingView();
        } else if (currentStage === 'urgency') {
            updateUrgencyView();
        } else if (currentStage === 'value') {
            updateValueView();
        } else if (currentStage === 'duration') {
            updateDurationView();
        } else if (currentStage === 'Results') {
            updateResultsView();
        }
    };
    
    // Helper function to toggle settings view
    const toggleSettingsView = (show) => {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsViewSection = document.getElementById('settingsViewSection');
        
        if (!settingsBtn || !settingsViewSection) return;
        
        if (show) {
            settingsViewSection.style.display = 'block';
            hideAllStageViews();
            settingsBtn.classList.add('active');
        } else {
            settingsViewSection.style.display = 'none';
            updateCurrentStageView();
            settingsBtn.classList.remove('active');
        }
    };
    
    // Settings button - toggle settings view
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsViewSection = document.getElementById('settingsViewSection');
    
    if (settingsBtn && settingsViewSection) {
        settingsBtn.addEventListener('click', () => {
            const isVisible = settingsViewSection.style.display !== 'none';
            toggleSettingsView(!isVisible);
        });
    }
    
    // Close settings button
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            toggleSettingsView(false);
        });
    }
    
    // Settings save buttons - use event delegation
    const settingsViewContent = document.querySelector('.settings-view-content');
    if (settingsViewContent) {
        settingsViewContent.addEventListener('click', (e) => {
            const saveBtn = e.target.closest('.settings-save-btn');
            if (!saveBtn) return;
            
            e.preventDefault();
            
            const category = saveBtn.getAttribute('data-category');
            const level = parseInt(saveBtn.getAttribute('data-level'));
            const type = saveBtn.getAttribute('data-type');
            
            let result;
            
            if (type === 'limit') {
                const input = document.getElementById(`${category}Limit${level}`);
                if (!input || !input.value) {
                    alert('Please enter a value');
                    return;
                }
                const value = parseInt(input.value);
                if (category === 'urgency') {
                    result = setUrgencyLimit(level, value);
                } else if (category === 'value') {
                    result = setValueLimit(level, value);
                }
            } else if (type === 'weight') {
                const input = document.getElementById(`${category}Weight${level}`);
                if (!input || !input.value) {
                    alert('Please enter a value');
                    return;
                }
                const value = parseFloat(input.value);
                if (category === 'urgency') {
                    result = setUrgencyWeight(level, value);
                } else if (category === 'value') {
                    result = setValueWeight(level, value);
                } else if (category === 'duration') {
                    result = setDurationWeight(level, value);
                }
            } else if (type === 'title') {
                const input = document.getElementById(`${category}Title${level}`);
                if (!input || !input.value.trim()) {
                    alert('Please enter a title');
                    return;
                }
                const value = input.value.trim();
                if (category === 'urgency') {
                    result = setUrgencyTitle(level, value);
                } else if (category === 'value') {
                    result = setValueTitle(level, value);
                }
            } else if (type === 'description') {
                const input = document.getElementById(`${category}Description${level}`);
                if (!input || !input.value.trim()) {
                    alert('Please enter a description');
                    return;
                }
                const value = input.value.trim();
                if (category === 'urgency') {
                    result = setUrgencyDescription(level, value);
                } else if (category === 'value') {
                    result = setValueDescription(level, value);
                }
            }
            
            if (result && result.success) {
                // Update settings display with new values
                populateSettings();
                displayJson();
                // Show brief feedback
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Saved!';
                saveBtn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.backgroundColor = '';
                }, 1000);
            } else if (result && result.error) {
                alert(result.error);
            }
        });
    }
    
    // Advance/Back stage buttons
    // Stage navigation - make stage steps clickable
    // Use event delegation on the parent container for dynamic updates
    const stageStepsContainer = document.querySelector('.stage-steps');
    if (stageStepsContainer) {
        stageStepsContainer.addEventListener('click', (e) => {
            const step = e.target.closest('.stage-step');
            if (step) {
                // Only attempt navigation if the step is clickable
                if (!step.classList.contains('clickable')) {
                    return; // Silently ignore - tooltip already explains why
                }
                
                const targetStage = step.getAttribute('data-stage');
                if (targetStage) {
                    const result = navigateToStage(targetStage);
                    // Navigation should only be attempted on clickable stages
                    // If it fails, it's a bug, not a user error
                    if (!result.success) {
                        console.warn('Navigation failed:', result.error);
                    }
                }
            }
        });
    }
    
    // Add Item button
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            const name = prompt('Enter item name:');
            if (name && name.trim()) {
                const result = addItem(name.trim());
                if (!result.success) {
                    alert(result.error);
                }
            }
        });
    }
    
    // Toggle Locked button
    const toggleLockedBtn = document.getElementById('toggleLockedBtn');
    if (toggleLockedBtn) {
        toggleLockedBtn.addEventListener('click', () => {
            const appState = Store.getAppState();
            appState.locked = !appState.locked;
            Store.save(appState);
            updateLockedDisplay();
            displayJson();
        });
    }
    
    // Clear Data button - show modal
    const clearDataBtn = document.getElementById('clearDataBtn');
    const clearDataModal = document.getElementById('clearDataModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSubmitBtn = document.getElementById('modalSubmitBtn');
    const clearDataOption = document.getElementById('clearDataOption');
    const clearDataConfirm = document.getElementById('clearDataConfirm');
    
    const showClearDataModal = () => {
        if (clearDataModal) {
            clearDataModal.style.display = 'flex';
            // Reset form
            if (clearDataOption) clearDataOption.value = 'itemsOnly';
            if (clearDataConfirm) {
                clearDataConfirm.value = '';
                clearDataConfirm.focus();
            }
            if (modalSubmitBtn) modalSubmitBtn.disabled = true;
        }
    };
    
    const hideClearDataModal = () => {
        if (clearDataModal) {
            clearDataModal.style.display = 'none';
        }
    };
    
    const validateClearDataInput = () => {
        if (clearDataConfirm && modalSubmitBtn) {
            const inputValue = clearDataConfirm.value.trim();
            modalSubmitBtn.disabled = inputValue !== 'Clear my data';
        }
    };
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', showClearDataModal);
    }
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideClearDataModal);
    }
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', hideClearDataModal);
    }
    
    // Close modal when clicking backdrop
    if (clearDataModal) {
        clearDataModal.addEventListener('click', (e) => {
            if (e.target === clearDataModal) {
                hideClearDataModal();
            }
        });
    }
    
    // Validate input as user types
    if (clearDataConfirm) {
        clearDataConfirm.addEventListener('input', validateClearDataInput);
    }
    
    // Handle submit
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', () => {
            const option = clearDataOption ? clearDataOption.value : 'itemsOnly';
            hideClearDataModal();
            
            if (option === 'itemsOnly') {
                clearItemDataOnly();
            } else {
                clearAllData(true);
            }
        });
    }
    
    // Item Listing Submit button
    const itemListingSubmitBtn = document.getElementById('itemListingSubmitBtn');
    if (itemListingSubmitBtn) {
        itemListingSubmitBtn.addEventListener('click', () => {
            const textarea = document.getElementById('itemListingTextarea');
            if (textarea) {
                const itemNamesText = textarea.value.trim();
                if (!itemNamesText) {
                    alert('Please enter at least one item name.');
                    return;
                }
                const result = bulkAddItems(itemNamesText);
                if (result.success) {
                    // Clear the textarea after successful add
                    textarea.value = '';
                    // View will update automatically via refreshApp
                } else {
                    alert(result.error);
                }
            }
        });
    }
    
    // Item remove buttons - use event delegation
    const itemListingViewSection = document.getElementById('itemListingViewSection');
    if (itemListingViewSection) {
        itemListingViewSection.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.item-remove-btn');
            if (!removeBtn) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const itemId = removeBtn.getAttribute('data-item-id');
            if (!itemId) return;
            
            const result = removeItem(itemId);
            if (!result.success) {
                alert(result.error || 'Failed to remove item');
            }
            // View will update automatically via removeItem function
        });
    }
    
    // Make functions globally available for event listeners
    window.setItemProperty = setItemProperty;
    window.setItemActive = setItemActive;
    window.setItemInactive = setItemInactive;
    
    // Attach listeners to urgency view items (they use the same button structure)
    function attachUrgencyViewListeners(setItemPropertyFn) {
        const urgencyViewSection = document.getElementById('urgencyViewSection');
        if (!urgencyViewSection) return;
        
        // Remove old listener if exists
        if (urgencyViewSection._urgencyViewHandler) {
            urgencyViewSection.removeEventListener('click', urgencyViewSection._urgencyViewHandler);
        }
        
        // Create new handler
        urgencyViewSection._urgencyViewHandler = function handleUrgencyViewClick(e) {
            // Find the button - e.target might be the button, a child element, or a text node
            let button = e.target;
            
            // Handle text nodes - get the parent element
            if (button.nodeType === Node.TEXT_NODE) {
                button = button.parentElement;
            }
            
            // If target is not a button, try to find the closest button ancestor
            if (!button || !button.classList || (!button.classList.contains('property-btn') && !button.classList.contains('urgency-quick-btn'))) {
                button = button ? (button.closest('.property-btn') || button.closest('.urgency-quick-btn')) : null;
            }
            
            if (!button) return;
            
            // Stop event propagation to prevent double handling
            e.stopPropagation();
            e.preventDefault();
            
            const itemId = button.getAttribute('data-item-id');
            const property = button.getAttribute('data-property');
            const action = button.getAttribute('data-action');
            
            if (!itemId || !property || !action) return;
            
            const items = Store.getItems();
            const item = items.find(i => i.id === itemId);
            if (!item) return;
            
            const currentValue = item[property] || 0;
            let newValue;
            
            if (action === 'increment') {
                newValue = Math.min(3, currentValue + 1);
            } else if (action === 'decrement') {
                newValue = Math.max(1, currentValue - 1);
            } else if (action === 'set') {
                const valueAttr = button.getAttribute('data-value');
                if (valueAttr) {
                    newValue = parseInt(valueAttr, 10);
                    if (isNaN(newValue) || newValue < 1 || newValue > 3) {
                        return;
                    }
                } else {
                    return;
                }
            } else {
                return;
            }
            
            if (newValue !== currentValue) {
                const result = setItemPropertyFn(itemId, property, newValue);
                if (!result.success) {
                    alert(result.error);
                }
            }
        };
        
        // Add new listener
        urgencyViewSection.addEventListener('click', urgencyViewSection._urgencyViewHandler);
    }
    
    // Attach urgency view listeners initially
    attachUrgencyViewListeners(setItemProperty);
    
    // Re-attach urgency view listeners after updateUrgencyView is called
    const originalUpdateUrgencyView = updateUrgencyView;
    window.updateUrgencyView = function() {
        originalUpdateUrgencyView();
        attachUrgencyViewListeners(setItemProperty);
    };
    
    // Attach listeners to value view items (they use the same button structure)
    function attachValueViewListeners(setItemPropertyFn) {
        const valueViewSection = document.getElementById('valueViewSection');
        if (!valueViewSection) return;
        
        // Remove old listener if exists
        if (valueViewSection._valueViewHandler) {
            valueViewSection.removeEventListener('click', valueViewSection._valueViewHandler);
        }
        
        // Create new handler
        valueViewSection._valueViewHandler = function handleValueViewClick(e) {
            // Find the button - e.target might be the button, a child element, or a text node
            let button = e.target;
            
            // Handle text nodes - get the parent element
            if (button.nodeType === Node.TEXT_NODE) {
                button = button.parentElement;
            }
            
            // If target is not a button, try to find the closest button ancestor
            if (!button || !button.classList || !button.classList.contains('property-btn')) {
                button = button ? button.closest('.property-btn') : null;
            }
            
            if (!button) return;
            
            // Stop event propagation to prevent double handling
            e.stopPropagation();
            e.preventDefault();
            
            const itemId = button.getAttribute('data-item-id');
            const property = button.getAttribute('data-property');
            const action = button.getAttribute('data-action');
            
            if (!itemId || !property || !action) return;
            
            const items = Store.getItems();
            const item = items.find(i => i.id === itemId);
            if (!item) return;
            
            const currentValue = item[property] || 0;
            let newValue;
            
            if (action === 'increment') {
                newValue = Math.min(3, currentValue + 1);
            } else if (action === 'decrement') {
                newValue = Math.max(1, currentValue - 1);
            } else {
                return;
            }
            
            if (newValue !== currentValue) {
                const result = setItemPropertyFn(itemId, property, newValue);
                if (!result.success) {
                    alert(result.error);
                }
            }
        };
        
        // Add new listener
        valueViewSection.addEventListener('click', valueViewSection._valueViewHandler);
    }
    
    // Attach value view listeners initially
    attachValueViewListeners(setItemProperty);
    
    // Re-attach value view listeners after updateValueView is called
    const originalUpdateValueView = updateValueView;
    window.updateValueView = function() {
        originalUpdateValueView();
        attachValueViewListeners(setItemProperty);
    };
    
    // Attach listeners to duration view items
    function attachDurationViewListeners(setItemPropertyFn) {
        const durationViewSection = document.getElementById('durationViewSection');
        if (!durationViewSection) return;
        
        // Remove old listener if exists
        if (durationViewSection._durationViewHandler) {
            durationViewSection.removeEventListener('change', durationViewSection._durationViewHandler);
        }
        
        // Create new handler
        durationViewSection._durationViewHandler = function handleDurationViewChange(e) {
            // Find the select element
            let select = e.target;
            
            if (!select || !select.classList || !select.classList.contains('duration-select')) {
                select = e.target.closest('.duration-select');
            }
            
            if (!select) return;
            
            // Stop event propagation
            e.stopPropagation();
            
            const itemId = select.getAttribute('data-item-id');
            const property = select.getAttribute('data-property');
            
            if (!itemId || !property) return;
            
            const newValue = select.value === '' ? 0 : parseInt(select.value, 10);
            
            if (isNaN(newValue) || newValue < 0 || newValue > 3) {
                return;
            }
            
            const result = setItemPropertyFn(itemId, property, newValue);
            if (!result.success) {
                alert(result.error);
            }
        };
        
        // Add new listener
        durationViewSection.addEventListener('change', durationViewSection._durationViewHandler);
    }
    
    // Attach duration view listeners initially
    attachDurationViewListeners(setItemProperty);
    
    // Re-attach duration view listeners after updateDurationView is called
    const originalUpdateDurationView = updateDurationView;
    window.updateDurationView = function() {
        originalUpdateDurationView();
        attachDurationViewListeners(setItemProperty);
    };
    
    // Attach results view listeners initially
    attachResultsViewListeners();
    
    // Attach reset order button listener
    const resetOrderBtn = document.getElementById('resetOrderBtn');
    if (resetOrderBtn) {
        resetOrderBtn.addEventListener('click', () => {
            resetResultsOrder();
            const appState = Store.getAppState();
            const items = Store.getItems();
            persistAndRefresh(appState, items);
            updateResultsView();
            displayJson();
        });
    }
    
    // Re-attach results view listeners after updateResultsView is called
    const originalUpdateResultsView = updateResultsView;
    window.updateResultsView = function() {
        originalUpdateResultsView();
        attachResultsViewListeners();
    };
}

// ============================================================================
// Initialize App
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Auto-initialize app: load existing state or create defaults
    let appState = Store.getAppState();
    
    // If no state exists, initialize with defaults
    if (!appState || !appState.currentStage) {
        appState = {
            currentStage: 'Item Listing',
            buckets: initializeBuckets(),
            locked: true,
            visitedStages: ['Item Listing']
        };
        Store.save(appState);
        console.log('App initialized with default state');
    } else {
        // Ensure visitedStages exists for existing state
        if (!appState.visitedStages) {
            appState.visitedStages = [appState.currentStage || 'Item Listing'];
            Store.save(appState);
        }
        console.log('App loaded existing state - continuing from', appState.currentStage);
    }
    
    setupEventListeners();
    populateSettings(); // Populate settings with current values
    updateCurrentStageDisplay();
    updateLockedDisplay();
    updateStageNavigation();
    updateUrgencyView();
    updateValueView();
    updateDurationView();
    updateResultsView();
    updateItemListingView();
    displayJson();
});

// ============================================================================
// Expose API for backward compatibility
// ============================================================================

// Initialize API when DOM is ready and API is available
function initializeAPI() {
    if (typeof window !== 'undefined' && window.PriorityManagerAPI) {
        window.PriorityManagerAPI.init({
        getItems: Store.getItems,
        addItem: addItem,
        bulkAddItems: bulkAddItems,
        removeItem: removeItem,
        setItemProperty: setItemProperty,
        getCurrentStage: () => {
            const appState = Store.getAppState();
            return STAGE_CONTROLLER.getCurrentStage(appState);
        },
        advanceStage: advanceStage,
        backStage: backStage,
        setCurrentStage: setCurrentStage,
        setUrgencyLimit: setUrgencyLimit,
        setValueLimit: setValueLimit,
        setUrgencyWeight: setUrgencyWeight,
        setValueWeight: setValueWeight,
        setDurationWeight: setDurationWeight,
        setItemActive: setItemActive,
        setItemInactive: setItemInactive,
        setUrgencyTitle: setUrgencyTitle,
        setUrgencyDescription: setUrgencyDescription,
        setValueTitle: setValueTitle,
        setValueDescription: setValueDescription,
        setDurationTitle: setDurationTitle,
        setDurationDescription: setDurationDescription,
        getAppState: Store.getAppState,
        clearCache: Store.clearCache,
        clearAllData: clearAllData,
        startApp: startApp,
        getButtonStates: () => {
            const appState = Store.getAppState();
            const items = Store.getItems();
            const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
            return STAGE_CONTROLLER.getButtonStates(currentStage, items);
        },
        updateStageNavigation: updateStageNavigation,
        navigateToStage: navigateToStage,
        getStageNavigationState: () => {
            const appState = Store.getAppState();
            const items = Store.getItems();
            const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
            const visitedStages = appState.visitedStages || ['Item Listing'];
            return STAGE_CONTROLLER.getStageNavigationState(currentStage, visitedStages, items);
        },
        updateStageButtonStates: updateStageNavigation, // Legacy alias
        setLocked: (locked) => {
            const appState = Store.getAppState();
            appState.locked = locked;
            Store.save(appState);
            updateLockedDisplay();
            displayJson();
            return { success: true };
        },
        // Utility functions
        initializeBuckets: initializeBuckets,
        migrateToBuckets: (state) => {
            state.buckets = normalizeBuckets(state.buckets);
            return state;
        },
        updateBuckets: updateBuckets,
        calculateBucketCounts: calculateBucketCounts,
        calculateCostOfDelay: (item) => {
            // API expects just item, so get appState from Store
            const appState = Store.getAppState();
            calculateCostOfDelay(item, appState.buckets);
        },
        recalculateAllCostOfDelay: () => {
            // API expects no parameters, so get appState from Store
            const appState = Store.getAppState();
            return recalculateAllCostOfDelay(appState.buckets, Store.getItems, Store.saveItems);
        },
        calculateCD3: (item) => {
            // API expects just item, so get appState from Store
            const appState = Store.getAppState();
            calculateCD3(item, appState.buckets);
        },
        recalculateAllCD3: () => {
            // API expects no parameters, so get appState from Store
            const appState = Store.getAppState();
            return recalculateAllCD3(appState.buckets, Store.getItems, Store.saveItems);
        },
        calculateBoardPosition: calculateBoardPosition
        });
    } else {
        // Retry if API not ready yet
        setTimeout(initializeAPI, 50);
    }
}

// Try to initialize immediately, and also on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
    initializeAPI();
}

// Expose global functions for backward compatibility
window.addItem = addItem;
window.bulkAddItems = bulkAddItems;
window.setItemProperty = setItemProperty;
window.advanceStage = advanceStage;
window.backStage = backStage;
window.startApp = startApp;
window.clearAllData = clearAllData;
window.displayJson = displayJson;
window.updateStageNavigation = updateStageNavigation;
window.updateStageButtonStates = updateStageNavigation; // Legacy alias

