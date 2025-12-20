// StateStore - Pure in-memory state management
// No persistence, no migration, just state management

/**
 * StateStore manages in-memory application state and items.
 * It provides:
 * - State getters/setters
 * - Item getters/setters
 * - State mutations
 * - Subscriber pattern for reactivity
 * - Snapshots for persistence
 */
export const StateStore = {
    state: null,
    items: null,
    subscribers: [],
    
    /**
     * Initialize StateStore with initial state and items
     * @param {Object} initialState - Initial application state
     * @param {Array} initialItems - Initial items array
     */
    init(initialState, initialItems = []) {
        StateStore.state = initialState;
        StateStore.items = initialItems || [];
        return StateStore.state;
    },
    
    /**
     * Get current state (cached, no reload)
     * @returns {Object} Current application state
     */
    getState() {
        if (!StateStore.state) {
            throw new Error('StateStore not initialized. Call StateStore.init() first.');
        }
        return StateStore.state;
    },
    
    /**
     * Get current items (cached, no reload)
     * @returns {Array} Current items array
     */
    getItems() {
        if (!StateStore.items) {
            StateStore.items = [];
        }
        return StateStore.items;
    },
    
    /**
     * Set state directly
     * @param {Object} state - New state object
     */
    setState(state) {
        StateStore.state = state;
        StateStore.notifySubscribers();
    },
    
    /**
     * Set items directly
     * @param {Array} items - New items array
     */
    setItems(items) {
        StateStore.items = items || [];
    },
    
    /**
     * Update state using a mutator function
     * @param {Function} mutator - Function that mutates state: (state) => { state.prop = value; }
     */
    updateState(mutator) {
        if (!StateStore.state) {
            throw new Error('StateStore not initialized. Call StateStore.init() first.');
        }
        mutator(StateStore.state);
        StateStore.notifySubscribers();
    },
    
    /**
     * Update items using a mutator function
     * @param {Function} mutator - Function that mutates items: (items) => { items.push(item); }
     */
    updateItems(mutator) {
        if (!StateStore.items) {
            StateStore.items = [];
        }
        mutator(StateStore.items);
    },
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function called when state changes: (state) => { ... }
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        StateStore.subscribers.push(callback);
        return () => {
            const index = StateStore.subscribers.indexOf(callback);
            if (index > -1) {
                StateStore.subscribers.splice(index, 1);
            }
        };
    },
    
    /**
     * Notify all subscribers of state changes
     */
    notifySubscribers() {
        StateStore.subscribers.forEach(callback => {
            try {
                callback(StateStore.state);
            } catch (error) {
                console.error('Error in StateStore subscriber:', error);
            }
        });
    },
    
    /**
     * Create a snapshot of current state and items
     * Returns deep copies for persistence
     * @returns {Object} Snapshot with state and items
     */
    snapshot() {
        return {
            state: StateStore.state ? JSON.parse(JSON.stringify(StateStore.state)) : null,
            items: StateStore.items ? JSON.parse(JSON.stringify(StateStore.items)) : []
        };
    },
    
    /**
     * Clear all state and items
     */
    clear() {
        StateStore.state = null;
        StateStore.items = null;
        StateStore.subscribers = [];
    }
};

