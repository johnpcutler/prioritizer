import { STAGE_CONTROLLER, STAGE_ORDER } from '../models/stages.js';
import { Store } from '../state/appState.js';
import { escapeHtml } from './forms.js';
import { getItemsSortedByCD3, assignSequenceNumbers, reorderItemSequence } from '../models/items.js';

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

// Display item listing view (only visible in Item Listing stage)
export function updateItemListingView() {
    const itemListingViewSection = document.getElementById('itemListingViewSection');
    if (!itemListingViewSection) return;
    
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    // Only show in Item Listing stage
    if (currentStage === 'Item Listing') {
        itemListingViewSection.style.display = 'block';
        displayItemListingContent();
    } else {
        itemListingViewSection.style.display = 'none';
    }
}

// Display the content of the item listing view
function displayItemListingContent() {
    const items = Store.getItems();
    const itemsDisplay = document.getElementById('itemListingItemsDisplay');
    if (!itemsDisplay) return;
    
    // Update callout message based on whether items exist
    const itemListingCallout = document.getElementById('itemListingCallout');
    if (itemListingCallout) {
        if (items.length === 0) {
            itemListingCallout.textContent = 'Add item names, one per line below. You can optionally include a link by adding a comma and URL after the item name.';
        } else {
            itemListingCallout.textContent = 'When you have added all your items, you can advance to Urgency to categorize them.';
        }
    }
    
    if (items.length === 0) {
        // Show example item with link
        itemsDisplay.innerHTML = `
            <div class="item-listing-item" style="opacity: 0.6; font-style: italic;">
                <span class="item-listing-item-name">Example Item, https://example.com <a href="https://example.com" target="_blank" rel="noopener noreferrer" class="item-link" title="https://example.com">🔗</a></span>
            </div>
            <div class="empty-state" style="text-align: center; color: #999; padding: 20px; font-style: italic; margin-top: 10px;">No items added yet. Add items using the form above.</div>
        `;
        return;
    }
    
    itemsDisplay.innerHTML = items.map(item => {
        const isActive = item.active !== false;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        
        return `
            <div class="item-listing-item ${!isActive ? 'item-inactive' : ''}" data-item-id="${item.id}">
                <span class="item-listing-item-name">${escapeHtml(item.name)}${linkHtml}</span>
                <button class="item-remove-btn" data-item-id="${item.id}" title="Remove item">🗑️</button>
            </div>
        `;
    }).join('');
}

// Display value view (only visible in value stage)
export function updateValueView() {
    const valueViewSection = document.getElementById('valueViewSection');
    if (!valueViewSection) return;
    
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    // Only show in value stage
    if (currentStage === 'value') {
        valueViewSection.style.display = 'block';
        displayValueViewContent();
    } else {
        valueViewSection.style.display = 'none';
    }
}

// Display duration view (only visible in duration stage)
export function updateDurationView() {
    const durationViewSection = document.getElementById('durationViewSection');
    if (!durationViewSection) return;
    
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    // Only show in duration stage
    if (currentStage === 'duration') {
        durationViewSection.style.display = 'block';
        displayDurationViewContent();
    } else {
        durationViewSection.style.display = 'none';
    }
}

// Display urgency view (only visible in urgency stage)
export function updateUrgencyView() {
    const urgencyViewSection = document.getElementById('urgencyViewSection');
    if (!urgencyViewSection) return;
    
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    // Only show in urgency stage
    if (currentStage === 'urgency') {
        urgencyViewSection.style.display = 'block';
        displayUrgencyViewContent();
    } else {
        urgencyViewSection.style.display = 'none';
    }
}

// Display the content of the urgency view
function displayUrgencyViewContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const isLocked = appState.locked !== false;
    
    // Only show if in urgency stage
    if (currentStage !== 'urgency') {
        return;
    }
    
    // Get bucket titles
    const urgency1Title = buckets.urgency[1]?.title || 'Title';
    const urgency2Title = buckets.urgency[2]?.title || 'Title';
    const urgency3Title = buckets.urgency[3]?.title || 'Title';
    
    // Update header labels with info icons (active during urgency stage)
    const label1El = document.getElementById('urgencyViewUrgencyColumnLabel1');
    const label2El = document.getElementById('urgencyViewUrgencyColumnLabel2');
    const label3El = document.getElementById('urgencyViewUrgencyColumnLabel3');
    const isActive = currentStage === 'urgency';
    renderHeaderWithInfoIcon(label1El, urgency1Title, 'urgency', 1, isActive);
    renderHeaderWithInfoIcon(label2El, urgency2Title, 'urgency', 2, isActive);
    renderHeaderWithInfoIcon(label3El, urgency3Title, 'urgency', 3, isActive);
    
    // Separate items by urgency
    const itemsWithUrgency1 = items.filter(item => item.urgency === 1);
    const itemsWithUrgency2 = items.filter(item => item.urgency === 2);
    const itemsWithUrgency3 = items.filter(item => item.urgency === 3);
    const itemsWithoutUrgency = items.filter(item => !item.urgency || item.urgency === 0);
    
    // Update callout message based on whether all items have urgency
    const urgencyCallout = document.getElementById('urgencyCallout');
    if (urgencyCallout) {
        const allItemsHaveUrgency = items.length > 0 && itemsWithoutUrgency.length === 0;
        if (allItemsHaveUrgency) {
            urgencyCallout.textContent = 'When you are done categorizing items, you can advance to Value';
        } else {
            urgencyCallout.textContent = 'Categorize each of your items by urgency';
        }
    }
    
    // Render items in each column
    renderUrgencyColumn('urgencyColumn1', itemsWithUrgency1, isLocked, urgency1Title, urgency2Title, urgency3Title);
    renderUrgencyColumn('urgencyColumn2', itemsWithUrgency2, isLocked, urgency1Title, urgency2Title, urgency3Title);
    renderUrgencyColumn('urgencyColumn3', itemsWithUrgency3, isLocked, urgency1Title, urgency2Title, urgency3Title);
    
    // Render items without urgency
    const noValueContent = document.getElementById('urgencyNoValueContent');
    if (noValueContent) {
        if (itemsWithoutUrgency.length === 0) {
            noValueContent.innerHTML = '<div class="empty">Items without urgency values go here</div>';
            noValueContent.classList.add('empty');
        } else {
            noValueContent.classList.remove('empty');
            noValueContent.innerHTML = itemsWithoutUrgency.map(item => renderUrgencyItem(item, isLocked, urgency1Title, urgency2Title, urgency3Title)).join('');
        }
    }
}

// Render items in an urgency column
function renderUrgencyColumn(columnId, items, isLocked, urgency1Title, urgency2Title, urgency3Title) {
    const columnEl = document.getElementById(columnId);
    if (!columnEl) return;
    
    if (items.length === 0) {
        columnEl.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-style: italic;">No items</div>';
    } else {
        columnEl.innerHTML = items.map(item => renderUrgencyItem(item, isLocked, urgency1Title, urgency2Title, urgency3Title)).join('');
    }
}

// Render a single item in the urgency view
function renderUrgencyItem(item, isLocked, urgency1Title, urgency2Title, urgency3Title) {
    const urgency = item.urgency || 0;
    const isActive = item.active !== false;
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    
    return `
        <div class="urgency-item ${!isActive ? 'item-inactive' : ''}" data-item-id="${item.id}">
            <div>
                <span class="urgency-item-name">${escapeHtml(item.name)}${linkHtml}</span>
            </div>
            <div class="urgency-quick-buttons">
                <button class="urgency-quick-btn ${urgency === 1 ? 'active' : ''}" 
                        data-item-id="${item.id}" 
                        data-property="urgency" 
                        data-action="set"
                        data-value="1"
                        title="Set urgency to ${escapeHtml(urgency1Title)}">${escapeHtml(urgency1Title)}</button>
                <button class="urgency-quick-btn ${urgency === 2 ? 'active' : ''}" 
                        data-item-id="${item.id}" 
                        data-property="urgency" 
                        data-action="set"
                        data-value="2"
                        title="Set urgency to ${escapeHtml(urgency2Title)}">${escapeHtml(urgency2Title)}</button>
                <button class="urgency-quick-btn ${urgency === 3 ? 'active' : ''}" 
                        data-item-id="${item.id}" 
                        data-property="urgency" 
                        data-action="set"
                        data-value="3"
                        title="Set urgency to ${escapeHtml(urgency3Title)}">${escapeHtml(urgency3Title)}</button>
            </div>
        </div>
    `;
}

// Display the content of the value view
function displayValueViewContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const isLocked = appState.locked !== false;
    
    // Only show if in value stage
    if (currentStage !== 'value') {
        return;
    }
    
    // Get bucket titles
    const value1Title = buckets.value[1]?.title || 'Title';
    const value2Title = buckets.value[2]?.title || 'Title';
    const value3Title = buckets.value[3]?.title || 'Title';
    const urgency1Title = buckets.urgency[1]?.title || 'Title';
    const urgency2Title = buckets.urgency[2]?.title || 'Title';
    const urgency3Title = buckets.urgency[3]?.title || 'Title';
    
    // Update row labels (Value) with info icons (active during value stage)
    const valueRowLabel1 = document.getElementById('valueRowLabel1');
    const valueRowLabel2 = document.getElementById('valueRowLabel2');
    const valueRowLabel3 = document.getElementById('valueRowLabel3');
    const isValueActive = currentStage === 'value';
    renderHeaderWithInfoIcon(valueRowLabel1, value1Title, 'value', 1, isValueActive);
    renderHeaderWithInfoIcon(valueRowLabel2, value2Title, 'value', 2, isValueActive);
    renderHeaderWithInfoIcon(valueRowLabel3, value3Title, 'value', 3, isValueActive);
    
    // Update column labels (Urgency) - not active in value view, so no icons
    const urgencyColumnLabel1 = document.getElementById('urgencyColumnLabel1');
    const urgencyColumnLabel2 = document.getElementById('urgencyColumnLabel2');
    const urgencyColumnLabel3 = document.getElementById('urgencyColumnLabel3');
    if (urgencyColumnLabel1) urgencyColumnLabel1.textContent = urgency1Title;
    if (urgencyColumnLabel2) urgencyColumnLabel2.textContent = urgency2Title;
    if (urgencyColumnLabel3) urgencyColumnLabel3.textContent = urgency3Title;
    
    // Separate items: those with value and those without value (but with urgency)
    const itemsWithValue = items.filter(item => item.value && item.value > 0);
    const itemsWithoutValue = items.filter(item => (!item.value || item.value === 0) && item.urgency && item.urgency > 0);
    
    // Update callout message based on whether all items have value
    const valueCallout = document.getElementById('valueCallout');
    if (valueCallout) {
        // Check if all items that have urgency also have value
        const itemsWithUrgency = items.filter(item => item.urgency && item.urgency > 0);
        const allItemsHaveValue = itemsWithUrgency.length > 0 && itemsWithUrgency.every(item => item.value && item.value > 0);
        if (allItemsHaveValue) {
            valueCallout.textContent = 'When you are happy with the value categories, you can advance to Duration';
        } else {
            valueCallout.textContent = 'For each of your items, move them up into the value rows. You can\'t move them sideways (for now)';
        }
    }
    
    // Clear all grid cells and initialize with empty state
    for (let value = 1; value <= 3; value++) {
        for (let urgency = 1; urgency <= 3; urgency++) {
            const cellId = `valueCell-${value}-${urgency}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl) {
                cellEl.innerHTML = '';
            }
        }
    }
    
    // Place items with value in grid cells
    itemsWithValue.forEach(item => {
        const value = item.value;
        const urgency = item.urgency || 0;
        if (value >= 1 && value <= 3 && urgency >= 1 && urgency <= 3) {
            const cellId = `valueCell-${value}-${urgency}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl) {
                const itemHtml = renderValueItem(item, isLocked);
                if (cellEl.innerHTML.trim() === '') {
                    cellEl.innerHTML = itemHtml;
                } else {
                    cellEl.innerHTML += itemHtml;
                }
            }
        }
    });
    
    // Show empty state for cells with no items
    for (let value = 1; value <= 3; value++) {
        for (let urgency = 1; urgency <= 3; urgency++) {
            const cellId = `valueCell-${value}-${urgency}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl && cellEl.innerHTML.trim() === '') {
                cellEl.innerHTML = '<div style="text-align: center; color: #999; padding: 10px; font-size: 12px; font-style: italic;">Empty</div>';
            }
        }
    }
    
    // Place items without value in bottom boxes (grouped by urgency)
    const itemsByUrgency = {
        1: itemsWithoutValue.filter(item => item.urgency === 1),
        2: itemsWithoutValue.filter(item => item.urgency === 2),
        3: itemsWithoutValue.filter(item => item.urgency === 3)
    };
    
    for (let urgency = 1; urgency <= 3; urgency++) {
        const boxId = `valueNoValueBox${urgency}`;
        const boxEl = document.getElementById(boxId);
        if (boxEl) {
            const itemsForUrgency = itemsByUrgency[urgency];
            if (itemsForUrgency.length === 0) {
                boxEl.innerHTML = '<div class="empty">No items</div>';
                boxEl.classList.add('empty');
            } else {
                boxEl.classList.remove('empty');
                boxEl.innerHTML = itemsForUrgency.map(item => renderValueItem(item, isLocked)).join('');
            }
        }
    }
}

// Render a single item in the value view
function renderValueItem(item, isLocked) {
    const value = item.value || 0;
    const urgency = item.urgency || 0;
    const isActive = item.active !== false;
    
    // In value stage, can set value if locked, or if unlocked and urgency is set
    const canSetValue = isLocked ? true : (item.urgencySet || urgency > 0);
    
    const canIncrement = canSetValue && value < 3;
    const canDecrement = canSetValue && value > 1;
    const displayValue = value > 0 ? value : '—';
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    
    return `
        <div class="value-item ${!isActive ? 'item-inactive' : ''}" data-item-id="${item.id}">
            <span class="value-item-name">${escapeHtml(item.name)}${linkHtml}</span>
            <div class="value-item-controls">
                <button class="property-btn decrement-btn" 
                        data-item-id="${item.id}" 
                        data-property="value" 
                        data-action="decrement"
                        ${!canDecrement ? 'disabled' : ''}
                        title="${!canDecrement ? 'Cannot decrease value' : 'Decrease value'}">↓</button>
                <button class="property-btn increment-btn" 
                        data-item-id="${item.id}" 
                        data-property="value" 
                        data-action="increment"
                        ${!canIncrement ? 'disabled' : ''}
                        title="${!canIncrement ? 'Already at maximum (3)' : 'Increase value'}">↑</button>
            </div>
        </div>
    `;
}

// Display the content of the duration view
function displayDurationViewContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const isLocked = appState.locked !== false;
    
    // Only show if in duration stage
    if (currentStage !== 'duration') {
        return;
    }
    
    // Get bucket titles
    const value1Title = buckets.value[1]?.title || 'Title';
    const value2Title = buckets.value[2]?.title || 'Title';
    const value3Title = buckets.value[3]?.title || 'Title';
    const urgency1Title = buckets.urgency[1]?.title || 'Title';
    const urgency2Title = buckets.urgency[2]?.title || 'Title';
    const urgency3Title = buckets.urgency[3]?.title || 'Title';
    const duration1Title = buckets.duration[1]?.title || '1-3d';
    const duration2Title = buckets.duration[2]?.title || '1-3w';
    const duration3Title = buckets.duration[3]?.title || '1-3mo';
    
    // Update row labels (Value)
    const durationValueRowLabel1 = document.getElementById('durationValueRowLabel1');
    const durationValueRowLabel2 = document.getElementById('durationValueRowLabel2');
    const durationValueRowLabel3 = document.getElementById('durationValueRowLabel3');
    if (durationValueRowLabel1) durationValueRowLabel1.textContent = value1Title;
    if (durationValueRowLabel2) durationValueRowLabel2.textContent = value2Title;
    if (durationValueRowLabel3) durationValueRowLabel3.textContent = value3Title;
    
    // Update column labels (Urgency)
    const durationUrgencyColumnLabel1 = document.getElementById('durationUrgencyColumnLabel1');
    const durationUrgencyColumnLabel2 = document.getElementById('durationUrgencyColumnLabel2');
    const durationUrgencyColumnLabel3 = document.getElementById('durationUrgencyColumnLabel3');
    if (durationUrgencyColumnLabel1) durationUrgencyColumnLabel1.textContent = urgency1Title;
    if (durationUrgencyColumnLabel2) durationUrgencyColumnLabel2.textContent = urgency2Title;
    if (durationUrgencyColumnLabel3) durationUrgencyColumnLabel3.textContent = urgency3Title;
    
    // Filter items that have both value and urgency set
    const itemsWithValueAndUrgency = items.filter(item => item.value && item.value > 0 && item.urgency && item.urgency > 0);
    
    // Update callout message based on whether all items have duration
    const durationCallout = document.getElementById('durationCallout');
    if (durationCallout) {
        // Check if all items that have value and urgency also have duration
        const allItemsHaveDuration = itemsWithValueAndUrgency.length > 0 && itemsWithValueAndUrgency.every(item => item.duration && item.duration > 0);
        if (allItemsHaveDuration) {
            durationCallout.textContent = 'When you are done setting durations, you can advance to Results';
        } else {
            durationCallout.textContent = 'Set the duration for each item using the dropdown. This represents how long the work will take.';
        }
    }
    
    // Clear all grid cells
    for (let value = 1; value <= 3; value++) {
        for (let urgency = 1; urgency <= 3; urgency++) {
            const cellId = `durationCell-${value}-${urgency}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl) {
                cellEl.innerHTML = '';
            }
        }
    }
    
    // Group items by cell and sort by duration (3, 2, 1, 0/blank)
    const itemsByCell = {};
    itemsWithValueAndUrgency.forEach(item => {
        const value = item.value;
        const urgency = item.urgency || 0;
        if (value >= 1 && value <= 3 && urgency >= 1 && urgency <= 3) {
            const cellId = `durationCell-${value}-${urgency}`;
            if (!itemsByCell[cellId]) {
                itemsByCell[cellId] = [];
            }
            itemsByCell[cellId].push(item);
        }
    });
    
    // Sort items within each cell: duration 3 first, then 2, then 1, then 0/blank
    Object.keys(itemsByCell).forEach(cellId => {
        itemsByCell[cellId].sort((a, b) => {
            const durationA = a.duration || 0;
            const durationB = b.duration || 0;
            // Sort descending: 3, 2, 1, 0
            return durationB - durationA;
        });
    });
    
    // Place sorted items in grid cells
    Object.keys(itemsByCell).forEach(cellId => {
        const cellEl = document.getElementById(cellId);
        if (cellEl) {
            const items = itemsByCell[cellId];
            cellEl.innerHTML = items.map(item => renderDurationItem(item, isLocked, duration1Title, duration2Title, duration3Title)).join('');
        }
    });
    
    // Show empty state for cells with no items
    for (let value = 1; value <= 3; value++) {
        for (let urgency = 1; urgency <= 3; urgency++) {
            const cellId = `durationCell-${value}-${urgency}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl && cellEl.innerHTML.trim() === '') {
                cellEl.innerHTML = '<div style="text-align: center; color: #999; padding: 10px; font-size: 12px; font-style: italic;">Empty</div>';
            }
        }
    }
}

// Render a single item in the duration view
function renderDurationItem(item, isLocked, duration1Title, duration2Title, duration3Title) {
    const duration = item.duration || 0;
    const isActive = item.active !== false;
    const isEmpty = duration === 0 || !duration;
    
    // In duration stage, can set duration if locked, or if unlocked and value is set
    const canSetDuration = isLocked ? true : (item.valueSet || (item.value && item.value > 0));
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    
    return `
        <div class="duration-item ${!isActive ? 'item-inactive' : ''}" data-item-id="${item.id}">
            <span class="duration-item-name">${escapeHtml(item.name)}${linkHtml}</span>
            <div class="duration-item-controls">
                <select class="duration-select ${isEmpty ? 'duration-select-empty' : ''}" 
                        data-item-id="${item.id}" 
                        data-property="duration"
                        ${!canSetDuration ? 'disabled' : ''}
                        title="${!canSetDuration ? 'Cannot set duration' : 'Set duration'}">
                    <option value="3" ${duration === 3 ? 'selected' : ''}>${escapeHtml(duration3Title)}</option>
                    <option value="2" ${duration === 2 ? 'selected' : ''}>${escapeHtml(duration2Title)}</option>
                    <option value="1" ${duration === 1 ? 'selected' : ''}>${escapeHtml(duration1Title)}</option>
                    <option value="" ${isEmpty ? 'selected' : ''}>—</option>
                </select>
            </div>
        </div>
    `;
}

// Display Results view (only visible in Results stage)
export function updateResultsView() {
    const resultsViewSection = document.getElementById('resultsViewSection');
    if (!resultsViewSection) return;
    
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    
    if (currentStage === 'Results') {
        resultsViewSection.style.display = 'block';
        
        // Assign sequence numbers if not already assigned
        const items = Store.getItems();
        const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
        if (itemsWithSequence.length === 0) {
            assignSequenceNumbers(items);
            Store.saveItems(items);
        }
        
        displayResultsContent();
    } else {
        resultsViewSection.style.display = 'none';
    }
}

// Reset order to CD3 descending
export function resetResultsOrder() {
    const items = Store.getItems();
    
    // Clear all sequence numbers
    items.forEach(item => {
        item.sequence = null;
    });
    
    // Reassign based on CD3 order
    assignSequenceNumbers(items);
    Store.saveItems(items);
    
    // Refresh the view
    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    if (currentStage === 'Results') {
        displayResultsContent();
    }
}

// Display the content of the Results view
function displayResultsContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;
    
    if (items.length === 0) {
        resultsList.innerHTML = '<div class="empty-state" style="text-align: center; color: #999; padding: 40px; font-style: italic;">No items to display.</div>';
        return;
    }
    
    // Get bucket titles
    const urgency1Title = buckets.urgency[1]?.title || 'Title';
    const urgency2Title = buckets.urgency[2]?.title || 'Title';
    const urgency3Title = buckets.urgency[3]?.title || 'Title';
    const value1Title = buckets.value[1]?.title || 'Title';
    const value2Title = buckets.value[2]?.title || 'Title';
    const value3Title = buckets.value[3]?.title || 'Title';
    const duration1Title = buckets.duration[1]?.title || '1-3d';
    const duration2Title = buckets.duration[2]?.title || '1-3w';
    const duration3Title = buckets.duration[3]?.title || '1-3mo';
    
    // Get items with sequence numbers
    const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
    
    // Sort by sequence if available, otherwise by CD3
    const sortedItems = itemsWithSequence.length > 0 
        ? [...items].sort((a, b) => {
            const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
        })
        : getItemsSortedByCD3(items);
    
    if (sortedItems.length === 0) {
        resultsList.innerHTML = '<div class="empty-state" style="text-align: center; color: #999; padding: 40px; font-style: italic;">No items to display.</div>';
        return;
    }
    
    // Find min and max sequence for arrow button enabling
    const sequences = sortedItems.map(i => i.sequence).filter(s => s !== null && s !== undefined);
    const minSequence = sequences.length > 0 ? Math.min(...sequences) : 1;
    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : sortedItems.length;
    
    // Render ranked list
    resultsList.innerHTML = sortedItems.map((item, index) => {
        const slotNumber = item.sequence !== null && item.sequence !== undefined ? item.sequence : index + 1;
        const cd3 = item.CD3 || 0;
        const cd3Formatted = cd3.toFixed(2);
        const isActive = item.active !== false;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        
        // Get bucket names for urgency, value, and duration
        const urgency = item.urgency || 0;
        const urgencyTitle = urgency === 1 ? urgency1Title : urgency === 2 ? urgency2Title : urgency === 3 ? urgency3Title : '—';
        const urgencyDisplay = urgency > 0 ? `${urgency} (${escapeHtml(urgencyTitle)})` : '—';
        
        const value = item.value || 0;
        const valueTitle = value === 1 ? value1Title : value === 2 ? value2Title : value === 3 ? value3Title : '—';
        const valueDisplay = value > 0 ? `${value} (${escapeHtml(valueTitle)})` : '—';
        
        const duration = item.duration || 0;
        const durationTitle = duration === 1 ? duration1Title : duration === 2 ? duration2Title : duration === 3 ? duration3Title : '—';
        const durationDisplay = duration > 0 ? `${duration} (${escapeHtml(durationTitle)})` : '—';
        
        const canMoveUp = item.sequence !== null && item.sequence !== undefined && item.sequence > minSequence;
        const canMoveDown = item.sequence !== null && item.sequence !== undefined && item.sequence < maxSequence;
        
        return `
            <div class="results-item ${!isActive ? 'item-inactive' : ''}" data-item-id="${item.id}">
                <div class="results-slot">${slotNumber}</div>
                <div class="results-item-controls">
                    <button class="results-arrow-btn results-arrow-up" 
                            data-item-id="${item.id}" 
                            data-direction="up"
                            ${!canMoveUp ? 'disabled' : ''}
                            title="Move up">↑</button>
                    <button class="results-arrow-btn results-arrow-down" 
                            data-item-id="${item.id}" 
                            data-direction="down"
                            ${!canMoveDown ? 'disabled' : ''}
                            title="Move down">↓</button>
                </div>
                <div class="results-item-details">
                    <div class="results-item-name">${escapeHtml(item.name)}${linkHtml}</div>
                    <div class="results-item-metrics">
                        <span class="results-metric">Urgency: ${urgencyDisplay}</span>
                        <span class="results-metric">Value: ${valueDisplay}</span>
                        <span class="results-metric">Duration: ${durationDisplay}</span>
                        <span class="results-cd3">CD3: ${cd3Formatted}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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

// ============================================================================
// Header Info Icon and Modal Functions
// ============================================================================

// Render header with clickable link when active
function renderHeaderWithInfoIcon(headerEl, title, category, level, isActive) {
    if (!headerEl) return;
    
    // Clear content
    headerEl.innerHTML = '';
    
    // If active, make the title a clickable link
    if (isActive) {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'header-info-link';
        link.setAttribute('data-category', category);
        link.setAttribute('data-level', level.toString());
        link.setAttribute('title', 'Click for description');
        link.textContent = title;
        headerEl.appendChild(link);
    } else {
        // If not active, just show plain text
        headerEl.textContent = title;
    }
}

// Open header info modal with description
function openHeaderInfoModal(category, level, title, description) {
    const modal = document.getElementById('headerInfoModal');
    const modalTitle = document.getElementById('headerInfoModalTitle');
    const modalDescription = document.getElementById('headerInfoModalDescription');
    
    if (!modal || !modalTitle || !modalDescription) return;
    
    modalTitle.textContent = title;
    modalDescription.textContent = description || 'No description available.';
    modal.classList.add('active');
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Close header info modal
function closeHeaderInfoModal() {
    const modal = document.getElementById('headerInfoModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Setup event delegation for header info icons (only once)
let headerInfoListenersSetup = false;

function setupHeaderInfoIconListeners() {
    if (headerInfoListenersSetup) return;
    headerInfoListenersSetup = true;
    
    // Use event delegation on document for dynamically added header links
    document.addEventListener('click', (e) => {
        const headerLink = e.target.closest('.header-info-link');
        if (!headerLink) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const category = headerLink.getAttribute('data-category');
        const level = parseInt(headerLink.getAttribute('data-level'));
        
        if (!category || !level) return;
        
        // Get description from buckets
        const appState = Store.getAppState();
        const buckets = appState.buckets;
        
        if (!buckets || !buckets[category] || !buckets[category][level]) {
            return;
        }
        
        const bucket = buckets[category][level];
        const title = bucket.title || `${category} ${level}`;
        const description = bucket.description || 'No description available.';
        
        openHeaderInfoModal(category, level, title, description);
    });
    
    // Close modal when clicking backdrop or close button
    const modal = document.getElementById('headerInfoModal');
    const closeBtn = document.getElementById('headerInfoModalClose');
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Close if clicking backdrop (not the container)
            if (e.target.classList.contains('header-info-modal-backdrop')) {
                closeHeaderInfoModal();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeHeaderInfoModal();
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('headerInfoModal');
            if (modal && modal.classList.contains('active')) {
                closeHeaderInfoModal();
            }
        }
    });
}

// Initialize header info icon listeners on page load
if (typeof document !== 'undefined') {
    const initHeaderInfoListeners = () => {
        setupHeaderInfoIconListeners();
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderInfoListeners);
    } else {
        initHeaderInfoListeners();
    }
}

