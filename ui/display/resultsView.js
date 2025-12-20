import { STAGE_CONTROLLER } from '../../models/stages.js';
import { Store } from '../../state/appState.js';
import { escapeHtml } from '../forms.js';
import { analytics } from '../../analytics/analytics.js';
import { getItemsSortedByCD3, assignSequenceNumbers, calculateConfidenceWeightedCD3 } from '../../models/items.js';
import { updateStageView } from '../stageView.js';
import { trackStageView } from '../../analytics/stageEvents.js';

// Display Results view (only visible in Results stage)
export function updateResultsView() {
    updateStageView({
        sectionId: 'resultsViewSection',
        stage: 'Results',
        render: () => {
            // Assign sequence numbers if not already assigned
            const items = Store.getItems();
            const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
            if (itemsWithSequence.length === 0) {
                assignSequenceNumbers(items);
                Store.saveItems(items);
            }
            
            displayResultsContent();
        },
        onFirstShow: () => {
            // Track analytics event only when view transitions from hidden to visible
            const items = Store.getItems();
            trackStageView('Results', items);
        }
    });
}

// Reset order to CD3 descending
export function resetResultsOrder() {
    const items = Store.getItems();
    
    // Clear all sequence numbers and "new" flags
    items.forEach(item => {
        item.sequence = null;
        item.addedToManuallySequencedList = false;
        item.reordered = false;
    });
    
    // Reassign based on CD3 order
    assignSequenceNumbers(items);
    Store.saveItems(items);
    
    // Clear manual reorder flag
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = false;
    Store.save(appState);
    
    // Refresh the view
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    if (currentStage === 'Results') {
        displayResultsContent();
    }
}

// Display the content of the Results view
function displayResultsContent() {
    const items = Store.getItems();
    const appState = Store.getAppState();
    const buckets = appState.buckets;
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;
    
    // Show/hide reset order button based on manual reorder flag
    const resetOrderBtn = document.getElementById('resetOrderBtn');
    if (resetOrderBtn) {
        resetOrderBtn.style.display = appState.resultsManuallyReordered ? 'block' : 'none';
    }
    
    // Update callout message based on manual reorder flag
    const resultsCallout = document.getElementById('resultsCallout');
    if (resultsCallout) {
        if (appState.resultsManuallyReordered) {
            resultsCallout.innerHTML = 'Here are your items. They were originally sorted by <a href="help.html#cd3" class="cd3-link">CD3</a>, but you adjusted sort sequence. Click Reset Order to resort';
        } else {
            resultsCallout.innerHTML = 'Here are your items sorted descending by weighted cost of delay (<a href="help.html#cd3" class="cd3-link">CD3</a>)';
        }
    }
    
    if (items.length === 0) {
        resultsList.innerHTML = '<div class="empty-state" style="text-align: center; color: #999; padding: 40px; font-style: italic;">No items to display.</div>';
        return;
    }
    
    // Get bucket titles
    const urgency1Title = buckets.urgency[1]?.title || 'Title';
    const urgency2Title = buckets.urgency[2]?.title || 'Title';
    const urgency3Title = buckets.urgency[3]?.title || 'Title';
    const value1Title = buckets.value[1]?.title || 'Title';
    const value2Title = buckets.value[2]?.title || 'Title';
    const value3Title = buckets.value[3]?.title || 'Title';
    const duration1Title = buckets.duration[1]?.title || '1-3d';
    const duration2Title = buckets.duration[2]?.title || '1-3w';
    const duration3Title = buckets.duration[3]?.title || '1-3mo';
    
    // Get items with sequence numbers
    const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
    
    // Sort by sequence if available, otherwise by CD3
    const sortedItems = itemsWithSequence.length > 0 
        ? [...items].sort((a, b) => {
            const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
        })
        : getItemsSortedByCD3(items);
    
    if (sortedItems.length === 0) {
        resultsList.innerHTML = '<div class="empty-state" style="text-align: center; color: #999; padding: 40px; font-style: italic;">No items to display.</div>';
        return;
    }
    
    // Find min and max sequence for arrow button enabling
    const sequences = sortedItems.map(i => i.sequence).filter(s => s !== null && s !== undefined);
    const minSequence = sequences.length > 0 ? Math.min(...sequences) : 1;
    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : sortedItems.length;
    
    // Get confidence level labels
    const confidenceLabels = appState.confidenceLevelLabels || {
        1: "Not Confident (rarely, unlikely, low probability)",
        2: "Somewhat Confident (maybe, possibly, moderate probability)",
        3: "Confident (likely, probably, high probability)",
        4: "Very Confident (almost certainly, almost always, certainly)"
    };
    
    // Render ranked list
    resultsList.innerHTML = sortedItems.map((item, index) => {
        const slotNumber = item.sequence !== null && item.sequence !== undefined ? item.sequence : index + 1;
        const cd3 = item.CD3 || 0;
        const cd3Formatted = cd3.toFixed(2);
        const isActive = item.active !== false;
        const notesCount = item.notes && Array.isArray(item.notes) ? item.notes.length : 0;
        const linkHtml = item.link ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link" title="${escapeHtml(item.link)}">🔗</a>` : '';
        const notesBadgeHtml = `<button class="notes-badge" data-item-id="${item.id}" title="${notesCount > 0 ? 'View/Edit notes' : 'Add notes'}">Notes (${notesCount})</button>`;
        
        // Get bucket names and weights for urgency, value, and duration
        const urgency = item.urgency || 0;
        const urgencyTitle = urgency === 1 ? urgency1Title : urgency === 2 ? urgency2Title : urgency === 3 ? urgency3Title : '—';
        const urgencyWeight = urgency > 0 ? (buckets.urgency[urgency]?.weight || 0) : 0;
        const urgencyDisplay = urgency > 0 ? `${escapeHtml(urgencyTitle)} (${urgencyWeight})` : '—';
        
        const value = item.value || 0;
        const valueTitle = value === 1 ? value1Title : value === 2 ? value2Title : value === 3 ? value3Title : '—';
        const valueWeight = value > 0 ? (buckets.value[value]?.weight || 0) : 0;
        const valueDisplay = value > 0 ? `${escapeHtml(valueTitle)} (${valueWeight})` : '—';
        
        const duration = item.duration || 0;
        const durationTitle = duration === 1 ? duration1Title : duration === 2 ? duration2Title : duration === 3 ? duration3Title : '—';
        const durationWeight = duration > 0 ? (buckets.duration[duration]?.weight || 0) : 0;
        const durationDisplay = duration > 0 ? `${escapeHtml(durationTitle)} (${durationWeight})` : '—';
        
        // Calculate confidence-weighted CD3 if survey exists
        let confidenceWeightedCD3Html = '';
        if (item.hasConfidenceSurvey) {
            const weightedCD3 = calculateConfidenceWeightedCD3(item, appState);
            if (weightedCD3 !== null && weightedCD3 !== undefined) {
                const weightedCD3Formatted = weightedCD3.toFixed(2);
                const weightedValues = item.confidenceWeightedValues || {};
                const urgencyWeighted = weightedValues.urgency !== undefined ? weightedValues.urgency.toFixed(2) : '—';
                const valueWeighted = weightedValues.value !== undefined ? weightedValues.value.toFixed(2) : '—';
                const durationWeighted = weightedValues.duration !== undefined ? weightedValues.duration.toFixed(2) : '—';
                confidenceWeightedCD3Html = `<span class="results-cd3 confidence-weighted-cd3"><a href="help.html#confidence-weighted-cd3" class="cd3-link">Confidence Weighted CD3</a>: ${weightedCD3Formatted} (Urgency: ${urgencyWeighted}, Value: ${valueWeighted}, Duration: ${durationWeighted})</span>`;
            }
        }
        
        // Confidence survey buttons
        const hasSurvey = item.hasConfidenceSurvey === true;
        const canShowSurvey = urgency > 0 && value > 0 && duration > 0;
        let surveyButtonHtml = '';
        if (canShowSurvey) {
            if (!hasSurvey) {
                surveyButtonHtml = `<button class="btn btn-primary btn-sm confidence-survey-btn" data-item-id="${item.id}" data-action="open">Run confidence survey</button>`;
            } else {
                surveyButtonHtml = `
                    <button class="btn btn-primary btn-sm confidence-survey-btn" data-item-id="${item.id}" data-action="edit">Edit confidence survey</button>
                    <button class="btn btn-danger btn-sm confidence-survey-btn confidence-survey-delete-btn" data-item-id="${item.id}" data-action="delete">Delete survey</button>
                `;
            }
        }
        
        // Survey form HTML (initially hidden)
        const surveyFormHtml = canShowSurvey ? renderConfidenceSurveyForm(item, appState, confidenceLabels) : '';
        
        const canMoveUp = item.sequence !== null && item.sequence !== undefined && item.sequence > minSequence;
        const canMoveDown = item.sequence !== null && item.sequence !== undefined && item.sequence < maxSequence;
        
        return `
            <div class="list-item-card results-item ${!isActive ? 'list-item-card-inactive item-inactive' : ''}" data-item-id="${item.id}">
                <div class="results-slot">${slotNumber}</div>
                <div class="results-item-controls">
                    <button class="results-arrow-btn results-arrow-up" 
                            data-item-id="${item.id}" 
                            data-direction="up"
                            ${!canMoveUp ? 'disabled' : ''}
                            title="Move up">↑</button>
                    <button class="results-arrow-btn results-arrow-down" 
                            data-item-id="${item.id}" 
                            data-direction="down"
                            ${!canMoveDown ? 'disabled' : ''}
                            title="Move down">↓</button>
                </div>
                <div class="results-item-details">
                    <div class="results-item-name">${escapeHtml(item.name)}${item.addedToManuallySequencedList ? ' <span class="new-item-badge">[New]</span>' : ''}${item.reordered ? ' <span class="reordered-badge">Reordered</span>' : ''}${linkHtml} ${notesBadgeHtml}</div>
                    <div class="results-item-metrics">
                        <span class="results-metric">Urgency: ${urgencyDisplay}</span>
                        <span class="results-metric">Value: ${valueDisplay}</span>
                        <span class="results-metric">Duration: ${durationDisplay}</span>
                        <span class="results-cd3"><a href="help.html#cd3" class="cd3-link">CD3</a>: ${cd3Formatted}</span>
                        ${confidenceWeightedCD3Html}
                    </div>
                    ${surveyButtonHtml ? `<div class="confidence-survey-buttons">${surveyButtonHtml}</div>` : ''}
                    ${surveyFormHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Render confidence survey form
function renderConfidenceSurveyForm(item, appState, confidenceLabels) {
    const survey = item.confidenceSurvey || {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
    };
    
    const urgency = item.urgency || 0;
    const urgencyTitle = urgency === 1 ? (appState.buckets.urgency[1]?.title || 'Title') : 
                         urgency === 2 ? (appState.buckets.urgency[2]?.title || 'Title') : 
                         urgency === 3 ? (appState.buckets.urgency[3]?.title || 'Title') : '—';
    
    const value = item.value || 0;
    const valueTitle = value === 1 ? (appState.buckets.value[1]?.title || 'Title') : 
                       value === 2 ? (appState.buckets.value[2]?.title || 'Title') : 
                       value === 3 ? (appState.buckets.value[3]?.title || 'Title') : '—';
    
    const duration = item.duration || 0;
    const durationTitle = duration === 1 ? (appState.buckets.duration[1]?.title || '1-3d') : 
                          duration === 2 ? (appState.buckets.duration[2]?.title || '1-3w') : 
                          duration === 3 ? (appState.buckets.duration[3]?.title || '1-3mo') : '—';
    
    const renderConfidenceSection = (dimension, questionText) => {
        const votes = survey[dimension] || {1: 0, 2: 0, 3: 0, 4: 0};
        return `
            <div class="confidence-survey-section">
                <div class="confidence-survey-question">${escapeHtml(questionText)}</div>
                <div class="confidence-vote-inputs">
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[1])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="1" value="${votes[1] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[2])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="2" value="${votes[2] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[3])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="3" value="${votes[3] || 0}" />
                    </div>
                    <div class="confidence-vote-input-group">
                        <label class="confidence-vote-label">${escapeHtml(confidenceLabels[4])}:</label>
                        <input type="number" min="0" class="input input-sm confidence-vote-input" data-dimension="${dimension}" data-level="4" value="${votes[4] || 0}" />
                    </div>
                </div>
            </div>
        `;
    };
    
    return `
        <div class="confidence-survey-form" data-item-id="${item.id}" style="display: none;">
            ${renderConfidenceSection('scopeConfidence', 'How confident are you in the scoping and shaping of this item?')}
            ${renderConfidenceSection('urgencyConfidence', `How confident are you in the ${urgency} (${escapeHtml(urgencyTitle)}) urgency categorization of this item?`)}
            ${renderConfidenceSection('valueConfidence', `How confident are you in the ${value} (${escapeHtml(valueTitle)}) value categorization of this item?`)}
            ${renderConfidenceSection('durationConfidence', `How confident are you in the ${duration} (${escapeHtml(durationTitle)}) duration categorization of this item?`)}
            <div class="confidence-survey-error" data-item-id="${item.id}" style="display: none;">
                <div class="confidence-survey-error-message"></div>
            </div>
            <div class="confidence-survey-form-actions">
                <button class="btn btn-success confidence-survey-submit-btn" data-item-id="${item.id}">Submit</button>
                <button class="btn btn-secondary confidence-survey-cancel-btn" data-item-id="${item.id}">Cancel</button>
            </div>
        </div>
    `;
}

// Show confidence survey error message
export function showConfidenceSurveyError(itemId, errorMessage) {
    const errorEl = document.querySelector(`.confidence-survey-error[data-item-id="${itemId}"]`);
    if (errorEl) {
        const messageEl = errorEl.querySelector('.confidence-survey-error-message');
        if (messageEl) {
            messageEl.textContent = errorMessage;
        }
        errorEl.style.display = 'block';
    }
}

// Hide confidence survey error message
export function hideConfidenceSurveyError(itemId) {
    const errorEl = document.querySelector(`.confidence-survey-error[data-item-id="${itemId}"]`);
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

