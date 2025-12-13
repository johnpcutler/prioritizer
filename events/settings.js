// Settings event listeners - settings view toggle and save buttons

import { Store } from '../state/appState.js';
import { STAGE_CONTROLLER } from '../models/stages.js';
import { 
    updateItemListingView, 
    updateUrgencyView, 
    updateValueView, 
    updateDurationView, 
    updateResultsView,
    populateSettings,
    displayJson
} from '../ui/display.js';

// Helper function to hide all stage views
function hideAllStageViews() {
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
}

// Helper function to show current stage view
function updateCurrentStageView() {
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
}

// Helper function to toggle settings view
function toggleSettingsView(show) {
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
}

// Setup settings event listeners
// Accepts bucket operation functions as dependencies
export function setupSettingsListeners(handlers) {
    const {
        setUrgencyLimit,
        setValueLimit,
        setUrgencyWeight,
        setValueWeight,
        setDurationWeight,
        setUrgencyTitle,
        setUrgencyDescription,
        setValueTitle,
        setValueDescription
    } = handlers;

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
}

