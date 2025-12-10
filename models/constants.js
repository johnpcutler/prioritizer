// Constants for Categories and Levels
export const CATEGORIES = ['urgency', 'value', 'duration'];
export const LEVELS = [1, 2, 3];

// Storage keys
export const STORAGE_KEY = 'priorityItems';
export const APP_STATE_KEY = 'appState';

// Property Metadata
export const PROPERTY_META = {
    urgency: { stage: 'urgency', prerequisites: [] },
    value: { stage: 'value', prerequisites: ['urgency'] },
    duration: { stage: 'duration', prerequisites: ['value'] }
};



