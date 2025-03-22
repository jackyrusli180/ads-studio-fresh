/**
 * Adset Display Module
 * Manages fetching and displaying adsets for Meta and TikTok platforms
 */

import { metaService, tiktokService } from '../../services/platformService.js';
import { createAdsetDropZone } from './AdsetDropZones.js';

/**
 * Initialize the Adset Display module
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @returns {Object} - AdsetDisplay methods
 */
export function initAdsetDisplay(elements, state) {
    /**
     * Format currency value for display
     * @param {number|string} value - The value to format
     * @param {string} currencyCode - The currency code
     * @returns {string} - Formatted currency value
     */
    function formatCurrency(value, currencyCode = 'USD') {
        // Map of currency codes to symbols
        const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'CHF': 'CHF',
            'CNY': '¥',
            'HKD': 'HK$',
            'NZD': 'NZ$',
            'SEK': 'kr',
            'SGD': 'S$',
            'KRW': '₩',
            'TWD': 'NT$',
            'INR': '₹',
            'RUB': '₽',
            'BRL': 'R$',
            'MXN': 'Mex$'
        };
        
        // If value is missing but we have a currency code, show a placeholder with currency symbol
        if (!value || value === '0') {
            const symbol = currencySymbols[currencyCode] || currencyCode;
            return `${symbol}0.00`;
        }
        
        // Convert string to number if needed
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        
        // Handle invalid values
        if (isNaN(numValue)) {
            const symbol = currencySymbols[currencyCode] || currencyCode;
            return `${symbol}0.00`;
        }
        
        // Get the currency symbol
        const symbol = currencySymbols[currencyCode] || currencyCode;
        
        // Format based on currency
        const options = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };
        
        // For JPY and currencies with no decimal places
        if (['JPY', 'KRW', 'TWD'].includes(currencyCode)) {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        }
        
        return `${symbol}${numValue.toLocaleString(undefined, options)}`;
    }
    
    /**
     * Get appropriate budget display based on available fields
     * @param {Object} adset - The adset object containing budget information
     * @returns {string} - Formatted budget display
     */
    function getBudgetDisplay(adset) {
        const currency = adset.currency || 'USD';
        
        // Check for daily budget
        if (adset.daily_budget && adset.daily_budget !== '0') {
            return `${formatCurrency(adset.daily_budget, currency)}/day`;
        }
        
        // Check for lifetime budget
        if (adset.lifetime_budget && adset.lifetime_budget !== '0') {
            return `${formatCurrency(adset.lifetime_budget, currency)} lifetime`;
        }
        
        // Fall back to budget remaining if available
        if (adset.budget_remaining && adset.budget_remaining !== '0') {
            return `${formatCurrency(adset.budget_remaining, currency)} remaining`;
        }
        
        // For TikTok adsets, check specific budget fields
        if (adset.budget && adset.budget !== '0') {
            let budgetDisplay = formatCurrency(adset.budget, currency);
            if (adset.budget_mode === 'BUDGET_MODE_DAY') {
                return `${budgetDisplay}/day`;
            } else if (adset.budget_mode === 'BUDGET_MODE_TOTAL') {
                return `${budgetDisplay} lifetime`;
            } else {
                return budgetDisplay;
            }
        }
        
        // If no budget info is available
        return formatCurrency(0, currency);
    }
    
    /**
     * Display Meta adsets for selected campaigns
     * @param {HTMLElement} container - Container element to append adsets to
     * @param {Array} campaigns - Array of campaign IDs
     * @param {Object} campaignAccountMap - Mapping of campaign IDs to account IDs
     * @param {Function} getCampaignDetails - Function to get campaign details by ID
     * @returns {Boolean} - Whether any content was loaded
     */
    async function displayMetaAdsets(container, campaigns, campaignAccountMap, getCampaignDetails) {
        if (!campaigns || campaigns.length === 0) return false;
        
        let hasLoadedContent = false;
        
        // Use campaign-specific account mappings
        const metaAccounts = state.advertiserAccounts.filter(acc => acc.platform === 'meta');
        
        for (const campaignId of campaigns) {
            try {
                // Get campaign details to display name
                const campaignDetails = await getCampaignDetails('meta', campaignId);
                
                // Get the correct account for this campaign
                const accountId = campaignAccountMap[campaignId];
                const metaAccount = metaAccounts.find(acc => acc.id === accountId);
                
                if (!metaAccount) {
                    console.error(`Could not find Meta account for campaign ${campaignId}`);
                    continue;
                }
                
                // Fetch adsets for this campaign using the correct account
                const response = await metaService.fetchAdsets(metaAccount.id, campaignId);
                
                if (response && response.adsets && Array.isArray(response.adsets)) {
                    const adsets = response.adsets;
                    
                    // Create campaign section
                    const campaignSection = document.createElement('div');
                    campaignSection.className = 'campaign-section';
                    campaignSection.innerHTML = `<h4 class="campaign-name">Meta Campaign: ${campaignDetails.name}</h4>`;
                    campaignSection.dataset.platform = 'meta';
                    campaignSection.dataset.campaignId = campaignId;
                    campaignSection.dataset.accountId = accountId;
                    
                    if (adsets.length === 0) {
                        campaignSection.innerHTML += '<p class="no-adsets">No adsets found for this campaign</p>';
                    } else {
                        // Create adsets list
                        const adsetsList = document.createElement('div');
                        adsetsList.className = 'adsets-list';
                        
                        for (const adset of adsets) {
                            // Format Meta status to be user-friendly
                            let displayStatus = adset.status || 'Unknown';
                            let statusClass = displayStatus.toLowerCase();
                            
                            // Map different status values to consistent classes for filtering
                            switch(statusClass) {
                                case 'active':
                                case 'enabled':
                                case 'delivered':
                                case 'delivery_ok':
                                    statusClass = 'active';
                                    displayStatus = 'Active';
                                    break;
                                case 'paused':
                                case 'disable':
                                case 'disabled':
                                    statusClass = 'paused';
                                    displayStatus = 'Paused';
                                    break;
                                case 'deleted':
                                case 'removed':
                                    statusClass = 'deleted';
                                    displayStatus = 'Deleted';
                                    break;
                                case 'pending':
                                case 'scheduled':
                                case 'pending_review':
                                    statusClass = 'pending';
                                    displayStatus = 'Pending';
                                    break;
                                case 'in_review':
                                case 'audit':
                                case 'review':
                                case 'reaudit':
                                    statusClass = 'review';
                                    displayStatus = 'In Review';
                                    break;
                                default:
                                    // Keep as is for other statuses
                                    break;
                            }
                            
                            // Create adset item element
                            const adsetItem = document.createElement('div');
                            adsetItem.className = 'adset-item';
                            adsetItem.dataset.adsetId = adset.id;
                            adsetItem.dataset.platform = 'meta';
                            adsetItem.dataset.accountId = accountId;
                            adsetItem.dataset.campaignId = campaignId;
                            
                            // Create adset header
                            const adsetHeader = document.createElement('div');
                            adsetHeader.className = 'adset-header';
                            
                            // Adset title with name
                            const adsetTitle = document.createElement('div');
                            adsetTitle.className = 'adset-title';
                            adsetTitle.innerHTML = `
                                <span class="adset-name">${adset.name}</span>
                            `;
                            adsetHeader.appendChild(adsetTitle);
                            
                            // Add the status
                            const statusEl = document.createElement('span');
                            statusEl.className = `adset-status ${statusClass}`;
                            statusEl.textContent = displayStatus;
                            statusEl.style.display = 'inline-flex'; // Force display
                            adsetHeader.appendChild(statusEl);
                            
                            // Add the header to the adset item
                            adsetItem.appendChild(adsetHeader);
                            
                            // Add the adset details
                            const details = document.createElement('div');
                            details.className = 'adset-details';
                            details.innerHTML = `
                                <div class="targeting-info">
                                    <i class="fas fa-users"></i> Targeting: ${adset.targeting_summary || 'Standard'}
                                </div>
                                <div class="budget-info">
                                    <i class="fas fa-dollar-sign"></i> Budget: ${getBudgetDisplay(adset)}
                                </div>
                                <div class="goal-info">
                                    <i class="fas fa-bullseye"></i> Goal: 
                                    ${adset.optimization_goal || 'N/A'}
                                </div>
                            `;
                            adsetItem.appendChild(details);
                            
                            // Use the imported createAdsetDropZone function
                            createAdsetDropZone(adsetItem, 'meta');
                            
                            // Add container for existing ads
                            const existingAdsContainer = document.createElement('div');
                            existingAdsContainer.className = 'existing-ads-container';
                            existingAdsContainer.id = `meta-ads-${adset.id}`;
                            existingAdsContainer.innerHTML = '<div class="ads-toggle">Show existing ads <i class="fas fa-chevron-down"></i></div>';
                            
                            adsetItem.appendChild(existingAdsContainer);
                            adsetsList.appendChild(adsetItem);
                        }
                        
                        campaignSection.appendChild(adsetsList);
                    }
                    
                    container.appendChild(campaignSection);
                    hasLoadedContent = true;
                }
            } catch (error) {
                console.error(`Error fetching Meta adsets for campaign ${campaignId}:`, error);
                
                // Add error message to container
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = `Error loading Meta adsets for campaign ${campaignId}: ${error.message}`;
                container.appendChild(errorElement);
            }
        }
        
        return hasLoadedContent;
    }
    
    /**
     * Display TikTok adsets for selected campaigns
     * @param {HTMLElement} container - Container element to append adsets to
     * @param {Array} campaigns - Array of campaign IDs
     * @param {Object} campaignAccountMap - Mapping of campaign IDs to account IDs
     * @param {Function} getCampaignDetails - Function to get campaign details by ID
     * @returns {Boolean} - Whether any content was loaded
     */
    async function displayTikTokAdsets(container, campaigns, campaignAccountMap, getCampaignDetails) {
        if (!campaigns || campaigns.length === 0) return false;
        
        let hasLoadedContent = false;
        
        // Use campaign-specific account mappings
        const tiktokAccounts = state.advertiserAccounts.filter(acc => acc.platform === 'tiktok');
        
        // Add observer to log when adset items are added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.classList && node.classList.contains('adset-item')) {
                            console.log('Adset item added to DOM:', node);
                            // Log the status element
                            const statusEl = node.querySelector('.adset-status');
                            console.log('Status element:', statusEl);
                            if (statusEl) {
                                console.log('Status text:', statusEl.textContent);
                                console.log('Status class:', statusEl.className);
                                // Make sure the status is visible
                                statusEl.style.display = 'inline-flex';
                            } else {
                                console.warn('Status element not found in adset item');
                            }
                        }
                    });
                }
            });
        });
        observer.observe(container, { childList: true, subtree: true });
        
        for (const campaignId of campaigns) {
            try {
                // Get campaign details to display name
                const campaignDetails = await getCampaignDetails('tiktok', campaignId);
                
                // Get the correct account for this campaign
                const accountId = campaignAccountMap[campaignId];
                const tiktokAccount = tiktokAccounts.find(acc => acc.id === accountId);
                
                if (!tiktokAccount) {
                    console.error(`Could not find TikTok account for campaign ${campaignId}`);
                    continue;
                }
                
                // Fetch adsets for this campaign using the correct account ID
                const response = await tiktokService.fetchAdsets(tiktokAccount.id, campaignId.toString());
                
                if (response && response.adsets && Array.isArray(response.adsets)) {
                    const adsets = response.adsets;
                    
                    // Create campaign section
                    const campaignSection = document.createElement('div');
                    campaignSection.className = 'campaign-section';
                    campaignSection.innerHTML = `<h4 class="campaign-name">TikTok Campaign: ${campaignDetails.name}</h4>`;
                    campaignSection.dataset.platform = 'tiktok';
                    campaignSection.dataset.campaignId = campaignId;
                    campaignSection.dataset.accountId = accountId;
                    
                    if (adsets.length === 0) {
                        campaignSection.innerHTML += '<p class="no-adsets">No adsets found for this campaign</p>';
                    } else {
                        // Create adsets list
                        const adsetsList = document.createElement('div');
                        adsetsList.className = 'adsets-list';
                        
                        for (const adset of adsets) {
                            // Format TikTok status to be user-friendly
                            let displayStatus = adset.status || 'Unknown';
                            let statusClass = 'unknown';
                            
                            // Log the original status value for debugging
                            console.log(`Processing TikTok adset status: "${displayStatus}" for adset: ${adset.name || adset.adgroup_name}`);
                            
                            // Extract just the status class name (lowercase, without prefix)
                            if (displayStatus.includes('_')) {
                                const statusParts = displayStatus.split('_');
                                
                                // If it's an ENABLE/DISABLE operation status, we need to handle it differently
                                if (displayStatus === 'ENABLE') {
                                    statusClass = 'active';
                                    displayStatus = 'Active';
                                } else if (displayStatus === 'DISABLE') {
                                    statusClass = 'paused';
                                    displayStatus = 'Paused';
                                } else if (statusParts[0] === 'ADGROUP' && statusParts[1] === 'STATUS') {
                                    // Usually status codes have format like ADGROUP_STATUS_DELIVERY_OK
                                    // Convert to lowercase for CSS class
                                    statusClass = statusParts.slice(2).join('_').toLowerCase();
                                } else {
                                    // For other status formats
                                    statusClass = displayStatus.toLowerCase();
                                }
                            } else {
                                statusClass = displayStatus.toLowerCase();
                            }
                            
                            // Map TikTok status codes to normalized status classes for filtering consistency
                            // For statuses like ADGROUP_STATUS_DELETE, ADGROUP_STATUS_DELIVERY_OK, etc.
                            if (displayStatus.includes('DELETE') || displayStatus === 'ADGROUP_STATUS_CAMPAIGN_DELETE') {
                                statusClass = 'deleted';
                            } else if (displayStatus.includes('DELIVERY_OK') || displayStatus === 'ENABLE') {
                                statusClass = 'active';
                            } else if (displayStatus.includes('DISABLE') || displayStatus === 'ADGROUP_STATUS_CAMPAIGN_DISABLE') {
                                statusClass = 'paused';
                            } else if (displayStatus.includes('AUDIT') || displayStatus.includes('REAUDIT')) {
                                statusClass = 'review';
                            } else if (displayStatus.includes('PRE_ONLINE') || displayStatus.includes('NOT_START') || 
                                     displayStatus.includes('CREATE') || displayStatus.includes('PENDING')) {
                                statusClass = 'pending';
                            }
                            
                            // Create adset item element with consistent class names for filtering
                            const adsetItem = document.createElement('div');
                            adsetItem.className = 'adset-item';
                            adsetItem.dataset.adsetId = adset.id || adset.adgroup_id;
                            adsetItem.dataset.platform = 'tiktok';
                            adsetItem.dataset.accountId = accountId;
                            adsetItem.dataset.campaignId = campaignId;
                            
                            // Use consistent status classes for filtering
                            adsetItem.innerHTML = `
                                <div class="adset-header">
                                    <div class="adset-title">
                                        <span class="adset-name">${adset.name || adset.adgroup_name}</span>
                                        <span class="adset-id">(ID: ${adset.id || adset.adgroup_id})</span>
                                    </div>
                                    <span class="adset-status ${statusClass} status-${statusClass}">${displayStatus}</span>
                                </div>
                                <div class="adset-details">
                                    <div class="targeting-info">
                                        <i class="fas fa-users"></i> Targeting: ${adset.audience || 'Standard'}
                                    </div>
                                    <div class="budget-info">
                                        <i class="fas fa-dollar-sign"></i> Budget: ${getBudgetDisplay(adset)}
                                    </div>
                                    <div class="goal-info">
                                        <i class="fas fa-bullseye"></i> Goal: 
                                        ${adset.objective || adset.optimization_goal || 'N/A'}
                                    </div>
                                </div>
                            `;
                            
                            // Use the imported createAdsetDropZone function
                            createAdsetDropZone(adsetItem, 'tiktok');
                            
                            // Add container for existing ads and add the adset item to the adsets list
                            const existingAdsContainer = document.createElement('div');
                            existingAdsContainer.className = 'existing-ads-container';
                            existingAdsContainer.id = `tiktok-ads-${adset.id || adset.adgroup_id}`;
                            existingAdsContainer.innerHTML = '<div class="ads-toggle">Show existing ads <i class="fas fa-chevron-down"></i></div>';
                            
                            adsetItem.appendChild(existingAdsContainer);
                            adsetsList.appendChild(adsetItem);
                            
                            // Add event listener to toggle existing ads
                            const adsToggle = existingAdsContainer.querySelector('.ads-toggle');
                            adsToggle.addEventListener('click', async function() {
                                const adsList = existingAdsContainer.querySelector('.ads-list');
                                
                                if (adsList) {
                                    // Toggle display of existing ads list
                                    adsList.style.display = adsList.style.display === 'none' ? 'block' : 'none';
                                    adsToggle.innerHTML = adsList.style.display === 'none' 
                                        ? 'Show existing ads <i class="fas fa-chevron-down"></i>' 
                                        : 'Hide existing ads <i class="fas fa-chevron-up"></i>';
                                } else {
                                    // Fetch and display existing ads
                                    adsToggle.innerHTML = 'Loading ads... <i class="fas fa-spinner fa-spin"></i>';
                                    
                                    try {
                                        const ads = await tiktokService.fetchAds(accountId, adset.id);
                                        
                                        if (ads && ads.ads && ads.ads.length > 0) {
                                            // Create list for ads
                                            const newAdsList = document.createElement('div');
                                            newAdsList.className = 'ads-list';
                                            
                                            ads.ads.forEach(ad => {
                                                const adItem = document.createElement('div');
                                                adItem.className = 'ad-item';
                                                adItem.dataset.adId = ad.id;
                                                
                                                // Determine preview content based on creative type
                                                let previewContent = '';
                                                if (ad.creative && ad.creative.image_url) {
                                                    previewContent = `<img src="${ad.creative.image_url}" alt="${ad.name}" class="ad-preview-img">`;
                                                } else {
                                                    previewContent = '<div class="ad-no-preview">No preview available</div>';
                                                }
                                                
                                                // Map status to readable format
                                                let adStatus = ad.status || 'Unknown';
                                                let statusClass = 'unknown';
                                                
                                                if (ad.status === 'AD_STATUS_DELIVERY_OK') {
                                                    adStatus = 'Active';
                                                    statusClass = 'active';
                                                } else if (ad.status === 'AD_STATUS_DISABLE') {
                                                    adStatus = 'Paused';
                                                    statusClass = 'paused';
                                                } else if (ad.status.includes('REJECT')) {
                                                    adStatus = 'Rejected';
                                                    statusClass = 'rejected';
                                                } else if (ad.status.includes('AUDIT')) {
                                                    adStatus = 'In Review';
                                                    statusClass = 'review';
                                                }
                                                
                                                adItem.innerHTML = `
                                                    <div class="ad-header">
                                                        <h6 class="ad-name">${ad.name}</h6>
                                                        <span class="ad-status ${statusClass}">${adStatus}</span>
                                                    </div>
                                                    <div class="ad-preview">
                                                        ${previewContent}
                                                    </div>
                                                    <div class="ad-details">
                                                        ${ad.creative?.title ? `<div class="ad-title">${ad.creative.title}</div>` : ''}
                                                        ${ad.creative?.description ? `<div class="ad-body">${ad.creative.description}</div>` : ''}
                                                    </div>
                                                `;
                                                
                                                newAdsList.appendChild(adItem);
                                            });
                                            
                                            existingAdsContainer.appendChild(newAdsList);
                                            adsToggle.innerHTML = 'Hide existing ads <i class="fas fa-chevron-up"></i>';
                                        } else {
                                            existingAdsContainer.innerHTML += '<div class="no-ads">No existing ads found</div>';
                                            adsToggle.innerHTML = 'No existing ads';
                                        }
                                    } catch (error) {
                                        console.error(`Error fetching TikTok ads for adset ${adset.id}:`, error);
                                        existingAdsContainer.innerHTML += '<div class="error">Failed to load ads</div>';
                                        adsToggle.innerHTML = 'Failed to load ads <i class="fas fa-exclamation-circle"></i>';
                                    }
                                }
                            });
                        }
                        
                        campaignSection.appendChild(adsetsList);
                    }
                    
                    container.appendChild(campaignSection);
                    hasLoadedContent = true;
                }
            } catch (error) {
                console.error(`Error fetching TikTok adsets for campaign ${campaignId}:`, error);
                
                // Add error message to container
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = `Error loading TikTok adsets for campaign ${campaignId}: ${error.message}`;
                container.appendChild(errorElement);
            }
        }
        
        return hasLoadedContent;
    }

    return {
        displayMetaAdsets,
        displayTikTokAdsets
    };
}

/**
 * Initialize drop zones in all adsets
 * This should be called after adsets are loaded
 */
function initAdsetDropZones() {
    console.log('Initializing adset drop zones');
    
    // Get all adset-content containers
    const adsetContents = document.querySelectorAll('.adset-content');
    
    adsetContents.forEach(adsetContent => {
        const adsetItem = adsetContent.closest('.adset-item');
        if (!adsetItem) {
            console.warn('Adset content found without parent adset item');
            return;
        }
        
        const adsetId = adsetItem.dataset.id;
        if (!adsetId) {
            console.warn('Adset item found without ID');
            return;
        }
        
        console.log(`Setting up drop zone for adset ${adsetId}`);
        
        // Create drop zone if it doesn't exist
        let dropZone = adsetContent.querySelector('.asset-drop-zone');
        
        if (!dropZone) {
            console.log(`Creating new drop zone for adset ${adsetId}`);
            dropZone = document.createElement('div');
            dropZone.className = 'asset-drop-zone';
            
            // Add placeholder text
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.textContent = 'Drag assets here to create ads';
            dropZone.appendChild(placeholder);
            
            // Insert the drop zone in the adset content
            if (adsetContent.children.length > 0) {
                adsetContent.insertBefore(dropZone, adsetContent.firstChild);
            } else {
                adsetContent.appendChild(dropZone);
            }
        }
        
        // Set adset ID on drop zone for reference
        dropZone.dataset.adsetId = adsetId;
        
        // Add event listeners for drag events
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        console.log(`Drop zone setup complete for adset ${adsetId}`);
    });
    
    // Also make the adset content areas themselves drop zones
    document.querySelectorAll('.adset-content').forEach(content => {
        if (!content.classList.contains('has-drop-listeners')) {
            content.addEventListener('dragover', handleDragOver);
            content.addEventListener('dragleave', handleDragLeave);
            content.addEventListener('drop', handleDrop);
            content.classList.add('has-drop-listeners');
            console.log('Added drop listeners to adset content area');
        }
    });
}

/**
 * Handle dragover event
 * @param {DragEvent} e - The drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Set drop effect
    e.dataTransfer.dropEffect = 'copy';
    
    // Add active class to indicate drop target
    this.classList.add('drag-over');
    
    // Don't log too much as this fires constantly during drag
}

/**
 * Handle dragleave event
 * @param {DragEvent} e - The drag event
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove active class
    this.classList.remove('drag-over');
}

/**
 * Trigger change event to update state
 */
function triggerChangeEvent() {
    // Create and dispatch a custom event
    const event = new CustomEvent('adset-changed');
    document.dispatchEvent(event);
    console.log('Triggered adset-changed event');
} 