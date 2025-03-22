/**
 * Common utility functions
 */

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, warning, info)
 */
export function showToast(message, type = 'info') {
    // Function disabled per user request
    console.log(`Toast suppressed: ${message} (${type})`);
    return;
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
export function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
} 