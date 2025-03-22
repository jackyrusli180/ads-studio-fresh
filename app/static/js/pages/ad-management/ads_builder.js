/**
 * Ads Builder JavaScript
 * 
 * Main module for the ads builder interface. This file orchestrates the components
 * and manages the overall application flow.
 */

// Import services and utilities
import { post } from './services/api.js';
import { showToast, debounce } from '../../utils/common.js';
import { validateStep, validateFormData } from './utils/validation.js';

// Import components
import { initStepNavigation } from './components/StepNavigation.js';
import { initPlatformSelector } from './components/PlatformSelector.js';
import { initCampaignSelector } from './components/CampaignSelector.js';
import { initAssetSelector } from './components/AssetSelector.js';
import { initSummaryView } from './components/SummaryView.js';
import { initAdsetDropZones } from './components/asset-modules/AdsetDropZones.js';
import { addSampleTikTokVideos } from './components/asset-modules/AssetManager.js';

// Add styles for ad IDs
function addAdIdStyles() {
    // Check if styles already exist
    if (document.getElementById('ad-id-styles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'ad-id-styles';
    styleEl.textContent = `
        .ad-id-text {
            font-weight: bold;
            display: inline-block;
            margin: 0 3px;
            color: #0d6efd;
        }
        
        .success-badge .ad-id-text {
            font-weight: bold;
            color: #15803d;
        }
    `;
    
    document.head.appendChild(styleEl);
}

// Global state
const state = {
    currentStep: 1,
    selectedPlatforms: [],
    advertiserAccounts: [],
    selectedAssets: [],
    searchTimeout: null,
    campaignSelections: {
        meta: {
            campaigns: [], // Array of selected campaign IDs
            adsets: {},    // Object mapping campaign IDs to selected adset IDs
            campaignAccountMap: {} // Object mapping campaign IDs to account IDs
        },
        tiktok: {
            campaigns: [], // Array of selected campaign IDs
            adsets: {},    // Object mapping campaign IDs to selected adset IDs
            campaignAccountMap: {} // Object mapping campaign IDs to account IDs
        }
    },
    allLibraryAssets: []
};

// DOM Elements (initialized in init function)
let elements = {};

/**
 * Global function to refresh the application state and validation
 * This is called when assets are added to drop zones
 */
window.refreshAppState = function() {
    console.log('Refreshing application state');
    
    // If we're on step 3, re-run validation to update the Next button state
    if (state.currentStep === 3) {
        console.log('Revalidating step 3 after asset change');
        
        // Run the validation without blocking on TikTok image requirements
        validateStep(3, state, elements);
        
        // Check if we're in fix errors mode and should hide successful adgroups and ads
        if (window.fixErrorsMode && window.failedAdgroups && window.failedAdgroups.size > 0) {
            console.log('In fix errors mode, filtering adgroups and ads');
            
            // Execute after a short delay to ensure new DOM elements are ready
            setTimeout(() => {
                const adsetItems = document.querySelectorAll('.adset-item');
                adsetItems.forEach(adsetItem => {
                    const adsetId = adsetItem.dataset.adsetId;
                    
                    if (window.failedAdgroups.has(adsetId)) {
                        adsetItem.style.display = 'block';
                        console.log(`Showing adgroup ${adsetId} with errors`);
                        
                        // Filter ads within this adgroup to show only problematic ones
                        if (window.failedAds && window.failedAds[adsetId]) {
                            console.log(`Filtering ads within adgroup ${adsetId}`);
                            
                            // Get all drop zones in this adset
                            const dropZones = adsetItem.querySelectorAll('.asset-drop-zone');
                            dropZones.forEach((dropZone, dzIndex) => {
                                // Get the parent container for styling/hiding
                                const adCreationContainer = dropZone.closest('.ad-creation-container');
                                
                                // Check if this specific ad had an error
                                const isFailedAd = window.failedAds[adsetId].has(dzIndex.toString());
                                
                                if (isFailedAd) {
                                    console.log(`Showing problematic ad at index ${dzIndex} in adgroup ${adsetId}`);
                                    // Show this ad's container and the drop zone
                                    if (adCreationContainer) {
                                        adCreationContainer.style.display = 'block';
                                    }
                                    dropZone.style.display = 'flex';
                                } else {
                                    console.log(`Hiding successful ad at index ${dzIndex} in adgroup ${adsetId}`);
                                    // Hide this ad's container and the drop zone
                                    if (adCreationContainer) {
                                        adCreationContainer.style.display = 'none';
                                    }
                                    dropZone.style.display = 'none';
                                }
                            });
                            
                            // Add a note about filtered ads if not already present
                            const adsetHeader = adsetItem.querySelector('.adset-header');
                            if (adsetHeader && !adsetHeader.querySelector('.filtered-ads-note')) {
                                const filteredNote = document.createElement('div');
                                filteredNote.className = 'filtered-ads-note';
                                filteredNote.innerHTML = '<i class="fas fa-filter"></i> Showing only ads with errors';
                                filteredNote.style.fontSize = '12px';
                                filteredNote.style.color = '#f59e0b';
                                filteredNote.style.marginLeft = '10px';
                                adsetHeader.appendChild(filteredNote);
                            }
                        }
                    } else {
                        adsetItem.style.display = 'none';
                        console.log(`Hiding adgroup ${adsetId} without errors`);
                    }
                });
                
                // Make sure the error message is still visible
                if (!document.getElementById('fix-errors-message')) {
                    const step3Container = document.querySelector('.form-step[data-step="3"]');
                    if (step3Container) {
                        const errorMessage = document.createElement('div');
                        errorMessage.id = 'fix-errors-message';
                        errorMessage.innerHTML = `
                            <div class="alert alert-warning" style="margin-bottom: 20px; border-left: 5px solid #f59e0b; padding: 15px; border-radius: 5px;">
                                <i class="fas fa-exclamation-triangle"></i> Please fix the errors in the adgroups below. We're only showing adgroups that had errors.
                                <button id="showAllAdgroups" class="btn btn-sm btn-outline-warning" style="margin-left: 10px;">Show All Adgroups</button>
                            </div>
                        `;
                        
                        step3Container.insertBefore(errorMessage, step3Container.firstChild);
                        
                        // Add event listener to the "Show All Adgroups" button
                        document.getElementById('showAllAdgroups').addEventListener('click', function() {
                            window.fixErrorsMode = false;
                            const adsetItems = document.querySelectorAll('.adset-item');
                            adsetItems.forEach(adsetItem => {
                                adsetItem.style.display = 'block';
                            });
                            this.parentElement.remove();
                        });
                    }
                }
            }, 300);
        }
    }
    
    // Dispatch an event that assets have been updated
    document.dispatchEvent(new CustomEvent('assets-updated'));
};

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Ads Builder');
    
    // Add styles
    addDragDropStyles();
    addAdIdStyles();
    
    // Set up drag and drop handling
    setupDragAndDropHandling();
    
    // Initialize the regular application components
    initializeElements();
    initializeComponents();
    validateStep(1, state, elements); // Initial validation
    
    // Setup event listeners for dynamic content
    document.addEventListener('adset-changed', function() {
        console.log('Adset changed event received, updating UI');
        
        // Reinitialize drop zones
        if (state.currentStep === 3) {
            initAdsetDropZones(state);
        }
    });
    
    // Add event listener for asset selection changes
    document.addEventListener('assets-updated', function() {
        console.log('Assets updated event received');
        
        // Reinitialize asset selector for newly added assets
        if (state.currentStep === 3) {
            initAssetSelector(elements, state, () => validateStep(3, state, elements));
        }
    });
    
    // Handle tab changes to ensure proper initialization
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Wait for tab content to be displayed
                setTimeout(function() {
                    // Reinitialize components on tab change if on step 3
                    if (state.currentStep === 3) {
                        initAdsetDropZones(state);
                        initAssetSelector(elements, state, () => validateStep(3, state, elements));
                    }
                }, 100);
            });
        });
    }
    
    console.log('Ad builder initialization complete');
    
    // Set default video URLs and dimensions for samples
    setTimeout(() => {
        setDefaultVideoUrls();
    }, 1000); // Wait for everything to be initialized
});

/**
 * Set up enhanced drag and drop handling
 */
function setupDragAndDropHandling() {
    // TikTok video URLs matching asset_service.py
    const tiktokVideoUrls = {
        'tiktok-video-0': "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
        'tiktok-video-1': "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
        'tiktok-video-2': "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
        'tiktok-video-3': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        'tiktok-video-4': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        'tiktok-video-5': "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
        'tiktok-video-6': "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
        'tiktok-video-7': "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
        'tiktok-video-8': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    };

    // Add global dragstart listener
    document.addEventListener('dragstart', (e) => {
        console.log('*** Dragstart event detected ***');
        
        // Add dragging class to body for global styling
        document.body.classList.add('dragging');
        
        // Clear the previous drop tracking data
        window.lastDropData = null;
        window.dropOccurred = false;
        window.isProcessingDrop = false;
        
        if (e.target.classList.contains('preview-item')) {
            // Add dragging class to the dragged element
            e.target.classList.add('dragging');
            
            // Get the asset ID
            const assetId = e.target.dataset.id;
            
            // Ensure TikTok videos use the correct public URLs
            let assetUrl = e.target.dataset.url || e.target.querySelector('img')?.src || '';
            
            // If this is a TikTok video asset, ensure it uses the correct public URL
            if (assetId && assetId.startsWith('tiktok-video-') && tiktokVideoUrls[assetId]) {
                assetUrl = tiktokVideoUrls[assetId];
                console.log(`Using public URL for ${assetId}: ${assetUrl}`);
            }
            
            // Create asset data object from the element
            const assetData = {
                id: assetId,
                type: e.target.dataset.type || 'image',
                url: assetUrl,
                name: e.target.dataset.name || `Asset ${assetId}`
            };
            
            // Set data in both formats for maximum compatibility
            try {
                const jsonData = JSON.stringify(assetData);
                e.dataTransfer.setData('application/json', jsonData);
                e.dataTransfer.setData('text/plain', jsonData);
                console.log('Set drag data:', assetData);
                
                // Set drag image for better visual feedback
                const img = e.target.querySelector('img');
                if (img && e.dataTransfer.setDragImage) {
                    e.dataTransfer.setDragImage(img, 50, 50);
                }
                
                // Show all drop zones
                showDropZones();
            } catch (err) {
                console.error('Error setting drag data:', err);
            }
        }
    });
    
    // Add global dragend listener
    document.addEventListener('dragend', (e) => {
        console.log('*** Dragend event detected ***');
        
        // Remove dragging classes
        document.body.classList.remove('dragging');
        document.querySelectorAll('.dragging').forEach(elem => {
            elem.classList.remove('dragging');
        });
        
        // Clean up after dragging - only if the drop didn't happen
        if (!window.dropOccurred) {
            resetDropZones();
        }
        
        // Reset the drop flag
        window.dropOccurred = false;
    });
    
    // Global dragover to enable drops
    document.addEventListener('dragover', (e) => {
        e.preventDefault(); // Required for drop to work
    });
    
    // Global drop listener - for preventing double drop processing
    document.addEventListener('drop', (e) => {
        console.log('*** Global drop event detected ***');
        console.log('Drop target:', e.target);
        
        // Check if we're already processing a drop
        if (window.isProcessingDrop) {
            console.log('Already processing a drop - preventing duplicate processing');
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // Find the drop target
        const dropTarget = e.target.closest('.asset-drop-zone');
        if (!dropTarget) {
            console.log('Not dropped on a valid drop zone');
            window.dropOccurred = true; // Still mark as occurred so we don't reset zones
            return;
        }
        
        // Extract the dropped data
        let assetData = null;
        try {
            if (e.dataTransfer.types.includes('application/json')) {
                const jsonData = e.dataTransfer.getData('application/json');
                if (jsonData) {
                    assetData = JSON.parse(jsonData);
                }
            }
        } catch (err) {
            console.error('Error extracting asset data:', err);
            return;
        }
        
        if (!assetData) {
            console.log('No valid asset data found in drop');
            return;
        }
        
        // Create a signature for this drop using asset ID, drop target, and time
        const now = Date.now();
        const dropKey = `${assetData.id}-${dropTarget.dataset.adsetId}`;
        
        // Check if we have a previous drop with the same key
        if (window.lastDropData && 
            window.lastDropData.key === dropKey && 
            (now - window.lastDropData.time < 2000)) { // 2 seconds cooldown
                
            console.log('PREVENTING DUPLICATE DROP: same asset + target within 2 seconds');
            console.log('Time since last drop:', now - window.lastDropData.time, 'ms');
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // Mark that we're processing this drop
        window.isProcessingDrop = true;
        window.lastDropData = {
            key: dropKey,
            time: now
        };
        
        // Set flag that drop occurred
        window.dropOccurred = true;
        
        // Release the processing lock after a short delay
        setTimeout(() => {
            window.isProcessingDrop = false;
            console.log('Drop processing lock released');
        }, 100);
    });
    
    /**
     * Make all drop zones visible
     */
    function showDropZones() {
        console.log('Showing all available drop zones');
        const dropZones = document.querySelectorAll('.asset-drop-zone');
        dropZones.forEach(zone => {
            zone.style.display = 'flex';
        });
    }
    
    /**
     * Hide drop zones that don't have assets
     */
    function resetDropZones() {
        // Only reset drop zones that don't have assets
        const dropZones = document.querySelectorAll('.asset-drop-zone:not(.has-asset)');
        dropZones.forEach(zone => {
            zone.classList.remove('drag-over');
            
            // Reset the placeholder text
            const placeholder = zone.querySelector('.drop-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <i class="fas fa-plus-circle"></i>
                    <div>Drag asset here</div>
                `;
            }
        });
    }
}

/**
 * Initialize and cache DOM elements
 */
function initializeElements() {
    elements = {
        // Form and steps
        form: document.getElementById('adsBuilderForm'),
        stepIndicators: document.querySelectorAll('.step-item'),
        formSteps: document.querySelectorAll('.form-step'),
        nextButtons: document.querySelectorAll('.next-step'),
        prevButtons: document.querySelectorAll('.prev-step'),
        
        // Step 1 elements
        platformItems: document.querySelectorAll('.platform-item'),
        platformCheckboxes: document.querySelectorAll('input[name="platforms"]'),
        advertiserAccountContainer: document.getElementById('advertiserAccountContainer'),
        step1NextBtn: document.getElementById('step1NextBtn'),
        
        // Step 2 elements
        metaCampaignSection: document.getElementById('metaCampaignSection'),
        metaCampaignSelect: document.getElementById('metaCampaignId'),
        metaAdsetSection: document.getElementById('metaAdsetSection'),
        metaAdsetSelect: document.getElementById('metaAdsetId'),
        tiktokCampaignSection: document.getElementById('tiktokCampaignSection'),
        tiktokCampaignSelect: document.getElementById('tiktokCampaignId'),
        tiktokAdsetSection: document.getElementById('tiktokAdgroupSection'),
        tiktokAdsetSelect: document.getElementById('tiktokAdgroupId'),
        step2NextBtn: document.getElementById('step2NextBtn'),
        
        // Step 3 elements
        selectFromLibraryBtn: document.getElementById('selectFromLibraryBtn'),
        uploadPreview: document.getElementById('uploadPreview'),
        step3NextBtn: document.getElementById('step3NextBtn'),
        
        // Step 4 elements
        campaignSummary: document.getElementById('campaignSummary'),
        submitBtn: document.getElementById('submitBtn'),
        
        // Asset library modal
        assetSelectorModal: document.getElementById('assetSelectorModal'),
        libraryAssets: document.getElementById('libraryAssets'),
        libraryTypeFilter: document.getElementById('libraryTypeFilter'),
        librarySearch: document.getElementById('librarySearch'),
        closeModalBtns: document.querySelectorAll('.close-modal')
    };
}

/**
 * Initialize all components and set up their interactions
 */
function initializeComponents() {
    // Function to validate the current step
    const validateCurrentStep = () => validateStep(state.currentStep, state, elements);
    
    // Step Navigation
    const stepNavigation = initStepNavigation(elements, state, validateCurrentStep, prepareStep);
    stepNavigation.setupEventListeners();
    
    // Platform Selector (Step 1)
    const platformSelector = initPlatformSelector(elements, state, () => validateStep(1, state, elements));
    platformSelector.setupEventListeners();
    
    // Campaign Selector (Step 2)
    const campaignSelector = initCampaignSelector(elements, state, () => validateStep(2, state, elements));
    campaignSelector.setupEventListeners();
    
    // Asset Selector (Step 3)
    const assetSelector = initAssetSelector(elements, state, () => validateStep(3, state, elements));
    assetSelector.setupEventListeners();
    
    // Initialize drop zones when on step 3
    if (state.currentStep === 3) {
        console.log('Currently on step 3, initializing drop zones');
        initAdsetDropZones(state);
    }
    
    // Summary View (Step 4)
    const summaryView = initSummaryView(elements, state);
    
    // Form submit handling
    console.log('Setting up form submit handler on form:', elements.form.id);
    elements.form.addEventListener('submit', (e) => {
        console.log('Form submit event captured');
        return handleFormSubmit(e, summaryView);
    });
}

/**
 * Prepare a step when navigating to it
 * @param {number} step - The step number to prepare
 */
function prepareStep(step) {
    console.log(`Preparing step ${step}`);
    
    switch (step) {
        case 1:
            // Nothing specific needed for step 1
            break;
            
        case 2:
            // Initialize and prepare the campaign selector
            const campaignSelector = initCampaignSelector(elements, state, () => validateStep(2, state, elements));
            campaignSelector.prepare();
            break;
            
        case 3:
            // Save any existing headline and ad name values before reinitializing
            const existingValues = {};
            document.querySelectorAll('.adset-item').forEach(adsetItem => {
                const adsetId = adsetItem.dataset.adsetId || adsetItem.id;
                if (adsetId) {
                    const adNameInput = adsetItem.querySelector('.ad-name-input input');
                    const headlineInput = adsetItem.querySelector('.headline-input input');
                    
                    existingValues[adsetId] = {
                        adName: adNameInput ? adNameInput.value : '',
                        headline: headlineInput ? headlineInput.value : ''
                    };
                    
                    console.log(`Saved values for adset ${adsetId}:`, existingValues[adsetId]);
                }
            });
            
            // Initialize Asset Selector for step 3
            initAssetSelector(elements, state, () => validateStep(3, state, elements)).prepare();
            
            // Set up drop zones for adsets
            console.log('Setting up adset drop zones for step 3');
            setTimeout(() => {
                initAdsetDropZones(state);
                
                // Restore saved values
                document.querySelectorAll('.adset-item').forEach(adsetItem => {
                    const adsetId = adsetItem.dataset.adsetId || adsetItem.id;
                    if (adsetId && existingValues[adsetId]) {
                        const adNameInput = adsetItem.querySelector('.ad-name-input input');
                        const headlineInput = adsetItem.querySelector('.headline-input input');
                        
                        if (adNameInput && existingValues[adsetId].adName) {
                            adNameInput.value = existingValues[adsetId].adName;
                        }
                        
                        if (headlineInput && existingValues[adsetId].headline) {
                            headlineInput.value = existingValues[adsetId].headline;
                        }
                        
                        console.log(`Restored values for adset ${adsetId}`);
                    }
                });
                
                // Add sample TikTok videos to the asset library
                addSampleTikTokVideos();
                
                // Add a button to refresh sample videos
                let refreshButton = document.querySelector('#refreshSampleVideosBtn');
                if (!refreshButton) {
                    const assetHeader = document.querySelector('.asset-library-header');
                    if (assetHeader) {
                        refreshButton = document.createElement('button');
                        refreshButton.id = 'refreshSampleVideosBtn';
                        refreshButton.className = 'btn btn-sm btn-outline-primary ml-2';
                        refreshButton.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh Sample Videos';
                        refreshButton.style.marginLeft = '10px';
                        refreshButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            addSampleTikTokVideos();
                            showToast('Sample TikTok videos refreshed!', 'success');
                        });
                        assetHeader.appendChild(refreshButton);
                    }
                }
                
            }, 500);
            break;
            
        case 4:
            // Prepare summary view
            initSummaryView(elements, state).prepare();
            break;
    }
}

/**
 * Handle form submission
 * @param {Event} e - The submit event
 * @param {Object} summaryView - The summary view component
 */
async function handleFormSubmit(e, summaryView) {
    e.preventDefault();
    
    if (!validateFormData(state, elements)) {
        return false;
    }
    
    // Show loading state - using the correct button ID (launchAdsBtn)
    const submitBtn = document.querySelector('#launchAdsBtn');
    
    // Log button info for debugging
    console.log('Form submit handler initiated');
    console.log('Submit button found:', submitBtn ? 'Yes' : 'No');
    
    // Check if button is found
    if (!submitBtn) {
        console.error('Could not find submit button with ID #launchAdsBtn');
        // Continue without button state updates
    } else {
        console.log('Using submit button with ID:', submitBtn.id);
    }
    
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
    }
    
    try {
        // Log that form submission is starting for debugging
        console.log('Starting form submission to create ads...');
        
        // Collect form data
        const formData = new FormData(elements.form);
        
        // Add selected platform data
        state.selectedPlatforms.forEach(platform => {
            formData.append('platforms[]', platform);
        });
        
        // Add selected account IDs
        state.advertiserAccounts.forEach(account => {
            formData.append('advertiser_account_ids[]', account.id);
            
            // Add platform-specific account ID
            if (account.platform) {
                formData.append(`${account.platform}_account_id`, account.id);
            }
        });
        
        // Add campaign and adset IDs for each platform
        for (const platform of state.selectedPlatforms) {
            // Add campaign IDs - use a Set to avoid duplicates
            const campaignIds = new Set(state.campaignSelections[platform].campaigns);
            for (const campaignId of campaignIds) {
                formData.append(`${platform}_campaign_ids[]`, campaignId);
                
                // Add adset/adgroup IDs for this campaign if they exist
                const adsetIds = state.campaignSelections[platform].adsets[campaignId];
                if (adsetIds) {
                    if (Array.isArray(adsetIds)) {
                        adsetIds.forEach(adsetId => {
                            formData.append(`${platform}_adset_ids[]`, adsetId);
                            // For TikTok, also use adgroup_ids for compatibility
                            if (platform === 'tiktok') {
                                formData.append('tiktok_adgroup_ids[]', adsetId);
                            }
                        });
                    } else {
                        formData.append(`${platform}_adset_ids[]`, adsetIds);
                        if (platform === 'tiktok') {
                            formData.append('tiktok_adgroup_ids[]', adsetIds);
                        }
                    }
                }
            }
            
            // Log the campaign IDs being submitted for this platform
            console.log(`${platform.toUpperCase()} campaign IDs:`, Array.from(campaignIds));
        }
        
        // Log submission data for debugging (excluding large files)
        console.log('Form data collected, fields:', Array.from(formData.keys()));
        
        // Log actual field values for debugging
        Array.from(formData.keys()).forEach(key => {
            if (key.includes('ad_name') || key.includes('headline') || 
                key.includes('tiktok_ad_names') || key.includes('tiktok_ad_headlines')) {
                console.log(`Form field ${key} = "${formData.get(key)}"`);
            }
        });
        
        // Submit the form data
        const response = await fetch(elements.form.getAttribute('action'), {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        // Log response details
        console.log('Received response from server:', response.status, response.statusText);
        
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        // Process response - tracking successful and failed ads
        const adsStatus = responseData.ads || {};
        let successfulAds = Object.values(adsStatus).filter(ad => ad && typeof ad === 'object' && ad.success).length;
        let failedAds = Object.values(adsStatus).filter(ad => ad && typeof ad === 'object' && !ad.success).length;
        
        // Handle platform-wide errors (where the key is just the platform name)
        let platformErrors = {};
        let platformSuccesses = {};
        
        Object.entries(adsStatus).forEach(([key, value]) => {
            if (!key.includes(':') && !key.includes('-')) {
                // If this is an array response, process it specially
                if (Array.isArray(value)) {
                    // Extract successful and failed ads separately
                    const successes = value.filter(ad => ad && ad.success === true);
                    const failures = value.filter(ad => ad && ad.success === false);
                    
                    // Update our counts
                    successfulAds = successes.length;
                    failedAds = failures.length;
                    
                    // Store platform-wide successes and failures for UI
                    platformSuccesses[key] = successes;
                    platformErrors[key] = failures.length > 0 ? failures : null;
                    
                    console.log(`Platform ${key}: ${successes.length} successes, ${failures.length} failures`);
                } else if (typeof value === 'string') {
                    // String error message
                    platformErrors[key] = value;
                    failedAds++;
                } else if (value && typeof value === 'object') {
                    // Single object response
                    if (value.success) {
                        platformSuccesses[key] = [value];
                        successfulAds++;
                    } else {
                        platformErrors[key] = [value];
                        failedAds++;
                    }
                }
            }
        });
        
        // Extract individual ad errors 
        let adErrors = {};
        Object.entries(adsStatus).forEach(([key, ad]) => {
            if (ad && typeof ad === 'object' && !ad.success) {
                adErrors[key] = ad.error || 'Unknown error';
            } else if (typeof ad === 'string') {
                adErrors[key] = ad;
            }
        });
        
        // Log the per-ad status breakdown
        console.log(`Ad creation results: ${successfulAds} successful, ${failedAds} failed`);
        if (failedAds > 0) {
            console.log('Failed ads details:', adErrors);
            console.log('Platform-wide errors:', platformErrors);
        }
        if (successfulAds > 0) {
            console.log('Platform-wide successes:', platformSuccesses);
        }
        
        // Enhance the response data to make it easier to process on the UI side
        if (!responseData.adResults) {
            responseData.adResults = {
                successful: platformSuccesses,
                failed: platformErrors
            };
        }
        
        // Extract all ad IDs for display in success message
        if (!responseData.ad_ids) {
            const ad_ids = [];
            // Extract from platform successes
            Object.values(platformSuccesses).forEach(successList => {
                if (Array.isArray(successList)) {
                    successList.forEach(ad => {
                        if (ad && ad.id) {
                            ad_ids.push(ad.id);
                        }
                    });
                }
            });
            responseData.ad_ids = ad_ids;
        }
        
        // Show success/error message
        if (responseData.success) {
            // Clear any existing error messages
            const existingErrorContainer = document.getElementById('adBuilderErrorContainer');
            if (existingErrorContainer) {
                existingErrorContainer.style.display = 'none';
            }
            
            // Log success
            console.log('Success: Ads created with IDs:', responseData.ad_ids);
            
            // Create custom message with details when some ads failed
            let message = responseData.message || 'Ads created successfully!';
            if (failedAds > 0 && successfulAds > 0) {
                message = `${successfulAds} ads created successfully! ${failedAds} ads failed - see details for each ad below.`;
            } else if (failedAds > 0 && successfulAds === 0) {
                message = `All ads failed to create - see details for each ad below.`;
            }
            
            // Add ad IDs to the message if available
            if (responseData.ad_ids && responseData.ad_ids.length > 0) {
                // For single ad, directly incorporate the ID into the success message
                if (responseData.ad_ids.length === 1) {
                    // Ensure there's no colon and the ID is directly embedded in the message
                    const adId = responseData.ad_ids[0];
                    console.log(`Formatting success message with ad ID: ${adId}`);
                    message = `Success! Ad ID ${adId} Created`;
                } else {
                    // For multiple ads, list the IDs clearly
                    message = `Success! ${successfulAds} ads created with IDs: ${responseData.ad_ids.join(', ')}`;
                }
            }
            
            // Create or get success container
            const successContainer = document.getElementById('adBuilderSuccessContainer') || createSuccessContainer();
            
            // Choose appropriate message and style based on overall success
            let alertClass = 'alert-success';
            let borderColor = '#28a745';
            let bgColor = '#d4edda';
            let icon = 'fa-check-circle';
            
            // If all ads failed but the request succeeded, show a warning
            if (failedAds > 0 && successfulAds === 0) {
                alertClass = 'alert-warning';
                borderColor = '#ffc107';
                bgColor = '#fff3cd';
                icon = 'fa-exclamation-triangle';
            }
            
            // Log the final message that will be displayed
            console.log('Final success message being rendered:', message);
            
            // For single ad success, create a more explicit format using direct concatenation
            if (responseData.ad_ids && responseData.ad_ids.length === 1) {
                const adId = responseData.ad_ids[0];
                // Use direct string concatenation instead of template literals
                const successHtml = 
                    '<div class="alert ' + alertClass + '" style="border-left: 5px solid ' + borderColor + '; background-color: ' + bgColor + '; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
                    '<i class="fas ' + icon + '"></i> <span style="font-weight: bold;">Success!</span> Ad ID: <span style="font-weight: bold;">' + adId + '</span> Created' +
                    '<button type="button" class="close" data-dismiss="alert">&times;</button>' +
                    '</div>';
                
                successContainer.innerHTML = successHtml;
                
                // Double-check what was actually rendered
                console.log('Rendered success message using direct HTML for ad ID:', adId);
                console.log('Success container HTML:', successContainer.innerHTML);
            } else {
                // Otherwise use the dynamically generated message
                successContainer.innerHTML = `
                    <div class="alert ${alertClass}" style="border-left: 5px solid ${borderColor}; background-color: ${bgColor}; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <i class="fas ${icon}"></i> ${message}
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                    </div>
                `;
            }
            
            // Make sure the success message is visible
            successContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Dispatch event to notify completion
            window.dispatchEvent(new CustomEvent('submissionComplete', {
                detail: { 
                    success: true, 
                    data: responseData,
                    adStats: {
                        successful: successfulAds,
                        failed: failedAds,
                        platformSuccesses: platformSuccesses,
                        platformErrors: platformErrors
                    }
                }
            }));
            
            // Redirect if specified
            if (responseData.redirect_url) {
                window.location.href = responseData.redirect_url;
            }
        } else {
            console.error('Error creating ads:', responseData.message || 'Unknown error');
            
            // Clear any existing success messages
            const existingSuccessContainer = document.getElementById('adBuilderSuccessContainer');
            if (existingSuccessContainer) {
                existingSuccessContainer.style.display = 'none';
            }
            
            // Check if we have detailed platform-specific errors
            let errorMessage = responseData.message || 'Error creating ads. Please try again.';
            
            // Enhanced error handling for TikTok specific errors
            if (responseData.error_details && responseData.error_details.tiktok) {
                const tiktokError = responseData.error_details.tiktok;
                
                // Special handling for carousel ad errors
                if (tiktokError.includes("Carousel ad requires at least 2 images")) {
                    errorMessage = "TikTok Carousel Ad Error: At least 2 images are required for carousel ads. Please add more images to your TikTok ad.";
                } else if (tiktokError.includes("asset")) {
                    errorMessage = "TikTok Asset Error: " + tiktokError;
                } else {
                    errorMessage = "TikTok Error: " + tiktokError;
                }
            }
            
            // Display error to user (just for logging, we're not showing toast anymore)
            console.log(`Error suppressed: ${errorMessage} (error)`);
            
            // Show error in UI - create or use an error container
            const errorContainer = document.getElementById('adBuilderErrorContainer') || createErrorContainer();
            errorContainer.innerHTML = `
                <div class="alert alert-danger" style="border-left: 5px solid #dc3545; background-color: #f8d7da; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong><i class="fas fa-exclamation-triangle"></i> Error:</strong> ${errorMessage}
                    <button type="button" class="close" data-dismiss="alert">&times;</button>
                </div>
            `;
            errorContainer.style.display = 'block';
            
            // Make sure the error is visible by scrolling to it
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Dispatch event to notify completion
            window.dispatchEvent(new CustomEvent('submissionComplete', {
                detail: { success: false, error: errorMessage }
            }));
            
            // Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showToast('An error occurred while creating ads. Please try again.', 'error');
        
        // Dispatch event to notify completion
        window.dispatchEvent(new CustomEvent('submissionComplete', {
            detail: { success: false, error: error.message }
        }));
        
        // Reset button state
        if (submitBtn) {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }
    
    return true;
}

/**
 * Create an error container element if it doesn't exist
 * @returns {HTMLElement} The error container
 */
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'adBuilderErrorContainer';
    container.className = 'container mb-4';
    container.style.marginTop = '20px';
    
    // Insert at the top of the summary view if it exists
    const summaryView = document.querySelector('.summary-view-container');
    if (summaryView) {
        summaryView.insertBefore(container, summaryView.firstChild);
    } else {
        // Otherwise insert before the form
        const form = document.getElementById('adsBuilderForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(container, form);
        } else {
            // Last resort - append to body
            document.body.appendChild(container);
        }
    }
    
    return container;
}

/**
 * Create a success message container
 * @returns {HTMLElement} The success container
 */
function createSuccessContainer() {
    const container = document.createElement('div');
    container.id = 'adBuilderSuccessContainer';
    container.className = 'container mb-4';
    container.style.marginTop = '20px';
    
    // Same insertion logic as error container
    const summaryView = document.querySelector('.summary-view-container');
    if (summaryView) {
        summaryView.insertBefore(container, summaryView.firstChild);
    } else {
        const form = document.getElementById('adsBuilderForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(container, form);
        } else {
            document.body.appendChild(container);
        }
    }
    
    return container;
}

/**
 * Initialize dismissible alerts
 * Manually adds click handlers to close buttons with data-dismiss="alert"
 */
function initDismissibleAlerts() {
    document.addEventListener('click', function(e) {
        if (e.target && e.target.getAttribute('data-dismiss') === 'alert') {
            // Find the closest parent with class "alert"
            const alert = e.target.closest('.alert');
            if (alert) {
                // Remove the alert from the DOM
                alert.remove();
            }
        }
    });
}

// Call this function when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initDismissibleAlerts();
});

// Add this function back to the DragDropHandler.js file 
function addDragDropStyles() {
    // Check if styles already exist
    if (document.getElementById('drag-drop-styles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'drag-drop-styles';
    styleEl.textContent = `
        .dragging .asset-drop-zone {
            border: 2px dashed #007bff;
            background-color: rgba(0, 123, 255, 0.05);
            animation: pulse-border 1.5s infinite;
        }
        
        @keyframes pulse-border {
            0% { border-color: rgba(0, 123, 255, 0.4); }
            50% { border-color: rgba(0, 123, 255, 1); }
            100% { border-color: rgba(0, 123, 255, 0.4); }
        }
        
        /* Additional styles to make drop targets more obvious */
        .dragging .assets-panel {
            opacity: 0.7;
        }
        
        .dragging .adsets-panel {
            opacity: 1;
        }
    `;
    
    document.head.appendChild(styleEl);
}

/**
 * Initialize drag and drop functionality for assets
 */
function initDragAndDrop() {
    console.log('Initializing drag-and-drop functionality...');
    
    // Add a global variable to track drops and prevent double-counting
    window.lastDropData = null;
    window.isProcessingDrop = false;
    window.DROP_COOLDOWN_MS = 2000; // 2 second cooldown
    
    // Remove any existing drag indicators
    const removeExistingIndicators = () => {
        const existingIndicators = document.querySelectorAll('.drag-indicator');
        existingIndicators.forEach(indicator => {
            indicator.remove();
        });
    };
    
    // Remove indicators now and after small delay to catch any late creations
    removeExistingIndicators();
    setTimeout(removeExistingIndicators, 500);
    
    // Add a global dragstart listener
    document.addEventListener('dragstart', (e) => {
        console.log('*** Dragstart event detected ***');
        
        // Reset the drop tracking state
        window.lastDropData = null;
        window.dropOccurred = false;
        
        // Remove any drag indicators that might be created
        removeExistingIndicators();
        
        // Ensure no drag indicator will be shown by setting body class to not show it
        document.body.classList.add('no-drag-indicator');
    });
    
    // Add a global dragend listener to clean up after dragging
    document.addEventListener('dragend', (e) => {
        console.log('*** Dragend event detected ***');
        
        // If a drop didn't occur, reset the drop zones
        if (!window.dropOccurred) {
            resetDropZones();
        }
        
        // Reset the drop occurred flag for the next drag operation
        window.dropOccurred = false;
        
        // Remove drag indicators
        removeExistingIndicators();
    });
    
    // Add a global drop listener to detect when drops happen anywhere
    document.addEventListener('drop', (e) => {
        console.log('*** Global drop event detected ***');
        console.log('Drop target:', e.target);
        
        // Prevent processing the same drop twice in quick succession
        const now = Date.now();
        const dropTarget = e.target.closest('.asset-drop-zone');
        
        if (!dropTarget) {
            console.log('Not dropped on a valid drop zone');
            return;
        }
        
        try {
            // Create a unique signature for this drop
            const dataTransfer = e.dataTransfer;
            let dropData = null;
            
            if (dataTransfer.types.includes('application/json')) {
                const jsonData = dataTransfer.getData('application/json');
                if (jsonData) {
                    dropData = JSON.parse(jsonData);
                }
            }
            
            if (!dropData) {
                console.log('No valid drop data found');
                return;
            }
            
            // Create a signature for this drop
            const dropSignature = `${dropData.id}-${dropTarget.dataset.adsetId}-${now}`;
            
            if (window.isProcessingDrop) {
                console.log('Already processing another drop, ignoring this one');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            if (window.lastDropData && 
                window.lastDropData.signature.startsWith(`${dropData.id}-${dropTarget.dataset.adsetId}`) && 
                (now - window.lastDropData.time < window.DROP_COOLDOWN_MS)) {
                console.log('Duplicate drop detected within cooldown period, ignoring');
                console.log('Previous:', window.lastDropData.signature);
                console.log('Current:', dropSignature);
                console.log('Time diff:', now - window.lastDropData.time, 'ms');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // Set the last drop data
            window.lastDropData = {
                signature: dropSignature,
                time: now
            };
            
            // Set the processing flag
            window.isProcessingDrop = true;
            setTimeout(() => {
                window.isProcessingDrop = false;
            }, 100); // Short delay to block any duplicates
            
            window.dropOccurred = true;
            console.log('Global drop processed:', dropSignature);
        } catch (err) {
            console.error('Error in global drop handler:', err);
        }
    });
    
    // Catch any drop events that reach the document body to prevent browser opening files
    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
    });
    
    // Initialize the drag-drop handler
    // ... existing dragDropHandler initialization code ...
}

// Clean up any duplicate Ad Name fields in drop zones on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cleaning up any duplicate Ad Name fields in drop zones');
    
    // Find all asset-drop-zone elements that have the has-asset class
    const activeDropZones = document.querySelectorAll('.asset-drop-zone.has-asset');
    
    activeDropZones.forEach(dropZone => {
        // Remove any Ad Name inputs directly inside drop zones
        const adNameInputs = dropZone.querySelectorAll('.ad-name-input, input.ad-name-input');
        adNameInputs.forEach(input => {
            console.log('Removing duplicate Ad Name input from drop zone');
            input.remove();
        });
        
        // Remove any Headline inputs directly inside drop zones
        const headlineInputs = dropZone.querySelectorAll('.headline-input');
        headlineInputs.forEach(input => {
            console.log('Removing duplicate Headline input from drop zone');
            input.remove();
        });
    });
});

// Near the initialization code, add this function to set default video URLs
function setDefaultVideoUrls() {
    console.log("Setting default video URLs and dimensions for TikTok videos");
    
    // Sample video URLs - making sure these match exactly with asset_service.py
    const sampleVideoUrls = {
        'tiktok-video-0': "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
        'tiktok-video-1': "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
        'tiktok-video-2': "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
        'tiktok-video-3': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        'tiktok-video-4': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        'tiktok-video-5': "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
        'tiktok-video-6': "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
        'tiktok-video-7': "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
        'tiktok-video-8': "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    };
    
    // Corresponding dimensions that match TikTok requirements
    const videoDimensions = {
        'tiktok-video-0': { width: 1920, height: 1080 }, // 16:9 Horizontal
        'tiktok-video-1': { width: 1920, height: 1080 }, // 16:9 Horizontal
        'tiktok-video-2': { width: 720, height: 1280 },  // 9:16 Vertical
        'tiktok-video-3': { width: 720, height: 1280 },  // 9:16 Vertical
        'tiktok-video-4': { width: 1080, height: 1080 }, // 1:1 Square
        'tiktok-video-5': { width: 1080, height: 1080 }, // 1:1 Square (repeated to match asset_service.py indexes)
        'tiktok-video-6': { width: 1920, height: 1080 }, // 16:9 Horizontal (repeated to match asset_service.py indexes)
        'tiktok-video-7': { width: 1920, height: 1080 }, // 16:9 Horizontal
        'tiktok-video-8': { width: 1080, height: 1920 }  // 9:16 Vertical
    };
    
    // Apply the URLs and dimensions to all video elements in the library
    document.querySelectorAll('.asset-item[data-type="video"], .preview-item[data-type="video"]').forEach(videoAsset => {
        const assetId = videoAsset.dataset.id;
        if (assetId && sampleVideoUrls[assetId]) {
            // Set URL
            videoAsset.dataset.url = sampleVideoUrls[assetId];
            console.log(`Set URL for ${assetId}: ${videoAsset.dataset.url}`);
            
            // Set dimensions
            if (videoDimensions[assetId]) {
                videoAsset.dataset.width = videoDimensions[assetId].width;
                videoAsset.dataset.height = videoDimensions[assetId].height;
                console.log(`Set dimensions for ${assetId}: ${videoAsset.dataset.width}x${videoAsset.dataset.height}`);
            }
            
            // Update video elements if they exist
            const videoElement = videoAsset.querySelector('video');
            if (videoElement) {
                const sourceElements = videoElement.querySelectorAll('source');
                if (sourceElements.length > 0) {
                    sourceElements.forEach(source => {
                        source.src = sampleVideoUrls[assetId];
                    });
                } else {
                    const source = document.createElement('source');
                    source.src = sampleVideoUrls[assetId];
                    source.type = 'video/mp4';
                    videoElement.appendChild(source);
                }
                videoElement.load();
            }
        }
    });
}
