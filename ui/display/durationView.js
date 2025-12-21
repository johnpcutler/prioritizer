import { STAGE_CONTROLLER } from '../../models/stages.js';
import { Store } from '../../state/appState.js';
import { escapeHtml } from '../forms.js';
import { updateStageView } from '../stageView.js';
import { allItemsWithValueAndUrgencyHaveDuration, canSetDuration } from '../../models/derived/items.js';
import { renderItemHeader, getItemCardClasses } from '../render/itemHeader.js';
import { trackStageView } from '../../analytics/stageEvents.js';
import { initCalloutInfoIcons } from '../overlay/calloutOverlay.js';

// Display duration view (only visible in duration stage)
export function updateDurationView() {
    updateStageView({
        sectionId: 'durationViewSection',
        stage: 'duration',
        render: displayDurationViewContent,
        onFirstShow: () => {
            const items = Store.getItems();
            trackStageView('duration', items);
        }
    });
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
        const allItemsHaveDuration = allItemsWithValueAndUrgencyHaveDuration(items);
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
                   cellEl.innerHTML = items.map(item => renderDurationItem(item, isLocked, duration1Title, duration2Title, duration3Title, appState)).join('');
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
    
    // Render parking lot row - only shows "Advance To Results" button when all durations are set
    const durationNoValueContent = document.getElementById('durationNoValueContent');
    if (durationNoValueContent) {
        const allItemsHaveDuration = allItemsWithValueAndUrgencyHaveDuration(items);
        if (allItemsHaveDuration) {
            // Show "Advance To Results" button when all items have duration
            durationNoValueContent.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; padding: 20px; min-height: 100px;">
                    <button id="advanceToResultsBtn" class="submit-btn">Advance To Results</button>
                </div>
            `;
            durationNoValueContent.classList.remove('empty');
        } else {
            // Show empty state - no items go in parking lot for duration
            durationNoValueContent.innerHTML = '<div class="empty">No items</div>';
            durationNoValueContent.classList.add('empty');
        }
    }
    
    // Initialize callout info icon for mobile
    initCalloutInfoIcons();
}

// Render a single item in the duration view
function renderDurationItem(item, isLocked, duration1Title, duration2Title, duration3Title, appState) {
    const duration = item.duration || 0;
    const isEmpty = duration === 0 || !duration;
    
    // In duration stage, can set duration if locked, or if unlocked and value is set
    const canSetDurationFlag = canSetDuration(item, appState);
    
    const headerHtml = renderItemHeader(item, { nameClass: 'item-name duration-item-name' });
    const cardClasses = getItemCardClasses(item, 'item-card duration-item');
    
    return `
        <div class="${cardClasses}" data-item-id="${item.id}">
            ${headerHtml}
            <div class="item-controls duration-item-controls">
                <select class="select input-sm input-border-light duration-select ${isEmpty ? 'duration-select-empty' : ''}" 
                        data-item-id="${item.id}" 
                        data-property="duration"
                               ${!canSetDurationFlag ? 'disabled' : ''}
                               title="${!canSetDurationFlag ? 'Cannot set duration' : 'Set duration'}">
                    <option value="3" ${duration === 3 ? 'selected' : ''}>${escapeHtml(duration3Title)}</option>
                    <option value="2" ${duration === 2 ? 'selected' : ''}>${escapeHtml(duration2Title)}</option>
                    <option value="1" ${duration === 1 ? 'selected' : ''}>${escapeHtml(duration1Title)}</option>
                    <option value="" ${isEmpty ? 'selected' : ''}>—</option>
                </select>
            </div>
        </div>
    `;
}

