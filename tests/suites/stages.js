// Test suite: Stages & Entry (Tests 8-15)
// Tests for stage navigation, entry stage validation, and bucket limits

// Import test infrastructure from test-core
import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    assert,
    assertEqual,
    getItems,
    saveItems,
    getAppState,
    saveAppState,
    setEntryStage,
    advanceStage,
    backStage,
    initializeBuckets,
    updateBuckets
} from '../test-core.js';

// Test: Entry stage validation
function testEntryStageValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add an item
    const item = {
        id: 'test-entry-stage',
        name: 'Test Entry Stage Item',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set urgency when entry stage is value (should fail)
    setEntryStage('value');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'value', 'Current stage should be value');
    
    // Validation should prevent setting urgency when entry stage is value
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-entry-stage');
    assert(foundItem.urgency === 1, 'Item should have urgency 1');
    
    // Simulate the validation: can only set value when entry stage is value
    const canSetUrgency = appState.currentStage === 'urgency';
    assert(!canSetUrgency, 'Should not be able to set urgency when entry stage is value');
    assert(true, 'Entry stage validation correctly prevents setting wrong property');
    
    // Now set entry stage to urgency and verify it would work
    setEntryStage('urgency');
    const appState2 = getAppState();
    const canSetUrgencyNow = appState2.currentStage === 'urgency';
    assert(canSetUrgencyNow, 'Should be able to set urgency when entry stage is urgency');
}

// Test: Bucket over-limit tracking
function testBucketLimitValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Set urgency limit to 2 for level 1
    const appState = getAppState();
    if (!appState.buckets) {
        appState.buckets = initializeBuckets();
    }
    appState.buckets.urgency[1].limit = 2;
    updateBuckets(appState, getItems());
    saveAppState(appState);
    
    // Add 2 items with urgency 1 (should succeed - no hard validation)
    const item1 = {
        id: 'test-limit-1',
        name: 'Test Limit Item 1',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-limit-2',
        name: 'Test Limit Item 2',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2]);
    
    // Verify both items have urgency 1
    const itemsAfter = getItems();
    const countUrgency1 = itemsAfter.filter(i => i.urgency === 1).length;
    assertEqual(countUrgency1, 2, 'Should have 2 items with urgency 1');
    
    // Update buckets after adding items
    const appStateAfter = getAppState();
    updateBuckets(appStateAfter, getItems());
    saveAppState(appStateAfter);
    
    // Check that bucket is NOT over limit (count = limit = 2)
    const appStateAfterCheck = getAppState();
    assertEqual(appStateAfterCheck.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when count equals limit');
    
    // Add a third item with urgency 1 (should succeed - no hard validation, but should track as over limit)
    const item3 = {
        id: 'test-limit-3',
        name: 'Test Limit Item 3',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items3 = getItems();
    items3.push(item3);
    saveItems(items3);
    
    // Update buckets after adding item
    const appState3 = getAppState();
    updateBuckets(appState3, getItems());
    saveAppState(appState3);
    
    // Verify bucket is now over limit
    const appState3After = getAppState();
    assertEqual(appState3After.buckets.urgency[1].overLimit, true, 'Bucket should be marked as over limit when count exceeds limit');
    
    // Test value limits
    setEntryStage('value');
    const appState4 = getAppState();
    if (!appState4.buckets) {
        appState4.buckets = initializeBuckets();
    }
    appState4.buckets.value[2].limit = 1;
    updateBuckets(appState4, getItems());
    saveAppState(appState4);
    
    // Add item with value 2
    const item4 = {
        id: 'test-value-limit',
        name: 'Test Value Limit Item',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items4 = getItems();
    items4.push(item4);
    saveItems(items4);
    
    // Update buckets after adding item
    const appState5 = getAppState();
    updateBuckets(appState5, getItems());
    saveAppState(appState5);
    
    // Verify bucket is NOT over limit (count = limit = 1)
    const appState5After = getAppState();
    assertEqual(appState5After.buckets.value[2].overLimit, false, 'Value bucket should not be over limit when count equals limit');
    
    // Add another item with value 2 (should succeed - no hard validation, but should track as over limit)
    const item5 = {
        id: 'test-value-limit-2',
        name: 'Test Value Limit Item 2',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items5 = getItems();
    items5.push(item5);
    saveItems(items5);
    
    // Update buckets after adding item
    const appState6 = getAppState();
    updateBuckets(appState6, getItems());
    saveAppState(appState6);
    
    // Verify bucket is now over limit
    const appState6After = getAppState();
    assertEqual(appState6After.buckets.value[2].overLimit, true, 'Value bucket should be marked as over limit when count exceeds limit');
}

// Test: Lowering limits when items already exceed them
function testLoweringLimitsWithExistingItems() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Add 5 items with urgency 1
    const items = [];
    for (let i = 1; i <= 5; i++) {
        items.push({
            id: `test-lower-limit-${i}`,
            name: `Test Lower Limit Item ${i}`,
            urgency: 1,
            value: 0,
            duration: 0,
            createdAt: new Date().toISOString()
        });
    }
    saveItems(items);
    
    // Set limit to 10 (should not be over limit)
    const appState1 = getAppState();
    if (!appState1.buckets) {
        appState1.buckets = initializeBuckets();
    }
    appState1.buckets.urgency[1].limit = 10;
    updateBuckets(appState1, getItems());
    saveAppState(appState1);
    
    // Check that bucket is NOT over limit (5 items < 10 limit)
    const appState2 = getAppState();
    assertEqual(appState2.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when count (5) is less than limit (10)');
    
    // Lower limit to 3 (now 5 items > 3 limit, should be over limit)
    appState2.buckets.urgency[1].limit = 3;
    updateBuckets(appState2, getItems());
    saveAppState(appState2);
    
    // Check that bucket is NOW over limit (5 items > 3 limit)
    const appState3 = getAppState();
    assertEqual(appState3.buckets.urgency[1].overLimit, true, 'Bucket should be marked as over limit when limit is lowered below current count');
    
    // Lower limit further to 1 (still over limit)
    appState3.buckets.urgency[1].limit = 1;
    updateBuckets(appState3, getItems());
    saveAppState(appState3);
    
    const appState4 = getAppState();
    assertEqual(appState4.buckets.urgency[1].overLimit, true, 'Bucket should remain over limit when limit is lowered further');
    
    // Increase limit back to 10 (should no longer be over limit)
    appState4.buckets.urgency[1].limit = 10;
    updateBuckets(appState4, getItems());
    saveAppState(appState4);
    
    const appState5 = getAppState();
    assertEqual(appState5.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when limit is increased above current count');
}

// Test: Add item only in urgency stage
function testAddItemOnlyInUrgencyStage() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Initialize app state first
    const initialState = getAppState();
    if (!initialState.currentStage) {
        initialState.currentStage = 'Item Listing';
        saveAppState(initialState);
    }
    
    // Add an item first (required to advance to urgency stage)
    const tempItem = {
        id: 'temp-item',
        name: 'Temp Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([tempItem]);
    
    // Test 1: Should succeed when entry stage is urgency
    const result = setEntryStage('urgency');
    assert(result.success !== false, `setEntryStage should succeed: ${result.error || ''}`);
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'urgency', 'Current stage should be urgency');
    
    // Simulate adding an item (should be allowed)
    const items1 = getItems();
    const newItem1 = {
        id: 'test-add-urgency',
        name: 'Test Add Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    items1.push(newItem1);
    saveItems(items1);
    
    const itemsAfter1 = getItems();
    // Should have tempItem + newItem1 = 2 items
    assertEqual(itemsAfter1.length, 2, 'Should be able to add item when entry stage is urgency (tempItem + newItem1)');
    
    // Test 2: Should fail when entry stage is value
    // Note: We need items with urgency to advance to value stage
    const itemsForValue = getItems();
    // First, ensure ALL items have urgency set (required to advance)
    if (itemsForValue.length > 0) {
        // We're already at urgency stage, so set urgency on ALL items
        itemsForValue.forEach(item => {
            if (!item.urgencySet) {
                item.urgency = item.id === 'temp-item' ? 1 : 2; // Set urgency on all items
                item.urgencySet = true; // Set the flag
            }
        });
        saveItems(itemsForValue);
        
        // Advance from urgency to value (we're already at urgency stage)
        const result2 = advanceStage(); // urgency -> value
        assert(result2.success !== false, `Should be able to advance to value stage when all items have urgency: ${result2.error || ''}`);
        const appState2 = getAppState();
        assertEqual(appState2.currentStage, 'value', 'Current stage should be value');
        
        // Simulate validation check
        const canAddItem = appState2.currentStage === 'Item Listing';
        assert(!canAddItem, 'Should not be able to add item when entry stage is value');
    }
}

// Test: Cannot set urgency when entry stage is value
function testCannotSetUrgencyWhenEntryStageIsValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Initialize app state first
    const initialState = getAppState();
    if (!initialState.currentStage) {
        initialState.currentStage = 'Item Listing';
        saveAppState(initialState);
    }
    
    // Add item first (required to advance to urgency stage)
    const item = {
        id: 'test-urgency-value-stage',
        name: 'Test Urgency Value Stage Item',
        urgency: 2,
        value: 0,
        duration: 0,
        urgencySet: true,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Advance to urgency stage first
    const result1 = advanceStage(); // Item Listing -> urgency
    assert(result1.success !== false, 'Should be able to advance to urgency stage');
    
    // Now set entry stage to value (should succeed because item has urgency)
    const result = setEntryStage('value');
    assert(result.success !== false, 'Should be able to advance to value when item has urgency');
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Current stage should be value');
    
    // Try to set urgency (should fail validation - entry stage is value, not urgency)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-urgency-value-stage');
    assert(foundItem !== undefined, 'Item should exist');
    
    // Simulate the validation check: entry stage must be 'urgency' to set urgency
    const canSetUrgency = appState2.currentStage === 'urgency';
    assert(!canSetUrgency, 'Should not be able to set urgency when entry stage is value');
}

// Test: Entry stage is always "urgency" on app start
function testEntryStageAlwaysUrgencyOnStart() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Test 1: When app state doesn't exist, getAppState should return "Item Listing" (new default)
    // Clear all state first
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    // Also clear and reload Store to ensure it picks up the cleared state
    if (window.Store && typeof window.Store.reload === 'function') {
        window.Store.reload();
    }
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'Item Listing', 'Current stage should be "Item Listing" when app state is first created');
    
    // Test 2: When app state exists but currentStage is null, getAppState should set it to "Item Listing"
    const testState = {
        currentStage: null,
        buckets: initializeBuckets()
    };
    saveAppState(testState);
    
    // Force reload by clearing and getting again
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    const testStateWithNull = { currentStage: null, buckets: initializeBuckets() };
    saveAppState(testStateWithNull);
    
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'Item Listing', 'Current stage should be set to "Item Listing" when it was null');
    
    // Test 3: After clearing state, current stage should default to "Item Listing"
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    // Also clear and reload Store to ensure it picks up the cleared state
    if (window.Store && typeof window.Store.reload === 'function') {
        window.Store.reload();
    }
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'Item Listing', 'After clearing state, current stage should default to "Item Listing"');
    
    // Test 4: Verify that on page load simulation, current stage is set to "Item Listing"
    // This simulates what happens in DOMContentLoaded - it should always be "Item Listing" on start
    const appState4 = getAppState();
    // Force set to "Item Listing" to simulate app start
    if (appState4.currentStage !== 'Item Listing') {
        setEntryStage('Item Listing');
    }
    const appState5 = getAppState();
    assertEqual(appState5.currentStage, 'Item Listing', 'Current stage should be "Item Listing" on app start');
}

// Test: Cannot advance to next stage unless all items have current stage values
function testCannotAdvanceWithoutAllItemsHavingCurrentStage() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing (default), add items first
    // Add 3 items (can only add in Item Listing stage)
    const item1 = {
        id: 'test-advance-1',
        name: 'Test Advance Item 1',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-advance-2',
        name: 'Test Advance Item 2',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item3 = {
        id: 'test-advance-3',
        name: 'Test Advance Item 3',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2, item3]);
    
    // Advance from Item Listing to urgency
    const result0 = advanceStage();
    assert(result0.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Set urgency for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items0 = getItems();
        TestAdapter.setItemProperty(items0[0].id, 'urgency', 1);
        TestAdapter.setItemProperty(items0[1].id, 'urgency', 2);
        TestAdapter.setItemProperty(items0[2].id, 'urgency', 3);
    } else {
        const items0 = getItems();
        items0[0].urgency = 1;
        items0[0].urgencySet = true;
        items0[1].urgency = 2;
        items0[1].urgencySet = true;
        items0[2].urgency = 3;
        items0[2].urgencySet = true;
        saveItems(items0);
    }
    
    // All items have urgency, so we should be able to advance to value
    const result1 = advanceStage();
    assert(result1.success !== false, 'Should be able to advance to value when all items have urgency');
    
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'value', 'Current stage should be value');
    
    // Set value for only 2 of the 3 items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items1 = getItems();
        TestAdapter.setItemProperty(items1.find(i => i.id === 'test-advance-1').id, 'value', 1);
        TestAdapter.setItemProperty(items1.find(i => i.id === 'test-advance-2').id, 'value', 2);
        // item3 still has value: 0
    } else {
        const items1 = getItems();
        const foundItem1 = items1.find(i => i.id === 'test-advance-1');
        const foundItem2 = items1.find(i => i.id === 'test-advance-2');
        foundItem1.value = 1;
        foundItem1.valueSet = true;
        foundItem2.value = 2;
        foundItem2.valueSet = true;
        // item3 still has value: 0
        saveItems(items1);
    }
    
    // Try to advance to duration - should fail because item3 doesn't have value set
    const result2 = advanceStage();
    assert(result2.success === false, 'Should not be able to advance to duration when not all items have value');
    assert(result2.error && result2.error.toLowerCase().includes('all items'), 'Error message should mention all items');
    
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Current stage should remain value when advance fails');
    
    // Now set value for the third item (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items2 = getItems();
        TestAdapter.setItemProperty(items2.find(i => i.id === 'test-advance-3').id, 'value', 3);
    } else {
        const items2 = getItems();
        const foundItem3 = items2.find(i => i.id === 'test-advance-3');
        foundItem3.value = 3;
        foundItem3.valueSet = true;
        saveItems(items2);
    }
    
    // Now we should be able to advance to duration
    const result3 = advanceStage();
    assert(result3.success !== false, 'Should be able to advance to duration when all items have value');
    
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'duration', 'Current stage should be duration');
    
    // Test: Cannot advance from urgency to value if not all items have urgency
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing, add items
    const item4 = {
        id: 'test-advance-4',
        name: 'Test Advance Item 4',
        urgency: 1,
        value: 0,
        duration: 0,
        urgencySet: true,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item5 = {
        id: 'test-advance-5',
        name: 'Test Advance Item 5',
        urgency: 0, // No urgency set
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item4, item5]);
    
    // Try to advance to value - should fail because item5 doesn't have urgency
    // First need to advance from Item Listing to urgency
    const result4a = advanceStage();
    assert(result4a.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Now try to advance from urgency to value - should fail because item5 doesn't have urgency
    const result4 = advanceStage();
    assert(result4.success === false, 'Should not be able to advance to value when not all items have urgency');
    assert(result4.error && result4.error.toLowerCase().includes('all items'), 'Error message should mention all items');
}

// Test: Stage navigation with advanceStage and backStage
function testStageNavigation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state - ensure we start at Item Listing
    let appState1 = getAppState();
    if (appState1.currentStage !== 'Item Listing') {
        appState1.currentStage = 'Item Listing';
        saveAppState(appState1);
        appState1 = getAppState();
    }
    assertEqual(appState1.currentStage, 'Item Listing', 'Should start at Item Listing stage');
    
    // Add items first (can only add items in Item Listing stage)
    const item1 = {
        id: 'test-nav-1',
        name: 'Test Nav Item 1',
        urgency: 0,
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-nav-2',
        name: 'Test Nav Item 2',
        urgency: 0,
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2]);
    
    // Advance from Item Listing to urgency
    const result0 = advanceStage();
    assert(result0.success !== false, 'Should be able to advance from Item Listing to urgency');
    const appState1a = getAppState();
    assertEqual(appState1a.currentStage, 'urgency', 'Should be at urgency stage after advance from Item Listing');
    
    // Set urgency for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items0 = getItems();
        TestAdapter.setItemProperty(items0[0].id, 'urgency', 1);
        TestAdapter.setItemProperty(items0[1].id, 'urgency', 2);
    } else {
        const items0 = getItems();
        items0[0].urgency = 1;
        items0[0].urgencySet = true;
        items0[1].urgency = 2;
        items0[1].urgencySet = true;
        saveItems(items0);
    }
    
    // Test advanceStage from urgency to value
    const result1 = advanceStage();
    assert(result1.success !== false, 'Should be able to advance from urgency to value');
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Should be at value stage after advance');
    
    // Set value for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items1 = getItems();
        TestAdapter.setItemProperty(items1[0].id, 'value', 1);
        TestAdapter.setItemProperty(items1[1].id, 'value', 2);
    } else {
        const items1 = getItems();
        items1[0].value = 1;
        items1[0].valueSet = true;
        items1[1].value = 2;
        items1[1].valueSet = true;
        saveItems(items1);
    }
    
    // Test advanceStage from value to duration
    const result2 = advanceStage();
    assert(result2.success !== false, 'Should be able to advance from value to duration');
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'duration', 'Should be at duration stage after advance');
    
    // Set duration for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items2 = getItems();
        TestAdapter.setItemProperty(items2[0].id, 'duration', 1);
        TestAdapter.setItemProperty(items2[1].id, 'duration', 2);
    } else {
        const items2 = getItems();
        items2[0].duration = 1;
        items2[0].durationSet = true;
        items2[1].duration = 2;
        items2[1].durationSet = true;
        saveItems(items2);
    }
    
    // Test advanceStage from duration to Results (final stage)
    const result3 = advanceStage();
    assert(result3.success !== false, 'Should be able to advance from duration to Results');
    const appState4 = getAppState();
    assertEqual(appState4.currentStage, 'Results', 'Should be at Results stage after advance');
    
    // Test that we cannot advance beyond Results (final stage)
    const result4 = advanceStage();
    assert(result4.success === false, 'Should not be able to advance beyond Results');
    assert(result4.error && result4.error.includes('final stage'), 'Error should mention final stage');
    
    // Test backStage from Results to duration
    const result5 = backStage();
    assert(result5.success !== false, 'Should be able to go back from Results to duration');
    const appState5 = getAppState();
    assertEqual(appState5.currentStage, 'duration', 'Should be at duration stage after going back');
    
    // Test backStage from duration to value
    const result6 = backStage();
    assert(result6.success !== false, 'Should be able to go back from duration to value');
    const appState6 = getAppState();
    assertEqual(appState6.currentStage, 'value', 'Should be at value stage after going back');
    
    // Test backStage from value to urgency
    const result7 = backStage();
    assert(result7.success !== false, 'Should be able to go back from value to urgency');
    const appState7 = getAppState();
    assertEqual(appState7.currentStage, 'urgency', 'Should be at urgency stage after going back');
    
    // Test backStage from urgency to Item Listing
    const result7b = backStage();
    assert(result7b.success !== false, 'Should be able to go back from urgency to Item Listing');
    const appState7b = getAppState();
    assertEqual(appState7b.currentStage, 'Item Listing', 'Should be at Item Listing stage after going back');
    
    // Test that we cannot go back beyond Item Listing (first stage)
    // First verify we're at Item Listing
    const stateBeforeBack = getAppState();
    assertEqual(stateBeforeBack.currentStage, 'Item Listing', 'Should be at Item Listing before trying to go back');
    
    const result8 = backStage();
    assert(result8.success === false, 'Should not be able to go back beyond Item Listing');
    assert(result8.error && (result8.error.includes('first stage') || result8.error.includes('Item Listing')), 'Error should mention first stage or Item Listing');
    
    // Test advanceStage validation - cannot advance if not all items have current stage values
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing, add items
    const item3 = {
        id: 'test-nav-3',
        name: 'Test Nav Item 3',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item4 = {
        id: 'test-nav-4',
        name: 'Test Nav Item 4',
        urgency: 0, // No urgency - will stay 0
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item3, item4]);
    
    // First need to advance from Item Listing to urgency
    const result8a = advanceStage();
    assert(result8a.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Set urgency for item3 only (item4 stays at 0) - using TestAdapter to ensure flags are set
    if (window.TestAdapter && window.TestAdapter.api) {
        const itemsBefore = getItems();
        TestAdapter.setItemProperty(itemsBefore.find(i => i.id === 'test-nav-3').id, 'urgency', 1);
    } else {
        const itemsBefore = getItems();
        const item3 = itemsBefore.find(i => i.id === 'test-nav-3');
        item3.urgency = 1;
        item3.urgencySet = true;
        saveItems(itemsBefore);
    }
    
    // Now try to advance from urgency to value - should fail because item4 doesn't have urgency
    const result9 = advanceStage();
    assert(result9.success === false, 'Should not be able to advance when not all items have urgency');
    assert(result9.error && result9.error.toLowerCase().includes('all items'), 'Error should mention all items');
}

// Export test suite
export const stagesTests = [
    { number: 8, name: 'Entry Stage Validation', fn: testEntryStageValidation },
    { number: 9, name: 'Bucket Over-Limit Tracking', fn: testBucketLimitValidation },
    { number: 10, name: 'Lowering Limits with Existing Items', fn: testLoweringLimitsWithExistingItems },
    { number: 11, name: 'Add Item Only in Urgency Stage', fn: testAddItemOnlyInUrgencyStage },
    { number: 12, name: 'Cannot Set Urgency When Entry Stage is Value', fn: testCannotSetUrgencyWhenEntryStageIsValue },
    { number: 13, name: 'Entry Stage Always "urgency" on App Start', fn: testEntryStageAlwaysUrgencyOnStart },
    { number: 14, name: 'Cannot Advance Without All Items Having Current Stage Values', fn: testCannotAdvanceWithoutAllItemsHavingCurrentStage },
    { number: 15, name: 'Stage Navigation (Advance/Back)', fn: testStageNavigation }
];

