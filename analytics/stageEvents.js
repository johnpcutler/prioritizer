import { analytics } from './analytics.js';
import { getParkingLotItems, getValueParkingLotItems } from '../models/derived/items.js';
import { getItemsSortedByCD3 } from '../models/items.js';

/**
 * Track analytics event when a stage view is first shown.
 * This centralizes all stage view analytics logic.
 * 
 * @param {string} stage - The stage name ('Item Listing', 'urgency', 'value', 'duration', 'Results')
 * @param {Array} items - Array of all items
 */
export function trackStageView(stage, items) {
    switch (stage) {
        case 'Item Listing':
            return analytics.trackEvent('View Items', {
                itemsCount: items.length
            });
        
        case 'urgency':
            return analytics.trackEvent('View Urgency', {
                parkingLotCount: getParkingLotItems(items, 'urgency').length
            });
        
        case 'value':
            return analytics.trackEvent('View Value', {
                parkingLotCount: getValueParkingLotItems(items).length
            });
        
        case 'duration':
            return analytics.trackEvent('View Duration', {
                totalItems: items.length
            });
        
        case 'Results':
            // Calculate results count (items with sequence numbers, or sorted by CD3)
            const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
            const sortedItems = itemsWithSequence.length > 0 
                ? [...items].sort((a, b) => {
                    const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
                    const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
                    return seqA - seqB;
                })
                : getItemsSortedByCD3(items);
            return analytics.trackEvent('View Results', {
                resultsCount: sortedItems.length
            });
        
        default:
            // Unknown stage, don't track
            return;
    }
}

