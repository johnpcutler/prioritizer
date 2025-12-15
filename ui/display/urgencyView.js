import { STAGE_CONTROLLER } from '../../models/stages.js';
import { Store } from '../../state/appState.js';
import { escapeHtml } from '../forms.js';
import { updateStageView } from '../stageView.js';
import { getParkingLotItems, allItemsHave } from '../../models/derived/items.js';
import { trackStageView } from '../../analytics/stageEvents.js';

// Display urgency view (only visible in urgency stage)
export function updateUrgencyView() {
    updateStageView({
        sectionId: 'urgencyViewSection',
        stage: 'urgency',
        render: displayUrgencyViewContent,
        onFirstShow: () => {
            const items = Store.getItems();
            trackStageView('urgency', items);
        }
    });
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
    const itemsWithoutUrgency = getParkingLotItems(items, 'urgency');
    
    // Update callout message based on whether all items have urgency
    const urgencyCallout = document.getElementById('urgencyCallout');
    if (urgencyCallout) {
        const allItemsHaveUrgency = allItemsHave(items, 'urgency');
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
            // Show "Advance To Value" button when parking lot is empty
            noValueContent.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; padding: 20px; min-height: 100px;">
                    <button id="advanceToValueBtn" class="submit-btn">Advance To Value</button>
                </div>
            `;
            noValueContent.classList.remove('empty');
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

