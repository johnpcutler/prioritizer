import { Store } from '../../state/appState.js';
import { escapeHtml } from '../forms.js';
import { updateStageView } from '../stageView.js';
import { hasAdvancedItems, hasNewItems } from '../../models/derived/items.js';
import { trackStageView } from '../../analytics/stageEvents.js';

// Display item listing view (only visible in Item Listing stage)
export function updateItemListingView() {
    updateStageView({
        sectionId: 'itemListingViewSection',
        stage: 'Item Listing',
        render: displayItemListingContent,
        onFirstShow: () => {
            const items = Store.getItems();
            trackStageView('Item Listing', items);
        }
    });
}

// Display the content of the item listing view
function displayItemListingContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const itemsDisplay = document.getElementById('itemListingItemsDisplay');
    if (!itemsDisplay) return;
    
    // Check if any items have been advanced (have urgency set)
    const hasAdvancedItemsFlag = hasAdvancedItems(items);
    // Check if there are new items that need to be prioritized
    const hasNewItemsFlag = hasNewItems(items);
    
    // Show/hide sample initiatives button (only when no items exist)
    const sampleInitiativesBtn = document.getElementById('sampleInitiativesBtn');
    if (sampleInitiativesBtn) {
        if (items.length === 0) {
            sampleInitiativesBtn.style.display = 'block';
        } else {
            sampleInitiativesBtn.style.display = 'none';
        }
    }
    
    // Show/hide button based on state:
    // - Show "Start Prioritizing" when items exist but none have urgency set
    // - Show "Prioritize New Items" when items have been advanced AND there are new items
    // - Hide when items have been advanced but no new items
    const startPrioritizingBtn = document.getElementById('startPrioritizingBtn');
    if (startPrioritizingBtn) {
        if (!hasAdvancedItemsFlag && items.length > 0) {
            // Initial state: items exist but none prioritized - show "Start Prioritizing"
            startPrioritizingBtn.textContent = 'Start Prioritizing';
            startPrioritizingBtn.style.display = 'block';
        } else if (hasAdvancedItemsFlag && hasNewItemsFlag) {
            // Advanced state with new items - show "Prioritize New Items"
            startPrioritizingBtn.textContent = 'Prioritize New Items';
            startPrioritizingBtn.style.display = 'block';
        } else {
            // Advanced state but no new items - hide button
            startPrioritizingBtn.style.display = 'none';
        }
    }
    
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
    
    // Get bucket titles for display
    const urgency1Title = buckets.urgency?.[1]?.title || 'Title';
    const urgency2Title = buckets.urgency?.[2]?.title || 'Title';
    const urgency3Title = buckets.urgency?.[3]?.title || 'Title';
    const value1Title = buckets.value?.[1]?.title || 'Title';
    const value2Title = buckets.value?.[2]?.title || 'Title';
    const value3Title = buckets.value?.[3]?.title || 'Title';
    const duration1Title = buckets.duration?.[1]?.title || '1-3d';
    const duration2Title = buckets.duration?.[2]?.title || '1-3w';
    const duration3Title = buckets.duration?.[3]?.title || '1-3mo';
    
    itemsDisplay.innerHTML = items.map(item => {
        const isActive = item.active !== false;
        const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
        
        // Show [New] badge if item is new
        const newBadgeHtml = item.isNewItem === true ? ' <span class="new-item-badge">[New]</span>' : '';
        
        // Build values display
        const valuesParts = [];
        const urgency = item.urgency || 0;
        const value = item.value || 0;
        const duration = item.duration || 0;
        
        if (urgency > 0) {
            const urgencyTitle = urgency === 1 ? urgency1Title : urgency === 2 ? urgency2Title : urgency === 3 ? urgency3Title : '';
            const urgencyWeight = buckets.urgency?.[urgency]?.weight || 0;
            valuesParts.push(`Urgency: ${escapeHtml(urgencyTitle)} (${urgencyWeight})`);
        }
        if (value > 0) {
            const valueTitle = value === 1 ? value1Title : value === 2 ? value2Title : value === 3 ? value3Title : '';
            const valueWeight = buckets.value?.[value]?.weight || 0;
            valuesParts.push(`Value: ${escapeHtml(valueTitle)} (${valueWeight})`);
        }
        if (duration > 0) {
            const durationTitle = duration === 1 ? duration1Title : duration === 2 ? duration2Title : duration === 3 ? duration3Title : '';
            const durationWeight = buckets.duration?.[duration]?.weight || 0;
            valuesParts.push(`Duration: ${escapeHtml(durationTitle)} (${durationWeight})`);
        }
        
        const valuesHtml = valuesParts.length > 0 
            ? `<div class="item-listing-values" style="font-size: 12px; color: #666; margin-top: 4px;">${valuesParts.join(' | ')}</div>`
            : '';
        
        return `
            <div class="list-item-card item-listing-item ${!isActive ? 'list-item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
                <div style="flex: 1;">
                    <span class="list-item-card-name item-listing-item-name">${escapeHtml(item.name)}${linkHtml}${newBadgeHtml} ${notesBadgeHtml}</span>
                    ${valuesHtml}
                </div>
                <button class="item-remove-btn" data-item-id="${item.id}" title="Remove item">🗑️</button>
            </div>
        `;
    }).join('');
}

