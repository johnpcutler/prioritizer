import { STAGE_CONTROLLER, STAGE_ORDER } from '../models/stages.js';
import { Store } from '../state/appState.js';
import { escapeHtml } from './forms.js';
import { getItemsSortedByCD3, assignSequenceNumbers, reorderItemSequence, calculateConfidenceWeightedCD3 } from '../models/items.js';
import { analytics } from '../analytics/analytics.js';

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
    
    // Check if view was previously hidden
    const wasHidden = itemListingViewSection.style.display === 'none' || !itemListingViewSection.style.display;
    
    // Only show in Item Listing stage
    if (currentStage === 'Item Listing') {
        itemListingViewSection.style.display = 'block';
        displayItemListingContent();
        
        // Track analytics event only when view transitions from hidden to visible
        if (wasHidden) {
            const items = Store.getItems();
            const itemsCount = items.length;
            analytics.trackEvent('View Items', { itemsCount });
        }
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
        const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
        
        return `
            <div class="list-item-card item-listing-item ${!isActive ? 'list-item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
                <span class="list-item-card-name item-listing-item-name">${escapeHtml(item.name)}${linkHtml} ${notesBadgeHtml}</span>
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
    
    // Check if view was previously hidden
    const wasHidden = valueViewSection.style.display === 'none' || !valueViewSection.style.display;
    
    // Only show in value stage
    if (currentStage === 'value') {
        valueViewSection.style.display = 'block';
        displayValueViewContent();
        
        // Track analytics event only when view transitions from hidden to visible
        if (wasHidden) {
            const items = Store.getItems();
            const parkingLotCount = items.filter(item => (!item.value || item.value === 0) && item.urgency && item.urgency > 0).length;
            analytics.trackEvent('View Value', { parkingLotCount });
        }
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
    
    // Check if view was previously hidden
    const wasHidden = durationViewSection.style.display === 'none' || !durationViewSection.style.display;
    
    // Only show in duration stage
    if (currentStage === 'duration') {
        durationViewSection.style.display = 'block';
        displayDurationViewContent();
        
        // Track analytics event only when view transitions from hidden to visible
        if (wasHidden) {
            const items = Store.getItems();
            const totalItems = items.length;
            analytics.trackEvent('View Duration', { totalItems });
        }
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
    
    // Check if view was previously hidden
    const wasHidden = urgencyViewSection.style.display === 'none' || !urgencyViewSection.style.display;
    
    // Only show in urgency stage
    if (currentStage === 'urgency') {
        urgencyViewSection.style.display = 'block';
        displayUrgencyViewContent();
        
        // Track analytics event only when view transitions from hidden to visible
        if (wasHidden) {
            const items = Store.getItems();
            const parkingLotCount = items.filter(item => !item.urgency || item.urgency === 0).length;
            analytics.trackEvent('View Urgency', { parkingLotCount });
        }
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
    
    // Update header labels (matching value/duration view structure)
    // Make them clickable links when on urgency stage
    const label1El = document.getElementById('urgencyViewUrgencyColumnLabel1');
    const label2El = document.getElementById('urgencyViewUrgencyColumnLabel2');
    const label3El = document.getElementById('urgencyViewUrgencyColumnLabel3');
    
    if (label1El) {
        if (currentStage === 'urgency') {
            label1El.innerHTML = `<a href="#" class="header-link" data-category="urgency" data-level="1">${escapeHtml(urgency1Title)}</a>`;
        } else {
            label1El.textContent = urgency1Title;
        }
    }
    if (label2El) {
        if (currentStage === 'urgency') {
            label2El.innerHTML = `<a href="#" class="header-link" data-category="urgency" data-level="2">${escapeHtml(urgency2Title)}</a>`;
        } else {
            label2El.textContent = urgency2Title;
        }
    }
    if (label3El) {
        if (currentStage === 'urgency') {
            label3El.innerHTML = `<a href="#" class="header-link" data-category="urgency" data-level="3">${escapeHtml(urgency3Title)}</a>`;
        } else {
            label3El.textContent = urgency3Title;
        }
    }
    
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
            urgencyCallout.innerHTML = 'When you are done categorizing items, you can advance to Value. To learn more about why we start with Urgency, check out this short video: <a href="https://youtu.be/ha46hhcGOY0" target="_blank" rel="noopener noreferrer">https://youtu.be/ha46hhcGOY0</a>';
        } else {
            urgencyCallout.innerHTML = 'Categorize each of your items by urgency. To learn more about why we start with Urgency, check out this short video: <a href="https://youtu.be/ha46hhcGOY0" target="_blank" rel="noopener noreferrer">https://youtu.be/ha46hhcGOY0</a>';
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
    const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
    
    return `
        <div class="item-card urgency-item ${!isActive ? 'item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
            <div>
                <span class="item-name urgency-item-name">${escapeHtml(item.name)}${linkHtml} ${notesBadgeHtml}</span>
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
    
    // Update row labels (Value)
    // Make them clickable links when on value stage
    const valueRowLabel1 = document.getElementById('valueRowLabel1');
    const valueRowLabel2 = document.getElementById('valueRowLabel2');
    const valueRowLabel3 = document.getElementById('valueRowLabel3');
    
    if (valueRowLabel1) {
        if (currentStage === 'value') {
            valueRowLabel1.innerHTML = `<a href="#" class="header-link" data-category="value" data-level="1">${escapeHtml(value1Title)}</a>`;
        } else {
            valueRowLabel1.textContent = value1Title;
        }
    }
    if (valueRowLabel2) {
        if (currentStage === 'value') {
            valueRowLabel2.innerHTML = `<a href="#" class="header-link" data-category="value" data-level="2">${escapeHtml(value2Title)}</a>`;
        } else {
            valueRowLabel2.textContent = value2Title;
        }
    }
    if (valueRowLabel3) {
        if (currentStage === 'value') {
            valueRowLabel3.innerHTML = `<a href="#" class="header-link" data-category="value" data-level="3">${escapeHtml(value3Title)}</a>`;
        } else {
            valueRowLabel3.textContent = value3Title;
        }
    }
    
    // Update column labels (Urgency)
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
    const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
    
    // In value stage, can set value if locked, or if unlocked and urgency is set
    const canSetValue = isLocked ? true : (item.urgencySet || urgency > 0);
    
    const canIncrement = canSetValue && value < 3;
    const canDecrement = canSetValue && value > 1;
    const displayValue = value > 0 ? value : '—';
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
    
    return `
        <div class="item-card value-item ${!isActive ? 'item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
            <span class="item-name value-item-name">${escapeHtml(item.name)}${linkHtml} ${notesBadgeHtml}</span>
            <div class="item-controls value-item-controls">
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
    const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
    
    // In duration stage, can set duration if locked, or if unlocked and value is set
    const canSetDuration = isLocked ? true : (item.valueSet || (item.value && item.value > 0));
    
    const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
    const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
    
    return `
        <div class="item-card duration-item ${!isActive ? 'item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
            <span class="item-name duration-item-name">${escapeHtml(item.name)}${linkHtml} ${notesBadgeHtml}</span>
            <div class="item-controls duration-item-controls">
                <select class="select input-sm input-border-light duration-select ${isEmpty ? 'duration-select-empty' : ''}" 
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
    
    // Check if view was previously hidden
    const wasHidden = resultsViewSection.style.display === 'none' || !resultsViewSection.style.display;
    
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
        
        // Track analytics event only when view transitions from hidden to visible
        if (wasHidden) {
            // Get results count from displayResultsContent
            // We need to calculate it here since displayResultsContent doesn't return it
            const itemsWithSequenceForCount = items.filter(i => i.sequence !== null && i.sequence !== undefined);
            const sortedItems = itemsWithSequenceForCount.length > 0 
                ? [...items].sort((a, b) => {
                    const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
                    const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
                    return seqA - seqB;
                })
                : getItemsSortedByCD3(items);
            const resultsCount = sortedItems.length;
            analytics.trackEvent('View Results', { resultsCount });
        }
    } else {
        resultsViewSection.style.display = 'none';
    }
}

// Reset order to CD3 descending
export function resetResultsOrder() {
    const items = Store.getItems();
    
    // Clear all sequence numbers and "new" flags
    items.forEach(item => {
        item.sequence = null;
        item.addedToManuallySequencedList = false;
        item.reordered = false;
    });
    
    // Reassign based on CD3 order
    assignSequenceNumbers(items);
    Store.saveItems(items);
    
    // Clear manual reorder flag
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = false;
    Store.save(appState);
    
    // Refresh the view
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
    
    // Show/hide reset order button based on manual reorder flag
    const resetOrderBtn = document.getElementById('resetOrderBtn');
    if (resetOrderBtn) {
        resetOrderBtn.style.display = appState.resultsManuallyReordered ? 'block' : 'none';
    }
    
    // Update callout message based on manual reorder flag
    const resultsCallout = document.getElementById('resultsCallout');
    if (resultsCallout) {
        if (appState.resultsManuallyReordered) {
            resultsCallout.innerHTML = 'Here are your items. They were originally sorted by <a href="help.html#cd3" class="cd3-link">CD3</a>, but you adjusted sort sequence. Click Reset Order to resort';
        } else {
            resultsCallout.innerHTML = 'Here are your items sorted descending by weighted cost of delay (<a href="help.html#cd3" class="cd3-link">CD3</a>)';
        }
    }
    
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
    
    // Get confidence level labels
    const confidenceLabels = appState.confidenceLevelLabels || {
        1: "Not Confident (rarely, unlikely, low probability)",
        2: "Somewhat Confident (maybe, possibly, moderate probability)",
        3: "Confident (likely, probably, high probability)",
        4: "Very Confident (almost certainly, almost always, certainly)"
    };
    
    // Render ranked list
    resultsList.innerHTML = sortedItems.map((item, index) => {
        const slotNumber = item.sequence !== null && item.sequence !== undefined ? item.sequence : index + 1;
        const cd3 = item.CD3 || 0;
        const cd3Formatted = cd3.toFixed(2);
        const isActive = item.active !== false;
        const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
        
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
        
        // Calculate confidence-weighted CD3 if survey exists
        let confidenceWeightedCD3Html = '';
        if (item.hasConfidenceSurvey) {
            const weightedCD3 = calculateConfidenceWeightedCD3(item, appState);
            if (weightedCD3 !== null && weightedCD3 !== undefined) {
                const weightedCD3Formatted = weightedCD3.toFixed(2);
                const weightedValues = item.confidenceWeightedValues || {};
                const urgencyWeighted = weightedValues.urgency !== undefined ? weightedValues.urgency.toFixed(2) : '—';
                const valueWeighted = weightedValues.value !== undefined ? weightedValues.value.toFixed(2) : '—';
                const durationWeighted = weightedValues.duration !== undefined ? weightedValues.duration.toFixed(2) : '—';
                confidenceWeightedCD3Html = `<span class="results-cd3 confidence-weighted-cd3"><a href="help.html#confidence-weighted-cd3" class="cd3-link">Confidence Weighted CD3</a>: ${weightedCD3Formatted} (Urgency: ${urgencyWeighted}, Value: ${valueWeighted}, Duration: ${durationWeighted})</span>`;
            }
        }
        
        // Confidence survey buttons
        const hasSurvey = item.hasConfidenceSurvey === true;
        const canShowSurvey = urgency > 0 && value > 0 && duration > 0;
        let surveyButtonHtml = '';
        if (canShowSurvey) {
            if (!hasSurvey) {
                surveyButtonHtml = `<button class="btn btn-primary btn-sm confidence-survey-btn" data-item-id="${item.id}" data-action="open">Run confidence survey</button>`;
            } else {
                surveyButtonHtml = `
                    <button class="btn btn-primary btn-sm confidence-survey-btn" data-item-id="${item.id}" data-action="edit">Edit confidence survey</button>
                    <button class="btn btn-danger btn-sm confidence-survey-btn confidence-survey-delete-btn" data-item-id="${item.id}" data-action="delete">Delete survey</button>
                `;
            }
        }
        
        // Survey form HTML (initially hidden)
        const surveyFormHtml = canShowSurvey ? renderConfidenceSurveyForm(item, appState, confidenceLabels) : '';
        
        const canMoveUp = item.sequence !== null && item.sequence !== undefined && item.sequence > minSequence;
        const canMoveDown = item.sequence !== null && item.sequence !== undefined && item.sequence < maxSequence;
        
        return `
            <div class="list-item-card results-item ${!isActive ? 'list-item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
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
                    <div class="results-item-name">${escapeHtml(item.name)}${item.addedToManuallySequencedList ? ' <span class="new-item-badge">[New]</span>' : ''}${item.reordered ? ' <span class="reordered-badge">Reordered</span>' : ''}${linkHtml} ${notesBadgeHtml}</div>
                    <div class="results-item-metrics">
                        <span class="results-metric">Urgency: ${urgencyDisplay}</span>
                        <span class="results-metric">Value: ${valueDisplay}</span>
                        <span class="results-metric">Duration: ${durationDisplay}</span>
                        <span class="results-cd3"><a href="help.html#cd3" class="cd3-link">CD3</a>: ${cd3Formatted}</span>
                        ${confidenceWeightedCD3Html}
                    </div>
                    ${surveyButtonHtml ? `<div class="confidence-survey-buttons">${surveyButtonHtml}</div>` : ''}
                    ${surveyFormHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Render confidence survey form
function renderConfidenceSurveyForm(item, appState, confidenceLabels) {
    const survey = item.confidenceSurvey || {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
    };
    
    const urgency = item.urgency || 0;
    const urgencyTitle = urgency === 1 ? (appState.buckets.urgency[1]?.title || 'Title') : 
                         urgency === 2 ? (appState.buckets.urgency[2]?.title || 'Title') : 
                         urgency === 3 ? (appState.buckets.urgency[3]?.title || 'Title') : '—';
    
    const value = item.value || 0;
    const valueTitle = value === 1 ? (appState.buckets.value[1]?.title || 'Title') : 
                       value === 2 ? (appState.buckets.value[2]?.title || 'Title') : 
                       value === 3 ? (appState.buckets.value[3]?.title || 'Title') : '—';
    
    const duration = item.duration || 0;
    const durationTitle = duration === 1 ? (appState.buckets.duration[1]?.title || '1-3d') : 
                          duration === 2 ? (appState.buckets.duration[2]?.title || '1-3w') : 
                          duration === 3 ? (appState.buckets.duration[3]?.title || '1-3mo') : '—';
    
    const renderConfidenceSection = (dimension, questionText) => {
        const votes = survey[dimension] || {1: 0, 2: 0, 3: 0, 4: 0};
        return `
            <div class="confidence-survey-section">
                <div class="confidence-survey-question">${escapeHtml(questionText)}</div>
                <div class="confidence-vote-inputs">
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[1])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="1" value="${votes[1] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[2])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="2" value="${votes[2] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[3])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="3" value="${votes[3] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[4])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="4" value="${votes[4] || 0}" />
                    </div>
                </div>
            </div>
        `;
    };
    
    return `
        <div class="confidence-survey-form" data-item-id="${item.id}" style="display: none;">
            ${renderConfidenceSection('scopeConfidence', 'How confident are you in the scoping and shaping of this item?')}
            ${renderConfidenceSection('urgencyConfidence', `How confident are you in the ${urgency} (${escapeHtml(urgencyTitle)}) urgency categorization of this item?`)}
            ${renderConfidenceSection('valueConfidence', `How confident are you in the ${value} (${escapeHtml(valueTitle)}) value categorization of this item?`)}
            ${renderConfidenceSection('durationConfidence', `How confident are you in the ${duration} (${escapeHtml(durationTitle)}) duration categorization of this item?`)}
            <div class="confidence-survey-form-actions">
                <button class="btn btn-success confidence-survey-submit-btn" data-item-id="${item.id}">Submit</button>
                <button class="btn btn-secondary confidence-survey-cancel-btn" data-item-id="${item.id}">Cancel</button>
            </div>
        </div>
    `;
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

