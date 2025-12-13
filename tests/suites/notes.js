// Test suite: Notes Functionality (Test 81)
// Tests for notes functionality across all stages

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test notes functionality across all stages
async function testNotesFunctionalityAcrossStages() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add an item
    const addResult = TestAdapter.addItem('Test Notes Item');
    assert(addResult.success, `Adding item should succeed: ${addResult.error || ''}`);
    
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist after adding');
    
    // Add a note while on Item Listing stage
    const noteResult = TestAdapter.addItemNote(testItem.id, 'This is a test note');
    assert(noteResult.success, `Adding note should succeed: ${noteResult.error || ''}`);
    
    // Reload items and verify note was added
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should still exist');
    assert(Array.isArray(testItem.notes), 'Item should have notes array');
    assertEqual(testItem.notes.length, 1, 'Item should have 1 note');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'Note text should match');
    assert(testItem.notes[0].createdAt !== undefined, 'Note should have createdAt timestamp');
    assert(testItem.notes[0].modifiedAt !== undefined, 'Note should have modifiedAt timestamp');
    
    // Advance to Urgency stage
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    assertEqual(TestAdapter.getCurrentStage(), 'urgency', 'Should be on urgency stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in urgency stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in urgency stage');
    
    // Set urgency and advance to Value stage
    const urgencyResult = TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    assert(urgencyResult.success, `Setting urgency should succeed: ${urgencyResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    assertEqual(TestAdapter.getCurrentStage(), 'value', 'Should be on value stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in value stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in value stage');
    
    // Set value and advance to Duration stage
    const valueResult = TestAdapter.setItemProperty(testItem.id, 'value', 2);
    assert(valueResult.success, `Setting value should succeed: ${valueResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    assertEqual(TestAdapter.getCurrentStage(), 'duration', 'Should be on duration stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in duration stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in duration stage');
    
    // Set duration and advance to Results stage
    const durationResult = TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    assert(durationResult.success, `Setting duration should succeed: ${durationResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Duration -> Results
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in Results stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in Results stage');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'Note text should still match in Results stage');
    
    // Add another note while on Results stage
    const note2Result = TestAdapter.addItemNote(testItem.id, 'Second note added in Results stage');
    assert(note2Result.success, `Adding second note should succeed: ${note2Result.error || ''}`);
    
    // Reload items and verify both notes exist
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assertEqual(testItem.notes.length, 2, 'Item should have 2 notes');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'First note should still exist');
    assertEqual(testItem.notes[1].text, 'Second note added in Results stage', 'Second note should exist');
    
    // Verify notes can be accessed via API
    const notes = TestAdapter.getItemNotes(testItem.id);
    assert(notes !== null, 'getItemNotes should return notes array');
    assertEqual(notes.length, 2, 'getItemNotes should return 2 notes');
}

// Export test suite
export const notesTests = [
    { number: 81, name: 'Notes Functionality Across All Stages', fn: testNotesFunctionalityAcrossStages }
];

