// Analytics abstraction layer
// Provides a clean interface for analytics that can be swapped out easily
// Currently wraps Amplitude, but designed to be provider-agnostic

/**
 * Initialize analytics
 * Should be called after the analytics script has loaded
 */
export function init() {
    // Amplitude auto-initializes via script tag, but we can verify it's loaded
    if (typeof window !== 'undefined' && window.amplitude) {
        // Amplitude is already initialized by the script tag in index.html
        // We can add any additional initialization here if needed
        return true;
    }
    return false;
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

