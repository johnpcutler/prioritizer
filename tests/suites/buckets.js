// Test suite: Bucket Configuration (Tests 16-29)
// Tests for bucket weights, titles, descriptions, and defaults

// Import test infrastructure from test-core
import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    assert,
    assertEqual,
    getAppState,
    saveAppState,
    initializeBuckets
} from '../test-core.js';
import { BUCKET_DEFAULTS } from '../../models/buckets.js';

// Test: Bucket weights default to 1
function testBucketWeightsDefault() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check urgency buckets have default weights
    assertEqual(appState.buckets.urgency[1].weight, BUCKET_DEFAULTS.urgency[1].weight, 'Urgency 1 should have default weight');
    assertEqual(appState.buckets.urgency[2].weight, BUCKET_DEFAULTS.urgency[2].weight, 'Urgency 2 should have default weight');
    assertEqual(appState.buckets.urgency[3].weight, BUCKET_DEFAULTS.urgency[3].weight, 'Urgency 3 should have default weight');
    
    // Check value buckets have default weights
    assertEqual(appState.buckets.value[1].weight, BUCKET_DEFAULTS.value[1].weight, 'Value 1 should have default weight');
    assertEqual(appState.buckets.value[2].weight, BUCKET_DEFAULTS.value[2].weight, 'Value 2 should have default weight');
    assertEqual(appState.buckets.value[3].weight, BUCKET_DEFAULTS.value[3].weight, 'Value 3 should have default weight');
    
    // Check duration buckets have default weights
    assertEqual(appState.buckets.duration[1].weight, BUCKET_DEFAULTS.duration[1].weight, 'Duration 1 should have default weight');
    assertEqual(appState.buckets.duration[2].weight, BUCKET_DEFAULTS.duration[2].weight, 'Duration 2 should have default weight');
    assertEqual(appState.buckets.duration[3].weight, BUCKET_DEFAULTS.duration[3].weight, 'Duration 3 should have default weight');
}

// Test: Set urgency weight
function testSetUrgencyWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    const appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Verify initial default weights
    const appStateCheck = getAppState();
    assertEqual(appStateCheck.buckets.urgency[1].weight, BUCKET_DEFAULTS.urgency[1].weight, 'Urgency 1 should have default weight');
    assertEqual(appStateCheck.buckets.urgency[2].weight, BUCKET_DEFAULTS.urgency[2].weight, 'Urgency 2 should have default weight');
    assertEqual(appStateCheck.buckets.urgency[3].weight, BUCKET_DEFAULTS.urgency[3].weight, 'Urgency 3 should have default weight');
    
    // Set urgency 1 weight to 2.5
    appStateCheck.buckets.urgency[1].weight = 2.5;
    saveAppState(appStateCheck);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].weight, 2.5, 'Urgency 1 weight should be 2.5');
    
    // Set urgency 2 weight to 0.5
    appStateAfter.buckets.urgency[2].weight = 0.5;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].weight, 0.5, 'Urgency 2 weight should be 0.5');
    
    // Set urgency 3 weight to 3
    appStateAfter2.buckets.urgency[3].weight = 3;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].weight, 3, 'Urgency 3 weight should be 3');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.value[1].weight, BUCKET_DEFAULTS.value[1].weight, 'Value 1 should still have default weight');
    assertEqual(appStateAfter3.buckets.duration[1].weight, BUCKET_DEFAULTS.duration[1].weight, 'Duration 1 should still have default weight');
}

// Test: Set value weight
function testSetValueWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    const appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Verify initial default weights
    const appStateCheck = getAppState();
    assertEqual(appStateCheck.buckets.value[1].weight, BUCKET_DEFAULTS.value[1].weight, 'Value 1 should have default weight');
    assertEqual(appStateCheck.buckets.value[2].weight, BUCKET_DEFAULTS.value[2].weight, 'Value 2 should have default weight');
    assertEqual(appStateCheck.buckets.value[3].weight, BUCKET_DEFAULTS.value[3].weight, 'Value 3 should have default weight');
    
    // Set value 1 weight to 1.5
    appStateCheck.buckets.value[1].weight = 1.5;
    saveAppState(appStateCheck);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].weight, 1.5, 'Value 1 weight should be 1.5');
    
    // Set value 2 weight to 2
    appStateAfter.buckets.value[2].weight = 2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].weight, 2, 'Value 2 weight should be 2');
    
    // Set value 3 weight to 0.25
    appStateAfter2.buckets.value[3].weight = 0.25;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].weight, 0.25, 'Value 3 weight should be 0.25');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.urgency[1].weight, BUCKET_DEFAULTS.urgency[1].weight, 'Urgency 1 should still have default weight');
    assertEqual(appStateAfter3.buckets.duration[1].weight, BUCKET_DEFAULTS.duration[1].weight, 'Duration 1 should still have default weight');
}

// Test: Set duration weight
function testSetDurationWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    let appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state (in case previous test modified them)
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Get fresh state to verify
    appState = getAppState();
    
    // Set duration 1 weight to 0.75
    appState.buckets.duration[1].weight = 0.75;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].weight, 0.75, 'Duration 1 weight should be 0.75');
    
    // Set duration 2 weight to 1.25
    appStateAfter.buckets.duration[2].weight = 1.25;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].weight, 1.25, 'Duration 2 weight should be 1.25');
    
    // Set duration 3 weight to 2.5
    appStateAfter2.buckets.duration[3].weight = 2.5;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].weight, 2.5, 'Duration 3 weight should be 2.5');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.urgency[1].weight, BUCKET_DEFAULTS.urgency[1].weight, 'Urgency 1 should still have default weight');
    assertEqual(appStateAfter3.buckets.value[1].weight, BUCKET_DEFAULTS.value[1].weight, 'Value 1 should still have default weight');
}

// Test: Weight validation (non-negative)
function testWeightValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Test that weight can be 0
    const appState = getAppState();
    appState.buckets.urgency[1].weight = 0;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].weight, 0, 'Weight should accept 0 as valid value');
    
    // Test that weight can be a decimal
    appStateAfter.buckets.value[1].weight = 0.123;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[1].weight, 0.123, 'Weight should accept decimal values');
    
    // Test that weight can be a large number
    appStateAfter2.buckets.duration[1].weight = 100.5;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[1].weight, 100.5, 'Weight should accept large values');
    
    // Note: Negative validation is handled in the UI/form validation and handler functions
    // The handler functions will show alerts for negative values
}

// Test: Urgency buckets have default titles and descriptions
function testUrgencyBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check urgency 1 defaults
    assertEqual(appState.buckets.urgency[1].title, 'WHENEVER', 'Urgency 1 should have default title "WHENEVER"');
    assert(appState.buckets.urgency[1].description.includes('lowest band of urgency'), 'Urgency 1 should have default description about lowest band');
    
    // Check urgency 2 defaults
    assertEqual(appState.buckets.urgency[2].title, 'SOON', 'Urgency 2 should have default title "SOON"');
    assert(appState.buckets.urgency[2].description.includes('middle band of urgency'), 'Urgency 2 should have default description about middle band');
    
    // Check urgency 3 defaults
    assertEqual(appState.buckets.urgency[3].title, 'ASAP', 'Urgency 3 should have default title "ASAP"');
    assert(appState.buckets.urgency[3].description.includes('highest band of urgency'), 'Urgency 3 should have default description about highest band');
}

// Test: Set urgency title
function testSetUrgencyTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set urgency 1 title to "LOW"
    appState.buckets.urgency[1].title = 'LOW';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].title, 'LOW', 'Urgency 1 title should be "LOW"');
    
    // Set urgency 2 title to "MEDIUM"
    appStateAfter.buckets.urgency[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].title, 'MEDIUM', 'Urgency 2 title should be "MEDIUM"');
    
    // Set urgency 3 title to "HIGH"
    appStateAfter2.buckets.urgency[3].title = 'HIGH';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].title, 'HIGH', 'Urgency 3 title should be "HIGH"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.urgency[1].title, 'LOW', 'Urgency 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.urgency[2].title, 'MEDIUM', 'Urgency 2 should still have custom title');
}

// Test: Set urgency description
function testSetUrgencyDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set urgency 1 description
    const newDescription1 = 'This is a custom description for urgency level 1.';
    appState.buckets.urgency[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].description, newDescription1, 'Urgency 1 description should be updated');
    
    // Set urgency 2 description
    const newDescription2 = 'This is a custom description for urgency level 2.';
    appStateAfter.buckets.urgency[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].description, newDescription2, 'Urgency 2 description should be updated');
    
    // Set urgency 3 description to empty string (should be allowed)
    appStateAfter2.buckets.urgency[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].description, '', 'Urgency 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.urgency[1].description, newDescription1, 'Urgency 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.urgency[2].description, newDescription2, 'Urgency 2 should still have custom description');
}

// Test: Value buckets have default titles and descriptions
function testValueBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check value 1 defaults
    assertEqual(appState.buckets.value[1].title, 'MEH', 'Value 1 should have default title "MEH"');
    assert(appState.buckets.value[1].description.includes('lowest total value band'), 'Value 1 should have default description about lowest band');
    
    // Check value 2 defaults
    assertEqual(appState.buckets.value[2].title, 'BONUS', 'Value 2 should have default title "BONUS"');
    assert(appState.buckets.value[2].description.includes('middle band of total value'), 'Value 2 should have default description about middle band');
    
    // Check value 3 defaults
    assertEqual(appState.buckets.value[3].title, 'KILLER', 'Value 3 should have default title "KILLER"');
    assert(appState.buckets.value[3].description.includes('highest band of total value'), 'Value 3 should have default description about highest band');
}

// Test: Set value title
function testSetValueTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set value 1 title to "LOW"
    appState.buckets.value[1].title = 'LOW';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].title, 'LOW', 'Value 1 title should be "LOW"');
    
    // Set value 2 title to "MEDIUM"
    appStateAfter.buckets.value[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].title, 'MEDIUM', 'Value 2 title should be "MEDIUM"');
    
    // Set value 3 title to "HIGH"
    appStateAfter2.buckets.value[3].title = 'HIGH';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].title, 'HIGH', 'Value 3 title should be "HIGH"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.value[1].title, 'LOW', 'Value 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.value[2].title, 'MEDIUM', 'Value 2 should still have custom title');
}

// Test: Set value description
function testSetValueDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set value 1 description
    const newDescription1 = 'This is a custom description for value level 1.';
    appState.buckets.value[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].description, newDescription1, 'Value 1 description should be updated');
    
    // Set value 2 description
    const newDescription2 = 'This is a custom description for value level 2.';
    appStateAfter.buckets.value[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].description, newDescription2, 'Value 2 description should be updated');
    
    // Set value 3 description to empty string (should be allowed)
    appStateAfter2.buckets.value[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].description, '', 'Value 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.value[1].description, newDescription1, 'Value 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.value[2].description, newDescription2, 'Value 2 should still have custom description');
}

// Test: Duration buckets have default titles and descriptions
function testDurationBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check duration 1 defaults
    assertEqual(appState.buckets.duration[1].title, '1-3d', 'Duration 1 should have default title "1-3d"');
    assertEqual(appState.buckets.duration[1].description, 'TBD', 'Duration 1 should have default description "TBD"');
    
    // Check duration 2 defaults
    assertEqual(appState.buckets.duration[2].title, '1-3w', 'Duration 2 should have default title "1-3w"');
    assertEqual(appState.buckets.duration[2].description, 'TBD', 'Duration 2 should have default description "TBD"');
    
    // Check duration 3 defaults
    assertEqual(appState.buckets.duration[3].title, '1-3mo', 'Duration 3 should have default title "1-3mo"');
    assertEqual(appState.buckets.duration[3].description, 'TBD', 'Duration 3 should have default description "TBD"');
}

// Test: Set duration title
function testSetDurationTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set duration 1 title to "SHORT"
    appState.buckets.duration[1].title = 'SHORT';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].title, 'SHORT', 'Duration 1 title should be "SHORT"');
    
    // Set duration 2 title to "MEDIUM"
    appStateAfter.buckets.duration[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].title, 'MEDIUM', 'Duration 2 title should be "MEDIUM"');
    
    // Set duration 3 title to "LONG"
    appStateAfter2.buckets.duration[3].title = 'LONG';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].title, 'LONG', 'Duration 3 title should be "LONG"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.duration[1].title, 'SHORT', 'Duration 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.duration[2].title, 'MEDIUM', 'Duration 2 should still have custom title');
}

// Test: Set duration description
function testSetDurationDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set duration 1 description
    const newDescription1 = 'This is a custom description for duration level 1.';
    appState.buckets.duration[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].description, newDescription1, 'Duration 1 description should be updated');
    
    // Set duration 2 description
    const newDescription2 = 'This is a custom description for duration level 2.';
    appStateAfter.buckets.duration[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].description, newDescription2, 'Duration 2 description should be updated');
    
    // Set duration 3 description to empty string (should be allowed)
    appStateAfter2.buckets.duration[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].description, '', 'Duration 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.duration[1].description, newDescription1, 'Duration 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.duration[2].description, newDescription2, 'Duration 2 should still have custom description');
}

// Export test suite
export const bucketsTests = [
    { number: 16, name: 'Bucket Weights Default to 1', fn: testBucketWeightsDefault },
    { number: 17, name: 'Set Urgency Weight', fn: testSetUrgencyWeight },
    { number: 18, name: 'Set Value Weight', fn: testSetValueWeight },
    { number: 19, name: 'Set Duration Weight', fn: testSetDurationWeight },
    { number: 20, name: 'Weight Validation', fn: testWeightValidation },
    { number: 21, name: 'Urgency Buckets Default Titles and Descriptions', fn: testUrgencyBucketsDefaults },
    { number: 22, name: 'Set Urgency Title', fn: testSetUrgencyTitle },
    { number: 23, name: 'Set Urgency Description', fn: testSetUrgencyDescription },
    { number: 24, name: 'Value Buckets Default Titles and Descriptions', fn: testValueBucketsDefaults },
    { number: 25, name: 'Set Value Title', fn: testSetValueTitle },
    { number: 26, name: 'Set Value Description', fn: testSetValueDescription },
    { number: 27, name: 'Duration Buckets Default Titles and Descriptions', fn: testDurationBucketsDefaults },
    { number: 28, name: 'Set Duration Title', fn: testSetDurationTitle },
    { number: 29, name: 'Set Duration Description', fn: testSetDurationDescription }
];

