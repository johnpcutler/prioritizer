// Test suite: Bulk Operations (Tests 44-47)
// Tests for bulk adding items

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test bulk add items
async function testBulkAddItems() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Should be in Item Listing stage
    assertEqual(TestAdapter.getCurrentStage(), 'Item Listing', 'Should be in Item Listing stage');
    
    // Bulk add items
    const itemNamesText = 'Item 1\nItem 2\nItem 3\nItem 4';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 4, 'Should have added 4 items');
    assertEqual(result.total, 4, 'Should have processed 4 items');
    
    // Verify all items were added
    const items = TestAdapter.getItems();
    assertEqual(items.length, 4, 'Should have 4 items');
    assertEqual(items[0].name, 'Item 1', 'First item should be "Item 1"');
    assertEqual(items[1].name, 'Item 2', 'Second item should be "Item 2"');
    assertEqual(items[2].name, 'Item 3', 'Third item should be "Item 3"');
    assertEqual(items[3].name, 'Item 4', 'Fourth item should be "Item 4"');
    
    // Verify all items have default values
    items.forEach(item => {
        assertEqual(item.urgency, 0, 'Item should have urgency 0');
        assertEqual(item.value, 0, 'Item should have value 0');
        assertEqual(item.duration, 0, 'Item should have duration 0');
        assertEqual(item.costOfDelay, 0, 'Item should have costOfDelay 0');
    });
}

async function testBulkAddItemsOnlyInItemListingStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add one item and advance to urgency stage
    TestAdapter.addItem('Test Item');
    TestAdapter.advanceStage();
    
    // Try to bulk add items - should fail
    const result = TestAdapter.bulkAddItems('Item 1\nItem 2');
    assert(!result.success, 'Bulk add should fail when not in Item Listing stage');
    assert(result.error && result.error.toLowerCase().includes('item listing'), 'Error should mention Item Listing stage');
}

async function testBulkAddItemsWithEmptyLines() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Bulk add items with empty lines and extra whitespace
    const itemNamesText = 'Item 1\n\nItem 2\n   \nItem 3\n';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 3, 'Should have added 3 items (empty lines ignored)');
    
    const items = TestAdapter.getItems();
    assertEqual(items.length, 3, 'Should have 3 items');
}

async function testBulkAddItemsWithNoValidNames() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to bulk add with only empty lines
    const result = TestAdapter.bulkAddItems('\n\n   \n');
    
    assert(!result.success, 'Bulk add should fail with no valid names');
    assert(result.error && result.error.toLowerCase().includes('no valid item names'), 'Error should mention no valid item names');
}

// Export test suite
export const bulkOperationsTests = [
    { number: 44, name: 'Bulk Add Items', fn: testBulkAddItems },
    { number: 45, name: 'Bulk Add Items Only in Item Listing Stage', fn: testBulkAddItemsOnlyInItemListingStage },
    { number: 46, name: 'Bulk Add Items With Empty Lines', fn: testBulkAddItemsWithEmptyLines },
    { number: 47, name: 'Bulk Add Items With No Valid Names', fn: testBulkAddItemsWithNoValidNames }
];

