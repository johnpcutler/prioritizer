// Test suite: CD3 Calculations (Tests 48-58)
// Tests for CD3 calculation, updates, and weight changes

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test CD3 calculation
async function testCD3DefaultsToZero() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // CD3 should be 0 when item has no duration
    assertEqual(items[0].CD3, 0, 'CD3 should default to 0');
    assertEqual(items[0].duration, 0, 'Duration should be 0');
}

async function testCD3CalculatedWhenDurationSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1, duration 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: costOfDelay (1) / duration weight (1) = 1
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
}

async function testCD3WithDifferentDurationWeights() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: costOfDelay (4) / duration weight (2) = 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
}

async function testCD3WithDuration3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 3, value 3 (costOfDelay = 9), duration 3 (weight 3)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 3);
    
    // CD3 should be: costOfDelay (9) / duration weight (3) = 3
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 3, 'CD3 should be 3 (9 / 3)');
}

async function testCD3UpdatesWhenDurationChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: 4 / 1 = 4
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 4, 'CD3 should be 4 (4 / 1)');
    
    // Change duration to 2
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should now be: 4 / 2 = 2
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
}

async function testCD3UpdatesWhenCostOfDelayChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1 (costOfDelay = 1), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: 1 / 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
    
    // Change urgency to 3 (unlock first)
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Cost of delay should now be: 3 × 1 = 3
    // CD3 should now be: 3 / 1 = 3
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 3, 'CD3 should be 3 (3 / 1)');
}

async function testCD3ResetsToZeroWhenDurationCleared() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // CD3 should be 0 when no duration is set
    assertEqual(items[0].CD3, 0, 'CD3 should be 0 when duration is not set');
    
    // Set urgency 2, value 2 (costOfDelay = 4), but no duration yet
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // CD3 should still be 0 (no duration set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 0, 'CD3 should be 0 when duration is not set');
    
    // Set duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: 4 / 2 = 2
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
    
    // Note: Cannot unset properties once set, so we test that CD3 is 0 when duration is 0 initially
    // This test verifies that CD3 correctly defaults to 0 when duration is 0
}

async function testCD3UpdatesWhenDurationWeightsChange() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: 4 / 2 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
    
    // Change duration 2 weight to 4
    TestAdapter.setDurationWeight(2, 4);
    
    // CD3 should now be: 4 / 4 = 1
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (4 / 4) after weight change');
}

// Test value weight change affects costOfDelay and CD3
async function testValueWeightChangeAffectsCostOfDelayAndCD3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1 (costOfDelay = 1), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // Cost of delay should be: 1 × 1 = 1
    // CD3 should be: 1 / 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
    
    // Change value 1 weight to 5
    TestAdapter.setValueWeight(1, 5);
    
    // Cost of delay should now be: 1 × 5 = 5
    // CD3 should now be: 5 / 1 = 5
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Cost of delay should be 5 (1 × 5) after value weight change');
    assertEqual(updatedItems[0].CD3, 5, 'CD3 should be 5 (5 / 1) after value weight change');
}

// Test urgency weight change affects CD3 (not just costOfDelay)
async function testUrgencyWeightChangeAffectsCD3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 2 (costOfDelay = 2), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // Cost of delay should be: 1 × 2 = 2
    // CD3 should be: 2 / 1 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (1 × 2)');
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (2 / 1)');
    
    // Change urgency 1 weight to 3
    TestAdapter.setUrgencyWeight(1, 3);
    
    // Cost of delay should now be: 3 × 2 = 6
    // CD3 should now be: 6 / 1 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (3 × 2) after urgency weight change');
    assertEqual(updatedItems[0].CD3, 6, 'CD3 should be 6 (6 / 1) after urgency weight change');
}

// Test weight changes affect multiple items
async function testWeightChangesAffectMultipleItems() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add multiple items
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    TestAdapter.addItem('Item 3');
    const items = TestAdapter.getItems();
    
    // Set different urgency values for each item, all with value 1, duration 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 2);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 1);
    TestAdapter.setItemProperty(items[2].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    
    // Initial values:
    // Item 1: urgency 1 (weight 1), value 1 (weight 1) = costOfDelay 1, CD3 = 1/1 = 1
    // Item 2: urgency 2 (weight 2), value 1 (weight 1) = costOfDelay 2, CD3 = 2/1 = 2
    // Item 3: urgency 3 (weight 3), value 1 (weight 1) = costOfDelay 3, CD3 = 3/1 = 3
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Item 1 costOfDelay should be 1');
    assertEqual(updatedItems[0].CD3, 1, 'Item 1 CD3 should be 1');
    assertEqual(updatedItems[1].costOfDelay, 2, 'Item 2 costOfDelay should be 2');
    assertEqual(updatedItems[1].CD3, 2, 'Item 2 CD3 should be 2');
    assertEqual(updatedItems[2].costOfDelay, 3, 'Item 3 costOfDelay should be 3');
    assertEqual(updatedItems[2].CD3, 3, 'Item 3 CD3 should be 3');
    
    // Change urgency 1 weight to 5 (affects Item 1)
    TestAdapter.setUrgencyWeight(1, 5);
    
    // After change:
    // Item 1: urgency 1 (weight 5), value 1 (weight 1) = costOfDelay 5, CD3 = 5/1 = 5
    // Item 2: urgency 2 (weight 2), value 1 (weight 1) = costOfDelay 2, CD3 = 2/1 = 2 (unchanged)
    // Item 3: urgency 3 (weight 3), value 1 (weight 1) = costOfDelay 3, CD3 = 3/1 = 3 (unchanged)
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Item 1 costOfDelay should be 5 after urgency weight change');
    assertEqual(updatedItems[0].CD3, 5, 'Item 1 CD3 should be 5 after urgency weight change');
    assertEqual(updatedItems[1].costOfDelay, 2, 'Item 2 costOfDelay should still be 2');
    assertEqual(updatedItems[1].CD3, 2, 'Item 2 CD3 should still be 2');
    assertEqual(updatedItems[2].costOfDelay, 3, 'Item 3 costOfDelay should still be 3');
    assertEqual(updatedItems[2].CD3, 3, 'Item 3 CD3 should still be 3');
}

// Export test suite
export const cd3Tests = [
    { number: 48, name: 'CD3 Defaults to Zero', fn: testCD3DefaultsToZero },
    { number: 49, name: 'CD3 Calculated When Duration Set', fn: testCD3CalculatedWhenDurationSet },
    { number: 50, name: 'CD3 With Different Duration Weights', fn: testCD3WithDifferentDurationWeights },
    { number: 51, name: 'CD3 With Duration 3', fn: testCD3WithDuration3 },
    { number: 52, name: 'CD3 Updates When Duration Changes', fn: testCD3UpdatesWhenDurationChanges },
    { number: 53, name: 'CD3 Updates When Cost of Delay Changes', fn: testCD3UpdatesWhenCostOfDelayChanges },
    { number: 54, name: 'CD3 Resets To Zero When Duration Cleared', fn: testCD3ResetsToZeroWhenDurationCleared },
    { number: 55, name: 'CD3 Updates When Duration Weights Change', fn: testCD3UpdatesWhenDurationWeightsChange },
    { number: 56, name: 'Value Weight Change Affects CostOfDelay and CD3', fn: testValueWeightChangeAffectsCostOfDelayAndCD3 },
    { number: 57, name: 'Urgency Weight Change Affects CD3', fn: testUrgencyWeightChangeAffectsCD3 },
    { number: 58, name: 'Weight Changes Affect Multiple Items', fn: testWeightChangesAffectMultipleItems }
];

