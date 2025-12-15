import { STAGE_CONTROLLER } from '../../models/stages.js';
import { Store } from '../../state/appState.js';
import { escapeHtml } from '../forms.js';
import { updateStageView } from '../stageView.js';
import { getValueParkingLotItems, allItemsWithUrgencyHaveValue, canSetValue } from '../../models/derived/items.js';
import { trackStageView } from '../../analytics/stageEvents.js';

// Display value view (only visible in value stage)
export function updateValueView() {
    updateStageView({
        sectionId: 'valueViewSection',
        stage: 'value',
        render: displayValueViewContent,
        onFirstShow: () => {
            const items = Store.getItems();
            trackStageView('value', items);
        }
    });
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
    const itemsWithoutValue = getValueParkingLotItems(items);
    
    // Update callout message based on whether all items have value
    const valueCallout = document.getElementById('valueCallout');
    if (valueCallout) {
        // Check if all items that have urgency also have value
        const allItemsHaveValue = allItemsWithUrgencyHaveValue(items);
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
                   const itemHtml = renderValueItem(item, isLocked, appState);
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
    
    // Check if all items have value (parking lot is empty)
    const allItemsHaveValue = allItemsWithUrgencyHaveValue(items);
    
    // Get merged box element
    const mergedBox = document.getElementById('valueNoValueBoxMerged');
    const mergedContent = document.getElementById('valueNoValueContentMerged');
    
    if (allItemsHaveValue) {
        // Hide individual boxes and show merged box with "Advance To Duration" button
        for (let urgency = 1; urgency <= 3; urgency++) {
            const contentId = `valueNoValueBox${urgency}`;
            const contentEl = document.getElementById(contentId);
            if (contentEl) {
                const parentBox = contentEl.closest('.parking-lot-box');
                if (parentBox) {
                    parentBox.style.display = 'none';
                }
            }
        }
        
        if (mergedBox && mergedContent) {
            mergedBox.style.display = 'flex';
            mergedContent.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; padding: 20px; min-height: 100px;">
                    <button id="advanceToDurationBtn" class="submit-btn">Advance To Duration</button>
                </div>
            `;
            mergedContent.classList.remove('empty');
        }
    } else {
        // Show individual boxes and hide merged box
        if (mergedBox) {
            mergedBox.style.display = 'none';
        }
        
        for (let urgency = 1; urgency <= 3; urgency++) {
            const contentId = `valueNoValueBox${urgency}`;
            const contentEl = document.getElementById(contentId);
            if (contentEl) {
                // Show the parent box
                const parentBox = contentEl.closest('.parking-lot-box');
                if (parentBox) {
                    parentBox.style.display = 'flex';
                }
                const itemsForUrgency = itemsByUrgency[urgency];
                if (itemsForUrgency.length === 0) {
                    contentEl.innerHTML = '<div class="empty">No items</div>';
                    contentEl.classList.add('empty');
                } else {
                    contentEl.classList.remove('empty');
                           contentEl.innerHTML = itemsForUrgency.map(item => renderValueItem(item, isLocked, appState)).join('');
                }
            }
        }
    }
}

// Render a single item in the value view
function renderValueItem(item, isLocked, appState) {
    const value = item.value || 0;
    const urgency = item.urgency || 0;
    const isActive = item.active !== false;
    const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
    
    // In value stage, can set value if locked, or if unlocked and urgency is set
    const canSetValueFlag = canSetValue(item, appState);
    
    const canIncrement = canSetValueFlag && value < 3;
    const canDecrement = canSetValueFlag && value > 1;
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

