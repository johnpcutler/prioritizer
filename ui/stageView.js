import { Store } from '../state/appState.js';
import { STAGE_CONTROLLER } from '../models/stages.js';

/**
 * Generic stage view controller that handles common view visibility and analytics tracking logic.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.sectionId - The ID of the DOM element for this view section
 * @param {string} options.stage - The stage name this view belongs to (e.g., 'Item Listing', 'urgency', 'value', 'duration', 'Results')
 * @param {Function} options.render - Function to call to render the view content
 * @param {Function} [options.onFirstShow] - Optional callback to call when view transitions from hidden to visible (for analytics)
 */
export function updateStageView({
    sectionId,
    stage,
    render,
    onFirstShow
}) {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const appState = Store.getAppState();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const wasHidden = el.style.display !== 'block';

    if (currentStage === stage) {
        el.style.display = 'block';
        render();

        if (wasHidden && onFirstShow) {
            onFirstShow();
        }
    } else {
        el.style.display = 'none';
    }
}

