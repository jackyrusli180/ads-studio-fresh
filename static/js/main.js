document.addEventListener('DOMContentLoaded', function() {
    // Active link highlighting
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Get the toggle button
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    
    // Get the sidebar element
    const sidebar = document.querySelector('.sidebar');
    
    // Get the main content area
    const mainContent = document.querySelector('.main-content');
    
    // Add click event listener to the toggle button
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            console.log('Toggle sidebar button clicked');
            
            // Toggle the 'collapsed' class on the sidebar
            sidebar.classList.toggle('collapsed');
            
            // Toggle 'expanded' class on the main content
            mainContent.classList.toggle('expanded');
            
            // Toggle the icon rotation
            const icon = this.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    } else {
        console.error('Toggle sidebar button not found');
    }
});

// Toast notification system
const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
};

// Ajax request helper
const makeRequest = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        showToast(error.message, 'error');
        throw error;
    }
}; 