/**
 * Form Helper Utilities
 * Common functions for form handling across the application
 */

/**
 * Dynamically populates a select dropdown with options
 * @param {string} selectId - The ID of the select element to populate
 * @param {Array} options - Array of options to add to the select
 * @param {string} valueKey - The key to use for the option value
 * @param {string} textKey - The key to use for the option text
 * @param {boolean} keepExisting - Whether to keep existing options
 */
function populateSelect(selectId, options, valueKey = 'id', textKey = 'name', keepExisting = false) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options if not keeping them
    if (!keepExisting) {
        // Keep only the first "placeholder" option
        const firstOption = select.options[0];
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }
    }

    // Add new options
    options.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option[valueKey] || '';
        optElement.textContent = option[textKey] || '';
        select.appendChild(optElement);
    });
}

/**
 * Shows form sections conditionally based on selected options
 * @param {string} sectionId - The ID of the section to show/hide
 * @param {boolean} show - Whether to show or hide the section
 */
function toggleFormSection(sectionId, show) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = show ? 'block' : 'none';
    }
}

/**
 * Validates a form and highlights missing required fields
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} Whether the form is valid
 */
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    // Reset previous validation
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    
    // Check required fields
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Collects form data and converts it to a JSON object
 * @param {HTMLFormElement} form - The form to collect data from
 * @returns {Object} Form data as a JSON object
 */
function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        // Handle checkboxes with the same name (multi-select)
        if (key.endsWith('[]')) {
            const cleanKey = key.substring(0, key.length - 2);
            if (!data[cleanKey]) {
                data[cleanKey] = [];
            }
            data[cleanKey].push(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Export utilities
export {
    populateSelect,
    toggleFormSection,
    validateForm,
    collectFormData
}; 