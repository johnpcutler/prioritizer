// Analytics abstraction layer
// Provides a clean interface for analytics that can be swapped out easily
// Currently wraps Amplitude, but designed to be provider-agnostic

// API Keys - determined once at module load
const PRODUCTION_API_KEY = '543dd5b441b293e629185cefc122efe7';
const DEVELOPMENT_API_KEY = '931668dc2c1f6795fb6af06aa64d83cd';

// Determine environment and API key once
function getAmplitudeApiKey() {
    if (typeof window === 'undefined') {
        return PRODUCTION_API_KEY; // Default to production if window not available
    }
    
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return DEVELOPMENT_API_KEY;
    }
    return PRODUCTION_API_KEY;
}

// Store the API key (determined once)
const AMPLITUDE_API_KEY = getAmplitudeApiKey();

// Track initialization state
let isInitialized = false;
let isInitializing = false;

/**
 * Load Amplitude script dynamically
 * @returns {Promise} Promise that resolves when script is loaded
 */
function loadAmplitudeScript() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.amplitude) {
            resolve();
            return;
        }
        
        // Check if script is already being loaded
        const existingScript = document.querySelector(`script[src*="amplitude.com/script/${AMPLITUDE_API_KEY}"]`);
        if (existingScript) {
            // Wait for it to load
            existingScript.addEventListener('load', resolve);
            existingScript.addEventListener('error', reject);
            return;
        }
        
        // Create and load script
        const script = document.createElement('script');
        script.src = `https://cdn.amplitude.com/script/${AMPLITUDE_API_KEY}.js`;
        script.async = true;
        script.onload = () => {
            // Initialize Amplitude after script loads
            if (window.amplitude) {
                window.amplitude.init(AMPLITUDE_API_KEY, {
                    "fetchRemoteConfig": true,
                    "autocapture": false
                });
            }
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Initialize analytics
 * Dynamically loads Amplitude script based on environment and initializes it
 */
export async function init() {
    if (isInitialized) {
        return true;
    }
    
    if (isInitializing) {
        // Wait for ongoing initialization
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (isInitialized) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 100);
        });
    }
    
    isInitializing = true;
    
    try {
        if (typeof window === 'undefined') {
            console.warn('Analytics: window object not available');
            return false;
        }
        
        await loadAmplitudeScript();
        
        if (window.amplitude) {
            isInitialized = true;
            isInitializing = false;
            console.log(`Analytics initialized with ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'development' : 'production'} key`);
            return true;
        } else {
            console.warn('Analytics: Amplitude failed to load');
            isInitializing = false;
            return false;
        }
    } catch (error) {
        console.error('Analytics initialization error:', error);
        isInitializing = false;
        return false;
    }
}

/**
 * Identify a user
 * @param {string} userId - Optional user ID. If not provided, Amplitude will auto-generate one
 * @param {object} userProperties - Optional user properties
 */
export function identify(userId = null, userProperties = {}) {
    try {
        if (typeof window !== 'undefined' && window.amplitude) {
            if (userId) {
                window.amplitude.setUserId(userId);
            }
            if (Object.keys(userProperties).length > 0) {
                window.amplitude.setUserProperties(userProperties);
            }
            return true;
        }
    } catch (error) {
        console.warn('Analytics identify failed:', error);
    }
    return false;
}

/**
 * Track an event
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties
 */
export function trackEvent(eventName, properties = {}) {
    try {
        if (typeof window !== 'undefined' && window.amplitude) {
            window.amplitude.logEvent(eventName, properties);
            return true;
        }
    } catch (error) {
        console.warn('Analytics trackEvent failed:', error);
    }
    return false;
}

// Export a default analytics object for convenience
export const analytics = {
    init,
    identify,
    trackEvent
};

