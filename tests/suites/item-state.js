// Test suite: Item Active/Inactive State (Tests 59-64)
// Tests for item active/inactive status

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test item active/inactive status
async function testItemActiveDefaultsToTrue() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Item should be active by default
    assertEqual(items[0].active, true, 'Item should be active by default');
}

async function testSetItemInactive() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Item should start as active
    assertEqual(items[0].active, true, 'Item should start as active');
    
    // Set item to inactive
    const result = TestAdapter.setItemInactive(items[0].id);
    assert(result.success, 'Setting item inactive should succeed');
    
    // Item should now be inactive
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, false, 'Item should be inactive after setItemInactive');
}

async function testSetItemActive() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set item to inactive first
    TestAdapter.setItemInactive(items[0].id);
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, false, 'Item should be inactive');
    
    // Set item back to active
    const result = TestAdapter.setItemActive(items[0].id);
    assert(result.success, 'Setting item active should succeed');
    
    // Item should now be active
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, true, 'Item should be active after setItemActive');
}

async function testBulkAddItemsAreActiveByDefault() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Bulk add items
    const itemNamesText = 'Item 1\nItem 2\nItem 3';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    
    // All items should be active by default
    const items = TestAdapter.getItems();
    items.forEach((item, index) => {
        assertEqual(item.active, true, `Item ${index + 1} should be active by default`);
    });
}

async function testSetItemActiveWithInvalidId() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to set non-existent item to active
    const result = TestAdapter.setItemActive('invalid-id');
    
    assert(!result.success, 'Setting invalid item active should fail');
    assert(result.error && result.error.includes('not found'), 'Error should mention item not found');
}

async function testSetItemInactiveWithInvalidId() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to set non-existent item to inactive
    const result = TestAdapter.setItemInactive('invalid-id');
    
    assert(!result.success, 'Setting invalid item inactive should fail');
    assert(result.error && result.error.includes('not found'), 'Error should mention item not found');
}

// Export test suite
export const itemStateTests = [
    { number: 59, name: 'Item Active Defaults to True', fn: testItemActiveDefaultsToTrue },
    { number: 60, name: 'Set Item Inactive', fn: testSetItemInactive },
    { number: 61, name: 'Set Item Active', fn: testSetItemActive },
    { number: 62, name: 'Bulk Add Items Are Active by Default', fn: testBulkAddItemsAreActiveByDefault },
    { number: 63, name: 'Set Item Active With Invalid Id', fn: testSetItemActiveWithInvalidId },
    { number: 64, name: 'Set Item Inactive With Invalid Id', fn: testSetItemInactiveWithInvalidId }
];

