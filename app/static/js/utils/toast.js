/**
 * Toast Notification Utility
 * Provides functions for showing toast notifications
 */

// Toast container
let toastContainer;

/**
 * Initialize the toast container
 */
function initToastContainer() {
    // Create container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Initialize container
    initToastContainer();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Show a success toast
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds
 */
export function showSuccessToast(message, duration = 3000) {
    showToast(message, 'success', duration);
}

/**
 * Show an error toast
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds
 */
export function showErrorToast(message, duration = 4000) {
    showToast(message, 'error', duration);
}

/**
 * Show an info toast
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds
 */
export function showInfoToast(message, duration = 3000) {
    showToast(message, 'info', duration);
}

/**
 * Show a warning toast
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds
 */
export function showWarningToast(message, duration = 3000) {
    showToast(message, 'warning', duration);
} 