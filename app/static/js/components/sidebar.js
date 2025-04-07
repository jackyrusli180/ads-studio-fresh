/**
 * Sidebar Component
 * Handles sidebar functionality
 */

import { select, selectAll, on, toggleClass } from '../utils/dom.js';

/**
 * Initialize sidebar functionality
 */
export const initSidebar = () => {
    // Toggle sidebar collapse
    const toggleSidebarBtn = select('#toggleSidebar');
    if (toggleSidebarBtn) {
        console.log('Toggle sidebar button found:', toggleSidebarBtn);
        
        toggleSidebarBtn.addEventListener('click', function() {
            console.log('Toggle sidebar button clicked');
            const sidebar = document.querySelector('.sidebar');
            const content = document.querySelector('.content');
            
            sidebar.classList.toggle('sidebar--collapsed');
            content.classList.toggle('content--expanded');
            
            // Toggle icon
            const icon = this.querySelector('i');
            if (sidebar.classList.contains('sidebar--collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    } else {
        console.error('Toggle sidebar button not found with ID: toggleSidebar');
    }
    
    // Toggle submenu visibility on click (in addition to hover)
    const navHeaders = selectAll('.sidebar__nav-header');
    navHeaders.forEach(header => {
        on(header, 'click', () => {
            const submenu = header.nextElementSibling;
            if (submenu && submenu.classList.contains('sidebar__submenu')) {
                // Toggle submenu visibility
                if (submenu.style.display === 'block') {
                    submenu.style.display = 'none';
                    header.querySelector('.fa-chevron-down').classList.remove('rotate');
                } else {
                    submenu.style.display = 'block';
                    header.querySelector('.fa-chevron-down').classList.add('rotate');
                }
            }
        });
    });
};

/**
 * Highlight the active navigation item based on current URL
 */
export const highlightActiveNavItem = () => {
    const currentPath = window.location.pathname;
    const navLinks = selectAll('.sidebar__nav-item');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('sidebar__nav-item--active');
            
            // Also expand the parent submenu if it exists
            const parentSubmenu = link.closest('.sidebar__submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block';
                
                // Rotate the chevron icon
                const navHeader = parentSubmenu.previousElementSibling;
                if (navHeader && navHeader.classList.contains('sidebar__nav-header')) {
                    navHeader.querySelector('.fa-chevron-down').classList.add('rotate');
                }
            }
        }
    });
}; 