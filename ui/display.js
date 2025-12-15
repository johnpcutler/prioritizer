import { STAGE_CONTROLLER, STAGE_ORDER } from '../models/stages.js';
import { Store } from '../state/appState.js';
import { updateUrgencyView } from './display/urgencyView.js';

// Re-export for global access
window.Store = Store;

// Display JSON data
export function displayJson() {
    const jsonDisplay = document.getElementById('jsonDisplay');
    if (!jsonDisplay) return; // Element doesn't exist (e.g., on main page after removal)
    
    const appState = Store.getAppState();
    const items = Store.getItems();
    
    const jsonData = {
        currentStage: appState.currentStage,
        locked: appState.locked,
        buckets: appState.buckets,
        items: items
    };
    
    jsonDisplay.textContent = JSON.stringify(jsonData, null, 2);
    updateCurrentStageDisplay();
}

// Update stage navigation display
export function updateStageNavigation() {
    const appState = Store.getAppState();
    const items = Store.getItems();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const visitedStages = appState.visitedStages || ['Item Listing'];
    
    // Get navigation state
    const navState = STAGE_CONTROLLER.getStageNavigationState(currentStage, visitedStages, items);
    
    // Update stage steps
    const stageSteps = document.querySelectorAll('.stage-step');
    stageSteps.forEach(step => {
        const stepStage = step.getAttribute('data-stage');
        const stageInfo = navState.stages.find(s => s.name === stepStage);
        
        if (!stageInfo) {
            return;
        }
        
        // Remove all status classes
        step.classList.remove('active', 'current', 'visited', 'future', 'locked');
        
        // Add appropriate status class
        step.classList.add(stageInfo.status);
        
        // Update clickability
        if (stageInfo.canNavigate) {
            step.classList.add('clickable');
            step.style.cursor = 'pointer';
            step.setAttribute('title', `Navigate to ${stageInfo.displayName}`);
        } else {
            step.classList.remove('clickable');
            step.style.cursor = stageInfo.status === 'current' ? 'default' : 'not-allowed';
            step.setAttribute('title', stageInfo.reason || stageInfo.displayName);
        }
    });
}

// Update current stage display (legacy - now calls updateStageNavigation)
export function updateCurrentStageDisplay() {
    updateStageNavigation();
}

// Update locked setting display
export function updateLockedDisplay() {
    const appState = Store.getAppState();
    const isLocked = appState.locked !== false;
    const lockedStatusText = document.getElementById('lockedStatusText');
    const lockedDescriptionText = document.getElementById('lockedDescriptionText');
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    if (lockedStatusText) {
        lockedStatusText.textContent = isLocked ? 'ON' : 'OFF';
        lockedStatusText.style.color = isLocked ? '#dc3545' : '#28a745';
        lockedStatusText.style.fontWeight = 'bold';
    }
    
    if (lockedDescriptionText) {
        if (isLocked) {
            lockedDescriptionText.textContent = `Can only adjust ${currentStage} values in ${currentStage} stage`;
        } else {
            if (currentStage === 'value') {
                lockedDescriptionText.textContent = 'Can adjust urgency and value in value stage';
            } else if (currentStage === 'duration') {
                lockedDescriptionText.textContent = 'Can adjust urgency, value, and duration in duration stage';
            } else {
                lockedDescriptionText.textContent = 'Can adjust all previous stage properties';
            }
        }
    }
}

// Update stage navigation button states (legacy - now calls updateStageNavigation)
export function updateStageButtonStates() {
    // Legacy function - now just calls updateStageNavigation
    // Kept for backward compatibility with existing code
    updateStageNavigation();
    
    // Handle addItemBtnContainer visibility if it exists
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const addItemBtnContainer = document.getElementById('addItemButtonContainer');
    
    if (addItemBtnContainer) {
        addItemBtnContainer.style.display = currentStage === 'Item Listing' ? 'block' : 'none';
    }
    
    // Show/hide urgency view based on current stage
    updateUrgencyView();
}

// Populate settings form with current values from app state
export function populateSettings() {
    const appState = Store.getAppState();
    const buckets = appState.buckets || {};
    
    // Populate Urgency Limits
    for (let level = 1; level <= 3; level++) {
        const limitInput = document.getElementById(`urgencyLimit${level}`);
        if (limitInput && buckets.urgency && buckets.urgency[level]) {
            limitInput.value = buckets.urgency[level].limit || '';
        }
    }
    
    // Populate Value Limits
    for (let level = 1; level <= 3; level++) {
        const limitInput = document.getElementById(`valueLimit${level}`);
        if (limitInput && buckets.value && buckets.value[level]) {
            limitInput.value = buckets.value[level].limit || '';
        }
    }
    
    // Populate Urgency Weights
    for (let level = 1; level <= 3; level++) {
        const weightInput = document.getElementById(`urgencyWeight${level}`);
        if (weightInput && buckets.urgency && buckets.urgency[level]) {
            weightInput.value = buckets.urgency[level].weight || '';
        }
    }
    
    // Populate Value Weights
    for (let level = 1; level <= 3; level++) {
        const weightInput = document.getElementById(`valueWeight${level}`);
        if (weightInput && buckets.value && buckets.value[level]) {
            weightInput.value = buckets.value[level].weight || '';
        }
    }
    
    // Populate Duration Weights
    for (let level = 1; level <= 3; level++) {
        const weightInput = document.getElementById(`durationWeight${level}`);
        if (weightInput && buckets.duration && buckets.duration[level]) {
            weightInput.value = buckets.duration[level].weight || '';
        }
    }
    
    // Populate Urgency Titles
    for (let level = 1; level <= 3; level++) {
        const titleInput = document.getElementById(`urgencyTitle${level}`);
        if (titleInput && buckets.urgency && buckets.urgency[level]) {
            titleInput.value = buckets.urgency[level].title || '';
        }
    }
    
    // Populate Urgency Descriptions
    for (let level = 1; level <= 3; level++) {
        const descInput = document.getElementById(`urgencyDescription${level}`);
        if (descInput && buckets.urgency && buckets.urgency[level]) {
            descInput.value = buckets.urgency[level].description || '';
        }
    }
    
    // Populate Value Titles
    for (let level = 1; level <= 3; level++) {
        const titleInput = document.getElementById(`valueTitle${level}`);
        if (titleInput && buckets.value && buckets.value[level]) {
            titleInput.value = buckets.value[level].title || '';
        }
    }
    
    // Populate Value Descriptions
    for (let level = 1; level <= 3; level++) {
        const descInput = document.getElementById(`valueDescription${level}`);
        if (descInput && buckets.value && buckets.value[level]) {
            descInput.value = buckets.value[level].description || '';
        }
    }
}
