// Form rendering utilities

// Escape HTML to prevent XSS
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render a single form field
export function renderFormField(field) {
    const label = `<label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>`;
    const requiredAttr = field.required ? 'required' : '';
    
    if (field.type === 'select') {
        const options = typeof field.options === 'function' ? field.options() : field.options || [];
        return `
            <div class="form-field">
                ${label}
                <select id="${field.name}" name="${field.name}" class="select input-lg" ${requiredAttr}>
                    <option value="">Select ${field.label.toLowerCase()}...</option>
                    ${options.map(opt => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (field.type === 'textarea') {
        return `
            <div class="form-field">
                ${label}
                <textarea 
                    id="${field.name}" 
                    name="${field.name}"
                    class="textarea input-lg input-border-muted"
                    placeholder="${field.placeholder || ''}"
                    ${requiredAttr}
                    rows="4"
                ></textarea>
            </div>
        `;
    } else {
        const attrs = [
            requiredAttr,
            field.min !== undefined ? `min="${field.min}"` : '',
            field.max !== undefined ? `max="${field.max}"` : '',
            field.step !== undefined ? `step="${field.step}"` : ''
        ].filter(Boolean).join(' ');
        
        return `
            <div class="form-field">
                ${label}
                <input 
                    type="${field.type}" 
                    id="${field.name}" 
                    name="${field.name}"
                    class="input input-lg input-border-muted"
                    placeholder="${field.placeholder || ''}"
                    ${attrs}
                />
            </div>
        `;
    }
}

// Show form for a command
export function showForm(command, commandConfig, getItemsFn) {
    if (!commandConfig) return;

    const formContainer = document.getElementById('dynamicForm');
    
    // Handle commands with no fields
    if (!commandConfig.fields || commandConfig.fields.length === 0) {
        formContainer.style.display = 'block';
        formContainer.innerHTML = `
            <form id="commandForm">
                <div class="form-info">This command will execute immediately when you click "Go".</div>
                <button type="submit" class="submit-btn">Go</button>
            </form>
        `;
        
        const form = document.getElementById('commandForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const result = commandConfig.handler({});
            if (result !== false) {
                hideForm();
                document.getElementById('commandSelect').value = '';
            }
        });
        return;
    }

    formContainer.style.display = 'block';

    // Check if command requires items
    const commandsWithoutItems = ['addItem', 'bulkAddItems', 'setBucketField', 'advanceStage', 'backStage'];
    const items = getItemsFn();
    const requiresItems = !commandsWithoutItems.includes(command);
    if (requiresItems && items.length === 0) {
        formContainer.innerHTML = '<div class="empty-state">No items available. Please add an item first.</div>';
        return;
    }

    // Build form HTML
    const fieldsHTML = commandConfig.fields.map(field => renderFormField(field)).join('');
    formContainer.innerHTML = `
        <form id="commandForm">
            ${fieldsHTML}
            <button type="submit" class="submit-btn">Go</button>
        </form>
    `;

    // Handle form submission
    const form = document.getElementById('commandForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // For textarea fields, get the value directly
        commandConfig.fields.forEach(field => {
            if (field.type === 'textarea') {
                const textarea = form.querySelector(`[name="${field.name}"]`);
                if (textarea) {
                    data[field.name] = textarea.value;
                }
            }
        });
        
        const result = commandConfig.handler(data);
        if (result !== false) {
            hideForm();
            document.getElementById('commandSelect').value = '';
        }
    });
}

// Hide form
export function hideForm() {
    const formContainer = document.getElementById('dynamicForm');
    formContainer.style.display = 'none';
    formContainer.innerHTML = '';
}



