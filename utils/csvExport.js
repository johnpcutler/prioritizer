// CSV Export Utilities
// Handles exporting items to CSV format with proper escaping

import { calculateConfidenceWeightedCD3, getItemsSortedByCD3 } from '../models/items.js';

/**
 * Escape a value for CSV format
 * Handles commas, quotes, and newlines
 */
function formatCSVValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    // Convert to string
    const str = String(value);
    
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
}

/**
 * Get bucket title for a given category and level
 */
function getBucketTitle(buckets, category, level) {
    if (!buckets || !buckets[category] || !level || level === 0) {
        return '';
    }
    return buckets[category][level]?.title || '';
}

/**
 * Format notes array as readable text
 * Concatenates all notes with semicolons
 */
function formatNotes(notes) {
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
        return '';
    }
    
    return notes
        .map(note => {
            if (typeof note === 'string') {
                return note;
            }
            return note.text || '';
        })
        .filter(text => text.trim().length > 0)
        .join('; ');
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    if (!dateString) {
        return '';
    }
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (e) {
        return dateString;
    }
}

/**
 * Export items to CSV format
 * @param {Array} items - Array of item objects
 * @param {Object} appState - Application state containing buckets and confidence weights
 * @returns {string} CSV content as string
 */
export function exportToCSV(items, appState) {
    if (!items || items.length === 0) {
        // Return header row only
        return [
            'Rank',
            'Item Name',
            'Link',
            'Urgency',
            'Urgency Title',
            'Value',
            'Value Title',
            'Duration',
            'Duration Title',
            'Cost of Delay',
            'CD3',
            'Confidence Weighted CD3',
            'Active Status',
            'Notes Count',
            'Notes',
            'Has Confidence Survey',
            'Created Date'
        ].join(',') + '\n';
    }
    
    const buckets = appState?.buckets || {};
    
    // Sort items by sequence (same order as displayed in results view)
    const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
    const sortedItems = itemsWithSequence.length > 0 
        ? [...items].sort((a, b) => {
            const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
        })
        : getItemsSortedByCD3(items);
    
    // Build header row
    const headers = [
        'Rank',
        'Item Name',
        'Link',
        'Urgency',
        'Urgency Title',
        'Value',
        'Value Title',
        'Duration',
        'Duration Title',
        'Cost of Delay',
        'CD3',
        'Confidence Weighted CD3',
        'Active Status',
        'Notes Count',
        'Notes',
        'Has Confidence Survey',
        'Created Date'
    ];
    
    // Build data rows
    const rows = sortedItems.map((item, index) => {
        const rank = item.sequence !== null && item.sequence !== undefined ? item.sequence : index + 1;
        const name = item.name || '';
        const link = item.link || '';
        const urgency = item.urgency || 0;
        const urgencyTitle = getBucketTitle(buckets, 'urgency', urgency);
        const value = item.value || 0;
        const valueTitle = getBucketTitle(buckets, 'value', value);
        const duration = item.duration || 0;
        const durationTitle = getBucketTitle(buckets, 'duration', duration);
        const costOfDelay = item.costOfDelay || 0;
        const cd3 = item.CD3 || 0;
        
        // Calculate confidence weighted CD3 if survey exists
        let confidenceWeightedCD3 = '';
        if (item.hasConfidenceSurvey && appState) {
            const weightedCD3 = calculateConfidenceWeightedCD3(item, appState);
            if (weightedCD3 !== null && weightedCD3 !== undefined) {
                confidenceWeightedCD3 = weightedCD3.toFixed(2);
            }
        }
        
        const activeStatus = item.active !== false ? 'Active' : 'Inactive';
        const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
        const notes = formatNotes(item.notes);
        const hasSurvey = item.hasConfidenceSurvey === true ? 'Yes' : 'No';
        const createdDate = formatDate(item.createdAt);
        
        return [
            formatCSVValue(rank),
            formatCSVValue(name),
            formatCSVValue(link),
            formatCSVValue(urgency || ''),
            formatCSVValue(urgencyTitle),
            formatCSVValue(value || ''),
            formatCSVValue(valueTitle),
            formatCSVValue(duration || ''),
            formatCSVValue(durationTitle),
            formatCSVValue(costOfDelay.toFixed(2)),
            formatCSVValue(cd3.toFixed(2)),
            formatCSVValue(confidenceWeightedCD3),
            formatCSVValue(activeStatus),
            formatCSVValue(notesCount),
            formatCSVValue(notes),
            formatCSVValue(hasSurvey),
            formatCSVValue(createdDate)
        ].join(',');
    });
    
    // Combine header and rows
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate filename with current date
 * @returns {string} Filename like "prioritizer-export-2024-01-15.csv"
 */
export function generateExportFilename() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `prioritizer-export-${dateStr}.csv`;
}

