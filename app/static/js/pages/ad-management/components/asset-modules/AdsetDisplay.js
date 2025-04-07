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
                            // Format TikTok status to be user-friendly
                            let displayStatus = adset.status || 'Unknown';
                            let statusClass = adset.status?.toLowerCase() || 'unknown';
                            
                            // Map TikTok status codes to descriptions from documentation
                            switch(displayStatus) {
                                case 'ADGROUP_STATUS_DELETE':
                                    displayStatus = 'Deleted';
                                    statusClass = 'deleted';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_DELETE':
                                    displayStatus = 'Campaign deleted';
                                    statusClass = 'deleted';
                                    break;
                                case 'ADGROUP_STATUS_ADVERTISER_AUDIT_DENY':
                                    displayStatus = 'Advertiser review failed';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_ADVERTISER_AUDIT':
                                    displayStatus = 'Advertiser review in progress';
                                    statusClass = 'review';
                                    break;
                                case 'ADVERTISER_CONTRACT_PENDING':
                                    displayStatus = 'Advertiser contract has not taken effect';
                                    statusClass = 'pending';
                                    break;
                                case 'ADVERTISER_ACCOUNT_PUNISH':
                                    displayStatus = 'Advertiser account is punished';
                                    statusClass = 'restricted';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_EXCEED':
                                    displayStatus = 'Campaign over budget';
                                    statusClass = 'budget-exceeded';
                                    break;
                                case 'ADGROUP_STATUS_BUDGET_EXCEED':
                                    displayStatus = 'Ad group over budget';
                                    statusClass = 'budget-exceeded';
                                    break;
                                case 'ADGROUP_STATUS_BALANCE_EXCEED':
                                    displayStatus = 'Insufficient account balance';
                                    statusClass = 'insufficient-funds';
                                    break;
                                case 'ADGROUP_STATUS_ADGROUP_PRE_ONLINE':
                                    displayStatus = 'Pre-online state';
                                    statusClass = 'pending';
                                    break;
                                case 'ADGROUP_STATUS_AUDIT_DENY':
                                    displayStatus = 'Ad group review failed';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_REAUDIT':
                                    displayStatus = 'Review of modifications in progress';
                                    statusClass = 'review';
                                    break;
                                case 'ADGROUP_STATUS_AUDIT':
                                    displayStatus = 'New review created';
                                    statusClass = 'review';
                                    break;
                                case 'ADGROUP_STATUS_CREATE':
                                    displayStatus = 'New ad group created';
                                    statusClass = 'pending';
                                    break;
                                case 'ADGROUP_STATUS_FROZEN':
                                    displayStatus = 'Ad group is frozen';
                                    statusClass = 'frozen';
                                    break;
                                case 'ADGROUP_STATUS_NOT_START':
                                    displayStatus = 'Scheduled delivery not started';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_LIVE_NOT_START':
                                    displayStatus = 'Live not started';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_DISABLE':
                                    displayStatus = 'Paused';
                                    statusClass = 'paused';
                                    break;
                                case 'ADGROUP_STATUS_DISABLE':
                                    displayStatus = 'Paused';
                                    statusClass = 'paused';
                                    break;
                                case 'ADGROUP_STATUS_DELIVERY_OK':
                                    displayStatus = 'Advertising in progress';
                                    statusClass = 'active';
                                    break;
                                case 'ADGROUP_STATUS_REVIEW_PARTIALLY_APPROVED':
                                    displayStatus = 'One or more ads have been rejected';
                                    statusClass = 'partial-approval';
                                    break;
                                case 'ADGROUP_STATUS_TIME_DONE':
                                    displayStatus = 'Completed';
                                    statusClass = 'completed';
                                    break;
                                // R&F ad group statuses
                                case 'ADGROUP_STATUS_RF_DEDUCTION_FAILED':
                                    displayStatus = 'Deduction failed for the R&F ad group';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_RF_NO_VALID_CREATIVE':
                                    displayStatus = 'No valid creatives in the R&F ad group';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_RF_CLOSED_OTHERS':
                                    displayStatus = 'The R&F ad group is closed';
                                    statusClass = 'closed';
                                    break;
                                case 'ADGROUP_STATUS_RF_SHORT_BALANCE':
                                    displayStatus = 'Not enough balance in the R&F ad group';
                                    statusClass = 'insufficient-funds';
                                    break;
                                case 'ADGROUP_STATUS_RF_BOOKING':
                                    displayStatus = 'Budget/inventory has been booked for this R&F ad group';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_RF_NO_DELIVERY_CREATIVE':
                                    displayStatus = 'No creatives in this R&F ad group';
                                    statusClass = 'incomplete';
                                    break;
                                case 'ADGROUP_STATUS_RF_SCHEDULE':
                                    displayStatus = 'A schedule has been created for the R&F ad group';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_RF_TERMINATE':
                                    displayStatus = 'The R&F ad group is terminated';
                                    statusClass = 'terminated';
                                    break;
                                case 'ADGROUP_STATUS_RF_AD_AUDIT_DENY':
                                    displayStatus = 'The R&F ad is rejected';
                                    statusClass = 'failed';
                                    break;
                                case 'ADVERTISER_ACCOUNT_INVALID':
                                    displayStatus = 'The advertiser account is invalid';
                                    statusClass = 'invalid';
                                    break;
                                case 'ADGROUP_STATUS_RF_ADGROUP_INVALID':
                                    displayStatus = 'The R&F ad group doesn\'t exist';
                                    statusClass = 'invalid';
                                    break;
                                case 'ADGROUP_STATUS_RF_WITHDRAW_ORDER':
                                    displayStatus = 'The R&F order is withdrawn';
                                    statusClass = 'withdrawn';
                                    break;
                                case 'ADGROUP_STATUS_RF_TIME_DONE':
                                    displayStatus = 'The R&F ad group is completed';
                                    statusClass = 'completed';
                                    break;
                                // Promote ad group statuses
                                case 'ADGROUP_STATUS_PROMOTE_AD_NOT_APPROVED':
                                    displayStatus = 'One or more creatives in the Promote ad group are not approved';
                                    statusClass = 'partial-approval';
                                    break;
                                case 'ADGROUP_STATUS_PROMOTE_WITHDRAW_ORDER':
                                    displayStatus = 'The Promote order is withdrawn';
                                    statusClass = 'withdrawn';
                                    break;
                                default:
                                    // Keep original if not matched
                                    break;
                            }

                            const adsetItem = document.createElement('div');
                            adsetItem.className = 'adset-item';
                            adsetItem.dataset.adsetId = adset.id;
                            adsetItem.dataset.platform = 'meta';
                            adsetItem.dataset.campaignId = campaignId;
                            adsetItem.dataset.accountId = accountId;
                            
                            adsetItem.innerHTML = `
                                <div class="adset-header">
                                    <h5 class="adset-name">${adset.name}</h5>
                                    <span class="adset-status ${statusClass}">${displayStatus}</span>
                                </div>
                                <div class="adset-details">
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
                                </div>
                            `;
                            
                            // Use the imported createAdsetDropZone function instead of manual creation
                            createAdsetDropZone(adsetItem, 'meta');
                            
                            // Add container for existing ads
                            const existingAdsContainer = document.createElement('div');
                            existingAdsContainer.className = 'existing-ads-container';
                            existingAdsContainer.id = `meta-ads-${adset.id}`;
                            existingAdsContainer.innerHTML = '<div class="ads-toggle">Show existing ads <i class="fas fa-chevron-down"></i></div>';
                            
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
                                        const ads = await metaService.fetchAds(accountId, adset.id);
                                        
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
                                                
                                                adItem.innerHTML = `
                                                    <div class="ad-header">
                                                        <h6 class="ad-name">${ad.name}</h6>
                                                        <span class="ad-status ${ad.status.toLowerCase()}">${ad.status}</span>
                                                    </div>
                                                    <div class="ad-preview">
                                                        ${previewContent}
                                                    </div>
                                                    <div class="ad-details">
                                                        ${ad.creative?.title ? `<div class="ad-title">${ad.creative.title}</div>` : ''}
                                                        ${ad.creative?.body ? `<div class="ad-body">${ad.creative.body}</div>` : ''}
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
                                        console.error(`Error fetching Meta ads for adset ${adset.id}:`, error);
                                        existingAdsContainer.innerHTML += '<div class="error">Failed to load ads</div>';
                                        adsToggle.innerHTML = 'Failed to load ads <i class="fas fa-exclamation-circle"></i>';
                                    }
                                }
                            });
                            
                            // Append elements to adset item
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
                            let statusClass = adset.status?.toLowerCase() || 'unknown';
                            
                            // Map TikTok status codes to descriptions from documentation
                            switch(displayStatus) {
                                case 'ADGROUP_STATUS_DELETE':
                                    displayStatus = 'Deleted';
                                    statusClass = 'deleted';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_DELETE':
                                    displayStatus = 'Campaign deleted';
                                    statusClass = 'deleted';
                                    break;
                                case 'ADGROUP_STATUS_ADVERTISER_AUDIT_DENY':
                                    displayStatus = 'Advertiser review failed';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_ADVERTISER_AUDIT':
                                    displayStatus = 'Advertiser review in progress';
                                    statusClass = 'review';
                                    break;
                                case 'ADVERTISER_CONTRACT_PENDING':
                                    displayStatus = 'Advertiser contract has not taken effect';
                                    statusClass = 'pending';
                                    break;
                                case 'ADVERTISER_ACCOUNT_PUNISH':
                                    displayStatus = 'Advertiser account is punished';
                                    statusClass = 'restricted';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_EXCEED':
                                    displayStatus = 'Campaign over budget';
                                    statusClass = 'budget-exceeded';
                                    break;
                                case 'ADGROUP_STATUS_BUDGET_EXCEED':
                                    displayStatus = 'Ad group over budget';
                                    statusClass = 'budget-exceeded';
                                    break;
                                case 'ADGROUP_STATUS_BALANCE_EXCEED':
                                    displayStatus = 'Insufficient account balance';
                                    statusClass = 'insufficient-funds';
                                    break;
                                case 'ADGROUP_STATUS_ADGROUP_PRE_ONLINE':
                                    displayStatus = 'Pre-online state';
                                    statusClass = 'pending';
                                    break;
                                case 'ADGROUP_STATUS_AUDIT_DENY':
                                    displayStatus = 'Ad group review failed';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_REAUDIT':
                                    displayStatus = 'Review of modifications in progress';
                                    statusClass = 'review';
                                    break;
                                case 'ADGROUP_STATUS_AUDIT':
                                    displayStatus = 'New review created';
                                    statusClass = 'review';
                                    break;
                                case 'ADGROUP_STATUS_CREATE':
                                    displayStatus = 'New ad group created';
                                    statusClass = 'pending';
                                    break;
                                case 'ADGROUP_STATUS_FROZEN':
                                    displayStatus = 'Ad group is frozen';
                                    statusClass = 'frozen';
                                    break;
                                case 'ADGROUP_STATUS_NOT_START':
                                    displayStatus = 'Scheduled delivery not started';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_LIVE_NOT_START':
                                    displayStatus = 'Live not started';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_CAMPAIGN_DISABLE':
                                    displayStatus = 'Paused';
                                    statusClass = 'paused';
                                    break;
                                case 'ADGROUP_STATUS_DISABLE':
                                    displayStatus = 'Paused';
                                    statusClass = 'paused';
                                    break;
                                case 'ADGROUP_STATUS_DELIVERY_OK':
                                    displayStatus = 'Advertising in progress';
                                    statusClass = 'active';
                                    break;
                                case 'ADGROUP_STATUS_REVIEW_PARTIALLY_APPROVED':
                                    displayStatus = 'One or more ads have been rejected';
                                    statusClass = 'partial-approval';
                                    break;
                                case 'ADGROUP_STATUS_TIME_DONE':
                                    displayStatus = 'Completed';
                                    statusClass = 'completed';
                                    break;
                                // R&F ad group statuses
                                case 'ADGROUP_STATUS_RF_DEDUCTION_FAILED':
                                    displayStatus = 'Deduction failed for the R&F ad group';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_RF_NO_VALID_CREATIVE':
                                    displayStatus = 'No valid creatives in the R&F ad group';
                                    statusClass = 'failed';
                                    break;
                                case 'ADGROUP_STATUS_RF_CLOSED_OTHERS':
                                    displayStatus = 'The R&F ad group is closed';
                                    statusClass = 'closed';
                                    break;
                                case 'ADGROUP_STATUS_RF_SHORT_BALANCE':
                                    displayStatus = 'Not enough balance in the R&F ad group';
                                    statusClass = 'insufficient-funds';
                                    break;
                                case 'ADGROUP_STATUS_RF_BOOKING':
                                    displayStatus = 'Budget/inventory has been booked for this R&F ad group';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_RF_NO_DELIVERY_CREATIVE':
                                    displayStatus = 'No creatives in this R&F ad group';
                                    statusClass = 'incomplete';
                                    break;
                                case 'ADGROUP_STATUS_RF_SCHEDULE':
                                    displayStatus = 'A schedule has been created for the R&F ad group';
                                    statusClass = 'scheduled';
                                    break;
                                case 'ADGROUP_STATUS_RF_TERMINATE':
                                    displayStatus = 'The R&F ad group is terminated';
                                    statusClass = 'terminated';
                                    break;
                                case 'ADGROUP_STATUS_RF_AD_AUDIT_DENY':
                                    displayStatus = 'The R&F ad is rejected';
                                    statusClass = 'failed';
                                    break;
                                case 'ADVERTISER_ACCOUNT_INVALID':
                                    displayStatus = 'The advertiser account is invalid';
                                    statusClass = 'invalid';
                                    break;
                                case 'ADGROUP_STATUS_RF_ADGROUP_INVALID':
                                    displayStatus = 'The R&F ad group doesn\'t exist';
                                    statusClass = 'invalid';
                                    break;
                                case 'ADGROUP_STATUS_RF_WITHDRAW_ORDER':
                                    displayStatus = 'The R&F order is withdrawn';
                                    statusClass = 'withdrawn';
                                    break;
                                case 'ADGROUP_STATUS_RF_TIME_DONE':
                                    displayStatus = 'The R&F ad group is completed';
                                    statusClass = 'completed';
                                    break;
                                // Promote ad group statuses
                                case 'ADGROUP_STATUS_PROMOTE_AD_NOT_APPROVED':
                                    displayStatus = 'One or more creatives in the Promote ad group are not approved';
                                    statusClass = 'partial-approval';
                                    break;
                                case 'ADGROUP_STATUS_PROMOTE_WITHDRAW_ORDER':
                                    displayStatus = 'The Promote order is withdrawn';
                                    statusClass = 'withdrawn';
                                    break;
                                default:
                                    // Keep original if not matched
                                    break;
                            }

                            const adsetItem = document.createElement('div');
                            adsetItem.className = 'adset-item';
                            adsetItem.dataset.adsetId = adset.id;
                            adsetItem.dataset.platform = 'tiktok';
                            adsetItem.dataset.campaignId = campaignId;
                            adsetItem.dataset.accountId = accountId;
                            
                            adsetItem.innerHTML = `
                                <div class="adset-header">
                                    <h5 class="adset-name">${adset.name}</h5>
                                    <span class="adset-status ${statusClass}">${displayStatus}</span>
                                </div>
                                <div class="adset-details">
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
                                </div>
                            `;
                            
                            // Use the imported createAdsetDropZone function instead of manual creation
                            createAdsetDropZone(adsetItem, 'tiktok');
                            
                            // Add container for existing ads
                            const existingAdsContainer = document.createElement('div');
                            existingAdsContainer.className = 'existing-ads-container';
                            existingAdsContainer.id = `tiktok-ads-${adset.id}`;
                            existingAdsContainer.innerHTML = '<div class="ads-toggle">Show existing ads <i class="fas fa-chevron-down"></i></div>';
                            
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
                            
                            // Append elements to adset item
                            adsetItem.appendChild(existingAdsContainer);
                            adsetsList.appendChild(adsetItem);
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