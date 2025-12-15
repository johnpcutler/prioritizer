/**
 * Derived state functions for items.
 * These functions compute business logic about items without side effects.
 */

/**
 * Get items that are in the parking lot for a given property.
 * Parking lot items are those without the property set (value is 0 or undefined).
 * 
 * @param {Array} items - Array of items
 * @param {string} property - Property name to check (e.g., 'urgency', 'value', 'duration')
 * @returns {Array} Items in the parking lot
 */
export function getParkingLotItems(items, property) {
    return items.filter(item => !item[property] || item[property] === 0);
}

/**
 * Get items that are in the parking lot for value, but have urgency set.
 * This is specific to the value stage parking lot.
 * 
 * @param {Array} items - Array of items
 * @returns {Array} Items in the value parking lot
 */
export function getValueParkingLotItems(items) {
    return items.filter(item => (!item.value || item.value === 0) && item.urgency && item.urgency > 0);
}

/**
 * Check if all items have a given property set (value > 0).
 * 
 * @param {Array} items - Array of items
 * @param {string} property - Property name to check (e.g., 'urgency', 'value', 'duration')
 * @returns {boolean} True if all items have the property set
 */
export function allItemsHave(items, property) {
    return items.length > 0 && items.every(item => item[property] && item[property] > 0);
}

/**
 * Check if all items that have urgency also have value set.
 * Used for value stage completion check.
 * 
 * @param {Array} items - Array of items
 * @returns {boolean} True if all items with urgency also have value
 */
export function allItemsWithUrgencyHaveValue(items) {
    const itemsWithUrgency = items.filter(item => item.urgency && item.urgency > 0);
    return itemsWithUrgency.length > 0 && itemsWithUrgency.every(item => item.value && item.value > 0);
}

/**
 * Check if all items that have value and urgency also have duration set.
 * Used for duration stage completion check.
 * 
 * @param {Array} items - Array of items
 * @returns {boolean} True if all items with value and urgency also have duration
 */
export function allItemsWithValueAndUrgencyHaveDuration(items) {
    const itemsWithValueAndUrgency = items.filter(item => item.value && item.value > 0 && item.urgency && item.urgency > 0);
    return itemsWithValueAndUrgency.length > 0 && itemsWithValueAndUrgency.every(item => item.duration && item.duration > 0);
}

/**
 * Check if an item can have its value property set.
 * Value can be set if:
 * - The app is locked (locked mode), OR
 * - The item has urgency set (unlocked mode)
 * 
 * @param {Object} item - The item to check
 * @param {Object} appState - The application state
 * @returns {boolean} True if value can be set
 */
export function canSetValue(item, appState) {
    const isLocked = appState.locked !== false;
    return isLocked ? true : (item.urgencySet || (item.urgency && item.urgency > 0));
}

/**
 * Check if an item can have its duration property set.
 * Duration can be set if:
 * - The app is locked (locked mode), OR
 * - The item has value set (unlocked mode)
 * 
 * @param {Object} item - The item to check
 * @param {Object} appState - The application state
 * @returns {boolean} True if duration can be set
 */
export function canSetDuration(item, appState) {
    const isLocked = appState.locked !== false;
    return isLocked ? true : (item.valueSet || (item.value && item.value > 0));
}

/**
 * Check if any items have been advanced (have urgency set).
 * Used to determine if prioritization has started.
 * 
 * @param {Array} items - Array of items
 * @returns {boolean} True if at least one item has urgency set
 */
export function hasAdvancedItems(items) {
    return items.some(item => item.urgency && item.urgency > 0);
}

/**
 * Check if there are new items that need to be prioritized.
 * New items are those with the isNewItem flag set to true.
 * 
 * @param {Array} items - Array of items
 * @returns {boolean} True if there are new items
 */
export function hasNewItems(items) {
    return items.some(item => item.isNewItem === true);
}

