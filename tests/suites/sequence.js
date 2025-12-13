// Test suite: Sequence & Reordering (Tests 77-80, 89-93)
// Tests for sequence assignment, manual reordering, and reordered flag

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test sequence assignment when item gets CD3 (not manually reordered)
async function testSequenceAssignedWhenCD3Assigned() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add two items
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 1);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.setItemProperty(items[1].id, 'value', 1);
    
    // Advance to Duration stage and unlock
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    
    // Now set duration for Item 1 (CD3 = 9/1 = 9)
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    
    // Get fresh items after Item 1 updates
    items = TestAdapter.getItems();
    const item1AfterSetup = items.find(i => i.name === 'Item 1');
    assertEqual(item1AfterSetup.CD3, 9, 'Item 1 should have CD3 9 after setting all properties');
    
    // Set duration for Item 2 (CD3 = 1/1 = 1)
    const item2Ref = items.find(i => i.name === 'Item 2');
    if (!item2Ref) {
        assert(false, 'Item 2 not found');
        return;
    }
    result = TestAdapter.setItemProperty(item2Ref.id, 'duration', 1);
    assert(result.success, `Setting duration for Item 2 should succeed: ${result.error || ''}`);
    
    const updatedItems = TestAdapter.getItems();
    const item1 = updatedItems.find(i => i.name === 'Item 1');
    const item2 = updatedItems.find(i => i.name === 'Item 2');
    
    if (!item1 || !item2) {
        assert(false, 'Items not found after updates');
        return;
    }
    
    // Verify CD3 values first
    assertEqual(item1.CD3, 9, 'Item 1 should have CD3 9');
    assertEqual(item2.CD3, 1, 'Item 2 should have CD3 1');
    
    // Item 1 should have sequence 1 (higher CD3)
    assertEqual(item1.sequence, 1, 'Item 1 should have sequence 1 (CD3 9)');
    // Item 2 should have sequence 2 (lower CD3)
    assertEqual(item2.sequence, 2, 'Item 2 should have sequence 2 (CD3 1)');
}

// Test sequence assignment when manually reordered - insert above highest CD3
async function testSequenceInsertionWhenManuallyReordered() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add three items
    TestAdapter.addItem('Item Low');
    TestAdapter.addItem('Item Medium');
    TestAdapter.addItem('Item High');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 2);
    TestAdapter.setItemProperty(items[2].id, 'value', 3);
    
    // Advance to Duration stage and unlock
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    
    // Set duration for all items
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 3);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    assert(result.success, `Setting duration for Item Medium should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    assert(result.success, `Setting duration for Item High should succeed: ${result.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    
    // Now manually reorder by accessing Store directly
    const { Store } = await import('../../state/appState.js');
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = true;
    Store.save(appState);
    
    // Manually set sequences: Low (seq 1), Medium (seq 2), High (seq 3)
    // This simulates user manually reordering
    const currentItems = Store.getItems();
    const itemLow = currentItems.find(i => i.name === 'Item Low');
    const itemMedium = currentItems.find(i => i.name === 'Item Medium');
    const itemHigh = currentItems.find(i => i.name === 'Item High');
    
    itemLow.sequence = 1;
    itemMedium.sequence = 2;
    itemHigh.sequence = 3;
    Store.saveItems(currentItems);
    
    // Navigate back to Item Listing stage to allow adding items
    while (TestAdapter.getCurrentStage() !== 'Item Listing') {
        TestAdapter.backStage();
    }
    
    // Now add a new item with CD3 = 9 (same as Item High)
    const addResult = TestAdapter.addItem('Item New');
    assert(addResult.success, `Adding Item New should succeed: ${addResult.error || ''}`);
    
    // Reload items after adding
    let newItems = TestAdapter.getItems();
    let itemNew = newItems.find(i => i.name === 'Item New');
    
    if (!itemNew) {
        // Try one more time with Store
        newItems = Store.getItems();
        itemNew = newItems.find(i => i.name === 'Item New');
        if (!itemNew) {
            assert(false, 'Item New not found after adding');
            return;
        }
    }
    
    // Navigate forward and set properties at each stage (required to advance)
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    result = TestAdapter.setItemProperty(itemNew.id, 'urgency', 3);
    assert(result.success, `Setting urgency for Item New should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    result = TestAdapter.setItemProperty(itemNew.id, 'value', 3);
    assert(result.success, `Setting value for Item New should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    result = TestAdapter.setItemProperty(itemNew.id, 'duration', 1);
    assert(result.success, `Setting duration for Item New should succeed: ${result.error || ''}`);
    
    // Reload to get updated item - use TestAdapter for consistency
    newItems = TestAdapter.getItems();
    itemNew = newItems.find(i => i.name === 'Item New');
    if (!itemNew) {
        // Try Store as fallback
        newItems = Store.getItems();
        itemNew = newItems.find(i => i.name === 'Item New');
        if (!itemNew) {
            assert(false, 'Item New not found after setting properties');
            return;
        }
    }
    
    const finalItems = TestAdapter.getItems();
    const finalItemNew = finalItems.find(i => i.name === 'Item New');
    const finalItemLow = finalItems.find(i => i.name === 'Item Low');
    const finalItemMedium = finalItems.find(i => i.name === 'Item Medium');
    const finalItemHigh = finalItems.find(i => i.name === 'Item High');
    
    // Item New (CD3 9) should be inserted above Item Medium (CD3 6, highest with lower CD3)
    // So sequence should be: Low (1), New (2), Medium (3), High (4)
    assertEqual(finalItemLow.sequence, 1, 'Item Low should remain sequence 1');
    assertEqual(finalItemNew.sequence, 2, 'Item New should be sequence 2 (above Item Medium)');
    assertEqual(finalItemMedium.sequence, 3, 'Item Medium should be sequence 3 (shifted)');
    assertEqual(finalItemHigh.sequence, 4, 'Item High should be sequence 4 (shifted)');
    assertEqual(finalItemNew.addedToManuallySequencedList, true, 'Item New should have addedToManuallySequencedList flag');
}

// Test that [New] flag is cleared on reset
async function testNewFlagClearedOnReset() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set up with CD3
    TestAdapter.addItem('Item 1');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    
    // Manually reorder to set flag
    const { Store } = await import('../../state/appState.js');
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = true;
    Store.save(appState);
    
    // Navigate back to Item Listing stage to allow adding items
    while (TestAdapter.getCurrentStage() !== 'Item Listing') {
        TestAdapter.backStage();
    }
    
    // Add another item that will get the flag
    const addResult = TestAdapter.addItem('Item 2');
    assert(addResult.success, `Adding Item 2 should succeed: ${addResult.error || ''}`);
    
    // Reload items after adding
    let newItems = TestAdapter.getItems();
    let item2 = newItems.find(i => i.name === 'Item 2');
    
    if (!item2) {
        // Try one more time with Store
        newItems = Store.getItems();
        item2 = newItems.find(i => i.name === 'Item 2');
        if (!item2) {
            assert(false, 'Item 2 not found after adding');
            return;
        }
    }
    
    // Navigate forward and set properties at each stage (required to advance)
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    result = TestAdapter.setItemProperty(item2.id, 'urgency', 3);
    assert(result.success, `Setting urgency for Item 2 should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    result = TestAdapter.setItemProperty(item2.id, 'value', 3);
    assert(result.success, `Setting value for Item 2 should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    result = TestAdapter.setItemProperty(item2.id, 'duration', 1);
    assert(result.success, `Setting duration for Item 2 should succeed: ${result.error || ''}`);
    
    // Reload to get updated item - use TestAdapter for consistency
    newItems = TestAdapter.getItems();
    item2 = newItems.find(i => i.name === 'Item 2');
    if (!item2) {
        // Try Store as fallback
        newItems = Store.getItems();
        item2 = newItems.find(i => i.name === 'Item 2');
        if (!item2) {
            assert(false, 'Item 2 not found after setting properties');
            return;
        }
    }
    
    // Verify flag is set
    const itemsBeforeReset = TestAdapter.getItems();
    const item2BeforeReset = itemsBeforeReset.find(i => i.name === 'Item 2');
    assertEqual(item2BeforeReset.addedToManuallySequencedList, true, 'Item 2 should have flag before reset');
    
    // Reset order
    const { resetResultsOrder } = await import('../../ui/display.js');
    resetResultsOrder();
    
    // Verify flag is cleared
    const itemsAfterReset = Store.getItems();
    const item2AfterReset = itemsAfterReset.find(i => i.name === 'Item 2');
    assertEqual(item2AfterReset.addedToManuallySequencedList, false, 'Item 2 should not have flag after reset');
}

// Test that new item is inserted in CD3 order when not manually reordered
async function testNewItemInsertedInCD3Order() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add three items
    TestAdapter.addItem('Item A');
    TestAdapter.addItem('Item B');
    TestAdapter.addItem('Item C');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 2);
    TestAdapter.setItemProperty(items[2].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration for all items
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration for Item A should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    assert(result.success, `Setting duration for Item B should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    assert(result.success, `Setting duration for Item C should succeed: ${result.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    
    // Verify sequences are in CD3 order: C (9), B (6), A (1)
    const { Store } = await import('../../state/appState.js');
    const sequencedItems = Store.getItems();
    const itemA = sequencedItems.find(i => i.name === 'Item A');
    const itemB = sequencedItems.find(i => i.name === 'Item B');
    const itemC = sequencedItems.find(i => i.name === 'Item C');
    
    assertEqual(itemC.sequence, 1, 'Item C (CD3 9) should be sequence 1');
    assertEqual(itemB.sequence, 2, 'Item B (CD3 6) should be sequence 2');
    assertEqual(itemA.sequence, 3, 'Item A (CD3 1) should be sequence 3');
}

// Test that reordered flag defaults to false for new items
async function testReorderedFlagDefaultsToFalse() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add an item
    const addResult = TestAdapter.addItem('Test Item');
    assert(addResult.success, `Adding item should succeed: ${addResult.error || ''}`);
    
    // Get the item
    let items = TestAdapter.getItems();
    const item = items.find(i => i.name === 'Test Item');
    assert(item !== undefined, 'Item should exist');
    
    // Verify reordered flag defaults to false
    assertEqual(item.reordered, false, 'New item should have reordered flag set to false');
}

// Test that reordered flag is set when item is manually moved
async function testReorderedFlagSetWhenManuallyMoved() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add two items and set up with CD3
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.setItemProperty(items[1].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    
    // Reload items to get updated sequences
    items = TestAdapter.getItems();
    const item1 = items.find(i => i.name === 'Item 1');
    const item2 = items.find(i => i.name === 'Item 2');
    
    // Verify items exist
    assert(item1 !== undefined, 'Item 1 should exist');
    assert(item2 !== undefined, 'Item 2 should exist');
    
    // Verify items have sequences
    assert(item1.sequence !== null && item1.sequence !== undefined, 'Item 1 should have a sequence');
    assert(item2.sequence !== null && item2.sequence !== undefined, 'Item 2 should have a sequence');
    
    // Verify reordered flags are false initially
    assertEqual(item1.reordered, false, 'Item 1 should not have reordered flag initially');
    assertEqual(item2.reordered, false, 'Item 2 should not have reordered flag initially');
    
    // Manually reorder item1 down (move it down in sequence)
    const { Store } = await import('../../state/appState.js');
    const { reorderItemSequence } = await import('../../models/items.js');
    const currentItems = Store.getItems();
    const item1ToMove = currentItems.find(i => i.id === item1.id);
    assert(item1ToMove !== undefined, 'Item 1 to move should exist in Store');
    
    const reorderResult = reorderItemSequence(item1ToMove.id, 'down', currentItems);
    assert(reorderResult.success, `Reordering item should succeed: ${reorderResult.error || ''}`);
    Store.saveItems(currentItems);
    
    // Reload items
    const itemsAfterReorder = Store.getItems();
    const item1AfterReorder = itemsAfterReorder.find(i => i.id === item1.id);
    assert(item1AfterReorder !== undefined, 'Item 1 should exist after reorder');
    
    // Verify reordered flag is set for the moved item
    assertEqual(item1AfterReorder.reordered, true, 'Item 1 should have reordered flag set to true after being moved');
}

// Test that only the moved item gets reordered flag, not the displaced item
async function testOnlyMovedItemGetsReorderedFlag() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add three items and set up with CD3
    TestAdapter.addItem('Item A');
    TestAdapter.addItem('Item B');
    TestAdapter.addItem('Item C');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.setItemProperty(items[1].id, 'value', 3);
    TestAdapter.setItemProperty(items[2].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    
    // Reload items to get updated sequences
    items = TestAdapter.getItems();
    const itemA = items.find(i => i.name === 'Item A');
    const itemB = items.find(i => i.name === 'Item B');
    const itemC = items.find(i => i.name === 'Item C');
    
    // Verify all items exist
    assert(itemA !== undefined, 'Item A should exist');
    assert(itemB !== undefined, 'Item B should exist');
    assert(itemC !== undefined, 'Item C should exist');
    
    // Verify all items have sequences
    assert(itemA.sequence !== null && itemA.sequence !== undefined, 'Item A should have a sequence');
    assert(itemB.sequence !== null && itemB.sequence !== undefined, 'Item B should have a sequence');
    assert(itemC.sequence !== null && itemC.sequence !== undefined, 'Item C should have a sequence');
    
    // Verify initial sequences (should be sorted by CD3)
    const initialSeqA = itemA.sequence;
    const initialSeqB = itemB.sequence;
    const initialSeqC = itemC.sequence;
    
    // Manually reorder itemB down (this will swap with itemC)
    const { Store } = await import('../../state/appState.js');
    const { reorderItemSequence } = await import('../../models/items.js');
    const currentItems = Store.getItems();
    const itemBToMove = currentItems.find(i => i.id === itemB.id);
    const itemCToDisplace = currentItems.find(i => i.id === itemC.id);
    assert(itemBToMove !== undefined, 'Item B to move should exist in Store');
    assert(itemCToDisplace !== undefined, 'Item C to displace should exist in Store');
    
    // Verify initial reordered flags
    assertEqual(itemBToMove.reordered, false, 'Item B should not have reordered flag initially');
    assertEqual(itemCToDisplace.reordered, false, 'Item C should not have reordered flag initially');
    
    // Move itemB down
    const reorderResult = reorderItemSequence(itemBToMove.id, 'down', currentItems);
    assert(reorderResult.success, `Reordering item should succeed: ${reorderResult.error || ''}`);
    Store.saveItems(currentItems);
    
    // Reload items
    const itemsAfterReorder = Store.getItems();
    const itemBAfterReorder = itemsAfterReorder.find(i => i.id === itemB.id);
    const itemCAfterReorder = itemsAfterReorder.find(i => i.id === itemC.id);
    assert(itemBAfterReorder !== undefined, 'Item B should exist after reorder');
    assert(itemCAfterReorder !== undefined, 'Item C should exist after reorder');
    
    // Verify only itemB (the moved item) has reordered flag set
    assertEqual(itemBAfterReorder.reordered, true, 'Item B (moved item) should have reordered flag set to true');
    assertEqual(itemCAfterReorder.reordered, false, 'Item C (displaced item) should NOT have reordered flag set');
    
    // Verify sequences were swapped
    assertEqual(itemBAfterReorder.sequence, initialSeqC, 'Item B should now have Item C\'s sequence');
    assertEqual(itemCAfterReorder.sequence, initialSeqB, 'Item C should now have Item B\'s sequence');
}

// Test that reordered flag is cleared on reset
async function testReorderedFlagClearedOnReset() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add two items and set up with CD3
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.setItemProperty(items[1].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    
    // Reload items
    items = TestAdapter.getItems();
    const item1 = items.find(i => i.name === 'Item 1');
    const item2 = items.find(i => i.name === 'Item 2');
    
    // Verify items exist
    assert(item1 !== undefined, 'Item 1 should exist');
    assert(item2 !== undefined, 'Item 2 should exist');
    
    // Manually reorder item1
    const { Store } = await import('../../state/appState.js');
    const { reorderItemSequence } = await import('../../models/items.js');
    const currentItems = Store.getItems();
    const item1ToMove = currentItems.find(i => i.id === item1.id);
    assert(item1ToMove !== undefined, 'Item 1 to move should exist in Store');
    
    const reorderResult = reorderItemSequence(item1ToMove.id, 'down', currentItems);
    assert(reorderResult.success, `Reordering item should succeed: ${reorderResult.error || ''}`);
    Store.saveItems(currentItems);
    
    // Verify reordered flag is set
    const itemsBeforeReset = Store.getItems();
    const item1BeforeReset = itemsBeforeReset.find(i => i.id === item1.id);
    assert(item1BeforeReset !== undefined, 'Item 1 should exist before reset');
    assertEqual(item1BeforeReset.reordered, true, 'Item 1 should have reordered flag before reset');
    
    // Reset order
    const { resetResultsOrder } = await import('../../ui/display.js');
    resetResultsOrder();
    
    // Verify reordered flag is cleared
    const itemsAfterReset = Store.getItems();
    const item1AfterReset = itemsAfterReset.find(i => i.id === item1.id);
    const item2AfterReset = itemsAfterReset.find(i => i.id === item2.id);
    assert(item1AfterReset !== undefined, 'Item 1 should exist after reset');
    assert(item2AfterReset !== undefined, 'Item 2 should exist after reset');
    assertEqual(item1AfterReset.reordered, false, 'Item 1 should not have reordered flag after reset');
    assertEqual(item2AfterReset.reordered, false, 'Item 2 should not have reordered flag after reset');
}

// Test that reordered flag persists (normalization)
async function testReorderedFlagPersists() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add an item and set up with CD3
    TestAdapter.addItem('Test Item');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // Reload items
    items = TestAdapter.getItems();
    const testItem = items.find(i => i.name === 'Test Item');
    
    // Verify item exists
    assert(testItem !== undefined, 'Test Item should exist');
    
    // Manually set reordered flag to true (simulating persisted state)
    const { Store } = await import('../../state/appState.js');
    const { normalizeItem } = await import('../../models/items.js');
    const currentItems = Store.getItems();
    const itemToNormalize = currentItems.find(i => i.id === testItem.id);
    assert(itemToNormalize !== undefined, 'Item to normalize should exist in Store');
    
    // Set reordered flag directly
    itemToNormalize.reordered = true;
    Store.saveItems(currentItems);
    
    // Normalize the item (this simulates loading from storage)
    const normalizedItem = normalizeItem({...itemToNormalize});
    
    // Verify reordered flag persists after normalization
    assertEqual(normalizedItem.reordered, true, 'Reordered flag should persist after normalization');
    
    // Test with undefined reordered (should default to false)
    const itemWithoutFlag = { id: 'test-2', name: 'Test Item 2', urgency: 0, value: 0, duration: 0 };
    const normalizedItemWithoutFlag = normalizeItem(itemWithoutFlag);
    assertEqual(normalizedItemWithoutFlag.reordered, false, 'Item without reordered flag should default to false');
}

// Export test suite
export const sequenceTests = [
    { number: 77, name: 'Sequence Assignment When CD3 Assigned', fn: testSequenceAssignedWhenCD3Assigned },
    { number: 78, name: 'Sequence Insertion When Manually Reordered', fn: testSequenceInsertionWhenManuallyReordered },
    { number: 79, name: '[New] Flag Cleared On Reset', fn: testNewFlagClearedOnReset },
    { number: 80, name: 'New Item Inserted In CD3 Order', fn: testNewItemInsertedInCD3Order },
    { number: 89, name: 'Reordered Flag Defaults to False', fn: testReorderedFlagDefaultsToFalse },
    { number: 90, name: 'Reordered Flag Set When Item Is Manually Moved', fn: testReorderedFlagSetWhenManuallyMoved },
    { number: 91, name: 'Only Moved Item Gets Reordered Flag', fn: testOnlyMovedItemGetsReorderedFlag },
    { number: 92, name: 'Reordered Flag Cleared On Reset', fn: testReorderedFlagClearedOnReset },
    { number: 93, name: 'Reordered Flag Persists (Normalization)', fn: testReorderedFlagPersists }
];

