import { escapeHtml } from '../forms.js';

/**
 * Render the header section of an item (name, link, notes badge).
 * This is a common pattern used across all stage views.
 * 
 * @param {Object} item - The item to render
 * @param {Object} options - Optional rendering options
 * @param {string} [options.nameClass] - Additional CSS class for the name span
 * @param {string} [options.badgePrefix] - HTML to insert before the notes badge (e.g., new item badge)
 * @param {string} [options.badgeSuffix] - HTML to insert after the notes badge
 * @returns {string} HTML string for the item header
 */
export function renderItemHeader(item, options = {}) {
    const {
        nameClass = 'item-name',
        badgePrefix = '',
        badgeSuffix = ''
    } = options;
    
    const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
    const linkHtml = item.link 
        ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` 
        : '';
    const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
    
    return `
        <span class="${nameClass}">
            ${escapeHtml(item.name)}${linkHtml}${badgePrefix} ${notesBadgeHtml}${badgeSuffix}
        </span>
    `;
}

/**
 * Get the CSS classes for an item card based on its active status.
 * 
 * @param {Object} item - The item
 * @param {string} baseClass - Base CSS class for the card (e.g., 'item-card urgency-item')
 * @returns {string} CSS class string
 */
export function getItemCardClasses(item, baseClass) {
    const isActive = item.active !== false;
    return `${baseClass}${!isActive ? ' item-card-inactive item-inactive' : ''}`;
}

/**
 * Get the CSS classes for a list item card based on its active status.
 * 
 * @param {Object} item - The item
 * @param {string} baseClass - Base CSS class for the card (e.g., 'list-item-card item-listing-item')
 * @returns {string} CSS class string
 */
export function getListItemCardClasses(item, baseClass) {
    const isActive = item.active !== false;
    return `${baseClass}${!isActive ? ' list-item-card-inactive item-inactive' : ''}`;
}

