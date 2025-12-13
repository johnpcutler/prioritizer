// App control event listeners - toggle locked, clear data, add item button

import { Store } from '../state/appState.js';
import { updateLockedDisplay, displayJson } from '../ui/display.js';

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
    
    // Clear Data modal submit handler
    // This is called from modals.js after modal validation
    window.handleClearDataSubmit = () => {
        const clearDataOption = document.getElementById('clearDataOption');
        const option = clearDataOption ? clearDataOption.value : 'itemsOnly';
        
        if (option === 'itemsOnly') {
            clearItemDataOnly();
        } else {
            clearAllData(true);
        }
    };
}

