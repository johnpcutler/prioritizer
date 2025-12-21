// Callout Overlay Module
// Handles displaying callout content in an overlay modal on mobile

/**
 * Create and show callout overlay
 * @param {string} content - HTML content to display in overlay
 */
export function showCalloutOverlay(content) {
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('calloutOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'calloutOverlay';
    overlay.className = 'callout-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'callout-overlay-modal';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'callout-overlay-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', closeCalloutOverlay);
    
    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'callout-overlay-content';
    contentDiv.innerHTML = content;
    
    // Assemble modal
    modal.appendChild(closeBtn);
    modal.appendChild(contentDiv);
    overlay.appendChild(modal);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCalloutOverlay();
        }
    });
    
    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeCalloutOverlay();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Prevent body scroll when overlay is open
    document.body.style.overflow = 'hidden';
}

/**
 * Close callout overlay
 */
export function closeCalloutOverlay() {
    const overlay = document.getElementById('calloutOverlay');
    if (overlay) {
        overlay.remove();
    }
    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Initialize callout info icons
 * Sets up click handlers for info icons in grid corners
 */
export function initCalloutInfoIcons() {
    // Urgency view
    const urgencyCorner = document.querySelector('.urgency-grid-corner');
    const urgencyCallout = document.getElementById('urgencyCallout');
    if (urgencyCorner && urgencyCallout) {
        setupInfoIcon(urgencyCorner, urgencyCallout);
    }
    
    // Value view
    const valueCorner = document.querySelector('.value-grid-corner');
    const valueCallout = document.getElementById('valueCallout');
    if (valueCorner && valueCallout) {
        setupInfoIcon(valueCorner, valueCallout);
    }
    
    // Duration view
    const durationCorner = document.querySelector('.duration-grid-corner');
    const durationCallout = document.getElementById('durationCallout');
    if (durationCorner && durationCallout) {
        setupInfoIcon(durationCorner, durationCallout);
    }
}

/**
 * Setup info icon in a corner cell
 * @param {HTMLElement} cornerElement - The corner cell element
 * @param {HTMLElement} calloutElement - The callout element to display
 */
function setupInfoIcon(cornerElement, calloutElement) {
    // Remove existing icon if present
    const existingIcon = cornerElement.querySelector('.callout-info-icon');
    if (existingIcon) {
        existingIcon.remove();
    }
    
    // Create info icon button
    const iconBtn = document.createElement('button');
    iconBtn.className = 'callout-info-icon';
    iconBtn.innerHTML = 'ℹ';
    iconBtn.setAttribute('aria-label', 'Show information');
    iconBtn.title = 'Show information';
    
    // Add click handler
    iconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get current callout content (clone to preserve any dynamic content)
        const content = calloutElement.innerHTML;
        showCalloutOverlay(content);
    });
    
    // Add to corner
    cornerElement.appendChild(iconBtn);
}

