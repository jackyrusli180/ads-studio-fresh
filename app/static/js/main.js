/**
 * Main JavaScript file for Ads Studio
 * Handles common functionality across the application
 */

import { showInfoToast } from './utils/toast.js';

// Store references to DOM elements globally
let sidebarEl, contentEl, toggleBtnEl;

/**
 * Initialize the application
 */
const initApp = () => {
    console.log('Ads Studio main.js loaded successfully');
    
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Highlight active navigation item
    highlightActiveNavItem();
    
    // Show welcome message if on dashboard
    if (window.location.pathname === '/' || window.location.pathname === '/index') {
        showInfoToast('Welcome to Ads Studio!');
    }
};

/**
 * Initialize sidebar toggle functionality
 */
const initSidebarToggle = () => {
    // Get DOM elements
    sidebarEl = document.querySelector('.sidebar');
    contentEl = document.querySelector('.content');
    toggleBtnEl = document.getElementById('toggleSidebar');
    
    console.log('Sidebar elements check:', {
        toggleBtn: !!toggleBtnEl,
        sidebar: !!sidebarEl,
        content: !!contentEl
    });
    
    // Skip initialization if the inline script has already set up the toggle
    // or if any required elements are missing
    if (!toggleBtnEl || !sidebarEl || !contentEl) {
        console.error('Required elements not found:');
        if (!toggleBtnEl) console.error('- Toggle button not found');
        if (!sidebarEl) console.error('- Sidebar element not found');
        if (!contentEl) console.error('- Content element not found');
        return;
    }
    
    // Toggle submenu visibility on click
    const navHeaders = document.querySelectorAll('.sidebar__nav-header');
    console.log(`Found ${navHeaders.length} nav headers`);
    
    navHeaders.forEach((header, index) => {
        // Use direct onclick handler
        header.onclick = function(e) {
            console.log(`Nav header ${index} clicked`);
            e.preventDefault();
            
            const submenu = this.nextElementSibling;
            if (submenu && submenu.classList.contains('sidebar__submenu')) {
                console.log('Toggling submenu visibility');
                
                // Toggle submenu visibility
                if (submenu.style.display === 'block') {
                    submenu.style.display = 'none';
                } else {
                    submenu.style.display = 'block';
                }
                
                // Toggle chevron rotation
                const chevron = this.querySelector('.fa-chevron-down');
                if (chevron) {
                    chevron.classList.toggle('rotate');
                } else {
                    console.log('Chevron icon not found in nav header');
                }
            } else {
                console.log('No valid submenu found:', submenu);
            }
            
            return false;
        };
    });
};

/**
 * Highlight the active navigation item based on current URL
 */
const highlightActiveNavItem = () => {
    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);
    const navLinks = document.querySelectorAll('.sidebar__nav-item');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        console.log('Checking link:', href);
        if (href === currentPath) {
            console.log('Active link found:', href);
            link.classList.add('sidebar__nav-item--active');
            
            // Also expand the parent submenu if it exists
            const parentSubmenu = link.closest('.sidebar__submenu');
            if (parentSubmenu) {
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
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp); 