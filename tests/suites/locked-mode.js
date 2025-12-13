// Test suite: Locked/Unlocked Mode (Tests 30-36)
// Tests for locked mode behavior and property setting restrictions

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test locked/unlocked behavior
async function testLockedModeDefault() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    const state = TestAdapter.getAppState();
    assert(state.locked === true, 'Locked should default to true');
}

async function testLockedModeCannotSetUrgencyInValueStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency for the item
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Try to set urgency (should fail when locked)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(!result.success, 'Should not be able to set urgency in value stage when locked');
    assert(result.error && result.error.toLowerCase().includes('cannot set'), 'Error should mention cannot set');
}

async function testUnlockedModeCanSetUrgencyInValueStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency for the item
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Unlock
    TestAdapter.setLocked(false);
    const state = TestAdapter.getAppState();
    assert(state.locked === false, 'Locked should be false');
    
    // Try to set urgency (should succeed when unlocked)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result.success, 'Should be able to set urgency in value stage when unlocked');
    
    // Verify urgency was changed
    const updatedItems = TestAdapter.getItems();
    assert(updatedItems[0].urgency === 1, 'Urgency should be 1');
}

async function testUnlockedModeCanSetUrgencyAndValueInDurationStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance from urgency to value
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Set value
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Advance from value to duration
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'duration', 'Should be in duration stage');
    
    // Unlock
    TestAdapter.setLocked(false);
    
    // Try to set urgency (should succeed when unlocked)
    const result1 = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result1.success, 'Should be able to set urgency in duration stage when unlocked');
    
    // Try to set value (should succeed when unlocked)
    const result2 = TestAdapter.setItemProperty(items[0].id, 'value', 3);
    assert(result2.success, 'Should be able to set value in duration stage when unlocked');
    
    // Verify values were changed
    const updatedItems = TestAdapter.getItems();
    assert(updatedItems[0].urgency === 1, 'Urgency should be 1');
    assert(updatedItems[0].value === 3, 'Value should be 3');
}

async function testLockedModeCannotSetValueInDurationStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance from urgency to value
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Set value
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Advance from value to duration
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'duration', 'Should be in duration stage');
    
    // Ensure locked (should be default)
    TestAdapter.setLocked(true);
    
    // Try to set value (should fail when locked)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 3);
    assert(!result.success, 'Should not be able to set value in duration stage when locked');
    assert(result.error && result.error.toLowerCase().includes('cannot set'), 'Error should mention cannot set');
}

async function testUnlockedModeCannotSetFutureStages() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Unlock
    TestAdapter.setLocked(false);
    
    // Try to set value (should fail - can't set future stages even when unlocked)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 2);
    assert(!result.success, 'Should not be able to set value when in urgency stage (future stage)');
}

async function testSetLockedToggle() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Should start locked
    let state = TestAdapter.getAppState();
    assert(state.locked === true, 'Should start locked');
    
    // Toggle to unlocked
    TestAdapter.setLocked(false);
    state = TestAdapter.getAppState();
    assert(state.locked === false, 'Should be unlocked after toggle');
    
    // Toggle back to locked
    TestAdapter.setLocked(true);
    state = TestAdapter.getAppState();
    assert(state.locked === true, 'Should be locked after toggle back');
}

// Export test suite
export const lockedModeTests = [
    { number: 30, name: 'Locked Mode Defaults to True', fn: testLockedModeDefault },
    { number: 31, name: 'Locked Mode Cannot Set Urgency in Value Stage', fn: testLockedModeCannotSetUrgencyInValueStage },
    { number: 32, name: 'Unlocked Mode Can Set Urgency in Value Stage', fn: testUnlockedModeCanSetUrgencyInValueStage },
    { number: 33, name: 'Unlocked Mode Can Set Urgency and Value in Duration Stage', fn: testUnlockedModeCanSetUrgencyAndValueInDurationStage },
    { number: 34, name: 'Locked Mode Cannot Set Value in Duration Stage', fn: testLockedModeCannotSetValueInDurationStage },
    { number: 35, name: 'Unlocked Mode Cannot Set Future Stages', fn: testUnlockedModeCannotSetFutureStages },
    { number: 36, name: 'Set Locked Toggle', fn: testSetLockedToggle }
];

