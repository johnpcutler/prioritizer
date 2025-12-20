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
    removeItem as removeItemModel,
    insertItemIntoSequence,
    addItemNote,
    updateItemNote,
    deleteItemNote,
    calculateConfidenceWeightedCD3,
    getItemsSortedByCD3
} from './models/items.js';
import { BucketActions, setRecalcFunctions } from './models/bucketActions.js';
import { showForm, hideForm, renderFormField, escapeHtml } from './ui/forms.js';
import { displayJson, updateCurrentStageDisplay, updateLockedDisplay, updateStageNavigation, updateUrgencyView, updateValueView, updateDurationView, updateResultsView, updateItemListingView, resetResultsOrder, populateSettings } from './ui/display/index.js';
import { setupAllEventListeners } from './events/listeners.js';
import { createCommands } from './config/commands.js';
import { analytics } from './analytics/analytics.js';
import { executeCommand, setRefreshFunction } from './commands/index.js';
import { COMMAND_TYPES } from './commands/commandTypes.js';
import { COMMAND_HANDLERS } from './commands/commandHandlers.js';

// Make functions available globally for event listeners
window.setItemProperty = null;
window.setItemActive = null;
window.setItemInactive = null;

// Initialize Store
Store.init();

// Set up command system refresh function
setRefreshFunction(refreshApp);

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
    return executeCommand({
        type: COMMAND_TYPES.ADD_ITEM,
        payload: { name }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function removeItem(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.REMOVE_ITEM,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function bulkAddItems(itemNamesText) {
    const result = executeCommand({
        type: COMMAND_TYPES.BULK_ADD_ITEMS,
        payload: { itemNamesText }
    }, {
        handlers: COMMAND_HANDLERS
    });
    
    // Track analytics after command completes (since we need the result)
    if (result.success && result.added > 0) {
        analytics.trackEvent('Items Added', { 
            count: result.added, 
            itemsWithLinksCount: result.itemsWithLinksCount || 0 
        });
    }
    
    return result;
}

// Reducer-style item property setter
function setItemProperty(itemId, property, value) {
    return executeCommand({
        type: COMMAND_TYPES.SET_ITEM_PROPERTY,
        payload: { itemId, property, value }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setItemActive(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.SET_ITEM_ACTIVE,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setItemInactive(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.SET_ITEM_INACTIVE,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// Add a note to an item
function addItemNoteToItem(itemId, noteText) {
    return executeCommand({
        type: COMMAND_TYPES.ADD_ITEM_NOTE,
        payload: { itemId, noteText }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// Update an existing note
function updateItemNoteInItem(itemId, noteIndex, noteText) {
    return executeCommand({
        type: COMMAND_TYPES.UPDATE_ITEM_NOTE,
        payload: { itemId, noteIndex, noteText }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// Delete a note from an item
function deleteItemNoteFromItem(itemId, noteIndex) {
    return executeCommand({
        type: COMMAND_TYPES.DELETE_ITEM_NOTE,
        payload: { itemId, noteIndex }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// ============================================================================
// Confidence Survey Management
// ============================================================================

// Open confidence survey form
function openConfidenceSurvey(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.OPEN_CONFIDENCE_SURVEY,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// Submit confidence survey
function submitConfidenceSurvey(itemId, surveyData) {
    const result = executeCommand({
        type: COMMAND_TYPES.SUBMIT_CONFIDENCE_SURVEY,
        payload: { itemId, surveyData }
    }, {
        handlers: COMMAND_HANDLERS
    });
    
    // Track analytics after command completes (since we need selectionsCount)
    if (result.success && result.selectionsCount !== undefined) {
        analytics.trackEvent('Submit Confidence Survey', {
            itemId: itemId,
            selectionsCount: result.selectionsCount
        });
    }
    
    return result;
}

// Delete confidence survey
function deleteConfidenceSurvey(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.DELETE_CONFIDENCE_SURVEY,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// Cancel confidence survey editing
function cancelConfidenceSurvey(itemId) {
    return executeCommand({
        type: COMMAND_TYPES.CANCEL_CONFIDENCE_SURVEY,
        payload: { itemId }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// ============================================================================
// Stage Operations
// ============================================================================

// Navigate to a specific stage
function navigateToStage(targetStage) {
    return executeCommand({
        type: COMMAND_TYPES.NAVIGATE_TO_STAGE,
        payload: { targetStage }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function advanceStage() {
    return executeCommand({
        type: COMMAND_TYPES.ADVANCE_STAGE,
        payload: {}
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function backStage() {
    return executeCommand({
        type: COMMAND_TYPES.BACK_STAGE,
        payload: {}
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setCurrentStage(stage) {
    return executeCommand({
        type: COMMAND_TYPES.SET_CURRENT_STAGE,
        payload: { stage }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// ============================================================================
// Bucket Operations (using generic BucketActions)
// ============================================================================

function setUrgencyLimit(level, limit) {
    return executeCommand({
        type: COMMAND_TYPES.SET_URGENCY_LIMIT,
        payload: { level, limit }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setValueLimit(level, limit) {
    return executeCommand({
        type: COMMAND_TYPES.SET_VALUE_LIMIT,
        payload: { level, limit }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setUrgencyWeight(level, weight) {
    return executeCommand({
        type: COMMAND_TYPES.SET_URGENCY_WEIGHT,
        payload: { level, weight }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setValueWeight(level, weight) {
    return executeCommand({
        type: COMMAND_TYPES.SET_VALUE_WEIGHT,
        payload: { level, weight }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setDurationWeight(level, weight) {
    return executeCommand({
        type: COMMAND_TYPES.SET_DURATION_WEIGHT,
        payload: { level, weight }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setUrgencyTitle(level, title) {
    return executeCommand({
        type: COMMAND_TYPES.SET_URGENCY_TITLE,
        payload: { level, title }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setUrgencyDescription(level, description) {
    return executeCommand({
        type: COMMAND_TYPES.SET_URGENCY_DESCRIPTION,
        payload: { level, description }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setValueTitle(level, title) {
    return executeCommand({
        type: COMMAND_TYPES.SET_VALUE_TITLE,
        payload: { level, title }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setValueDescription(level, description) {
    return executeCommand({
        type: COMMAND_TYPES.SET_VALUE_DESCRIPTION,
        payload: { level, description }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setDurationTitle(level, title) {
    return executeCommand({
        type: COMMAND_TYPES.SET_DURATION_TITLE,
        payload: { level, title }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function setDurationDescription(level, description) {
    return executeCommand({
        type: COMMAND_TYPES.SET_DURATION_DESCRIPTION,
        payload: { level, description }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// ============================================================================
// App Lifecycle
// ============================================================================

function startApp() {
    return executeCommand({
        type: COMMAND_TYPES.START_APP,
        payload: {}
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function clearItemDataOnly() {
    return executeCommand({
        type: COMMAND_TYPES.CLEAR_ITEM_DATA_ONLY,
        payload: {}
    }, {
        handlers: COMMAND_HANDLERS
    });
}

function clearAllData(clearSettings = false) {
    return executeCommand({
        type: COMMAND_TYPES.CLEAR_ALL_DATA,
        payload: { clearSettings }
    }, {
        handlers: COMMAND_HANDLERS
    });
}

// ============================================================================
// Declarative Command System
// ============================================================================

// Create commands using factory function with handler functions
const { COMMANDS, COMMAND_FORMS } = createCommands({
    startApp,
    advanceStage,
    backStage,
    addItem,
    bulkAddItems,
    setItemProperty,
    setItemActive,
    setItemInactive,
    setUrgencyLimit,
    setValueLimit,
    setUrgencyWeight,
    setValueWeight,
    setDurationWeight,
    setUrgencyTitle,
    setUrgencyDescription,
    setValueTitle,
    setValueDescription,
    setDurationTitle,
    setDurationDescription
});

// ============================================================================
// UI Refresh Helper
// ============================================================================

export function refreshApp() {
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
    // Setup all event listeners using the modular event system
    setupAllEventListeners({
        // Navigation
        navigateToStage,
        // Settings
        setUrgencyLimit,
        setValueLimit,
        setUrgencyWeight,
        setValueWeight,
        setDurationWeight,
        setUrgencyTitle,
        setUrgencyDescription,
        setValueTitle,
        setValueDescription,
        // Items
        addItem,
        bulkAddItems,
        removeItem,
        setItemProperty,
        setItemActive,
        setItemInactive,
        // Modals
        addItemNoteToItem,
        updateItemNoteInItem,
        openConfidenceSurvey,
        submitConfidenceSurvey,
        deleteConfidenceSurvey,
        cancelConfidenceSurvey,
        // App Controls
        clearItemDataOnly,
        clearAllData
    });
}

// OLD setupEventListeners function removed - now using modular event system
// All event listeners have been moved to:
// - events/navigation.js
// - events/settings.js
// - events/items.js
// - events/modals.js
// - events/app-controls.js
// Orchestrated by events/listeners.js

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
    
    // Initialize analytics (dynamically loads Amplitude based on environment)
    // Analytics module handles environment detection and script loading
    analytics.init().then(() => {
        // Check if this is first load with empty items list
        const items = Store.getItems();
        const appState = Store.getAppState();
        const hasTrackedEmptyLanding = sessionStorage.getItem('trackedEmptyItemsListLanding');
        
        if (!hasTrackedEmptyLanding && 
            items.length === 0 && 
            appState.currentStage === 'Item Listing') {
            
            analytics.trackEvent('Landed On Empty Items List', {});
            
            // Mark as tracked for this session
            sessionStorage.setItem('trackedEmptyItemsListLanding', 'true');
        }
    }).catch(error => {
        console.warn('Analytics initialization failed:', error);
    });
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
        addItemNote: addItemNoteToItem,
        updateItemNote: updateItemNoteInItem,
        deleteItemNote: deleteItemNoteFromItem,
        submitConfidenceSurvey: submitConfidenceSurvey,
        deleteConfidenceSurvey: deleteConfidenceSurvey,
        getConfidenceSurvey: (itemId) => {
            const items = Store.getItems();
            const item = items.find(i => i.id === itemId);
            return item && item.hasConfidenceSurvey ? item.confidenceSurvey : null;
        },
        getConfidenceWeights: () => {
            const appState = Store.getAppState();
            return appState.confidenceWeights || null;
        },
        getConfidenceLevelLabels: () => {
            const appState = Store.getAppState();
            return appState.confidenceLevelLabels || null;
        },
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

