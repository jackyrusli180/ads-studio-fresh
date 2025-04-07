/**
 * Platform Selector Component
 * Manages the platform selection UI and functionality
 */

import { fetchAdvertiserAccounts } from '../services/accountService.js';

/**
 * Initialize the Platform Selector component
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @param {Function} validateStep - Function to validate the step
 * @returns {Object} - PlatformSelector methods
 */
export function initPlatformSelector(elements, state, validateStep) {
    /**
     * Set up event listeners for platform selection
     */
    function setupEventListeners() {
        elements.platformItems.forEach(item => {
            item.addEventListener('click', function(event) {
                // Don't handle if clicking on the checkbox itself
                if (event.target.type === 'checkbox') return;
                
                // Toggle selected class
                this.classList.toggle('selected');
                
                // Update checkbox state
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = this.classList.contains('selected');
                
                // Dispatch change event
                const changeEvent = new Event('change');
                checkbox.dispatchEvent(changeEvent);
            });
        });
        
        elements.platformCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelectedPlatforms();
                
                // Load advertiser accounts if necessary
                if (state.selectedPlatforms.length > 0) {
                    loadAdvertiserAccounts();
                } else {
                    // Clear accounts if no platforms selected
                    elements.advertiserAccountContainer.innerHTML = '<div class="loading-accounts">Please select a platform first</div>';
                    state.advertiserAccounts = [];
                }
                
                // Validate step
                validateStep();
            });
        });
    }
    
    /**
     * Update the selected platforms in the state
     */
    function updateSelectedPlatforms() {
        state.selectedPlatforms = Array.from(elements.platformCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        console.log('Selected platforms:', state.selectedPlatforms);
    }
    
    /**
     * Load advertiser accounts for selected platforms
     */
    async function loadAdvertiserAccounts() {
        // Show loading state
        elements.advertiserAccountContainer.innerHTML = '<div class="loading-accounts">Loading advertiser accounts...</div>';
        
        try {
            const accounts = await fetchAdvertiserAccounts(state.selectedPlatforms);
            
            // Render accounts
            if (accounts && accounts.length > 0) {
                renderAccountCheckboxes(accounts);
            } else {
                elements.advertiserAccountContainer.innerHTML = '<div class="loading-accounts">No accounts available</div>';
            }
        } catch (error) {
            console.error('Error loading advertiser accounts:', error);
            elements.advertiserAccountContainer.innerHTML = '<div class="loading-accounts error">Failed to load accounts</div>';
        }
        
        // Validate step after loading accounts
        validateStep();
    }
    
    /**
     * Render account checkboxes for the selected platforms
     * @param {Array} accounts - Array of account objects from the API
     */
    function renderAccountCheckboxes(accounts) {
        // Clear previous checkboxes
        elements.advertiserAccountContainer.innerHTML = '';
        
        if (!accounts || accounts.length === 0) {
            elements.advertiserAccountContainer.innerHTML = '<div class="no-accounts">No accounts found for the selected platforms</div>';
            return;
        }
        
        // Group accounts by platform if needed
        const platformsSelected = state.selectedPlatforms.length;
        
        accounts.forEach(account => {
            // Create account checkbox item
            const accountItem = document.createElement('div');
            accountItem.className = 'account-item';
            accountItem.dataset.platform = account.platform || 
                                        (state.selectedPlatforms.length === 1 ? state.selectedPlatforms[0] : '');
            
            // Make sure platform is set
            if (!account.platform && state.selectedPlatforms.length === 1) {
                account.platform = state.selectedPlatforms[0];
            }
            
            // Add account info
            accountItem.innerHTML = `
                <label class="account-checkbox-label">
                    <input type="checkbox" name="advertiser_account_id[]" value="${account.id}" class="account-checkbox">
                    <div class="account-info">
                        <div class="account-name">${account.name}</div>
                        <div class="account-id">${account.id}</div>
                        ${platformsSelected > 1 ? `<div class="account-platform">${account.platform}</div>` : ''}
                    </div>
                </label>
            `;
            
            // Add click event listener to update state
            const checkbox = accountItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                updateSelectedAccounts();
                
                // Validate step
                validateStep();
            });
            
            elements.advertiserAccountContainer.appendChild(accountItem);
        });
    }
    
    /**
     * Update the selected accounts in the state
     */
    function updateSelectedAccounts() {
        const accountCheckboxes = elements.advertiserAccountContainer.querySelectorAll('input[name="advertiser_account_id[]"]:checked');
        
        state.advertiserAccounts = Array.from(accountCheckboxes).map(checkbox => {
            const accountItem = checkbox.closest('.account-item');
            return {
                id: checkbox.value,
                name: accountItem.querySelector('.account-name').textContent,
                platform: accountItem.dataset.platform
            };
        });
        
        console.log('Selected accounts updated:', state.advertiserAccounts);
    }
    
    return {
        setupEventListeners,
        updateSelectedPlatforms,
        loadAdvertiserAccounts,
        updateSelectedAccounts
    };
} 