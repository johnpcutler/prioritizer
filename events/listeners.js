// Unified event handlers using event delegation
import { Store } from '../state/appState.js';
import { reorderItemSequence } from '../models/items.js';

// Constants for event handling
const ARROW_BUTTON_CLASS = 'results-arrow-btn';
const DATA_ITEM_ID_ATTR = 'data-item-id';
const DATA_DIRECTION_ATTR = 'data-direction';

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
        // Handle arrow buttons
        if (e.target.classList.contains(ARROW_BUTTON_CLASS)) {
            const itemId = e.target.getAttribute(DATA_ITEM_ID_ATTR);
            const direction = e.target.getAttribute(DATA_DIRECTION_ATTR);
            
            if (!itemId || !direction) return;
            
            e.stopPropagation();
            e.preventDefault();
            
            handleArrowButtonClick(itemId, direction);
            return;
        }
        
    };
    
    // Add new listener
    resultsList.addEventListener('click', resultsList._resultsViewHandler);
}

