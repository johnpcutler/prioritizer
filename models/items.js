import { PROPERTY_META } from './constants.js';
import { STORAGE_KEY } from './constants.js';

// Normalize item - ensures all required properties exist
export function normalizeItem(item) {
    // Set flags migration
    if (item.urgencySet === undefined || item.urgencySet === null) {
        item.urgencySet = (item.urgency > 0);
    }
    if (item.valueSet === undefined || item.valueSet === null) {
        item.valueSet = (item.value > 0);
    }
    if (item.durationSet === undefined || item.durationSet === null) {
        item.durationSet = (item.duration > 0);
    }
    
    // Default values
    if (item.active === undefined || item.active === null) {
        item.active = true;
    }
    if (item.costOfDelay === undefined || item.costOfDelay === null) {
        item.costOfDelay = 0;
    }
    if (item.CD3 === undefined || item.CD3 === null) {
        item.CD3 = 0;
    }
    if (item.sequence === undefined || item.sequence === null) {
        item.sequence = null;
    }
    
    // Normalize link - validate if present, otherwise set to null
    if (item.link !== undefined && item.link !== null && item.link !== '') {
        if (isValidUrl(item.link)) {
            item.link = item.link.trim();
        } else {
            // Invalid URL - set to null
            item.link = null;
        }
    } else {
        item.link = null;
    }
    
    return item;
}

// Calculate board position based on urgency, value, and duration
export function calculateBoardPosition(item) {
    const urgency = item.urgency || 0;
    const value = item.value || 0;
    const duration = item.duration || 0;
    
    let row, col, durationBucket;
    
    if (urgency === 0 && value === 0 && duration === 0) {
        row = 0;
        col = 0;
        durationBucket = null;
    } else if (urgency > 0 && value === 0) {
        row = 0;
        col = urgency;
        durationBucket = null;
    } else if (value > 0) {
        row = value;
        col = urgency || 0;
        durationBucket = duration > 0 ? duration : null;
    } else {
        row = 0;
        col = 0;
        durationBucket = null;
    }
    
    item.boardPosition = { row, col, duration: durationBucket };
    return item.boardPosition;
}

// Calculate cost of delay for an item
export function calculateCostOfDelay(item, buckets) {
    if (!item.urgency || item.urgency === 0 || !item.value || item.value === 0) {
        item.costOfDelay = 0;
        return;
    }
    
    const urgencyWeight = buckets.urgency[item.urgency]?.weight || 1;
    const valueWeight = buckets.value[item.value]?.weight || 1;
    item.costOfDelay = urgencyWeight * valueWeight;
}

// Calculate CD3 for an item
export function calculateCD3(item, buckets) {
    if (!item.duration || item.duration === 0) {
        item.CD3 = 0;
        return;
    }
    if (!item.costOfDelay || item.costOfDelay === 0) {
        item.CD3 = 0;
        return;
    }
    
    const durationWeight = buckets.duration[item.duration]?.weight || 1;
    item.CD3 = item.costOfDelay / durationWeight;
}

// Unified item metric calculator
export function recomputeItemMetrics(item, buckets) {
    calculateBoardPosition(item);
    calculateCostOfDelay(item, buckets);
    calculateCD3(item, buckets);
}

// Counter for unique IDs (ensures uniqueness even when items are created in the same millisecond)
let itemIdCounter = 0;

// Validate URL format
export function isValidUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') {
        return false;
    }
    
    // Trim whitespace
    urlString = urlString.trim();
    
    // Basic URL pattern validation
    // Must start with http:// or https://
    const urlPattern = /^https?:\/\/.+/i;
    
    if (!urlPattern.test(urlString)) {
        return false;
    }
    
    // Try to create a URL object to validate
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Create a new item
export function createItem(name, link = null) {
    // Use timestamp + counter to ensure unique IDs even when created in bulk
    const uniqueId = `${Date.now()}-${++itemIdCounter}`;
    
    // Validate link if provided
    let validatedLink = null;
    if (link) {
        if (isValidUrl(link)) {
            validatedLink = link.trim();
        } else {
            // Invalid URL - we'll store it but it won't be displayed as a link
            // This allows for graceful degradation
            validatedLink = null;
        }
    }
    
    return normalizeItem({
        id: uniqueId,
        name: name,
        link: validatedLink,
        urgency: 0,
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        costOfDelay: 0,
        CD3: 0,
        active: true,
        sequence: null,
        createdAt: new Date().toISOString()
    });
}

// Validate property prerequisites
export function validatePropertyPrerequisites(item, property) {
    const meta = PROPERTY_META[property];
    if (!meta) {
        return { valid: false, error: `Invalid property: ${property}` };
    }
    
    for (const prereq of meta.prerequisites) {
        const prereqSetFlag = prereq + 'Set';
        if (!item[prereqSetFlag]) {
            return {
                valid: false,
                error: `Error: Cannot set ${property.charAt(0).toUpperCase() + property.slice(1)}. Item must have ${prereq.charAt(0).toUpperCase() + prereq.slice(1)} set first. Please set ${prereq.charAt(0).toUpperCase() + prereq.slice(1)} (1-3) before setting ${property.charAt(0).toUpperCase() + property.slice(1)}.`
            };
        }
    }
    
    return { valid: true };
}

// Validate that property cannot be unset once set
export function validatePropertyUnset(item, property, value) {
    if (property !== 'urgency' && property !== 'value' && property !== 'duration') {
        return { valid: true };
    }
    
    const setFlag = property + 'Set';
    if (value === 0 && item[setFlag]) {
        return {
            valid: false,
            error: `Error: Cannot unset ${property.charAt(0).toUpperCase() + property.slice(1)}. Once ${property.charAt(0).toUpperCase() + property.slice(1)} has been set, it cannot be changed back to 0. You can change it to a different value (1-3), but not unset it.`
        };
    }
    
    return { valid: true };
}

// Update item property with validation and metric recalculation
export function updateItemProperty(item, property, value, buckets) {
    // Validate prerequisites
    const prereqCheck = validatePropertyPrerequisites(item, property);
    if (!prereqCheck.valid) {
        return prereqCheck;
    }
    
    // Validate unset prevention
    const unsetCheck = validatePropertyUnset(item, property, value);
    if (!unsetCheck.valid) {
        return unsetCheck;
    }
    
    // Set the property
    item[property] = value;
    
    // Update set flag if setting to non-zero value for first time
    if (property === 'urgency' || property === 'value' || property === 'duration') {
        const setFlag = property + 'Set';
        if (value > 0 && !item[setFlag]) {
            item[setFlag] = true;
        }
    }
    
    // Recompute all metrics
    recomputeItemMetrics(item, buckets);
    
    return { valid: true };
}

// Recalculate cost of delay for all items (needs Store reference)
export function recalculateAllCostOfDelay(buckets, getItemsFn, saveItemsFn) {
    const items = getItemsFn();
    items.forEach(item => {
        calculateCostOfDelay(item, buckets);
        calculateCD3(item, buckets); // CD3 depends on costOfDelay
    });
    saveItemsFn(items);
    return items;
}

// Recalculate CD3 for all items (needs Store reference)
export function recalculateAllCD3(buckets, getItemsFn, saveItemsFn) {
    const items = getItemsFn();
    items.forEach(item => {
        calculateCD3(item, buckets);
    });
    saveItemsFn(items);
    return items;
}

// Get items sorted by CD3 in descending order (highest CD3 first)
export function getItemsSortedByCD3(items) {
    // Create a copy to avoid mutating the original array
    const sortedItems = [...items];
    
    // Sort by CD3 descending, then by name ascending as tiebreaker
    sortedItems.sort((a, b) => {
        const cd3A = a.CD3 || 0;
        const cd3B = b.CD3 || 0;
        
        // Primary sort: CD3 descending
        if (cd3B !== cd3A) {
            return cd3B - cd3A;
        }
        
        // Secondary sort: name ascending (alphabetical)
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    return sortedItems;
}

// Assign sequence numbers to items based on CD3 order
export function assignSequenceNumbers(items) {
    // Get items sorted by CD3
    const sortedItems = getItemsSortedByCD3(items);
    
    // Assign sequence numbers 1, 2, 3...
    sortedItems.forEach((item, index) => {
        // Only assign if sequence is null/undefined
        if (item.sequence === null || item.sequence === undefined) {
            item.sequence = index + 1;
        }
    });
    
    return items;
}

// Reorder item sequence (move up or down)
// Remove an item from the items array
export function removeItem(itemId, items) {
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) {
        return { success: false, error: 'Item not found' };
    }
    
    items.splice(index, 1);
    return { success: true };
}

export function reorderItemSequence(itemId, direction, items) {
    // Find the item
    const item = items.find(i => i.id === itemId);
    if (!item || item.sequence === null || item.sequence === undefined) {
        return { success: false, error: 'Item not found or has no sequence' };
    }
    
    const currentSequence = item.sequence;
    const targetSequence = direction === 'up' ? currentSequence - 1 : currentSequence + 1;
    
    // Validate bounds
    const minSequence = 1;
    const maxSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined).length;
    
    if (targetSequence < minSequence || targetSequence > maxSequence) {
        return { success: false, error: 'Cannot move item beyond bounds' };
    }
    
    // Find the item that currently has the target sequence
    const displacedItem = items.find(i => i.sequence === targetSequence && i.id !== itemId);
    
    // Swap sequences
    if (displacedItem) {
        displacedItem.sequence = currentSequence;
    }
    item.sequence = targetSequence;
    
    return { success: true };
}


