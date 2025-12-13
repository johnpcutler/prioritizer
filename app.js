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
import { displayJson, updateCurrentStageDisplay, updateLockedDisplay, updateStageNavigation, updateUrgencyView, updateValueView, updateDurationView, updateResultsView, updateItemListingView, resetResultsOrder, populateSettings } from './ui/display.js';
import { setupAllEventListeners } from './events/listeners.js';
import { createCommands } from './config/commands.js';
import { analytics } from './analytics/analytics.js';

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
    let itemsWithLinksCount = 0;
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
        
        // Count items with hyperlinks
        if (itemLink) {
            itemsWithLinksCount++;
        }
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
    
    // Track analytics event for items added
    if (added > 0) {
        analytics.trackEvent('Items Added', { count: added, itemsWithLinksCount: itemsWithLinksCount });
    }
    
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
    
    // Store old CD3 before update to detect transition
    const oldCD3 = item.CD3 || 0;
    
    // Use unified update function
    const result = updateItemProperty(item, property, value, appState.buckets);
    if (!result.valid) {
        return { success: false, error: result.error };
    }
    
    // Check if CD3 transitioned from 0 to >0
    const newCD3 = item.CD3 || 0;
    if (oldCD3 === 0 && newCD3 > 0) {
        // Item just got CD3 - insert into sequence
        insertItemIntoSequence(item, items, appState);
    }
    
    // Recalculate confidence-weighted CD3 if survey exists
    if (item.hasConfidenceSurvey && (property === 'urgency' || property === 'value' || property === 'duration')) {
        calculateConfidenceWeightedCD3(item, appState);
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
    
    // Track analytics events for property changes
    if (property === 'urgency' || property === 'value' || property === 'duration') {
        const bucket = value;
        const bucketName = appState.buckets[property] && appState.buckets[property][bucket] 
            ? appState.buckets[property][bucket].title 
            : `Bucket ${bucket}`;
        
        const eventName = property === 'urgency' ? 'Set Urgency' 
            : property === 'value' ? 'Set Value' 
            : 'Set Duration';
        
        analytics.trackEvent(eventName, {
            bucket: bucket,
            bucketName: bucketName,
            itemId: itemId
        });
    }
    
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

// Add a note to an item
function addItemNoteToItem(itemId, noteText) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    const result = addItemNote(item, noteText);
    if (!result.success) {
        return result;
    }
    
    Store.saveItems(items);
    const appState = Store.getAppState();
    persistAndRefresh(appState, items);
    refreshApp();
    
    return { success: true };
}

// Update an existing note
function updateItemNoteInItem(itemId, noteIndex, noteText) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    const result = updateItemNote(item, noteIndex, noteText);
    if (!result.success) {
        return result;
    }
    
    Store.saveItems(items);
    const appState = Store.getAppState();
    persistAndRefresh(appState, items);
    refreshApp();
    
    return { success: true };
}

// Delete a note from an item
function deleteItemNoteFromItem(itemId, noteIndex) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    const result = deleteItemNote(item, noteIndex);
    if (!result.success) {
        return result;
    }
    
    Store.saveItems(items);
    const appState = Store.getAppState();
    persistAndRefresh(appState, items);
    refreshApp();
    
    return { success: true };
}

// ============================================================================
// Confidence Survey Management
// ============================================================================

// Open confidence survey form
function openConfidenceSurvey(itemId) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    // Check if item has required properties
    if (!item.urgency || item.urgency === 0 || !item.value || item.value === 0 || !item.duration || item.duration === 0) {
        return { success: false, error: 'Item must have urgency, value, and duration set before running confidence survey' };
    }
    
    // Calculate sequence for analytics
    let sequence = null;
    if (item.sequence !== null && item.sequence !== undefined) {
        sequence = item.sequence;
    } else {
        // Calculate from sorted results list
        const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
        if (itemsWithSequence.length > 0) {
            const sortedItems = [...items].sort((a, b) => {
                const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            const itemIndex = sortedItems.findIndex(i => i.id === itemId);
            sequence = itemIndex >= 0 ? itemIndex + 1 : null;
        } else {
            // No items with sequence, use CD3 sorted position
            const sortedItems = getItemsSortedByCD3(items);
            const itemIndex = sortedItems.findIndex(i => i.id === itemId);
            sequence = itemIndex >= 0 ? itemIndex + 1 : null;
        }
    }
    
    // Track analytics event
    analytics.trackEvent('Run Confidence Survey', {
        itemId: itemId,
        sequence: sequence
    });
    
    // Find and show the survey form
    const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
    if (surveyForm) {
        surveyForm.style.display = 'block';
    }
    
    return { success: true };
}

// Submit confidence survey
function submitConfidenceSurvey(itemId, surveyData) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    // Validate survey data
    if (!surveyData || typeof surveyData !== 'object') {
        return { success: false, error: 'Invalid survey data' };
    }
    
    const requiredDimensions = ['scopeConfidence', 'urgencyConfidence', 'valueConfidence', 'durationConfidence'];
    let selectionsCount = 0;
    
    for (const dim of requiredDimensions) {
        if (!surveyData[dim] || typeof surveyData[dim] !== 'object') {
            return { success: false, error: `Missing or invalid ${dim} data` };
        }
        for (let level = 1; level <= 4; level++) {
            const count = surveyData[dim][level];
            if (count === undefined || count === null) {
                surveyData[dim][level] = 0;
            } else {
                const numCount = parseInt(count);
                if (isNaN(numCount) || numCount < 0) {
                    return { success: false, error: `Invalid vote count for ${dim} level ${level}` };
                }
                surveyData[dim][level] = numCount;
                
                // Count selections with value > 0
                if (numCount > 0) {
                    selectionsCount++;
                }
            }
        }
    }
    
    // Track analytics event
    analytics.trackEvent('Submit Confidence Survey', {
        itemId: itemId,
        selectionsCount: selectionsCount
    });
    
    // Save survey data
    item.confidenceSurvey = surveyData;
    item.hasConfidenceSurvey = true;
    
    // Calculate confidence-weighted CD3
    const appState = Store.getAppState();
    calculateConfidenceWeightedCD3(item, appState);
    
    // Hide the survey form
    const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
    if (surveyForm) {
        surveyForm.style.display = 'none';
    }
    
    Store.saveItems(items);
    persistAndRefresh(appState, items);
    refreshApp();
    
    return { success: true };
}

// Delete confidence survey
function deleteConfidenceSurvey(itemId) {
    const items = Store.getItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    // Track analytics event
    analytics.trackEvent('Delete Survey', {
        itemId: itemId
    });
    
    // Remove survey data
    item.hasConfidenceSurvey = false;
    item.confidenceSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
    };
    item.confidenceWeightedCD3 = null;
    item.confidenceWeightedValues = null;
    
    // Hide the survey form if open
    const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
    if (surveyForm) {
        surveyForm.style.display = 'none';
    }
    
    const appState = Store.getAppState();
    Store.saveItems(items);
    persistAndRefresh(appState, items);
    refreshApp();
    
    return { success: true };
}

// Cancel confidence survey editing
function cancelConfidenceSurvey(itemId) {
    // Hide the survey form
    const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
    if (surveyForm) {
        surveyForm.style.display = 'none';
    }
    
    return { success: true };
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
    analytics.init().catch(error => {
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

