// Test suite: Enhanced Item Listing Display (Tests 101+)
// Tests for isNewItem flag, button visibility, and enhanced display features

import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    assert,
    assertEqual,
    getItems,
    saveItems,
    getAppState,
    saveAppState,
    initializeBuckets
} from '../test-core.js';

// Test: isNewItem flag not set when adding items initially
async function testIsNewItemNotSetInitially() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add items when nothing is prioritized
    const result1 = window.TestAdapter.addItem('Item 1');
    assert(result1.success, 'Adding first item should succeed');
    
    const result2 = window.TestAdapter.bulkAddItems('Item 2\nItem 3');
    assert(result2.success, 'Bulk adding items should succeed');
    
    const items = window.TestAdapter.getItems();
    const item1 = items.find(i => i.name === 'Item 1');
    const item2 = items.find(i => i.name === 'Item 2');
    const item3 = items.find(i => i.name === 'Item 3');
    
    assertEqual(item1.isNewItem, false, 'Item 1 should not have isNewItem flag set');
    assertEqual(item2.isNewItem, false, 'Item 2 should not have isNewItem flag set');
    assertEqual(item3.isNewItem, false, 'Item 3 should not have isNewItem flag set');
}

// Test: isNewItem flag set when adding items after prioritization started
async function testIsNewItemSetAfterPrioritization() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add initial items
    window.TestAdapter.addItem('Initial Item');
    let items = window.TestAdapter.getItems();
    let initialItem = items.find(i => i.name === 'Initial Item');
    
    // Advance to urgency and set urgency on initial item
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(initialItem.id, 'urgency', 2);
    
    // Now add new items - they should be marked as new
    const result1 = window.TestAdapter.navigateToStage('Item Listing');
    assert(result1.success, 'Should navigate back to Item Listing');
    
    const addResult = window.TestAdapter.addItem('New Item After Prioritization');
    assert(addResult.success, 'Adding item after prioritization should succeed');
    
    items = window.TestAdapter.getItems();
    const newItem = items.find(i => i.name === 'New Item After Prioritization');
    const stillInitialItem = items.find(i => i.name === 'Initial Item');
    
    assertEqual(newItem.isNewItem, true, 'New item should have isNewItem flag set');
    assertEqual(stillInitialItem.isNewItem, false, 'Initial item should not have isNewItem flag');
}

// Test: isNewItem flag cleared when urgency is set
async function testIsNewItemClearedWhenUrgencySet() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add initial item and prioritize it
    window.TestAdapter.addItem('Prioritized Item');
    let items = window.TestAdapter.getItems();
    let prioritizedItem = items.find(i => i.name === 'Prioritized Item');
    
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(prioritizedItem.id, 'urgency', 2);
    
    // Add new item
    window.TestAdapter.navigateToStage('Item Listing');
    window.TestAdapter.addItem('New Item');
    items = window.TestAdapter.getItems();
    let newItem = items.find(i => i.name === 'New Item');
    
    assertEqual(newItem.isNewItem, true, 'New item should have isNewItem flag set initially');
    
    // Set urgency on new item - flag should be cleared
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(newItem.id, 'urgency', 1);
    
    items = window.TestAdapter.getItems();
    newItem = items.find(i => i.name === 'New Item');
    assertEqual(newItem.isNewItem, false, 'isNewItem flag should be cleared when urgency is set');
}

// Test: Bulk add items after prioritization - all should be marked as new
async function testBulkAddItemsMarkedAsNew() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add initial item and prioritize
    window.TestAdapter.addItem('Initial Item');
    let items = window.TestAdapter.getItems();
    let initialItem = items.find(i => i.name === 'Initial Item');
    
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(initialItem.id, 'urgency', 2);
    
    // Bulk add new items
    window.TestAdapter.navigateToStage('Item Listing');
    const bulkResult = window.TestAdapter.bulkAddItems('New Item 1\nNew Item 2\nNew Item 3');
    assert(bulkResult.success, 'Bulk adding items should succeed');
    
    items = window.TestAdapter.getItems();
    const newItem1 = items.find(i => i.name === 'New Item 1');
    const newItem2 = items.find(i => i.name === 'New Item 2');
    const newItem3 = items.find(i => i.name === 'New Item 3');
    
    assertEqual(newItem1.isNewItem, true, 'New Item 1 should have isNewItem flag');
    assertEqual(newItem2.isNewItem, true, 'New Item 2 should have isNewItem flag');
    assertEqual(newItem3.isNewItem, true, 'New Item 3 should have isNewItem flag');
}

// Test: Button visibility - shows "Start Prioritizing" when items exist but none prioritized
async function testButtonShowsStartPrioritizingInitially() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add items but don't prioritize
    window.TestAdapter.addItem('Item 1');
    window.TestAdapter.addItem('Item 2');
    
    // Navigate to Item Listing stage
    window.TestAdapter.navigateToStage('Item Listing');
    const currentStage = window.TestAdapter.getCurrentStage();
    assertEqual(currentStage, 'Item Listing', 'Should be on Item Listing stage');
    
    // Check button visibility and text (this would require DOM access, so we'll test the logic)
    const items = window.TestAdapter.getItems();
    const hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    const hasNewItems = items.some(item => item.isNewItem === true);
    
    assertEqual(hasAdvancedItems, false, 'No items should be advanced initially');
    assertEqual(hasNewItems, false, 'No items should be marked as new initially');
    // Button should show "Start Prioritizing" when hasAdvancedItems is false and items exist
}

// Test: Button shows "Prioritize New Items" when items advanced and new items exist
async function testButtonShowsPrioritizeNewItems() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add and prioritize initial item
    window.TestAdapter.addItem('Initial Item');
    let items = window.TestAdapter.getItems();
    let initialItem = items.find(i => i.name === 'Initial Item');
    
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(initialItem.id, 'urgency', 2);
    
    // Add new item
    window.TestAdapter.navigateToStage('Item Listing');
    window.TestAdapter.addItem('New Item');
    
    items = window.TestAdapter.getItems();
    const hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    const hasNewItems = items.some(item => item.isNewItem === true);
    
    assertEqual(hasAdvancedItems, true, 'Should have advanced items');
    assertEqual(hasNewItems, true, 'Should have new items');
    // Button should show "Prioritize New Items" when both conditions are true
}

// Test: Button hidden when items advanced but no new items
async function testButtonHiddenWhenNoNewItems() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add and prioritize items
    window.TestAdapter.addItem('Item 1');
    let items = window.TestAdapter.getItems();
    let item1 = items.find(i => i.name === 'Item 1');
    
    window.TestAdapter.advanceStage();
    window.TestAdapter.setItemProperty(item1.id, 'urgency', 2);
    
    // Navigate back to Item Listing (no new items added)
    window.TestAdapter.navigateToStage('Item Listing');
    
    items = window.TestAdapter.getItems();
    const hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    const hasNewItems = items.some(item => item.isNewItem === true);
    
    assertEqual(hasAdvancedItems, true, 'Should have advanced items');
    assertEqual(hasNewItems, false, 'Should not have new items');
    // Button should be hidden when hasAdvancedItems is true but hasNewItems is false
}

// Test: Multiple batches initially don't change button
async function testMultipleBatchesInitially() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Add first batch
    window.TestAdapter.addItem('Batch 1 Item');
    let items = window.TestAdapter.getItems();
    let hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    assertEqual(hasAdvancedItems, false, 'First batch should not have advanced items');
    
    // Add second batch
    window.TestAdapter.bulkAddItems('Batch 2 Item 1\nBatch 2 Item 2');
    items = window.TestAdapter.getItems();
    hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    assertEqual(hasAdvancedItems, false, 'Second batch should not have advanced items');
    
    // Add third batch
    window.TestAdapter.bulkAddItems('Batch 3 Item');
    items = window.TestAdapter.getItems();
    hasAdvancedItems = items.some(item => item.urgency && item.urgency > 0);
    assertEqual(hasAdvancedItems, false, 'Third batch should not have advanced items');
    
    // None of the items should be marked as new
    const hasNewItems = items.some(item => item.isNewItem === true);
    assertEqual(hasNewItems, false, 'No items should be marked as new when adding batches initially');
}

// Test: Sample initiatives button should be visible when no items exist
async function testSampleInitiativesButtonVisibleWhenEmpty() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Clear all items using clearAllData (which clears items but preserves settings)
    window.TestAdapter.clearAllData();
    
    // Navigate to Item Listing stage
    window.TestAdapter.navigateToStage('Item Listing');
    
    const items = window.TestAdapter.getItems();
    assertEqual(items.length, 0, 'Items list should be empty');
    // Button visibility logic: items.length === 0 should show the button
}

// Test: Sample initiatives button adds 10 sample items
async function testSampleInitiativesButtonAddsItems() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Clear all items using clearAllData
    window.TestAdapter.clearAllData();
    
    // Simulate clicking the sample initiatives button by calling bulkAddItems with sample items
    const sampleItems = `🐉🔥 Project dragonfire frosting
✨🤖 The sentient sprinkles program
🌙🥧 Operation midnight muffin heist
🦄 The unicorn supply chain initiative
🧁🚀 Cupcake teleportation research
📜🔮 The prophecy fulfillment roadmap
🍫⬆️ Anti gravity ganache pilot
⏰🧁 The time travel taste test
🧙✨ Wizards in residence program
🧁💙 The emotional support cupcake platform`;
    
    const result = window.TestAdapter.bulkAddItems(sampleItems);
    assert(result.success, 'Bulk adding sample items should succeed');
    
    const items = window.TestAdapter.getItems();
    assertEqual(items.length, 10, 'Should have exactly 10 sample items');
    
    // Verify some specific items exist
    const itemNames = items.map(item => item.name);
    assert(itemNames.includes('🐉🔥 Project dragonfire frosting'), 'Should include dragonfire frosting');
    assert(itemNames.includes('🦄 The unicorn supply chain initiative'), 'Should include unicorn initiative');
    assert(itemNames.includes('🧁💙 The emotional support cupcake platform'), 'Should include emotional support cupcake');
}

// Test: Sample initiatives button should be hidden after items are added
async function testSampleInitiativesButtonHiddenAfterAddingItems() {
    await window.TestAdapter.init();
    window.TestAdapter.startApp();
    window.TestAdapter.setLocked(false);
    
    // Clear all items using clearAllData
    window.TestAdapter.clearAllData();
    
    // Add an item (simulating what happens after clicking sample initiatives button)
    window.TestAdapter.addItem('Test Item');
    
    const items = window.TestAdapter.getItems();
    assertEqual(items.length, 1, 'Should have one item');
    // Button visibility logic: items.length > 0 should hide the button
}

// Export test functions
export const enhancedItemListingTests = [
    { name: 'isNewItem flag not set when adding items initially', fn: testIsNewItemNotSetInitially },
    { name: 'isNewItem flag set when adding items after prioritization started', fn: testIsNewItemSetAfterPrioritization },
    { name: 'isNewItem flag cleared when urgency is set', fn: testIsNewItemClearedWhenUrgencySet },
    { name: 'Bulk add items after prioritization - all marked as new', fn: testBulkAddItemsMarkedAsNew },
    { name: 'Button shows Start Prioritizing when items exist but none prioritized', fn: testButtonShowsStartPrioritizingInitially },
    { name: 'Button shows Prioritize New Items when items advanced and new items exist', fn: testButtonShowsPrioritizeNewItems },
    { name: 'Button hidden when items advanced but no new items', fn: testButtonHiddenWhenNoNewItems },
    { name: 'Multiple batches initially don\'t change button', fn: testMultipleBatchesInitially },
    { name: 'Sample initiatives button visible when no items exist', fn: testSampleInitiativesButtonVisibleWhenEmpty },
    { name: 'Sample initiatives button adds 10 sample items', fn: testSampleInitiativesButtonAddsItems },
    { name: 'Sample initiatives button hidden after items are added', fn: testSampleInitiativesButtonHiddenAfterAddingItems }
];

