/**
 * Campaign Selector Component
 * Manages the campaign and ad set selection UI and functionality
 */

import { metaService, tiktokService } from '../services/platformService.js';

/**
 * Initialize the Campaign Selector component
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @param {Function} validateStep - Function to validate the step
 * @returns {Object} - CampaignSelector methods
 */
export function initCampaignSelector(elements, state, validateStep) {
    /**
     * Prepare the campaign selector for display
     */
    function prepare() {
        // Filter accounts by platform
        const metaAccounts = state.advertiserAccounts.filter(account => account.platform === 'meta');
        const tiktokAccounts = state.advertiserAccounts.filter(account => account.platform === 'tiktok');
        
        // Show/hide Meta campaign section based on selected Meta accounts
        if (metaAccounts.length > 0) {
            elements.metaCampaignSection.style.display = 'block';
            
            // Create header to show we're fetching for all accounts
            elements.metaCampaignSection.innerHTML = '<div class="campaign-section-header">Loading campaigns from multiple Meta accounts...</div>';
            
            // Fetch campaigns for all Meta accounts
            metaAccounts.forEach(account => {
                console.log(`Fetching campaigns for Meta account: ${account.name} (${account.id})`);
                fetchMetaCampaigns(account.id, account.name);
            });
        } else {
            elements.metaCampaignSection.style.display = 'none';
            elements.metaAdsetSection.style.display = 'none';
        }
        
        // Show/hide TikTok campaign section based on selected TikTok accounts
        if (tiktokAccounts.length > 0) {
            elements.tiktokCampaignSection.style.display = 'block';
            
            // Create header to show we're fetching for all accounts
            elements.tiktokCampaignSection.innerHTML = '<div class="campaign-section-header">Loading campaigns from multiple TikTok accounts...</div>';
            
            // Fetch campaigns for all TikTok accounts
            tiktokAccounts.forEach(account => {
                console.log(`Fetching campaigns for TikTok account: ${account.name} (${account.id})`);
                fetchTikTokCampaigns(account.id, account.name);
            });
        } else {
            elements.tiktokCampaignSection.style.display = 'none';
            elements.tiktokAdsetSection.style.display = 'none';
        }
    }
    
    /**
     * Set up event listeners for campaign selection
     */
    function setupEventListeners() {
        // Meta campaign selection
        elements.metaCampaignSelect.addEventListener('change', function() {
            const accountId = document.querySelector('select[name="meta_account_id"]')?.value;
            const campaignId = this.value;
            
            // Store selection in state
            if (campaignId && !state.campaignSelections.meta.campaigns.includes(campaignId)) {
                state.campaignSelections.meta.campaigns.push(campaignId);
            }
            
            // Fetch adsets if both account and campaign are selected
            if (accountId && campaignId) {
                fetchMetaAdsets(campaignId, accountId);
            } else {
                // Reset adset select if campaign is deselected
                elements.metaAdsetSelect.innerHTML = '<option value="">Select Ad Set</option>';
                elements.metaAdsetSelect.disabled = true;
                state.campaignSelections.meta.adsets[campaignId] = '';
            }
            
            // Validate step
            validateStep();
        });
        
        // TikTok campaign selection
        elements.tiktokCampaignSelect.addEventListener('change', function() {
            const accountId = document.querySelector('select[name="tiktok_account_id"]')?.value;
            const campaignId = this.value;
            
            // Store selection in state
            if (campaignId && !state.campaignSelections.tiktok.campaigns.includes(campaignId)) {
                state.campaignSelections.tiktok.campaigns.push(campaignId);
            }
            
            // Fetch adsets if both account and campaign are selected
            if (accountId && campaignId) {
                fetchTikTokAdsets(accountId, campaignId);
            } else {
                // Reset adset select if campaign is deselected
                elements.tiktokAdsetSelect.innerHTML = '<option value="">Select Ad Set</option>';
                elements.tiktokAdsetSelect.disabled = true;
                state.campaignSelections.tiktok.adsets[campaignId] = '';
            }
            
            // Validate step
            validateStep();
        });
        
        // Meta adset selection
        elements.metaAdsetSelect.addEventListener('change', function() {
            if (this.value) {
                const campaignId = elements.metaCampaignSelect.value;
                state.campaignSelections.meta.adsets[campaignId] = this.value;
            }
            validateStep();
        });
        
        // TikTok adset selection
        elements.tiktokAdsetSelect.addEventListener('change', function() {
            if (this.value) {
                const campaignId = elements.tiktokCampaignSelect.value;
                state.campaignSelections.tiktok.adsets[campaignId] = this.value;
            }
            validateStep();
        });
    }
    
    /**
     * Fetch Meta campaigns for selected account
     * @param {string} accountId - The selected account ID
     * @param {string} accountName - The selected account name
     */
    async function fetchMetaCampaigns(accountId, accountName) {
        // Create campaign container for this account if it doesn't exist
        let accountContainer = document.getElementById(`meta-account-${accountId}`);
        
        if (!accountContainer) {
            accountContainer = document.createElement('div');
            accountContainer.id = `meta-account-${accountId}`;
            accountContainer.className = 'account-campaign-container';
            
            // Clear the loading message if this is the first account
            if (!elements.metaCampaignSection.querySelector('.account-campaign-container')) {
                elements.metaCampaignSection.innerHTML = '';
            }
            
            // Add account header
            const accountHeader = document.createElement('h4');
            accountHeader.className = 'account-header';
            accountHeader.innerHTML = `<i class="fab fa-facebook-f"></i> ${accountName} <span class="account-id-badge">${accountId}</span>`;
            accountContainer.appendChild(accountHeader);
            
            // Add loading indicator
            const loadingElement = document.createElement('div');
            loadingElement.className = 'loading-campaigns';
            loadingElement.textContent = 'Loading campaigns...';
            accountContainer.appendChild(loadingElement);
            
            // Add to main campaign section
            elements.metaCampaignSection.appendChild(accountContainer);
        }
        
        try {
            const response = await metaService.fetchCampaigns(accountId);
            
            // Remove loading indicator
            const loadingElement = accountContainer.querySelector('.loading-campaigns');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            if (response && response.campaigns && Array.isArray(response.campaigns)) {
                const campaigns = response.campaigns;
                
                if (campaigns.length === 0) {
                    const noCampaignsMessage = document.createElement('div');
                    noCampaignsMessage.className = 'no-campaigns-message';
                    noCampaignsMessage.textContent = 'No campaigns available for this account';
                    accountContainer.appendChild(noCampaignsMessage);
                    return;
                }
                
                // Create campaign container
                const campaignContainer = document.createElement('div');
                campaignContainer.className = 'campaign-checkbox-container';
                
                // Add campaign checkboxes
                campaigns.forEach(campaign => {
                    // Create campaign item with proper structure
                    const campaignItem = document.createElement('div');
                    campaignItem.className = 'campaign-item';
                    campaignItem.style.cursor = 'pointer'; // Add pointer cursor to indicate clickable
                    
                    // Create checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'campaign-checkbox';
                    checkbox.name = 'meta_campaign_ids[]';
                    checkbox.value = campaign.id;
                    checkbox.id = `meta-campaign-${campaign.id}`;
                    checkbox.dataset.accountId = accountId;
                    
                    // Check if this campaign is already selected in state
                    if (state.campaignSelections.meta.campaigns.includes(campaign.id)) {
                        checkbox.checked = true;
                        campaignItem.classList.add('selected');
                    }
                    
                    // Create details container for name
                    const campaignDetails = document.createElement('div');
                    campaignDetails.className = 'campaign-details';
                    
                    // Create campaign info container for the label
                    const campaignInfo = document.createElement('div');
                    campaignInfo.className = 'campaign-info';
                    
                    // Create label
                    const label = document.createElement('label');
                    label.htmlFor = `meta-campaign-${campaign.id}`;
                    label.textContent = campaign.name;
                    label.className = 'campaign-name';
                    
                    // Create campaign status badge
                    const statusBadge = document.createElement('span');
                    statusBadge.className = `campaign-status status-${campaign.status?.toLowerCase() || 'unknown'}`;
                    
                    // Display user-friendly status text
                    let statusText = campaign.status || 'Unknown';
                    if (statusText === 'CAMPAIGN_STATUS_ENABLE') {
                        statusText = 'ACTIVE';
                    } else if (statusText === 'CAMPAIGN_STATUS_DISABLE') {
                        statusText = 'PAUSED';
                    }
                    
                    statusBadge.textContent = statusText;
                    
                    // Proper nesting of elements for layout
                    campaignInfo.appendChild(label);
                    campaignDetails.appendChild(checkbox);
                    campaignDetails.appendChild(campaignInfo);
                    campaignItem.appendChild(campaignDetails);
                    campaignItem.appendChild(statusBadge);
                    
                    // Add click event to the entire campaign item
                    campaignItem.addEventListener('click', function(e) {
                        // Don't trigger when clicking directly on the checkbox (it already handles its own change event)
                        if (e.target !== checkbox) {
                            // Toggle the checkbox
                            checkbox.checked = !checkbox.checked;
                            
                            // Trigger the change event programmatically
                            const changeEvent = new Event('change');
                            checkbox.dispatchEvent(changeEvent);
                        }
                    });
                    
                    // Add event listener for checkbox
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            // Add selected class to the parent element
                            this.closest('.campaign-item').classList.add('selected');
                            
                            // Store campaign ID and account ID
                            const campaignId = campaign.id;
                            
                            // Normalize campaign ID (if it has any whitespace or inconsistencies)
                            const normalizedCampaignId = campaignId.trim();
                            
                            // Add campaign to selected campaigns if not already included
                            if (!state.campaignSelections.meta.campaigns.includes(normalizedCampaignId)) {
                                state.campaignSelections.meta.campaigns.push(normalizedCampaignId);
                                
                                // Store mapping between campaign and account
                                if (!state.campaignSelections.meta.campaignAccountMap) {
                                    state.campaignSelections.meta.campaignAccountMap = {};
                                }
                                state.campaignSelections.meta.campaignAccountMap[normalizedCampaignId] = accountId;
                                
                                // Log the selection to debug consistency
                                console.log(`Selected Meta campaign: "${normalizedCampaignId}" from account ${accountId}`);
                                
                                fetchMetaAdsets(normalizedCampaignId, accountId);
                            }
                        } else {
                            // Remove selected class from the parent element
                            this.closest('.campaign-item').classList.remove('selected');
                            
                            // Get normalized campaign ID
                            const normalizedCampaignId = campaign.id.trim();
                            
                            // Remove campaign from selected campaigns
                            state.campaignSelections.meta.campaigns = state.campaignSelections.meta.campaigns.filter(id => 
                                id !== normalizedCampaignId);
                            
                            // Remove account mapping
                            if (state.campaignSelections.meta.campaignAccountMap) {
                                delete state.campaignSelections.meta.campaignAccountMap[normalizedCampaignId];
                            }
                            
                            // Remove adsets for this campaign
                            delete state.campaignSelections.meta.adsets[normalizedCampaignId];
                            
                            // Remove adset section for this campaign if it exists
                            const adsetSection = document.getElementById(`meta-adsets-${normalizedCampaignId}`);
                            if (adsetSection) {
                                adsetSection.remove();
                            }
                        }
                        
                        validateStep();
                    });
                    
                    campaignContainer.appendChild(campaignItem);
                });
                
                accountContainer.appendChild(campaignContainer);
                
            } else {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Invalid response format from API';
                accountContainer.appendChild(errorMessage);
            }
        } catch (error) {
            console.error('Error loading Meta campaigns:', error);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger';
            errorMessage.textContent = 'Failed to load campaigns';
            accountContainer.appendChild(errorMessage);
        }
    }
    
    /**
     * Fetch TikTok campaigns for selected account
     * @param {string} accountId - The selected account ID
     * @param {string} accountName - The selected account name
     */
    async function fetchTikTokCampaigns(accountId, accountName) {
        // Create campaign container for this account if it doesn't exist
        let accountContainer = document.getElementById(`tiktok-account-${accountId}`);
        
        if (!accountContainer) {
            accountContainer = document.createElement('div');
            accountContainer.id = `tiktok-account-${accountId}`;
            accountContainer.className = 'account-campaign-container';
            
            // Clear the loading message if this is the first account
            if (!elements.tiktokCampaignSection.querySelector('.account-campaign-container')) {
                elements.tiktokCampaignSection.innerHTML = '';
            }
            
            // Add account header
            const accountHeader = document.createElement('h4');
            accountHeader.className = 'account-header';
            accountHeader.innerHTML = `<i class="fab fa-tiktok"></i> ${accountName} <span class="account-id-badge">${accountId}</span>`;
            accountContainer.appendChild(accountHeader);
            
            // Add loading indicator
            const loadingElement = document.createElement('div');
            loadingElement.className = 'loading-campaigns';
            loadingElement.textContent = 'Loading campaigns...';
            accountContainer.appendChild(loadingElement);
            
            // Add to main campaign section
            elements.tiktokCampaignSection.appendChild(accountContainer);
        }
        
        try {
            console.log(`Starting TikTok campaign fetch for account ID: ${accountId}`);
            
            const response = await tiktokService.fetchCampaigns(accountId);
            console.log('TikTok campaigns response in component:', response);
            
            // Remove loading indicator
            const loadingElement = accountContainer.querySelector('.loading-campaigns');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            // Provide fallback for empty campaigns
            let campaigns = [];
            
            if (response && response.campaigns && Array.isArray(response.campaigns)) {
                campaigns = response.campaigns;
                console.log(`Processing ${campaigns.length} TikTok campaigns for account ${accountName}`);
            } else if (response && Array.isArray(response)) {
                campaigns = response;
                console.log(`Processing ${campaigns.length} TikTok campaigns (direct array format) for account ${accountName}`);
            } else {
                console.warn('Unexpected response format for TikTok campaigns:', response);
                
                // Fallback to mock data for development environments only
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    campaigns = [
                        { id: `tt_camp_${accountId}_123`, name: 'TikTok Reach Campaign (Mock)' },
                        { id: `tt_camp_${accountId}_456`, name: 'TikTok App Promotion (Mock)' }
                    ];
                    console.log(`Using mock TikTok campaign data for development for account ${accountName}`);
                }
            }
            
            if (campaigns.length === 0) {
                // Show a more informative message when no campaigns are found
                const noCampaignsMessage = document.createElement('div');
                noCampaignsMessage.className = 'alert alert-info';
                noCampaignsMessage.innerHTML = `
                    <h5>No TikTok Campaigns Found</h5>
                    <p>There are no campaigns available for account "${accountName}". Please ensure that:</p>
                    <ul>
                        <li>You have at least one campaign created in your TikTok Ads Manager</li>
                        <li>The campaign is active or has been active in the past</li>
                        <li>Your account has proper permissions to access these campaigns</li>
                    </ul>
                    <p>If you need to create a campaign first, please visit <a href="https://ads.tiktok.com/" target="_blank">TikTok Ads Manager</a>.</p>
                `;
                accountContainer.appendChild(noCampaignsMessage);
                console.log(`No TikTok campaigns found for account: ${accountId}`);
                return;
            }
            
            // Create campaign container
            const campaignContainer = document.createElement('div');
            campaignContainer.className = 'campaign-checkbox-container';
            
            // Add campaign checkboxes
            campaigns.forEach(campaign => {
                // Map TikTok API fields to standardized format
                const campaignId = campaign.campaign_id || campaign.id;
                const campaignName = campaign.campaign_name || campaign.name;
                
                console.log(`Adding TikTok campaign option: ${campaignId} - ${campaignName}`);
                
                const campaignItem = document.createElement('div');
                campaignItem.className = 'campaign-item';
                campaignItem.style.cursor = 'pointer'; // Add pointer cursor to indicate clickable
                
                // Create checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'campaign-checkbox';
                checkbox.name = 'tiktok_campaign_ids[]';
                checkbox.value = campaignId;
                checkbox.id = `tiktok-campaign-${campaignId}`;
                checkbox.dataset.accountId = accountId;
                
                // Check if this campaign is already selected in state
                if (state.campaignSelections.tiktok.campaigns.includes(campaignId)) {
                    checkbox.checked = true;
                    campaignItem.classList.add('selected');
                }
                
                // Create details container for name
                const campaignDetails = document.createElement('div');
                campaignDetails.className = 'campaign-details';
                
                // Create campaign info container for the label
                const campaignInfo = document.createElement('div');
                campaignInfo.className = 'campaign-info';
                
                // Create label
                const label = document.createElement('label');
                label.htmlFor = `tiktok-campaign-${campaignId}`;
                label.textContent = campaignName;
                label.className = 'campaign-name';
                
                // Create campaign status badge
                const statusBadge = document.createElement('span');
                statusBadge.className = `campaign-status status-${campaign.status?.toLowerCase() || 'unknown'}`;
                
                // Display user-friendly status text based on TikTok documentation
                let statusText = campaign.status || 'Unknown';
                let statusClass = '';
                
                // Map TikTok campaign status codes to descriptions from documentation
                switch(statusText) {
                    case 'CAMPAIGN_STATUS_ENABLE':
                        statusText = 'ACTIVE';
                        break;
                    case 'CAMPAIGN_STATUS_DISABLE': 
                        statusText = 'PAUSED';
                        break;
                    case 'BUDGET_EXCEED':
                        statusText = 'BUDGET EXCEEDED';
                        break;
                    case 'CTC_STATUS_NOT_START': 
                        statusText = 'SCHEDULED';
                        break;
                    case 'CAMPAIGN_STATUS_DELETE':
                        statusText = 'DELETED';
                        break;
                    case 'Suspended':
                        statusText = 'Suspended';
                        break;
                    default:
                        if (typeof statusText === 'string') {
                            // Make the status text more readable if it's in UPPER_SNAKE_CASE
                            statusText = statusText.replace(/_/g, ' ');
                            
                            // Only transform if it's all uppercase
                            if (statusText === statusText.toUpperCase()) {
                                // Convert to Title Case
                                statusText = statusText.split(' ').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
                            }
                        }
                }
                
                statusBadge.textContent = statusText;
                
                // Proper nesting of elements for layout
                campaignInfo.appendChild(label);
                campaignDetails.appendChild(checkbox);
                campaignDetails.appendChild(campaignInfo);
                campaignItem.appendChild(campaignDetails);
                campaignItem.appendChild(statusBadge);
                
                // Add click event to the entire campaign item
                campaignItem.addEventListener('click', function(e) {
                    // Don't trigger when clicking directly on the checkbox (it already handles its own change event)
                    if (e.target !== checkbox) {
                        // Toggle the checkbox
                        checkbox.checked = !checkbox.checked;
                        
                        // Trigger the change event programmatically
                        const changeEvent = new Event('change');
                        checkbox.dispatchEvent(changeEvent);
                    }
                });
                
                // Add event listener for checkbox
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        // Add selected class to the parent element
                        this.closest('.campaign-item').classList.add('selected');
                        
                        // Store campaign ID and its associated account ID
                        // Don't redeclare campaignId - it's already defined in the outer scope
                        
                        // Add campaign to selected campaigns if not already included
                        if (!state.campaignSelections.tiktok.campaigns.includes(campaignId)) {
                            state.campaignSelections.tiktok.campaigns.push(campaignId);
                        }
                        
                        // Store the account mapping
                        if (!state.campaignSelections.tiktok.campaignAccountMap) {
                            state.campaignSelections.tiktok.campaignAccountMap = {};
                        }
                        state.campaignSelections.tiktok.campaignAccountMap[campaignId] = accountId;
                        
                        // Load and display adsets for this campaign
                        fetchTikTokAdsets(accountId, campaignId);
                    } else {
                        // Remove selected class from the parent element
                        this.closest('.campaign-item').classList.remove('selected');
                        
                        // Remove campaign from selected campaigns
                        state.campaignSelections.tiktok.campaigns = state.campaignSelections.tiktok.campaigns.filter(id => 
                            id !== campaignId);
                        
                        // Remove account mapping
                        if (state.campaignSelections.tiktok.campaignAccountMap) {
                            delete state.campaignSelections.tiktok.campaignAccountMap[campaignId];
                        }
                        
                        // Remove adsets for this campaign
                        delete state.campaignSelections.tiktok.adsets[campaignId];
                        
                        // Remove adset section for this campaign if it exists
                        const adsetSection = document.getElementById(`tiktok-adsets-${campaignId}`);
                        if (adsetSection) {
                            adsetSection.remove();
                        }
                    }
                    
                    validateStep();
                });
                
                campaignContainer.appendChild(campaignItem);
            });
            
            accountContainer.appendChild(campaignContainer);
            
        } catch (error) {
            console.error('Error loading TikTok campaigns in component:', error);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger';
            errorMessage.textContent = 'Failed to load campaigns';
            accountContainer.appendChild(errorMessage);
        }
    }
    
    /**
     * Fetch Meta adsets for the selected campaign
     * @param {string} campaignId - Meta campaign ID
     * @param {string} accountId - Meta account ID associated with the campaign
     */
    async function fetchMetaAdsets(campaignId, accountId) {
        try {
            // Create or update the adset section for this campaign
            if (!elements.metaAdsetSection.querySelector(`#meta-adsets-${campaignId}`)) {
                // Create a new section for this campaign's adsets
                const campaignAdsetSection = document.createElement('div');
                campaignAdsetSection.id = `meta-adsets-${campaignId}`;
                campaignAdsetSection.className = 'campaign-adsets';
                
                // Get campaign name
                const campaignName = document.querySelector(`#meta-campaign-${campaignId}`).nextElementSibling.textContent;
                
                // Add campaign header
                const header = document.createElement('h5');
                header.className = 'adset-campaign-header';
                header.textContent = `Adsets for ${campaignName}`;
                campaignAdsetSection.appendChild(header);
                
                // Add loading indicator
                campaignAdsetSection.innerHTML += '<div class="loading-adsets">Loading adsets...</div>';
                
                // Check if the adset section is visible, if not, make it visible
                if (elements.metaAdsetSection.style.display === 'none') {
                    elements.metaAdsetSection.style.display = 'block';
                }
                
                // Add to main adset section
                elements.metaAdsetSection.appendChild(campaignAdsetSection);
            } else {
                // Section already exists, just update loading state
                const campaignAdsetSection = elements.metaAdsetSection.querySelector(`#meta-adsets-${campaignId}`);
                campaignAdsetSection.querySelector('.loading-adsets')?.remove();
                campaignAdsetSection.innerHTML += '<div class="loading-adsets">Loading adsets...</div>';
            }
            
            // Fetch adsets from API
            const adsets = await metaService.fetchAdsets(accountId, campaignId);
            
            // Update the specific campaign's adset section
            const campaignAdsetSection = elements.metaAdsetSection.querySelector(`#meta-adsets-${campaignId}`);
            campaignAdsetSection.querySelector('.loading-adsets')?.remove();
            
            if (adsets && adsets.adsets && adsets.adsets.length > 0) {
                const adsetsList = adsets.adsets;
                
                // Create adset checkboxes
                const adsetContainer = document.createElement('div');
                adsetContainer.className = 'adset-checkbox-container';
                
                adsetsList.forEach(adset => {
                    const adsetItem = document.createElement('div');
                    adsetItem.className = 'adset-item';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = 'meta_adset_ids[]';
                    checkbox.value = adset.id;
                    checkbox.id = `meta-adset-${adset.id}`;
                    checkbox.className = 'adset-checkbox';
                    checkbox.dataset.campaignId = campaignId;
                    checkbox.dataset.accountId = accountId;
                    
                    // Check if this adset is already selected in state
                    if (state.campaignSelections.meta.adsets[campaignId] && 
                        (state.campaignSelections.meta.adsets[campaignId] === adset.id || 
                         (Array.isArray(state.campaignSelections.meta.adsets[campaignId]) && 
                          state.campaignSelections.meta.adsets[campaignId].includes(adset.id)))) {
                        checkbox.checked = true;
                        adsetItem.classList.add('selected');
                    }
                    
                    const label = document.createElement('label');
                    label.htmlFor = `meta-adset-${adset.id}`;
                    label.textContent = adset.name;
                    
                    const statusBadge = document.createElement('span');
                    statusBadge.className = `adset-status status-${adset.status?.toLowerCase() || 'unknown'}`;
                    statusBadge.textContent = adset.status || 'Unknown';
                    
                    adsetItem.appendChild(checkbox);
                    adsetItem.appendChild(label);
                    adsetItem.appendChild(statusBadge);
                    
                    // Add event listener for adset selection
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            // Add selected class to the parent element
                            this.closest('.adset-item').classList.add('selected');
                            
                            // Store adset selection for this campaign
                            state.campaignSelections.meta.adsets[campaignId] = 
                                state.campaignSelections.meta.adsets[campaignId] || [];
                            
                            if (!state.campaignSelections.meta.adsets[campaignId].includes(adset.id)) {
                                state.campaignSelections.meta.adsets[campaignId].push(adset.id);
                            }
                        } else {
                            // Remove selected class from the parent element
                            this.closest('.adset-item').classList.remove('selected');
                            
                            // Remove adset selection
                            if (state.campaignSelections.meta.adsets[campaignId]) {
                                const index = state.campaignSelections.meta.adsets[campaignId].indexOf(adset.id);
                                if (index !== -1) {
                                    state.campaignSelections.meta.adsets[campaignId].splice(index, 1);
                                }
                            }
                        }
                        
                        validateStep();
                    });
                    
                    adsetContainer.appendChild(adsetItem);
                });
                
                campaignAdsetSection.appendChild(adsetContainer);
            } else {
                campaignAdsetSection.innerHTML += '<div class="no-adsets">No adsets available for this campaign</div>';
            }
        } catch (error) {
            console.error('Error fetching Meta adsets:', error);
            // Update error state in the adset section
            const campaignAdsetSection = elements.metaAdsetSection.querySelector(`#meta-adsets-${campaignId}`);
            if (campaignAdsetSection) {
                campaignAdsetSection.querySelector('.loading-adsets')?.remove();
                campaignAdsetSection.innerHTML += '<div class="adset-error">Failed to load adsets</div>';
            }
        }
    }
    
    /**
     * Fetch TikTok adsets for the selected campaign
     * @param {string} accountId - TikTok account ID
     * @param {string} campaignId - TikTok campaign ID
     */
    async function fetchTikTokAdsets(accountId, campaignId) {
        try {
            // Create or update the adset section for this campaign
            if (!elements.tiktokAdsetSection.querySelector(`#tiktok-adsets-${campaignId}`)) {
                // Create a new section for this campaign's adsets
                const campaignAdsetSection = document.createElement('div');
                campaignAdsetSection.id = `tiktok-adsets-${campaignId}`;
                campaignAdsetSection.className = 'campaign-adsets';
                
                // Get campaign name
                const campaignName = document.querySelector(`#tiktok-campaign-${campaignId}`).nextElementSibling.textContent;
                
                // Add campaign header
                const header = document.createElement('h5');
                header.className = 'adset-campaign-header';
                header.textContent = `Adgroups for ${campaignName}`;
                campaignAdsetSection.appendChild(header);
                
                // Add loading indicator
                campaignAdsetSection.innerHTML += '<div class="loading-adsets">Loading adgroups...</div>';
                
                // Add to main adset section
                if (elements.tiktokAdsetSection.innerHTML === '') {
                    elements.tiktokAdsetSection.appendChild(campaignAdsetSection);
                } else {
                    elements.tiktokAdsetSection.appendChild(campaignAdsetSection);
                }
            } else {
                // Section already exists, just update loading state
                const campaignAdsetSection = elements.tiktokAdsetSection.querySelector(`#tiktok-adsets-${campaignId}`);
                campaignAdsetSection.querySelector('.loading-adsets')?.remove();
                campaignAdsetSection.innerHTML += '<div class="loading-adsets">Loading adgroups...</div>';
            }
            
            // Fetch adsets from API
            const adsets = await tiktokService.fetchAdsets(accountId, campaignId);
            
            // Update the specific campaign's adset section
            const campaignAdsetSection = elements.tiktokAdsetSection.querySelector(`#tiktok-adsets-${campaignId}`);
            campaignAdsetSection.querySelector('.loading-adsets')?.remove();
            
            // Process adsets based on response format (could be adsets or adgroups)
            let adsetsArray = [];
            if (adsets && adsets.adsets && adsets.adsets.length > 0) {
                adsetsArray = adsets.adsets;
            } else if (adsets && adsets.adgroups && adsets.adgroups.length > 0) {
                // Map adgroups to adsets format
                adsetsArray = adsets.adgroups.map(adgroup => ({
                    id: adgroup.adgroup_id || adgroup.id,
                    name: adgroup.adgroup_name || adgroup.name
                }));
            }
            
            if (adsetsArray.length > 0) {
                // Create adset checkboxes
                const adsetContainer = document.createElement('div');
                adsetContainer.className = 'adset-checkbox-container';
                
                adsetsArray.forEach(adset => {
                    // Standardize adset ID and name
                    const adsetId = adset.adgroup_id || adset.id;
                    const adsetName = adset.adgroup_name || adset.name;
                    
                    const adsetItem = document.createElement('div');
                    adsetItem.className = 'adset-item';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = 'tiktok_adset_ids[]';
                    checkbox.value = adsetId;
                    checkbox.id = `tiktok-adset-${adsetId}`;
                    checkbox.className = 'adset-checkbox';
                    
                    // Check if this adset is already selected in state
                    if (state.campaignSelections.tiktok.adsets[campaignId] && 
                        (state.campaignSelections.tiktok.adsets[campaignId] === adsetId || 
                         (Array.isArray(state.campaignSelections.tiktok.adsets[campaignId]) && 
                          state.campaignSelections.tiktok.adsets[campaignId].includes(adsetId)))) {
                        checkbox.checked = true;
                        adsetItem.classList.add('selected');
                    }
                    
                    const label = document.createElement('label');
                    label.htmlFor = `tiktok-adset-${adsetId}`;
                    label.textContent = adsetName;
                    
                    const statusBadge = document.createElement('span');
                    statusBadge.className = `adset-status status-${adset.status?.toLowerCase() || 'unknown'}`;
                    statusBadge.textContent = adset.status || 'Unknown';
                    
                    adsetItem.appendChild(checkbox);
                    adsetItem.appendChild(label);
                    adsetItem.appendChild(statusBadge);
                    
                    // Add event listener for adset selection
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            // Add selected class to the parent element
                            this.closest('.adset-item').classList.add('selected');
                            
                            // Store adset selection for this campaign
                            state.campaignSelections.tiktok.adsets[campaignId] = 
                                state.campaignSelections.tiktok.adsets[campaignId] || [];
                            
                            if (!state.campaignSelections.tiktok.adsets[campaignId].includes(adsetId)) {
                                state.campaignSelections.tiktok.adsets[campaignId].push(adsetId);
                            }
                        } else {
                            // Remove selected class from the parent element
                            this.closest('.adset-item').classList.remove('selected');
                            
                            // Remove adset selection
                            if (state.campaignSelections.tiktok.adsets[campaignId]) {
                                const index = state.campaignSelections.tiktok.adsets[campaignId].indexOf(adsetId);
                                if (index !== -1) {
                                    state.campaignSelections.tiktok.adsets[campaignId].splice(index, 1);
                                }
                            }
                        }
                        
                        validateStep();
                    });
                    
                    adsetContainer.appendChild(adsetItem);
                });
                
                campaignAdsetSection.appendChild(adsetContainer);
            } else {
                campaignAdsetSection.innerHTML += '<div class="no-adsets">No adgroups available for this campaign</div>';
            }
        } catch (error) {
            console.error('Error fetching TikTok adgroups:', error);
            // Update error state in the adset section
            const campaignAdsetSection = elements.tiktokAdsetSection.querySelector(`#tiktok-adsets-${campaignId}`);
            if (campaignAdsetSection) {
                campaignAdsetSection.querySelector('.loading-adsets')?.remove();
                campaignAdsetSection.innerHTML += '<div class="adset-error">Failed to load adgroups</div>';
            }
        }
    }
    
    /**
     * Render TikTok adsets for a selected campaign
     * @param {string} campaignId - The selected campaign ID
     * @param {string} accountId - The account ID
     */
    function renderTikTokAdsets(campaignId, accountId) {
        console.log(`Rendering TikTok adsets for campaign ${campaignId}`);
        const adsetSection = elements.tiktokAdsetSection;
        const container = document.createElement('div');
        container.className = 'adsets-list';
        
        const adsets = state.tiktokCampaignAdsets[campaignId] || [];
        
        if (adsets.length === 0) {
            container.innerHTML = '<div class="no-adsets">No adsets found for this campaign</div>';
            adsetSection.innerHTML = '';
            adsetSection.appendChild(container);
            return;
        }
        
        // Sort adsets by name
        adsets.sort((a, b) => a.name.localeCompare(b.name));
        
        adsets.forEach(adset => {
            const adsetItem = document.createElement('div');
            adsetItem.className = 'adset-item';
            adsetItem.dataset.adsetId = adset.id;
            adsetItem.dataset.platform = 'tiktok';
            adsetItem.dataset.campaignId = campaignId;
            adsetItem.dataset.accountId = accountId;
            
            // Create adset content with header
            const adsetContent = `
                <div class="adset-header">
                    <h5 class="adset-name">${adset.name}</h5>
                    <div class="adset-status ${getStatusClass(adset.status)}">${adset.status}</div>
                </div>
                <div class="adset-details">
                    <div class="targeting-info">
                        <i class="fas fa-users"></i> ${adset.targeting || 'General targeting'}
                    </div>
                    <div class="budget-info">
                        <i class="fas fa-dollar-sign"></i> ${formatBudget(adset.budget, adset.currency)}
                    </div>
                    <div class="goal-info">
                        <i class="fas fa-bullseye"></i> ${adset.objective || 'Default objective'}
                    </div>
                </div>
                <div class="ad-creation-container">
                    <div class="asset-drop-zone" data-adset-id="${adset.id}" data-platform="tiktok" data-account-id="${accountId}">
                        <div class="drop-placeholder">Drag assets here to create ads</div>
                    </div>
                </div>
            `;
            
            adsetItem.innerHTML = adsetContent;
            container.appendChild(adsetItem);
            
            // Make the drop zone span the entire adset area for easier targeting
            const dropZone = adsetItem.querySelector('.asset-drop-zone');
            dropZone.style.minHeight = '100px';
            
            // Make the entire adset-item clickable to activate drop zone
            adsetItem.addEventListener('click', (e) => {
                // Only handle if not clicking on buttons or links
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                    // Visually highlight the drop zone
                    dropZone.classList.add('drag-over');
                    setTimeout(() => {
                        dropZone.classList.remove('drag-over');
                    }, 500);
                }
            });
        });
        
        adsetSection.innerHTML = '';
        adsetSection.appendChild(container);
    }
    
    return {
        prepare,
        setupEventListeners
    };
} 