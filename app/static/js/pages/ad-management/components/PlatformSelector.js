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
     * Render account checkboxes
     * @param {Array} accounts - List of account objects
     */
    function renderAccountCheckboxes(accounts) {
        // Clear container
        elements.advertiserAccountContainer.innerHTML = '';
        
        // Generate checkboxes for each account
        accounts.forEach(account => {
            const accountItem = document.createElement('div');
            accountItem.className = 'account-item';
            accountItem.dataset.id = account.id;
            accountItem.dataset.platform = account.platform;
            
            // Create checkbox input
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'account-checkbox';
            checkbox.name = 'advertiser_account_id[]';
            checkbox.value = account.id;
            checkbox.id = `account-${account.id}`;
            
            // Check if this account is already selected
            const isSelected = state.advertiserAccounts.some(selectedAccount => 
                selectedAccount.id === account.id && selectedAccount.platform === account.platform
            );
            
            if (isSelected) {
                checkbox.checked = true;
                accountItem.classList.add('selected');
            }
            
            // Create platform icon
            const platformIcon = document.createElement('div');
            platformIcon.className = `account-platform-icon platform-${account.platform}`;
            
            // Set icon based on platform
            if (account.platform === 'meta') {
                platformIcon.innerHTML = '<i class="fab fa-facebook-f"></i>';
            } else if (account.platform === 'tiktok') {
                platformIcon.innerHTML = '<i class="fab fa-tiktok"></i>';
            }
            
            // Create account details container
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'account-details';
            
            // Account name and ID
            const nameElement = document.createElement('div');
            nameElement.className = 'account-name';
            nameElement.textContent = account.name;
            
            const idElement = document.createElement('div');
            idElement.className = 'account-id';
            idElement.textContent = `ID: ${account.id}`;
            
            // Assemble elements
            detailsContainer.appendChild(nameElement);
            detailsContainer.appendChild(idElement);
            
            accountItem.appendChild(checkbox);
            accountItem.appendChild(platformIcon);
            accountItem.appendChild(detailsContainer);
            
            // Add click handler for the entire item
            accountItem.addEventListener('click', (e) => {
                // Don't toggle if clicking directly on the checkbox (it handles its own state)
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);
                }
            });
            
            // Handle checkbox change
            checkbox.addEventListener('change', () => {
                // Update selected class
                if (checkbox.checked) {
                    accountItem.classList.add('selected');
                } else {
                    accountItem.classList.remove('selected');
                }
                
                // Update state
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