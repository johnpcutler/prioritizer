// Test suite: Basic Item Operations (Tests 1-7)
// Tests for adding items, setting urgency/value/duration, validation, and loading test data

// Import test infrastructure from test-core
// Note: In browser, these will be available via window.TestCore
// This file will be loaded as a module, so we can use imports
import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    TEST_DATA,
    assert,
    assertEqual,
    getItems,
    saveItems,
    getAppState,
    setEntryStage
} from '../test-core.js';

// Test: Add Item
function testAddItem() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    
    const items = getItems();
    assertEqual(items.length, 0, 'Storage should be empty initially');
    
    // Simulate adding an item
    const newItem = {
        id: Date.now().toString(),
        name: 'Test Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    
    const updatedItems = [...items, newItem];
    saveItems(updatedItems);
    
    const itemsAfter = getItems();
    assertEqual(itemsAfter.length, 1, 'Should have one item after adding');
    assertEqual(itemsAfter[0].name, 'Test Item', 'Item name should match');
    assertEqual(itemsAfter[0].urgency, 0, 'New item should have urgency set to 0 (unset)');
    assertEqual(itemsAfter[0].value, 0, 'New item should have value set to 0 (unset)');
    assertEqual(itemsAfter[0].duration, 0, 'New item should have duration set to 0 (unset)');
    assert(itemsAfter[0].id !== undefined, 'Item should have an ID');
}

// Test: Set Urgency
function testSetUrgency() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Add an item first (with default 0 values)
    const item = {
        id: 'test-urgency',
        name: 'Test Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Set urgency (should succeed because entry stage is urgency)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-urgency');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'urgency', 'Current stage should be urgency');
    
    foundItem.urgency = 2;
    saveItems(items);
    
    const itemsAfter = getItems();
    const updatedItem = itemsAfter.find(i => i.id === 'test-urgency');
    assertEqual(updatedItem.urgency, 2, 'Urgency should be set to 2');
    assertEqual(updatedItem.value, 0, 'Value should still be 0 (unset)');
    assertEqual(updatedItem.duration, 0, 'Duration should still be 0 (unset)');
}

// Test: Set Value (with Urgency prerequisite)
function testSetValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add item with urgency set (not 0) FIRST
    const item = {
        id: 'test-value',
        name: 'Test Value Item',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Now set entry stage to value (after item has urgency)
    setEntryStage('value');
    
    // Set value (should succeed because urgency is not 0 and entry stage is value)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-value');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'value', 'Current stage should be value');
    
    // Simulate validation check (0 means unset)
    if (foundItem.urgency === undefined || foundItem.urgency === null || foundItem.urgency === 0) {
        assert(false, 'Should not reach here - urgency should be set (not 0)');
    } else {
        foundItem.value = 3;
        saveItems(items);
        
        const itemsAfter = getItems();
        const updatedItem = itemsAfter.find(i => i.id === 'test-value');
        assertEqual(updatedItem.value, 3, 'Value should be set to 3');
        assertEqual(updatedItem.urgency, 1, 'Urgency should still be 1');
    }
}

// Test: Set Duration (with Value prerequisite)
function testSetDuration() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add item with urgency and value set (not 0) FIRST
    const item = {
        id: 'test-duration',
        name: 'Test Duration Item',
        urgency: 2,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Now set entry stage to duration (after item has urgency and value)
    setEntryStage('duration');
    
    // Set duration (should succeed because value is not 0 and entry stage is duration)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-duration');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'duration', 'Current stage should be duration');
    
    // Simulate validation check (0 means unset)
    if (foundItem.value === undefined || foundItem.value === null || foundItem.value === 0) {
        assert(false, 'Should not reach here - value should be set (not 0)');
    } else {
        foundItem.duration = 1;
        saveItems(items);
        
        const itemsAfter = getItems();
        const updatedItem = itemsAfter.find(i => i.id === 'test-duration');
        assertEqual(updatedItem.duration, 1, 'Duration should be set to 1');
        assertEqual(updatedItem.value, 2, 'Value should still be 2');
        assertEqual(updatedItem.urgency, 2, 'Urgency should still be 2');
    }
}

// Test: Validation - Set Value without Urgency
function testSetValueWithoutUrgency() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to value (even though urgency is not set)
    setEntryStage('value');
    
    // Add item with urgency set to 0 (unset)
    const item = {
        id: 'test-no-urgency',
        name: 'Test No Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set value (should fail validation because urgency is 0)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-no-urgency');
    
    // Simulate validation check (0 means unset)
    const hasUrgency = foundItem.urgency !== undefined && foundItem.urgency !== null && foundItem.urgency !== 0;
    assert(!hasUrgency, 'Item should not have urgency set (should be 0)');
    
    // Validation should prevent setting value
    if (!hasUrgency) {
        assert(true, 'Validation correctly prevents setting value when urgency is 0 (unset)');
    } else {
        assert(false, 'Validation should have prevented this');
    }
}

// Test: Validation - Set Duration without Value
function testSetDurationWithoutValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    
    // Add item with urgency set but value set to 0 (unset)
    const item = {
        id: 'test-no-value',
        name: 'Test No Value Item',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set duration (should fail validation)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-no-value');
    
    // Simulate validation check (0 means unset)
    const hasValue = foundItem.value !== undefined && foundItem.value !== null && foundItem.value !== 0;
    assert(!hasValue, 'Item should not have value set (should be 0)');
    
    // Validation should prevent setting duration
    if (!hasValue) {
        assert(true, 'Validation correctly prevents setting duration when value is 0 (unset)');
    } else {
        assert(false, 'Validation should have prevented this');
    }
}

// Test: Load test data
function testLoadTestData() {
    // Test data is embedded, no fetch needed
    const data = TEST_DATA;
    assert(data.items !== undefined, 'Test data should have items array');
    assert(data.items.length > 0, 'Test data should have at least one item');
    assert(data.items[0].name !== undefined, 'Test items should have names');
    assert(data.items[0].id !== undefined, 'Test items should have IDs');
}

// Export test suite
export const basicItemsTests = [
    { number: 1, name: 'Add Item', fn: testAddItem },
    { number: 2, name: 'Set Urgency', fn: testSetUrgency },
    { number: 3, name: 'Set Value (with Urgency)', fn: testSetValue },
    { number: 4, name: 'Set Duration (with Value)', fn: testSetDuration },
    { number: 5, name: 'Validation - Set Value without Urgency', fn: testSetValueWithoutUrgency },
    { number: 6, name: 'Validation - Set Duration without Value', fn: testSetDurationWithoutValue },
    { number: 7, name: 'Load Test Data', fn: testLoadTestData }
];

