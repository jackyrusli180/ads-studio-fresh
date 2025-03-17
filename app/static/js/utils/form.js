/**
 * Form utility functions for handling form operations
 */

import { showToast } from './common.js';

/**
 * Validate a form element
 * @param {HTMLElement} element - The form element to validate
 * @returns {boolean} - Whether the element is valid
 */
export function validateFormElement(element) {
    if (!element) return true;
    
    // Skip disabled elements
    if (element.disabled) return true;
    
    // Skip elements that don't have validation
    if (!element.checkValidity) return true;
    
    // Check validity
    const isValid = element.checkValidity();
    
    // Show validation message if invalid
    if (!isValid) {
        element.classList.add('is-invalid');
        
        // Get validation message
        const message = element.validationMessage || 'This field is invalid';
        
        // Create or update error message
        let errorElement = element.nextElementSibling;
        if (errorElement && errorElement.classList.contains('invalid-feedback')) {
            errorElement.textContent = message;
        } else {
            errorElement = document.createElement('div');
            errorElement.className = 'invalid-feedback';
            errorElement.textContent = message;
            element.parentNode.insertBefore(errorElement, element.nextSibling);
        }
        
        // Focus the element
        element.focus();
    } else {
        element.classList.remove('is-invalid');
        
        // Remove error message if it exists
        const errorElement = element.nextElementSibling;
        if (errorElement && errorElement.classList.contains('invalid-feedback')) {
            errorElement.remove();
        }
    }
    
    return isValid;
}

/**
 * Validate a form
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - Whether the form is valid
 */
export function validateForm(form) {
    if (!form) return false;
    
    // Get all form elements
    const elements = form.querySelectorAll('input, select, textarea');
    
    // Validate each element
    let isValid = true;
    elements.forEach(element => {
        if (!validateFormElement(element)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Collect form data as an object
 * @param {HTMLFormElement} form - The form to collect data from
 * @returns {Object} - The form data as an object
 */
export function collectFormData(form) {
    if (!form) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        // Handle array inputs (name="field[]")
        if (key.endsWith('[]')) {
            const arrayKey = key.slice(0, -2);
            
            if (!data[arrayKey]) {
                data[arrayKey] = [];
            }
            
            data[arrayKey].push(value);
        } else {
            // Handle regular inputs
            if (data[key]) {
                // Convert to array if multiple values
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
    });
    
    return data;
}

/**
 * Set form values from an object
 * @param {HTMLFormElement} form - The form to populate
 * @param {Object} data - The data to set
 */
export function setFormValues(form, data) {
    if (!form || !data) return;
    
    // Loop through form elements
    const elements = form.querySelectorAll('input, select, textarea');
    
    elements.forEach(element => {
        const name = element.name;
        
        // Skip elements without a name
        if (!name) return;
        
        // Skip if no data for this element
        if (!(name in data) && !name.endsWith('[]')) return;
        
        // Handle different element types
        if (element.type === 'checkbox' || element.type === 'radio') {
            // For checkboxes and radio buttons, check if value matches
            element.checked = data[name] === element.value;
        } else if (element.tagName === 'SELECT' && element.multiple) {
            // For multi-select, set selected options
            const values = Array.isArray(data[name]) ? data[name] : [data[name]];
            
            Array.from(element.options).forEach(option => {
                option.selected = values.includes(option.value);
            });
        } else {
            // For regular inputs
            element.value = data[name] || '';
        }
    });
} 