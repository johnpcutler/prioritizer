// Test suite: Property Unset Validation (Tests 73-76)
// Tests for preventing unsetting properties once they are set

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test that urgency cannot be unset once set
async function testCannotUnsetUrgencyOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set urgency
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency to 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Try to set urgency back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 0);
    
    assert(!result.success, 'Setting urgency to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify urgency is still 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 2, 'Urgency should still be 2');
}

// Test that value cannot be unset once set
async function testCannotUnsetValueOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency and value
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 3
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Try to set value back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 0);
    
    assert(!result.success, 'Setting value to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify value is still 3
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].value, 3, 'Value should still be 3');
}

// Test that duration cannot be unset once set
async function testCannotUnsetDurationOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency, value, and duration
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1, duration 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // Try to set duration back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'duration', 0);
    
    assert(!result.success, 'Setting duration to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify duration is still 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].duration, 2, 'Duration should still be 2');
}

// Test that urgency can still be changed (not unset)
async function testCanStillChangeUrgencyValues() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set urgency
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency to 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Change urgency to 1 (should succeed)
    let result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result.success, 'Changing urgency from 2 to 1 should succeed');
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 1, 'Urgency should be 1');
    
    // Change urgency to 3 (should succeed)
    result = TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    assert(result.success, 'Changing urgency from 1 to 3 should succeed');
    
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 3, 'Urgency should be 3');
}

// Export test suite
export const propertyValidationTests = [
    { number: 73, name: 'Cannot Unset Urgency Once Set', fn: testCannotUnsetUrgencyOnceSet },
    { number: 74, name: 'Cannot Unset Value Once Set', fn: testCannotUnsetValueOnceSet },
    { number: 75, name: 'Cannot Unset Duration Once Set', fn: testCannotUnsetDurationOnceSet },
    { number: 76, name: 'Can Still Change Urgency Values (Not Unset)', fn: testCanStillChangeUrgencyValues }
];

