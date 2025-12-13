// Modal event listeners - clear data, header info, notes, confidence survey modals

import { Store } from '../state/appState.js';
import { escapeHtml } from '../ui/forms.js';
import { analytics } from '../analytics/analytics.js';
import { showConfidenceSurveyError, hideConfidenceSurveyError } from '../ui/display.js';

// Setup modal event listeners
// Accepts handler functions as dependencies
export function setupModalsListeners(handlers) {
    const {
        addItemNoteToItem,
        updateItemNoteInItem,
        openConfidenceSurvey,
        submitConfidenceSurvey,
        deleteConfidenceSurvey,
        cancelConfidenceSurvey
    } = handlers;

    // ============================================================================
    // Clear Data Modal
    // ============================================================================
    
    const clearDataBtn = document.getElementById('clearDataBtn');
    const clearDataModal = document.getElementById('clearDataModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSubmitBtn = document.getElementById('modalSubmitBtn');
    const clearDataOption = document.getElementById('clearDataOption');
    const clearDataConfirm = document.getElementById('clearDataConfirm');
    
    const showClearDataModal = () => {
        if (clearDataModal) {
            clearDataModal.style.display = 'flex';
            // Reset form
            if (clearDataOption) clearDataOption.value = 'itemsOnly';
            if (clearDataConfirm) {
                clearDataConfirm.value = '';
                clearDataConfirm.focus();
            }
            if (modalSubmitBtn) modalSubmitBtn.disabled = true;
        }
    };
    
    const hideClearDataModal = () => {
        if (clearDataModal) {
            clearDataModal.style.display = 'none';
        }
    };
    
    const validateClearDataInput = () => {
        if (clearDataConfirm && modalSubmitBtn) {
            const inputValue = clearDataConfirm.value.trim();
            modalSubmitBtn.disabled = inputValue !== 'Clear my data';
        }
    };
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            showClearDataModal();
            // Track analytics event
            analytics.trackEvent('Access Clear Data');
        });
    }
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideClearDataModal);
    }
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', hideClearDataModal);
    }
    
    // Close modal when clicking backdrop
    if (clearDataModal) {
        clearDataModal.addEventListener('click', (e) => {
            if (e.target === clearDataModal) {
                hideClearDataModal();
            }
        });
    }
    
    // Validate input as user types
    if (clearDataConfirm) {
        clearDataConfirm.addEventListener('input', validateClearDataInput);
    }
    
    // Handle submit - use global handler from app-controls.js
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', () => {
            if (window.handleClearDataSubmit) {
                hideClearDataModal();
                window.handleClearDataSubmit();
            }
        });
    }
    
    // ============================================================================
    // Header Info Modal
    // ============================================================================
    
    const headerInfoModal = document.getElementById('headerInfoModal');
    const headerInfoModalTitle = document.getElementById('headerInfoModalTitle');
    const headerInfoModalDescription = document.getElementById('headerInfoModalDescription');
    const headerInfoModalClose = document.getElementById('headerInfoModalClose');
    
    function openHeaderInfoModal(category, level) {
        const appState = Store.getAppState();
        const buckets = appState.buckets;
        
        if (!buckets || !buckets[category] || !buckets[category][level]) {
            console.warn('Bucket not found:', category, level);
            return;
        }
        
        const bucket = buckets[category][level];
        const title = bucket.title || `${category} ${level}`;
        const description = bucket.description || 'No description available.';
        
        if (headerInfoModalTitle) {
            headerInfoModalTitle.textContent = title;
        }
        if (headerInfoModalDescription) {
            headerInfoModalDescription.textContent = description;
        }
        if (headerInfoModal) {
            headerInfoModal.style.display = 'flex';
        }
    }
    
    function closeHeaderInfoModal() {
        if (headerInfoModal) {
            headerInfoModal.style.display = 'none';
        }
    }
    
    // Event delegation for header links
    document.addEventListener('click', (e) => {
        const headerLink = e.target.closest('.header-link');
        if (!headerLink) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const category = headerLink.getAttribute('data-category');
        const level = parseInt(headerLink.getAttribute('data-level'));
        
        if (category && level) {
            openHeaderInfoModal(category, level);
        }
    });
    
    // Close modal handlers
    if (headerInfoModalClose) {
        headerInfoModalClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeHeaderInfoModal();
        });
    }
    
    if (headerInfoModal) {
        headerInfoModal.addEventListener('click', (e) => {
            if (e.target === headerInfoModal) {
                closeHeaderInfoModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && headerInfoModal && headerInfoModal.style.display !== 'none') {
            closeHeaderInfoModal();
        }
    });
    
    // ============================================================================
    // Notes Modal
    // ============================================================================
    
    const notesModal = document.getElementById('notesModal');
    const notesModalTitle = document.getElementById('notesModalTitle');
    const notesModalItemName = document.getElementById('notesModalItemName');
    const notesModalNotesList = document.getElementById('notesModalNotesList');
    const notesModalTextarea = document.getElementById('notesModalTextarea');
    const notesModalAddBtn = document.getElementById('notesModalAddBtn');
    const notesModalEditBtn = document.getElementById('notesModalEditBtn');
    const notesModalCancelEditBtn = document.getElementById('notesModalCancelEditBtn');
    const notesModalClose = document.getElementById('notesModalClose');
    
    let currentNotesItemId = null;
    let currentEditingNoteIndex = null;
    
    function formatTimestamp(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString();
    }
    
    function renderNotesList(item) {
        if (!item || !Array.isArray(item.notes) || item.notes.length === 0) {
            notesModalNotesList.innerHTML = '<div style="color: #6c757d; font-style: italic; padding: 10px;">No notes yet. Add your first note below.</div>';
            return;
        }
        
        notesModalNotesList.innerHTML = item.notes.map((note, index) => {
            const isSelected = currentEditingNoteIndex === index;
            const createdTime = formatTimestamp(note.createdAt);
            const modifiedTime = note.modifiedAt && note.modifiedAt !== note.createdAt 
                ? formatTimestamp(note.modifiedAt) 
                : null;
            
            return `
                <div class="note-item ${isSelected ? 'selected' : ''}" data-note-index="${index}">
                    <div class="note-item-text">${escapeHtml(note.text)}</div>
                    <div class="note-item-timestamps">
                        <span class="note-item-timestamp">Created: ${createdTime}</span>
                        ${modifiedTime ? `<span class="note-item-timestamp">Modified: ${modifiedTime}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers to note items
        notesModalNotesList.querySelectorAll('.note-item').forEach(noteEl => {
            noteEl.addEventListener('click', () => {
                const noteIndex = parseInt(noteEl.getAttribute('data-note-index'));
                selectNoteForEditing(noteIndex);
            });
        });
    }
    
    function selectNoteForEditing(noteIndex) {
        const items = Store.getItems();
        const item = items.find(i => i.id === currentNotesItemId);
        if (!item || !item.notes || noteIndex < 0 || noteIndex >= item.notes.length) {
            return;
        }
        
        currentEditingNoteIndex = noteIndex;
        const note = item.notes[noteIndex];
        notesModalTextarea.value = note.text;
        
        notesModalAddBtn.style.display = 'none';
        notesModalEditBtn.style.display = 'inline-block';
        notesModalCancelEditBtn.style.display = 'inline-block';
        
        renderNotesList(item);
        notesModalTextarea.focus();
    }
    
    function cancelEditing() {
        currentEditingNoteIndex = null;
        notesModalTextarea.value = '';
        notesModalAddBtn.style.display = 'inline-block';
        notesModalEditBtn.style.display = 'none';
        notesModalCancelEditBtn.style.display = 'none';
        
        const items = Store.getItems();
        const item = items.find(i => i.id === currentNotesItemId);
        if (item) {
            renderNotesList(item);
        }
    }
    
    function openNotesModal(itemId) {
        const items = Store.getItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            console.warn('Item not found:', itemId);
            return;
        }
        
        currentNotesItemId = itemId;
        currentEditingNoteIndex = null;
        
        if (notesModalItemName) {
            notesModalItemName.textContent = item.name;
        }
        
        renderNotesList(item);
        notesModalTextarea.value = '';
        notesModalAddBtn.style.display = 'inline-block';
        notesModalEditBtn.style.display = 'none';
        notesModalCancelEditBtn.style.display = 'none';
        
        if (notesModal) {
            notesModal.style.display = 'flex';
            notesModalTextarea.focus();
        }
    }
    
    function closeNotesModal() {
        if (notesModal) {
            notesModal.style.display = 'none';
        }
        currentNotesItemId = null;
        currentEditingNoteIndex = null;
        if (notesModalTextarea) {
            notesModalTextarea.value = '';
        }
    }
    
    // Event delegation for notes badge clicks
    document.addEventListener('click', (e) => {
        const notesBadge = e.target.closest('.notes-badge');
        if (!notesBadge) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const itemId = notesBadge.getAttribute('data-item-id');
        if (itemId) {
            openNotesModal(itemId);
        }
    });
    
    // Add note button
    if (notesModalAddBtn) {
        notesModalAddBtn.addEventListener('click', () => {
            const noteText = notesModalTextarea.value.trim();
            if (!noteText) {
                alert('Please enter a note.');
                return;
            }
            
            const result = addItemNoteToItem(currentNotesItemId, noteText);
            if (result.success) {
                notesModalTextarea.value = '';
                const items = Store.getItems();
                const item = items.find(i => i.id === currentNotesItemId);
                if (item) {
                    renderNotesList(item);
                }
            } else {
                alert(result.error || 'Failed to add note');
            }
        });
    }
    
    // Edit note button
    if (notesModalEditBtn) {
        notesModalEditBtn.addEventListener('click', () => {
            const noteText = notesModalTextarea.value.trim();
            if (!noteText) {
                alert('Please enter a note.');
                return;
            }
            
            if (currentEditingNoteIndex === null) {
                return;
            }
            
            const result = updateItemNoteInItem(currentNotesItemId, currentEditingNoteIndex, noteText);
            if (result.success) {
                cancelEditing();
                const items = Store.getItems();
                const item = items.find(i => i.id === currentNotesItemId);
                if (item) {
                    renderNotesList(item);
                }
            } else {
                alert(result.error || 'Failed to update note');
            }
        });
    }
    
    // Cancel edit button
    if (notesModalCancelEditBtn) {
        notesModalCancelEditBtn.addEventListener('click', () => {
            cancelEditing();
        });
    }
    
    // Close modal handlers
    if (notesModalClose) {
        notesModalClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeNotesModal();
        });
    }
    
    if (notesModal) {
        notesModal.addEventListener('click', (e) => {
            if (e.target === notesModal) {
                closeNotesModal();
            }
        });
    }
    
    // Close notes modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && notesModal && notesModal.style.display !== 'none') {
            closeNotesModal();
        }
    });
    
    // ============================================================================
    // Confidence Survey Modal
    // ============================================================================
    
    // Event delegation for confidence survey buttons
    document.addEventListener('click', (e) => {
        const surveyBtn = e.target.closest('.confidence-survey-btn');
        if (!surveyBtn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const itemId = surveyBtn.getAttribute('data-item-id');
        const action = surveyBtn.getAttribute('data-action');
        
        if (!itemId) return;
        
        if (action === 'open' || action === 'edit') {
            const result = openConfidenceSurvey(itemId);
            if (!result.success) {
                alert(result.error || 'Failed to open confidence survey');
            }
        } else if (action === 'delete') {
            if (confirm('Are you sure you want to delete this confidence survey? This cannot be undone.')) {
                const result = deleteConfidenceSurvey(itemId);
                if (!result.success) {
                    alert(result.error || 'Failed to delete confidence survey');
                }
            }
        }
    });
    
    // Event delegation for confidence survey form buttons
    document.addEventListener('click', (e) => {
        const submitBtn = e.target.closest('.confidence-survey-submit-btn');
        const cancelBtn = e.target.closest('.confidence-survey-cancel-btn');
        
        if (submitBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const itemId = submitBtn.getAttribute('data-item-id');
            if (!itemId) return;
            
            // Collect survey data from form inputs
            const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
            if (!surveyForm) return;
            
            const surveyData = {
                scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
                urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
                valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
                durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
            };
            
            // Collect vote counts for each dimension
            ['scopeConfidence', 'urgencyConfidence', 'valueConfidence', 'durationConfidence'].forEach(dimension => {
                for (let level = 1; level <= 4; level++) {
                    const input = surveyForm.querySelector(`.confidence-vote-input[data-dimension="${dimension}"][data-level="${level}"]`);
                    if (input) {
                        surveyData[dimension][level] = parseInt(input.value) || 0;
                    }
                }
            });
            
            const result = submitConfidenceSurvey(itemId, surveyData);
            if (!result.success) {
                // Show inline error callout instead of alert
                showConfidenceSurveyError(itemId, result.error || 'Failed to submit confidence survey');
            } else {
                // Hide any existing error on success
                hideConfidenceSurveyError(itemId);
            }
        } else if (cancelBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const itemId = cancelBtn.getAttribute('data-item-id');
            if (itemId) {
                cancelConfidenceSurvey(itemId);
            }
        }
    });
}

