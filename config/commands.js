// Command definitions - declarative configuration for forms and command execution
// This module exports a factory function that creates COMMANDS and COMMAND_FORMS
// given the handler functions from app.js

import { CATEGORIES, LEVELS } from '../models/constants.js';
import { Store } from '../state/appState.js';
import { BucketActions } from '../models/bucketActions.js';
import { displayJson } from '../ui/display.js';

// Factory function to create commands given handler functions
export function createCommands(handlers) {
    const {
        startApp,
        advanceStage,
        backStage,
        addItem,
        bulkAddItems,
        setItemProperty,
        setItemActive,
        setItemInactive,
        setUrgencyLimit,
        setValueLimit,
        setUrgencyWeight,
        setValueWeight,
        setDurationWeight,
        setUrgencyTitle,
        setUrgencyDescription,
        setValueTitle,
        setValueDescription,
        setDurationTitle,
        setDurationDescription
    } = handlers;

    const COMMANDS = {
        startApp: {
            fields: [],
            handler: () => {
                startApp();
                return true;
            }
        },
        advanceStage: {
            fields: [],
            handler: () => {
                const result = advanceStage();
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        backStage: {
            fields: [],
            handler: () => {
                const result = backStage();
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        addItem: {
            fields: [
                { name: 'name', label: 'Item Name', type: 'text', required: true, placeholder: 'Enter item name' }
            ],
            handler: (formData) => {
                const result = addItem(formData.name);
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        bulkAddItems: {
            fields: [
                { name: 'itemNames', label: 'Item Names (one per line)', type: 'textarea', required: true, placeholder: 'Enter item names, one per line:\nItem 1\nItem 2\nItem 3' }
            ],
            handler: (formData) => {
                const result = bulkAddItems(formData.itemNames);
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        setBucketField: {
            fields: [
                { name: 'category', label: 'Category', type: 'select', required: true, options: () => CATEGORIES.map(c => ({ value: c, label: c })) },
                { name: 'level', label: 'Level', type: 'select', required: true, options: () => LEVELS.map(l => ({ value: l.toString(), label: l.toString() })) },
                { name: 'field', label: 'Field', type: 'select', required: true, options: () => ['limit', 'weight', 'title', 'description'].map(f => ({ value: f, label: f })) },
                { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Enter value' }
            ],
            handler: (formData) => {
                const category = formData.category;
                const level = parseInt(formData.level);
                const field = formData.field;
                let value = formData.value;
                
                // Parse value based on field type
                if (field === 'limit' || field === 'weight') {
                    value = field === 'limit' ? parseInt(value) : parseFloat(value);
                }
                
                let result;
                if (field === 'limit') {
                    result = BucketActions.setLimit(category, level, value);
                } else if (field === 'weight') {
                    result = BucketActions.setWeight(category, level, value);
                } else if (field === 'title') {
                    result = BucketActions.setTitle(category, level, value);
                } else if (field === 'description') {
                    result = BucketActions.setDescription(category, level, value);
                } else {
                    alert('Invalid field');
                    return false;
                }
                
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                
                displayJson();
                return true;
            }
        },
        setUrgency: {
            fields: [
                { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
                { name: 'urgency', label: 'Urgency', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
            ],
            handler: (formData) => {
                const result = setItemProperty(formData.itemId, 'urgency', parseInt(formData.urgency));
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        setValue: {
            fields: [
                { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
                { name: 'value', label: 'Value', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
            ],
            handler: (formData) => {
                const result = setItemProperty(formData.itemId, 'value', parseInt(formData.value));
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        setDuration: {
            fields: [
                { name: 'itemId', label: 'Select Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: item.name })) },
                { name: 'duration', label: 'Duration', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) }
            ],
            handler: (formData) => {
                const result = setItemProperty(formData.itemId, 'duration', parseInt(formData.duration));
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        setItemActive: {
            fields: [
                { name: 'itemId', label: 'Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: `${item.name} (${item.active !== false ? 'Active' : 'Inactive'})` })) }
            ],
            handler: (formData) => {
                const result = setItemActive(formData.itemId);
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        },
        setItemInactive: {
            fields: [
                { name: 'itemId', label: 'Item', type: 'select', required: true, options: () => Store.getItems().map(item => ({ value: item.id, label: `${item.name} (${item.active !== false ? 'Active' : 'Inactive'})` })) }
            ],
            handler: (formData) => {
                const result = setItemInactive(formData.itemId);
                if (!result.success) {
                    alert(result.error);
                    return false;
                }
                return true;
            }
        }
    };

    // Legacy command forms for backward compatibility
    const COMMAND_FORMS = {
        ...COMMANDS,
        // Keep individual bucket commands for backward compatibility
        setUrgencyLimit: {
            fields: [
                { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'limit', label: 'New Limit', type: 'number', required: true, placeholder: 'Enter limit (e.g., 30)', min: 0 }
            ],
            handler: (formData) => {
                const result = setUrgencyLimit(parseInt(formData.urgencyLevel), parseInt(formData.limit));
                return result.success;
            }
        },
        setValueLimit: {
            fields: [
                { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'limit', label: 'New Limit', type: 'number', required: true, placeholder: 'Enter limit (e.g., 30)', min: 0 }
            ],
            handler: (formData) => {
                const result = setValueLimit(parseInt(formData.valueLevel), parseInt(formData.limit));
                return result.success;
            }
        },
        setUrgencyWeight: {
            fields: [
                { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
            ],
            handler: (formData) => {
                const result = setUrgencyWeight(parseInt(formData.urgencyLevel), parseFloat(formData.weight));
                return result.success;
            }
        },
        setValueWeight: {
            fields: [
                { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
            ],
            handler: (formData) => {
                const result = setValueWeight(parseInt(formData.valueLevel), parseFloat(formData.weight));
                return result.success;
            }
        },
        setDurationWeight: {
            fields: [
                { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'weight', label: 'New Weight', type: 'number', required: true, placeholder: 'Enter weight (e.g., 1)', min: 0, step: 0.1 }
            ],
            handler: (formData) => {
                const result = setDurationWeight(parseInt(formData.durationLevel), parseFloat(formData.weight));
                return result.success;
            }
        },
        setUrgencyTitle: {
            fields: [
                { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., WHENEVER)' }
            ],
            handler: (formData) => {
                const result = setUrgencyTitle(parseInt(formData.urgencyLevel), formData.title);
                return result.success;
            }
        },
        setUrgencyDescription: {
            fields: [
                { name: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
            ],
            handler: (formData) => {
                const result = setUrgencyDescription(parseInt(formData.urgencyLevel), formData.description);
                return result.success;
            }
        },
        setValueTitle: {
            fields: [
                { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., MEH)' }
            ],
            handler: (formData) => {
                const result = setValueTitle(parseInt(formData.valueLevel), formData.title);
                return result.success;
            }
        },
        setValueDescription: {
            fields: [
                { name: 'valueLevel', label: 'Value Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
            ],
            handler: (formData) => {
                const result = setValueDescription(parseInt(formData.valueLevel), formData.description);
                return result.success;
            }
        },
        setDurationTitle: {
            fields: [
                { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'title', label: 'New Title', type: 'text', required: true, placeholder: 'Enter title (e.g., 1-3d)' }
            ],
            handler: (formData) => {
                const result = setDurationTitle(parseInt(formData.durationLevel), formData.title);
                return result.success;
            }
        },
        setDurationDescription: {
            fields: [
                { name: 'durationLevel', label: 'Duration Level', type: 'select', required: true, options: () => ['1', '2', '3'].map(v => ({ value: v, label: v })) },
                { name: 'description', label: 'New Description', type: 'textarea', required: true, placeholder: 'Enter description' }
            ],
            handler: (formData) => {
                const result = setDurationDescription(parseInt(formData.durationLevel), formData.description);
                return result.success;
            }
        }
    };

    return { COMMANDS, COMMAND_FORMS };
}

