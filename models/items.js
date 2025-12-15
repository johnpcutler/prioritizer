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
    if (item.addedToManuallySequencedList === undefined || item.addedToManuallySequencedList === null) {
        item.addedToManuallySequencedList = false;
    }
    if (item.reordered === undefined || item.reordered === null) {
        item.reordered = false;
    }
    if (item.isNewItem === undefined || item.isNewItem === null) {
        item.isNewItem = false;
    }
    
    // Normalize confidence survey fields
    if (item.hasConfidenceSurvey === undefined || item.hasConfidenceSurvey === null) {
        item.hasConfidenceSurvey = false;
    }
    if (item.confidenceSurvey === undefined || item.confidenceSurvey === null) {
        item.confidenceSurvey = {
            scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
        };
    } else {
        // Ensure all confidence dimensions exist with proper structure
        const defaultConfidence = {1: 0, 2: 0, 3: 0, 4: 0};
        item.confidenceSurvey = {
            scopeConfidence: item.confidenceSurvey.scopeConfidence || defaultConfidence,
            urgencyConfidence: item.confidenceSurvey.urgencyConfidence || defaultConfidence,
            valueConfidence: item.confidenceSurvey.valueConfidence || defaultConfidence,
            durationConfidence: item.confidenceSurvey.durationConfidence || defaultConfidence
        };
        // Ensure each dimension has all 4 levels
        ['scopeConfidence', 'urgencyConfidence', 'valueConfidence', 'durationConfidence'].forEach(dim => {
            if (!item.confidenceSurvey[dim]) {
                item.confidenceSurvey[dim] = {...defaultConfidence};
            } else {
                for (let i = 1; i <= 4; i++) {
                    if (item.confidenceSurvey[dim][i] === undefined || item.confidenceSurvey[dim][i] === null) {
                        item.confidenceSurvey[dim][i] = 0;
                    }
                }
            }
        });
    }
    if (item.confidenceWeightedCD3 === undefined || item.confidenceWeightedCD3 === null) {
        item.confidenceWeightedCD3 = null;
    }
    if (item.confidenceWeightedValues === undefined || item.confidenceWeightedValues === null) {
        item.confidenceWeightedValues = null;
    }
    
    // Normalize notes array
    if (item.notes === undefined || item.notes === null || !Array.isArray(item.notes)) {
        item.notes = [];
    } else {
        // Ensure each note has required structure
        item.notes = item.notes.map(note => {
            if (typeof note === 'string') {
                // Migrate old string notes to note objects
                return {
                    text: note,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                };
            }
            return {
                text: note.text || '',
                createdAt: note.createdAt || new Date().toISOString(),
                modifiedAt: note.modifiedAt || note.createdAt || new Date().toISOString()
            };
        });
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

// Calculate confidence average from vote counts
export function calculateConfidenceAverage(voteCounts, weights) {
    if (!voteCounts || !weights) {
        return null;
    }
    
    let totalVotes = 0;
    let weightedSum = 0;
    
    for (let level = 1; level <= 4; level++) {
        const count = voteCounts[level] || 0;
        const weight = weights[level] || 0;
        totalVotes += count;
        weightedSum += count * weight;
    }
    
    if (totalVotes === 0) {
        return null;
    }
    
    return weightedSum / totalVotes;
}

// Calculate confidence-weighted CD3 for an item
export function calculateConfidenceWeightedCD3(item, appState) {
    if (!item.hasConfidenceSurvey || !item.confidenceSurvey) {
        item.confidenceWeightedCD3 = null;
        return null;
    }
    
    // Get confidence weights from app state
    const confidenceWeights = appState.confidenceWeights || {
        1: 0.30,
        2: 0.50,
        3: 0.70,
        4: 0.90
    };
    
    // Get bucket weights
    const buckets = appState.buckets;
    if (!buckets) {
        item.confidenceWeightedCD3 = null;
        return null;
    }
    
    // Calculate confidence averages for each dimension
    const urgencyConfidenceAvg = calculateConfidenceAverage(
        item.confidenceSurvey.urgencyConfidence,
        confidenceWeights
    );
    const valueConfidenceAvg = calculateConfidenceAverage(
        item.confidenceSurvey.valueConfidence,
        confidenceWeights
    );
    const durationConfidenceAvg = calculateConfidenceAverage(
        item.confidenceSurvey.durationConfidence,
        confidenceWeights
    );
    
    // If any required confidence is missing, return null
    if (urgencyConfidenceAvg === null || valueConfidenceAvg === null || durationConfidenceAvg === null) {
        item.confidenceWeightedCD3 = null;
        item.confidenceWeightedValues = null;
        return null;
    }
    
    // Check if item has required properties
    if (!item.urgency || item.urgency === 0 || !item.value || item.value === 0 || !item.duration || item.duration === 0) {
        item.confidenceWeightedCD3 = null;
        item.confidenceWeightedValues = null;
        return null;
    }
    
    // Calculate confidence-weighted Cost of Delay
    const urgencyWeight = buckets.urgency[item.urgency]?.weight || 1;
    const valueWeight = buckets.value[item.value]?.weight || 1;
    const confidenceWeightedUrgencyWeight = urgencyWeight * urgencyConfidenceAvg;
    const confidenceWeightedValueWeight = valueWeight * valueConfidenceAvg;
    const confidenceWeightedCostOfDelay = confidenceWeightedUrgencyWeight * confidenceWeightedValueWeight;
    
    // Calculate confidence-weighted CD3
    const durationWeight = buckets.duration[item.duration]?.weight || 1;
    const confidenceWeightedDurationWeight = durationWeight * durationConfidenceAvg;
    const confidenceWeightedCD3 = confidenceWeightedCostOfDelay / confidenceWeightedDurationWeight;
    
    item.confidenceWeightedCD3 = confidenceWeightedCD3;
    // Store weighted values for display
    item.confidenceWeightedValues = {
        urgency: confidenceWeightedUrgencyWeight,
        value: confidenceWeightedValueWeight,
        duration: confidenceWeightedDurationWeight
    };
    return confidenceWeightedCD3;
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
        addedToManuallySequencedList: false,
        reordered: false,
        isNewItem: false,
        notes: [],
        hasConfidenceSurvey: false,
        confidenceSurvey: {
            scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
        },
        confidenceWeightedCD3: null,
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
    
    // Clear "new" flag when urgency is set (item has been prioritized)
    if (property === 'urgency' && value > 0) {
        item.isNewItem = false;
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
    
    // Clear the "new" flag when user manually moves the item
    item.addedToManuallySequencedList = false;
    // Mark only the item that received the arrow command as reordered
    item.reordered = true;
    
    return { success: true };
}

// Insert item into sequence when it gets CD3
export function insertItemIntoSequence(item, items, appState) {
    const newCD3 = item.CD3 || 0;
    if (newCD3 === 0) {
        return; // Item doesn't have CD3 yet, nothing to do
    }
    
    const manuallyReordered = appState.resultsManuallyReordered === true;
    
    if (!manuallyReordered) {
        // Case 1: Results NOT manually reordered - insert in CD3-sorted position
        // Get all items with CD3 > 0
        const itemsWithCD3 = items.filter(i => (i.CD3 || 0) > 0);
        
        if (itemsWithCD3.length === 0) {
            return; // No items with CD3, nothing to do
        }
        
        // Sort by CD3 descending
        const sortedItems = getItemsSortedByCD3(itemsWithCD3);
        
        // Reassign sequence numbers to maintain CD3 order
        // Note: sortedItems contains references to original items, so modifications persist
        sortedItems.forEach((sortedItem, index) => {
            sortedItem.sequence = index + 1;
        });
    } else {
        // Case 2: Results manually reordered - insert above highest ranked item with lower CD3
        // Get all items with sequence numbers, sorted by sequence
        const sequencedItems = items
            .filter(i => i.sequence !== null && i.sequence !== undefined)
            .sort((a, b) => a.sequence - b.sequence);
        
        if (sequencedItems.length === 0) {
            // No sequenced items, assign sequence 1
            item.sequence = 1;
            item.addedToManuallySequencedList = true;
            return;
        }
        
        // Find items with CD3 < newItem.CD3, then find the one with highest CD3
        const itemsWithLowerCD3 = sequencedItems.filter(i => (i.CD3 || 0) < newCD3);
        
        if (itemsWithLowerCD3.length > 0) {
            // Find the item with the highest CD3 among those with lower CD3
            // This ensures we insert above the highest CD3 item that is still lower than the new item
            // This respects manual ordering - items with lower CD3 above it stay in place
            const targetItem = itemsWithLowerCD3.reduce((highest, current) => {
                return (current.CD3 || 0) > (highest.CD3 || 0) ? current : highest;
            });
            
            // Insert above target item
            const targetSequence = targetItem.sequence;
            item.sequence = targetSequence;
            item.addedToManuallySequencedList = true;
            
            // Shift all items with sequence >= targetSequence up by 1
            sequencedItems.forEach(i => {
                if (i.sequence >= targetSequence && i.id !== item.id) {
                    i.sequence = i.sequence + 1;
                }
            });
        } else {
            // New item has lowest CD3, place at end
            const maxSequence = Math.max(...sequencedItems.map(i => i.sequence));
            item.sequence = maxSequence + 1;
            item.addedToManuallySequencedList = true;
        }
    }
}

// Add a note to an item
export function addItemNote(item, noteText) {
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    if (!noteText || typeof noteText !== 'string' || noteText.trim() === '') {
        return { success: false, error: 'Note text is required' };
    }
    
    // Ensure notes array exists
    if (!Array.isArray(item.notes)) {
        item.notes = [];
    }
    
    const now = new Date().toISOString();
    const newNote = {
        text: noteText.trim(),
        createdAt: now,
        modifiedAt: now
    };
    
    item.notes.push(newNote);
    
    return { success: true };
}

// Update an existing note
export function updateItemNote(item, noteIndex, noteText) {
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    if (!Array.isArray(item.notes) || noteIndex < 0 || noteIndex >= item.notes.length) {
        return { success: false, error: 'Invalid note index' };
    }
    
    if (!noteText || typeof noteText !== 'string' || noteText.trim() === '') {
        return { success: false, error: 'Note text is required' };
    }
    
    const note = item.notes[noteIndex];
    note.text = noteText.trim();
    note.modifiedAt = new Date().toISOString();
    
    return { success: true };
}

// Delete a note from an item
export function deleteItemNote(item, noteIndex) {
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    if (!Array.isArray(item.notes) || noteIndex < 0 || noteIndex >= item.notes.length) {
        return { success: false, error: 'Invalid note index' };
    }
    
    item.notes.splice(noteIndex, 1);
    
    return { success: true };
}


