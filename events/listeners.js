// Unified event handlers using event delegation
// This module orchestrates all event listeners

import { Store } from '../state/appState.js';
import { reorderItemSequence } from '../models/items.js';
import { setupNavigationListeners } from './navigation.js';
import { setupSettingsListeners } from './settings.js';
import { setupItemsListeners } from './items.js';
import { setupModalsListeners } from './modals.js';
import { setupAppControlListeners } from './app-controls.js';
import { analytics } from '../analytics/analytics.js';

// Refresh the results view and JSON display
function refreshViews() {
    if (window.updateResultsView) {
        window.updateResultsView();
    }
    if (window.displayJson) {
        window.displayJson();
    }
}

// Handle arrow button click for reordering items
function handleArrowButtonClick(itemId, direction) {
    // Reorder the item
    const items = Store.getItems();
    const result = reorderItemSequence(itemId, direction, items);
    
    if (result.success) {
        Store.saveItems(items);
        const appState = Store.getAppState();
        // Set flag to indicate manual reordering has occurred
        appState.resultsManuallyReordered = true;
        Store.save(appState);
        
        // Track analytics event
        const eventName = direction === 'up' ? 'Reorder Results Up' : 'Reorder Results Down';
        analytics.trackEvent(eventName, { itemId });
        
        // Refresh the results view and JSON display
        refreshViews();
    } else {
        console.error('Failed to reorder item:', result.error);
    }
}

// Attach results view listeners for reordering and color selection
export function attachResultsViewListeners() {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;
    
    // Remove old listener if exists
    if (resultsList._resultsViewHandler) {
        resultsList.removeEventListener('click', resultsList._resultsViewHandler);
    }
    
    // Create new handler
    resultsList._resultsViewHandler = function handleResultsViewClick(e) {
        // Check for arrow button clicks
        const arrowBtn = e.target.closest('.results-arrow-btn');
        if (arrowBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const itemId = arrowBtn.getAttribute(DATA_ITEM_ID_ATTR);
            const direction = arrowBtn.getAttribute(DATA_DIRECTION_ATTR);
            
            if (itemId && direction) {
                handleArrowButtonClick(itemId, direction);
            }
            return;
        }
    };
    
    // Add new listener
    resultsList.addEventListener('click', resultsList._resultsViewHandler);
}

// Constants for event handling
const ARROW_BUTTON_CLASS = 'results-arrow-btn';
const DATA_ITEM_ID_ATTR = 'data-item-id';
const DATA_DIRECTION_ATTR = 'data-direction';

// Setup all event listeners
// Accepts all handler functions as dependencies
export function setupAllEventListeners(handlers) {
    const {
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
    } = handlers;

    // Setup all event listener modules
    setupNavigationListeners(navigateToStage);
    
    setupSettingsListeners({
        setUrgencyLimit,
        setValueLimit,
        setUrgencyWeight,
        setValueWeight,
        setDurationWeight,
        setUrgencyTitle,
        setUrgencyDescription,
        setValueTitle,
        setValueDescription
    });
    
    setupItemsListeners({
        addItem,
        bulkAddItems,
        removeItem,
        setItemProperty,
        setItemActive,
        setItemInactive
    });
    
    setupModalsListeners({
        addItemNoteToItem,
        updateItemNoteInItem,
        openConfidenceSurvey,
        submitConfidenceSurvey,
        deleteConfidenceSurvey,
        cancelConfidenceSurvey
    });
    
    setupAppControlListeners({
        addItem,
        clearItemDataOnly,
        clearAllData
    });
}
