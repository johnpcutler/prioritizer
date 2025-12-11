// Unified event handlers using event delegation
import { Store } from '../state/appState.js';

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
        if (e.target.classList.contains('results-arrow-btn')) {
            const itemId = e.target.getAttribute('data-item-id');
            const direction = e.target.getAttribute('data-direction');
            
            if (!itemId || !direction) return;
            
            e.stopPropagation();
            e.preventDefault();
            
            // Import the function
            import('../models/items.js').then(({ reorderItemSequence }) => {
                const items = Store.getItems();
                const result = reorderItemSequence(itemId, direction, items);
                
                if (result.success) {
                    Store.saveItems(items);
                    const appState = Store.getAppState();
                    // Set flag to indicate manual reordering has occurred
                    appState.resultsManuallyReordered = true;
                    Store.save(appState);
                    
                    // Refresh the results view and JSON display
                    if (window.updateResultsView) {
                        window.updateResultsView();
                    }
                    if (window.displayJson) {
                        window.displayJson();
                    }
                } else {
                    console.error('Failed to reorder item:', result.error);
                }
            });
            return;
        }
        
    };
    
    // Add new listener
    resultsList.addEventListener('click', resultsList._resultsViewHandler);
}

