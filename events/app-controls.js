// App control event listeners - toggle locked, clear data, add item button

import { Store } from '../state/appState.js';
import { updateLockedDisplay, displayJson } from '../ui/display/index.js';
import { analytics } from '../analytics/analytics.js';

// Setup app control event listeners
// Accepts handler functions as dependencies
export function setupAppControlListeners(handlers) {
    const {
        addItem,
        clearItemDataOnly,
        clearAllData
    } = handlers;

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
    
    // Help link
    const helpLink = document.querySelector('a[href="help.html"]');
    if (helpLink) {
        helpLink.addEventListener('click', () => {
            analytics.trackEvent('Access Help');
        });
    }
    
    // Clear Data modal submit handler
    // This is called from modals.js after modal validation
    window.handleClearDataSubmit = () => {
        const clearDataOption = document.getElementById('clearDataOption');
        const option = clearDataOption ? clearDataOption.value : 'itemsOnly';
        
        const clearType = option === 'itemsOnly' ? 'itemsOnly' : 'itemsAndSettings';
        
        if (option === 'itemsOnly') {
            clearItemDataOnly();
        } else {
            clearAllData(true);
        }
        
        // Track analytics event
        analytics.trackEvent('Data Cleared', { clearType });
    };
}

