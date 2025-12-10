import { CATEGORIES, LEVELS } from './constants.js';

// Centralized Bucket Defaults
export const BUCKET_DEFAULTS = {
    urgency: {
        1: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 1,
            title: 'WHENEVER',
            description: '"Whenever" represents the lowest band of urgency. What this means is that the total value isn\'t massively affected by delay. Most cost-reducing initiatives would normally fall into this band. Other initiatives where there is little or no competition, might also initially fall in this band.'
        },
        2: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 2,
            title: 'SOON',
            description: '"Soon" represents the middle band of urgency. If we don\'t deliver this Soon, then the value will start to decline or the risk of loss increase - reduced market share, reduced opportunity size. Whether Soon means in a matter of days, weeks or months you will need to decide for your context, given the distribution of urgency you are dealing with.'
        },
        3: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 3,
            title: 'ASAP',
            description: '"ASAP" represents the highest band of urgency. If we don\'t deliver this ASAP, then the value (whatever total value that might be) will quickly evaporate - someone will get there before us or the opportunity (however big or small) will be massively impaired.'
        }
    },
    value: {
        1: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 1,
            title: 'MEH',
            description: '"Meh" represents the lowest total value band. This is the pocket change stuff. The things that are still valuable and worth our time and effort doing, but they\'re not the sort of thing that customers are likely to rave about - more maintenance-level stuff. This is the work that keeps the lights on but won\'t get anyone too excited or move the needle significantly.'
        },
        2: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 2,
            title: 'BONUS',
            description: '"Bonus" represents the middle band of total value. What this means will be context dependent (of course), but I\'m meaning it in a couple of different ways. Bonus could be those delighting things that we would want to tell our Customers about, perhaps even worth writing a press release for (try writing it before you start development). Customers will (hopefully) like it enough to give us money, or if they are already customers, to stay with us. The other way to think about it, would be that this is valuable enough that if we deliver this (and it works) we\'ll grow revenues or reduce costs enough for us all to "make bonus" for the year!'
        },
        3: { 
            limit: 30, 
            count: 0, 
            overLimit: false, 
            weight: 3,
            title: 'KILLER',
            description: '"Killer" represents the highest band of total value. These are the few things where if we do them, we stand to make an absolute killing, or; if we don\'t do something, it will probably kill us. (The challenge, as with all relative/qualitative approaches, is to try and avoid inflation)'
        }
    },
    duration: {
        1: { 
            limit: null, 
            count: 0, 
            overLimit: false, 
            weight: 1,
            title: '1-3d',
            description: 'TBD'
        },
        2: { 
            limit: null, 
            count: 0, 
            overLimit: false, 
            weight: 2,
            title: '1-3w',
            description: 'TBD'
        },
        3: { 
            limit: null, 
            count: 0, 
            overLimit: false, 
            weight: 3,
            title: '1-3mo',
            description: 'TBD'
        }
    }
};

// Field Validators
export const FIELD_VALIDATORS = {
    limit: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
            return { valid: false, error: 'Limit must be a non-negative integer' };
        }
        return { valid: true, processed: num };
    },
    weight: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            return { valid: false, error: 'Weight must be a non-negative number' };
        }
        return { valid: true, processed: num };
    },
    title: (value) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return { valid: false, error: 'Title cannot be empty' };
        }
        return { valid: true };
    },
    description: (value) => {
        // Description can be empty, so always valid
        return { valid: true };
    }
};

// Initialize buckets with defaults
export function initializeBuckets() {
    const buckets = {};
    CATEGORIES.forEach(category => {
        buckets[category] = {};
        LEVELS.forEach(level => {
            buckets[category][level] = { ...BUCKET_DEFAULTS[category][level] };
        });
    });
    return buckets;
}

// Normalize buckets - ensures all buckets have proper structure
export function normalizeBuckets(raw) {
    return CATEGORIES.reduce((acc, cat) => {
        acc[cat] = LEVELS.reduce((levels, lvl) => ({
            ...levels,
            [lvl]: { ...BUCKET_DEFAULTS[cat][lvl], ...(raw?.[cat]?.[lvl] || {}) }
        }), {});
        return acc;
    }, {});
}

// Calculate bucket counts from items
export function calculateBucketCounts(items) {
    const counts = {
        urgency: { 1: 0, 2: 0, 3: 0 },
        value: { 1: 0, 2: 0, 3: 0 },
        duration: { 1: 0, 2: 0, 3: 0 }
    };
    
    items.forEach(item => {
        if (item.urgency && item.urgency > 0 && item.urgency <= 3) {
            counts.urgency[item.urgency]++;
        }
        if (item.value && item.value > 0 && item.value <= 3) {
            counts.value[item.value]++;
        }
        if (item.duration && item.duration > 0 && item.duration <= 3) {
            counts.duration[item.duration]++;
        }
    });
    
    return counts;
}

// Update buckets with counts and over-limit status
export function updateBuckets(state, items) {
    if (!state.buckets) {
        state.buckets = initializeBuckets();
    }
    
    const counts = calculateBucketCounts(items);
    
    CATEGORIES.forEach(category => {
        LEVELS.forEach(level => {
            const bucket = state.buckets[category][level];
            bucket.count = counts[category][level] || 0;
            if (bucket.limit !== null && bucket.limit !== undefined) {
                bucket.overLimit = bucket.count > bucket.limit;
            } else {
                bucket.overLimit = false;
            }
        });
    });
    
    return state;
}



