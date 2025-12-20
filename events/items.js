// Item operation event listeners - item listing, urgency/value/duration view interactions

import { Store } from '../state/appState.js';
import { 
    updateUrgencyView, 
    updateValueView, 
    updateDurationView,
    updateResultsView,
    displayJson,
    resetResultsOrder
} from '../ui/display/index.js';
import { attachResultsViewListeners } from './listeners.js';
import { persistAndRefresh } from '../state/appState.js';
import { analytics } from '../analytics/analytics.js';
import { exportToCSV, downloadCSV, generateExportFilename } from '../utils/csvExport.js';

// Setup item operation event listeners
// Accepts handler functions as dependencies
export function setupItemsListeners(handlers) {
    const {
        addItem,
        bulkAddItems,
        removeItem,
        setItemProperty,
        navigateToStage
    } = handlers;

    // Make functions globally available for event listeners
    window.setItemProperty = setItemProperty;
    window.setItemActive = handlers.setItemActive;
    window.setItemInactive = handlers.setItemInactive;
    
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
    
    // Sample Initiatives button
    const sampleInitiativesBtn = document.getElementById('sampleInitiativesBtn');
    if (sampleInitiativesBtn && bulkAddItems) {
        sampleInitiativesBtn.addEventListener('click', () => {
            const sampleItems = `🐉🔥 Project dragonfire frosting
✨🤖 The sentient sprinkles program
🌙🥧 Operation midnight muffin heist
🦄 The unicorn supply chain initiative
🧁🚀 Cupcake teleportation research
📜🔮 The prophecy fulfillment roadmap
🍫⬆️ Anti gravity ganache pilot
⏰🧁 The time travel taste test
🧙✨ Wizards in residence program
🧁💙 The emotional support cupcake platform`;
            
            const result = bulkAddItems(sampleItems);
            if (result.success) {
                // Track analytics event
                analytics.trackEvent('Clicked Have Fun With Sample Initiatives', { itemsCount: 10 });
            } else {
                // Still track the click even if there's an error
                analytics.trackEvent('Clicked Have Fun With Sample Initiatives', { itemsCount: 10 });
                if (result.error) {
                    alert(result.error);
                }
            }
        });
    }
    
    // Start Prioritizing button
    const startPrioritizingBtn = document.getElementById('startPrioritizingBtn');
    if (startPrioritizingBtn && navigateToStage) {
        startPrioritizingBtn.addEventListener('click', () => {
            const items = Store.getItems();
            const itemsCount = items.length;
            
            // Check button text to determine which event to fire
            const buttonText = startPrioritizingBtn.textContent.trim();
            const eventName = buttonText === 'Prioritize New Items' 
                ? 'Clicked Prioritize New Items' 
                : 'Clicked Start Prioritizing';
            
            // Navigate to urgency stage
            const result = navigateToStage('urgency');
            if (result.success) {
                // Track analytics event based on button text
                analytics.trackEvent(eventName, { itemsCount });
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
    
    // Attach listeners to urgency view items
    function attachUrgencyViewListeners(setItemPropertyFn) {
        const urgencyViewSection = document.getElementById('urgencyViewSection');
        if (!urgencyViewSection) return;
        
        // Remove old listener if exists
        if (urgencyViewSection._urgencyViewHandler) {
            urgencyViewSection.removeEventListener('click', urgencyViewSection._urgencyViewHandler);
        }
        
        // Create new handler
        urgencyViewSection._urgencyViewHandler = function handleUrgencyViewClick(e) {
            // Check for "Advance To Value" button click
            const advanceToValueBtn = e.target.closest('#advanceToValueBtn');
            if (advanceToValueBtn && navigateToStage) {
                e.preventDefault();
                e.stopPropagation();
                
                const items = Store.getItems();
                const itemsCount = items.length;
                
                // Navigate to value stage
                const result = navigateToStage('value');
                if (result.success) {
                    // Track analytics event
                    analytics.trackEvent('Clicked Advance To Value', { itemsCount });
                }
                return;
            }
            
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
    
    // Attach listeners to value view items
    function attachValueViewListeners(setItemPropertyFn) {
        const valueViewSection = document.getElementById('valueViewSection');
        if (!valueViewSection) return;
        
        // Remove old listener if exists
        if (valueViewSection._valueViewHandler) {
            valueViewSection.removeEventListener('click', valueViewSection._valueViewHandler);
        }
        
        // Create new handler
        valueViewSection._valueViewHandler = function handleValueViewClick(e) {
            // Check for "Advance To Duration" button click
            const advanceToDurationBtn = e.target.closest('#advanceToDurationBtn');
            if (advanceToDurationBtn && navigateToStage) {
                e.preventDefault();
                e.stopPropagation();
                
                const items = Store.getItems();
                const itemsCount = items.length;
                
                // Navigate to duration stage
                const result = navigateToStage('duration');
                if (result.success) {
                    // Track analytics event
                    analytics.trackEvent('Clicked Advance To Duration', { itemsCount });
                }
                return;
            }
            
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
        
        // Remove old listeners if they exist
        if (durationViewSection._durationViewChangeHandler) {
            durationViewSection.removeEventListener('change', durationViewSection._durationViewChangeHandler);
        }
        if (durationViewSection._durationViewClickHandler) {
            durationViewSection.removeEventListener('click', durationViewSection._durationViewClickHandler);
        }
        
        // Create change handler for select dropdowns
        durationViewSection._durationViewChangeHandler = function handleDurationViewChange(e) {
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
        
        // Create click handler for "Advance To Results" button
        durationViewSection._durationViewClickHandler = function handleDurationViewClick(e) {
            // Check for "Advance To Results" button click
            const advanceToResultsBtn = e.target.closest('#advanceToResultsBtn');
            if (advanceToResultsBtn && navigateToStage) {
                e.preventDefault();
                e.stopPropagation();
                
                const items = Store.getItems();
                const itemsCount = items.length;
                
                // Navigate to Results stage
                const result = navigateToStage('Results');
                if (result.success) {
                    // Track analytics event
                    analytics.trackEvent('Clicked Advance To Results', { itemsCount });
                }
                return;
            }
        };
        
        // Add listeners
        durationViewSection.addEventListener('change', durationViewSection._durationViewChangeHandler);
        durationViewSection.addEventListener('click', durationViewSection._durationViewClickHandler);
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
            
            // Track analytics event
            analytics.trackEvent('Reset Order');
        });
    }
    
    // Attach export CSV button listener
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            const appState = Store.getAppState();
            const items = Store.getItems();
            const csvContent = exportToCSV(items, appState);
            const filename = generateExportFilename();
            downloadCSV(csvContent, filename);
            
            // Track analytics event
            // Count rows: header row (1) + data rows (items.length)
            const rows = items.length > 0 ? items.length + 1 : 1; // At least header row
            analytics.trackEvent('Export CSV', { rows: rows });
        });
    }
    
    // Re-attach results view listeners after updateResultsView is called
    const originalUpdateResultsView = updateResultsView;
    window.updateResultsView = function() {
        originalUpdateResultsView();
        attachResultsViewListeners();
    };
}

