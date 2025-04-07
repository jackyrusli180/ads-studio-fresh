/**
 * Main JavaScript file for Ads Studio
 * Handles common functionality across the application
 */

// Import utilities if needed
// import { showInfoToast } from './utils/toast.js';

// Store references to DOM elements globally
let sidebarEl, contentEl, toggleBtnEl;

/**
 * Initialize the application
 */
const initApp = () => {
    console.log('Ads Studio main.js loaded successfully');
    
    // Initialize sidebar
    initSidebar();
    
    // Skip highlighting active nav if it was done by the inline script
    if (!window.navInitialized) {
        highlightActiveNavItem();
    }
};

/**
 * Initialize sidebar functionality
 */
const initSidebar = () => {
    // Get DOM elements
    sidebarEl = document.querySelector('.sidebar');
    contentEl = document.querySelector('.content');
    toggleBtnEl = document.getElementById('toggleSidebar');
    
    if (!sidebarEl || !contentEl) {
        console.error('Required sidebar elements not found');
        return;
    }

    // Only initialize submenu toggles if not already set up by inline script
    if (!window.submenuTogglesInitialized) {
        initSubmenuToggles();
    }
};

/**
 * Initialize submenu toggles
 */
const initSubmenuToggles = () => {
    const navHeaders = document.querySelectorAll('.sidebar__nav-header[data-toggle="submenu"]');
    
    if (navHeaders.length === 0) {
        console.warn('No submenu headers found with data-toggle attribute');
        return;
    }
    
    console.log(`Found ${navHeaders.length} submenu headers`);
    
    // First, ensure all submenus have their initial state set properly
    document.querySelectorAll('.sidebar__submenu').forEach(submenu => {
        // Make sure display property is explicitly set
        if (submenu.style.display !== 'block') {
            submenu.style.display = 'none';
        }
    });
    
    navHeaders.forEach((header, index) => {
        // Add click event handler
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const submenu = this.nextElementSibling;
            if (submenu && submenu.classList.contains('sidebar__submenu')) {
                // Get computed style to ensure we detect visibility correctly
                const computedStyle = window.getComputedStyle(submenu);
                const isVisible = computedStyle.display !== 'none';
                
                // Toggle submenu visibility
                submenu.style.display = isVisible ? 'none' : 'block';
                
                // Toggle chevron rotation
                const chevron = this.querySelector('.fa-chevron-down');
                if (chevron) {
                    if (isVisible) {
                        chevron.classList.remove('rotate');
                    } else {
                        chevron.classList.add('rotate');
                    }
                }
                
                console.log(`Toggled submenu ${index}: ${isVisible ? 'closed' : 'opened'}`);
            }
        });
    });
    
    // Set a flag to indicate submenus have been initialized
    window.submenuTogglesInitialized = true;
};

/**
 * Highlight the active navigation item based on current URL
 */
const highlightActiveNavItem = () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar__nav-item');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === currentPath) {
            link.classList.add('sidebar__nav-item--active');
            
            // Expand the parent submenu if it exists
            const parentSubmenu = link.closest('.sidebar__submenu');
            if (parentSubmenu) {
                // Make explicitly visible
                parentSubmenu.style.display = 'block';
                
                // Rotate the chevron icon
                const navHeader = parentSubmenu.previousElementSibling;
                if (navHeader && navHeader.classList.contains('sidebar__nav-header')) {
                    const chevron = navHeader.querySelector('.fa-chevron-down');
                    if (chevron) chevron.classList.add('rotate');
                }
            }
        }
    });
    
    // Set a flag to indicate nav has been initialized
    window.navInitialized = true;
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp); 