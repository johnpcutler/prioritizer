// Test suite: Confidence Survey (Tests 82-88)
// Tests for confidence survey functionality, calculation, editing, deletion, and edge cases

// Import test infrastructure from test-core
import {
    assert,
    assertEqual
} from '../test-core.js';

// Test confidence survey basic functionality
async function testConfidenceSurveyBasic() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    const addResult = TestAdapter.addItem('Confidence Test Item');
    assert(addResult.success, `Adding item should succeed: ${addResult.error || ''}`);
    
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Confidence Test Item');
    assert(testItem !== undefined, 'Test item should exist after adding');
    
    // Advance through stages and set properties
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    const urgencyResult = TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    assert(urgencyResult.success, `Setting urgency should succeed: ${urgencyResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    const valueResult = TestAdapter.setItemProperty(testItem.id, 'value', 3);
    assert(valueResult.success, `Setting value should succeed: ${valueResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    const durationResult = TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    assert(durationResult.success, `Setting duration should succeed: ${durationResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Duration -> Results
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Confidence Test Item');
    
    // Verify item has required properties
    assert(testItem.urgency === 2, 'Item should have urgency 2');
    assert(testItem.value === 3, 'Item should have value 3');
    assert(testItem.duration === 1, 'Item should have duration 1');
    assert(testItem.hasConfidenceSurvey === false, 'Item should not have confidence survey initially');
    
    // Submit confidence survey
    const surveyData = {
        scopeConfidence: {1: 2, 2: 3, 3: 1, 4: 0},
        urgencyConfidence: {1: 1, 2: 4, 3: 2, 4: 1},
        valueConfidence: {1: 0, 2: 2, 3: 3, 4: 3},
        durationConfidence: {1: 1, 2: 2, 3: 2, 4: 3}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting confidence survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items and verify survey was saved
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Confidence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey after submission');
    assert(testItem.confidenceSurvey !== undefined, 'Item should have confidenceSurvey object');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 1, 'Urgency confidence level 1 should be 1');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 4, 'Urgency confidence level 2 should be 4');
    assertEqual(testItem.confidenceSurvey.valueConfidence[3], 3, 'Value confidence level 3 should be 3');
    
    // Verify survey can be retrieved via API
    const retrievedSurvey = TestAdapter.getConfidenceSurvey(testItem.id);
    assert(retrievedSurvey !== null, 'getConfidenceSurvey should return survey data');
    assertEqual(retrievedSurvey.urgencyConfidence[2], 4, 'Retrieved survey should match submitted data');
}

// Test confidence survey calculation
async function testConfidenceSurveyCalculation() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Calculation Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Set properties: urgency=2 (weight 2), value=2 (weight 2), duration=1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Base CD3 should be: (urgency weight 2 * value weight 2) / duration weight 1 = 4 / 1 = 4
    assertEqual(testItem.CD3, 4, 'Base CD3 should be 4');
    
    // Submit survey with known confidence values
    // Using confidence weights: 1=0.30, 2=0.50, 3=0.70, 4=0.90
    // Urgency: 1 vote at level 2 (0.50) = weighted avg 0.50
    // Value: 1 vote at level 3 (0.70) = weighted avg 0.70
    // Duration: 1 vote at level 4 (0.90) = weighted avg 0.90
    const surveyData = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2
        valueConfidence: {1: 0, 2: 0, 3: 1, 4: 0}, // 1 vote at level 3
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 1} // 1 vote at level 4
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Verify confidence-weighted CD3 is calculated
    // Weighted urgency: 2 * 0.50 = 1.0
    // Weighted value: 2 * 0.70 = 1.4
    // Weighted cost of delay: 1.0 * 1.4 = 1.4
    // Weighted duration: 1 * 0.90 = 0.9
    // Weighted CD3: 1.4 / 0.9 = 1.555...
    assert(testItem.confidenceWeightedCD3 !== null, 'Confidence-weighted CD3 should be calculated');
    assert(testItem.confidenceWeightedCD3 !== undefined, 'Confidence-weighted CD3 should be defined');
    assert(Math.abs(testItem.confidenceWeightedCD3 - 1.5556) < 0.01, `Confidence-weighted CD3 should be approximately 1.56, got ${testItem.confidenceWeightedCD3}`);
    
    // Verify weighted values are stored
    assert(testItem.confidenceWeightedValues !== null, 'Confidence-weighted values should be stored');
    assert(testItem.confidenceWeightedValues !== undefined, 'Confidence-weighted values should be defined');
    assert(Math.abs(testItem.confidenceWeightedValues.urgency - 1.0) < 0.01, `Weighted urgency should be 1.0, got ${testItem.confidenceWeightedValues.urgency}`);
    assert(Math.abs(testItem.confidenceWeightedValues.value - 1.4) < 0.01, `Weighted value should be 1.4, got ${testItem.confidenceWeightedValues.value}`);
    assert(Math.abs(testItem.confidenceWeightedValues.duration - 0.9) < 0.01, `Weighted duration should be 0.9, got ${testItem.confidenceWeightedValues.duration}`);
}

// Test confidence survey editing
async function testConfidenceSurveyEditing() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item and set properties
    TestAdapter.addItem('Edit Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Edit Test Item');
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Submit initial survey
    const initialSurvey = {
        scopeConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 1, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult1 = TestAdapter.submitConfidenceSurvey(testItem.id, initialSurvey);
    assert(submitResult1.success, `Initial survey submission should succeed: ${submitResult1.error || ''}`);
    
    // Reload and verify initial values
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edit Test Item');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 1, 'Initial urgency confidence should be 1');
    
    // Edit survey with new values
    const editedSurvey = {
        scopeConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0}
    };
    
    const submitResult2 = TestAdapter.submitConfidenceSurvey(testItem.id, editedSurvey);
    assert(submitResult2.success, `Editing survey should succeed: ${submitResult2.error || ''}`);
    
    // Reload and verify edited values
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edit Test Item');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 0, 'Edited urgency confidence level 1 should be 0');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 1, 'Edited urgency confidence level 2 should be 1');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey after editing');
}

// Test confidence survey deletion
async function testConfidenceSurveyDeletion() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item and set properties
    TestAdapter.addItem('Delete Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Delete Test Item');
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Submit survey
    const surveyData = {
        scopeConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 1, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload and verify survey exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Delete Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey');
    assert(testItem.confidenceWeightedCD3 !== null, 'Item should have confidence-weighted CD3');
    
    // Delete survey
    const deleteResult = TestAdapter.deleteConfidenceSurvey(testItem.id);
    assert(deleteResult.success, `Deleting survey should succeed: ${deleteResult.error || ''}`);
    
    // Reload and verify survey is deleted
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Delete Test Item');
    assert(testItem.hasConfidenceSurvey === false, 'Item should not have confidence survey after deletion');
    assert(testItem.confidenceWeightedCD3 === null, 'Item should not have confidence-weighted CD3 after deletion');
    assert(testItem.confidenceWeightedValues === null, 'Item should not have confidence-weighted values after deletion');
    
    // Verify survey data is reset
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 0, 'Urgency confidence should be reset to 0');
    assertEqual(testItem.confidenceSurvey.valueConfidence[1], 0, 'Value confidence should be reset to 0');
    
    // Verify getConfidenceSurvey returns null
    const retrievedSurvey = TestAdapter.getConfidenceSurvey(testItem.id);
    assert(retrievedSurvey === null, 'getConfidenceSurvey should return null after deletion');
}

// Test confidence survey persistence across stages
async function testConfidenceSurveyPersistence() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Persistence Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Persistence Test Item');
    
    // Set properties and advance to Results
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Submit survey in Results stage
    const surveyData = {
        scopeConfidence: {1: 2, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 2, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 1, 3: 1, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 1, 4: 1}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload and verify survey exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey');
    
    // Navigate back to Duration stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'duration', 'Should be on duration stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in duration stage');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 2, 'Survey data should persist');
    
    // Navigate back to Value stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'value', 'Should be on value stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in value stage');
    
    // Navigate back to Urgency stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'urgency', 'Should be on urgency stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in urgency stage');
}

// Test confidence survey weighted values breakdown
async function testConfidenceSurveyWeightedValues() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Weighted Values Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Weighted Values Test Item');
    
    // Set properties: urgency=3 (weight 3), value=3 (weight 3), duration=2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 2);
    TestAdapter.advanceStage();
    
    // Submit survey with all votes at level 2 (0.50 confidence)
    const surveyData = {
        scopeConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2 = 0.50
        valueConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2 = 0.50
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0} // 1 vote at level 2 = 0.50
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Weighted Values Test Item');
    
    // Verify weighted values
    // Weighted urgency: 3 * 0.50 = 1.5
    // Weighted value: 3 * 0.50 = 1.5
    // Weighted duration: 2 * 0.50 = 1.0
    assert(testItem.confidenceWeightedValues !== null, 'Confidence-weighted values should be stored');
    assert(Math.abs(testItem.confidenceWeightedValues.urgency - 1.5) < 0.01, `Weighted urgency should be 1.5, got ${testItem.confidenceWeightedValues.urgency}`);
    assert(Math.abs(testItem.confidenceWeightedValues.value - 1.5) < 0.01, `Weighted value should be 1.5, got ${testItem.confidenceWeightedValues.value}`);
    assert(Math.abs(testItem.confidenceWeightedValues.duration - 1.0) < 0.01, `Weighted duration should be 1.0, got ${testItem.confidenceWeightedValues.duration}`);
    
    // Verify confidence-weighted CD3: (1.5 * 1.5) / 1.0 = 2.25
    assert(Math.abs(testItem.confidenceWeightedCD3 - 2.25) < 0.01, `Confidence-weighted CD3 should be 2.25, got ${testItem.confidenceWeightedCD3}`);
}

// Test confidence survey edge cases
async function testConfidenceSurveyEdgeCases() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Test 1: Survey with all zeros should not calculate weighted CD3
    TestAdapter.addItem('Edge Case Item 1');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Edge Case Item 1');
    assert(testItem !== undefined, 'Edge Case Item 1 should exist');
    
    // Set properties and advance to Results
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    const zeroSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult1 = TestAdapter.submitConfidenceSurvey(testItem.id, zeroSurvey);
    assert(submitResult1.success, `Submitting zero survey should succeed: ${submitResult1.error || ''}`);
    
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edge Case Item 1');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey flag set');
    // With all zeros, confidence averages will be null, so weighted CD3 should be null
    assert(testItem.confidenceWeightedCD3 === null, 'Confidence-weighted CD3 should be null with all zero votes');
    
    // Test 2: Survey with missing dimension should not calculate weighted CD3
    // Navigate back to Item Listing stage to add new item
    while (TestAdapter.getCurrentStage() !== 'Item Listing') {
        TestAdapter.backStage();
    }
    
    TestAdapter.addItem('Edge Case Item 2');
    items = TestAdapter.getItems();
    let testItem2 = items.find(i => i.name === 'Edge Case Item 2');
    assert(testItem2 !== undefined, 'Edge Case Item 2 should exist');
    
    // Advance to Urgency stage and set properties
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(testItem2.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem2.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem2.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Survey with urgency votes but no value votes
    const partialSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // Has votes
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0}, // No votes
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0} // Has votes
    };
    
    const submitResult2 = TestAdapter.submitConfidenceSurvey(testItem2.id, partialSurvey);
    assert(submitResult2.success, `Submitting partial survey should succeed: ${submitResult2.error || ''}`);
    
    items = TestAdapter.getItems();
    testItem2 = items.find(i => i.name === 'Edge Case Item 2');
    assert(testItem2.hasConfidenceSurvey === true, 'Item should have confidence survey flag');
    // Value confidence has no votes, so weighted CD3 should be null
    assert(testItem2.confidenceWeightedCD3 === null, 'Confidence-weighted CD3 should be null when value has no votes');
    
    // Test 3: Verify confidence weights and labels are accessible
    const weights = TestAdapter.getConfidenceWeights();
    assert(weights !== null, 'Confidence weights should be accessible');
    assertEqual(weights[1], 0.30, 'Confidence weight level 1 should be 0.30');
    assertEqual(weights[2], 0.50, 'Confidence weight level 2 should be 0.50');
    assertEqual(weights[3], 0.70, 'Confidence weight level 3 should be 0.70');
    assertEqual(weights[4], 0.90, 'Confidence weight level 4 should be 0.90');
    
    const labels = TestAdapter.getConfidenceLevelLabels();
    assert(labels !== null, 'Confidence level labels should be accessible');
    assert(typeof labels[1] === 'string', 'Confidence label level 1 should be a string');
    assert(labels[1].includes('Not Confident'), 'Confidence label level 1 should contain "Not Confident"');
}

// Export test suite
export const confidenceSurveyTests = [
    { number: 82, name: 'Confidence Survey Basic Functionality', fn: testConfidenceSurveyBasic },
    { number: 83, name: 'Confidence Survey Calculation', fn: testConfidenceSurveyCalculation },
    { number: 84, name: 'Confidence Survey Editing', fn: testConfidenceSurveyEditing },
    { number: 85, name: 'Confidence Survey Deletion', fn: testConfidenceSurveyDeletion },
    { number: 86, name: 'Confidence Survey Persistence Across Stages', fn: testConfidenceSurveyPersistence },
    { number: 87, name: 'Confidence Survey Weighted Values Breakdown', fn: testConfidenceSurveyWeightedValues },
    { number: 88, name: 'Confidence Survey Edge Cases', fn: testConfidenceSurveyEdgeCases }
];

