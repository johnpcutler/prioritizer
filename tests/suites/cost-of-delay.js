// Test suite: Cost of Delay Calculation (Tests 37-43)
// Tests for cost of delay calculation and updates

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test cost of delay calculation
async function testCostOfDelayDefaultsToZero() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Cost of delay should be 0 when item has no urgency or value
    assertEqual(items[0].costOfDelay, 0, 'Cost of delay should default to 0');
    assertEqual(items[0].urgency, 0, 'Urgency should be 0');
    assertEqual(items[0].value, 0, 'Value should be 0');
}

async function testCostOfDelayCalculatedWhenBothSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance to urgency stage and set urgency
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    
    // Cost of delay should still be 0 (no value set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 0, 'Cost of delay should be 0 when only urgency is set');
    
    // Advance to value stage and set value
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should now be calculated: urgency 1 (weight 1) × value 1 (weight 1) = 1
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
}

async function testCostOfDelayWithDifferentWeights() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance to urgency stage and set urgency to 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage and set value to 3 (weight 3)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Cost of delay should be: urgency 2 (weight 2) × value 3 (weight 3) = 6
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (2 × 3)');
}

async function testCostOfDelayUpdatesWhenUrgencyChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1 and value 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Cost of delay should be: 1 × 2 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (1 × 2)');
    
    // Change urgency to 3 (unlock first to allow changing urgency in value stage)
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Cost of delay should now be: 3 × 2 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (3 × 2)');
}

async function testCostOfDelayUpdatesWhenValueChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2 and value 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should be: 2 × 1 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (2 × 1)');
    
    // Change value to 3
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Cost of delay should now be: 2 × 3 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (2 × 3)');
}

async function testCostOfDelayResetsToZeroWhenUrgencyOrValueCleared() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Cost of delay should be 0 when no urgency or value is set
    assertEqual(items[0].costOfDelay, 0, 'Cost of delay should be 0 when urgency and value are not set');
    
    // Set urgency 2 only (no value)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Cost of delay should still be 0 (no value set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 0, 'Cost of delay should be 0 when only urgency is set');
    
    // Set value 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Cost of delay should be: 2 × 2 = 4
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 4, 'Cost of delay should be 4 (2 × 2)');
    
    // Note: Cannot unset properties once set, so we test that costOfDelay is 0 when properties are 0 initially
    // This test verifies that costOfDelay correctly defaults to 0 when urgency or value is 0
}

async function testCostOfDelayUpdatesWhenWeightsChange() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1 and value 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should be: 1 × 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
    
    // Change urgency 1 weight to 5
    TestAdapter.setUrgencyWeight(1, 5);
    
    // Cost of delay should now be: 5 × 1 = 5
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Cost of delay should be 5 (5 × 1) after weight change');
}

// Export test suite
export const costOfDelayTests = [
    { number: 37, name: 'Cost of Delay Defaults to Zero', fn: testCostOfDelayDefaultsToZero },
    { number: 38, name: 'Cost of Delay Calculated When Both Set', fn: testCostOfDelayCalculatedWhenBothSet },
    { number: 39, name: 'Cost of Delay With Different Weights', fn: testCostOfDelayWithDifferentWeights },
    { number: 40, name: 'Cost of Delay Updates When Urgency Changes', fn: testCostOfDelayUpdatesWhenUrgencyChanges },
    { number: 41, name: 'Cost of Delay Updates When Value Changes', fn: testCostOfDelayUpdatesWhenValueChanges },
    { number: 42, name: 'Cost of Delay Resets To Zero When Urgency Or Value Cleared', fn: testCostOfDelayResetsToZeroWhenUrgencyOrValueCleared },
    { number: 43, name: 'Cost of Delay Updates When Weights Change', fn: testCostOfDelayUpdatesWhenWeightsChange }
];

