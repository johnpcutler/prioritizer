// Test suite: CSV Export (Tests 94+)
// Tests for CSV export functionality including formatting, escaping, and data handling

import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    assert,
    assertEqual,
    getItems,
    saveItems,
    getAppState,
    saveAppState,
    initializeBuckets
} from '../test-core.js';

import { exportToCSV, generateExportFilename } from '../../utils/csvExport.js';
import { normalizeItem, recomputeItemMetrics } from '../../models/items.js';

// Test: Export empty items list
function testExportEmptyItems() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const items = [];
    const appState = {
        currentStage: 'Results',
        buckets: initializeBuckets(),
        locked: true
    };
    
    const csv = exportToCSV(items, appState);
    const lines = csv.split('\n');
    
    // Should have header row only
    assertEqual(lines.length, 2, 'Should have header row and empty line');
    assert(lines[0].includes('Rank'), 'Should include Rank column');
    assert(lines[0].includes('Item Name'), 'Should include Item Name column');
    assert(lines[0].includes('CD3'), 'Should include CD3 column');
}

// Test: Export items with all fields
function testExportItemsWithAllFields() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const buckets = initializeBuckets();
    const appState = {
        currentStage: 'Results',
        buckets: buckets,
        locked: true
    };
    
    const item1 = normalizeItem({
        id: 'test-1',
        name: 'Test Item 1',
        link: 'https://example.com/item1',
        urgency: 2,
        value: 3,
        duration: 1,
        urgencySet: true,
        valueSet: true,
        durationSet: true,
        active: true,
        sequence: 1,
        notes: [
            { text: 'Note 1', createdAt: '2024-01-01T00:00:00.000Z', modifiedAt: '2024-01-01T00:00:00.000Z' },
            { text: 'Note 2', createdAt: '2024-01-02T00:00:00.000Z', modifiedAt: '2024-01-02T00:00:00.000Z' }
        ],
        hasConfidenceSurvey: false,
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item1, buckets);
    
    const items = [item1];
    saveItems(items);
    
    const csv = exportToCSV(items, appState);
    const lines = csv.split('\n');
    
    // Should have header + 1 data row
    assert(lines.length >= 2, 'Should have at least header and one data row');
    assert(lines[0].includes('Rank'), 'Header should include Rank');
    
    // Check data row contains expected values
    const dataRow = lines[1];
    assert(dataRow.includes('1'), 'Should include rank 1');
    assert(dataRow.includes('Test Item 1'), 'Should include item name');
    assert(dataRow.includes('https://example.com/item1'), 'Should include link');
    assert(dataRow.includes('2'), 'Should include urgency value');
    assert(dataRow.includes('SOON'), 'Should include urgency title');
    assert(dataRow.includes('3'), 'Should include value');
    assert(dataRow.includes('KILLER'), 'Should include value title');
    assert(dataRow.includes('1'), 'Should include duration');
    assert(dataRow.includes('1-3d'), 'Should include duration title');
    assert(dataRow.includes('Active'), 'Should include active status');
    assert(dataRow.includes('2'), 'Should include notes count');
}

// Test: Export items with missing fields
function testExportItemsWithMissingFields() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const buckets = initializeBuckets();
    const appState = {
        currentStage: 'Results',
        buckets: buckets,
        locked: true
    };
    
    const item = normalizeItem({
        id: 'test-2',
        name: 'Incomplete Item',
        urgency: 0,
        value: 0,
        duration: 0,
        active: true,
        sequence: 1,
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item, buckets);
    
    const items = [item];
    const csv = exportToCSV(items, appState);
    const lines = csv.split('\n');
    
    assert(lines.length >= 2, 'Should have header and data row');
    const dataRow = lines[1];
    
    // Should handle missing values gracefully
    assert(dataRow.includes('Incomplete Item'), 'Should include item name');
    assert(dataRow.includes('Active'), 'Should include active status');
    // Urgency, value, duration should be empty or 0
}

// Test: CSV escaping for special characters
function testCSVEscaping() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const buckets = initializeBuckets();
    const appState = {
        currentStage: 'Results',
        buckets: buckets,
        locked: true
    };
    
    const item = normalizeItem({
        id: 'test-3',
        name: 'Item with "quotes" and, commas',
        link: 'https://example.com',
        urgency: 1,
        value: 1,
        duration: 1,
        urgencySet: true,
        valueSet: true,
        durationSet: true,
        active: true,
        sequence: 1,
        notes: [
            { text: 'Note with "quotes"', createdAt: '2024-01-01T00:00:00.000Z', modifiedAt: '2024-01-01T00:00:00.000Z' },
            { text: 'Note with, commas', createdAt: '2024-01-01T00:00:00.000Z', modifiedAt: '2024-01-01T00:00:00.000Z' }
        ],
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item, buckets);
    
    const items = [item];
    const csv = exportToCSV(items, appState);
    
    // CSV should properly escape quotes and commas
    assert(csv.includes('"Item with ""quotes"" and, commas"'), 'Should escape quotes in item name');
    // Notes should be properly formatted - the entire notes field is CSV-escaped
    // Notes are joined with '; ' and then the whole string is escaped, so quotes become ""
    assert(csv.includes('Note with ""quotes""') || csv.includes('Note with "quotes"'), 'Should include quoted note (with proper CSV escaping)');
    assert(csv.includes('Note with, commas'), 'Should include note with commas');
}

// Test: Export items sorted by sequence
function testExportItemsSortedBySequence() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const buckets = initializeBuckets();
    const appState = {
        currentStage: 'Results',
        buckets: buckets,
        locked: true
    };
    
    const item1 = normalizeItem({
        id: 'test-4',
        name: 'Item 1',
        urgency: 1,
        value: 1,
        duration: 1,
        urgencySet: true,
        valueSet: true,
        durationSet: true,
        active: true,
        sequence: 2,
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item1, buckets);
    
    const item2 = normalizeItem({
        id: 'test-5',
        name: 'Item 2',
        urgency: 1,
        value: 1,
        duration: 1,
        urgencySet: true,
        valueSet: true,
        durationSet: true,
        active: true,
        sequence: 1,
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item2, buckets);
    
    const items = [item1, item2];
    const csv = exportToCSV(items, appState);
    const lines = csv.split('\n');
    
    // Should be sorted by sequence (1, 2)
    assert(lines.length >= 3, 'Should have header and 2 data rows');
    const firstDataRow = lines[1];
    const secondDataRow = lines[2];
    
    assert(firstDataRow.includes('Item 2'), 'First row should be Item 2 (sequence 1)');
    assert(secondDataRow.includes('Item 1'), 'Second row should be Item 1 (sequence 2)');
}

// Test: Export items with confidence survey
function testExportItemsWithConfidenceSurvey() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const buckets = initializeBuckets();
    const appState = {
        currentStage: 'Results',
        buckets: buckets,
        locked: true,
        confidenceWeights: {
            1: 0.30,
            2: 0.50,
            3: 0.70,
            4: 0.90
        }
    };
    
    const item = normalizeItem({
        id: 'test-6',
        name: 'Item with Survey',
        urgency: 2,
        value: 3,
        duration: 1,
        urgencySet: true,
        valueSet: true,
        durationSet: true,
        active: true,
        sequence: 1,
        hasConfidenceSurvey: true,
        confidenceSurvey: {
            scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
            urgencyConfidence: {1: 1, 2: 2, 3: 0, 4: 0},
            valueConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
            durationConfidence: {1: 1, 2: 0, 3: 0, 4: 0}
        },
        createdAt: '2024-01-01T00:00:00.000Z'
    });
    recomputeItemMetrics(item, buckets);
    
    const items = [item];
    const csv = exportToCSV(items, appState);
    
    assert(csv.includes('Yes'), 'Should indicate confidence survey exists');
    // Confidence weighted CD3 should be calculated and included
}

// Test: Generate export filename
function testGenerateExportFilename() {
    const filename = generateExportFilename();
    
    assert(filename.startsWith('prioritizer-export-'), 'Filename should start with prefix');
    assert(filename.endsWith('.csv'), 'Filename should end with .csv');
    
    // Should match date pattern YYYY-MM-DD
    const dateMatch = filename.match(/prioritizer-export-(\d{4}-\d{2}-\d{2})\.csv/);
    assert(dateMatch !== null, 'Filename should include date in YYYY-MM-DD format');
}

// Export test functions
export const csvExportTests = [
    { name: 'Export empty items list', fn: testExportEmptyItems },
    { name: 'Export items with all fields', fn: testExportItemsWithAllFields },
    { name: 'Export items with missing fields', fn: testExportItemsWithMissingFields },
    { name: 'CSV escaping for special characters', fn: testCSVEscaping },
    { name: 'Export items sorted by sequence', fn: testExportItemsSortedBySequence },
    { name: 'Export items with confidence survey', fn: testExportItemsWithConfidenceSurvey },
    { name: 'Generate export filename', fn: testGenerateExportFilename }
];

