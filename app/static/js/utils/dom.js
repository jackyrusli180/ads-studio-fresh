/**
 * DOM Utility
 * Provides helper functions for DOM manipulation
 */

/**
 * Select a DOM element
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element to search within
 * @returns {Element|null} - The selected element or null
 */
export const select = (selector, parent = document) => {
    return parent.querySelector(selector);
};

/**
 * Select multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element to search within
 * @returns {NodeList} - List of selected elements
 */
export const selectAll = (selector, parent = document) => {
    return parent.querySelectorAll(selector);
};

/**
 * Create a DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes={}] - Element attributes
 * @param {Array|Element|string} [children] - Child elements or text content
 * @returns {Element} - The created element
 */
export const createElement = (tag, attributes = {}, children) => {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add children
    if (children !== undefined) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                appendChild(element, child);
            });
        } else {
            appendChild(element, children);
        }
    }
    
    return element;
};

/**
 * Append a child to an element
 * @param {Element} parent - Parent element
 * @param {Element|string} child - Child element or text content
 */
const appendChild = (parent, child) => {
    if (child instanceof Element) {
        parent.appendChild(child);
    } else {
        parent.appendChild(document.createTextNode(child));
    }
};

/**
 * Add event listener to an element
 * @param {Element|string} element - Element or CSS selector
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @param {Object} [options] - Event listener options
 */
export const on = (element, event, callback, options) => {
    const el = typeof element === 'string' ? select(element) : element;
    if (el) {
        el.addEventListener(event, callback, options);
    }
};

/**
 * Remove event listener from an element
 * @param {Element|string} element - Element or CSS selector
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @param {Object} [options] - Event listener options
 */
export const off = (element, event, callback, options) => {
    const el = typeof element === 'string' ? select(element) : element;
    if (el) {
        el.removeEventListener(event, callback, options);
    }
};

/**
 * Add a class to an element
 * @param {Element|string} element - Element or CSS selector
 * @param {string} className - Class to add
 */
export const addClass = (element, className) => {
    const el = typeof element === 'string' ? select(element) : element;
    if (el) {
        el.classList.add(className);
    }
};

/**
 * Remove a class from an element
 * @param {Element|string} element - Element or CSS selector
 * @param {string} className - Class to remove
 */
export const removeClass = (element, className) => {
    const el = typeof element === 'string' ? select(element) : element;
    if (el) {
        el.classList.remove(className);
    }
};

/**
 * Toggle a class on an element
 * @param {Element|string} element - Element or CSS selector
 * @param {string} className - Class to toggle
 * @param {boolean} [force] - Force add or remove
 * @returns {boolean} - Whether the class is now present
 */
export const toggleClass = (element, className, force) => {
    const el = typeof element === 'string' ? select(element) : element;
    if (el) {
        return el.classList.toggle(className, force);
    }
    return false;
}; 