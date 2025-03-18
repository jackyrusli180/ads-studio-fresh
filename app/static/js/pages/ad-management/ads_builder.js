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
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Ads Builder');
    
    // Add drag-drop styles
    addDragDropStyles();
    
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
});

/**
 * Set up enhanced drag and drop handling
 */
function setupDragAndDropHandling() {
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
            
            // Create asset data object from the element
            const assetData = {
                id: e.target.dataset.id,
                type: e.target.dataset.type || 'image',
                url: e.target.dataset.url || e.target.querySelector('img')?.src || '',
                name: e.target.dataset.name || `Asset ${e.target.dataset.id}`
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
        selectAssetsBtn: document.getElementById('selectAssetsBtn'),
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
                
                // Force creation of headline fields if they don't exist
                setTimeout(() => {
                    console.log('Checking for missing headline fields...');
                    document.querySelectorAll('.adset-item').forEach(adsetItem => {
                        const adCreationContainer = adsetItem.querySelector('.ad-creation-container');
                        if (!adCreationContainer) return;
                        
                        const adNameInput = adCreationContainer.querySelector('.ad-name-input');
                        if (!adNameInput) return;
                        
                        const headlineInput = adCreationContainer.querySelector('.headline-input');
                        if (!headlineInput) {
                            console.log('Missing headline input detected, creating one...');
                            
                            // Create headline input
                            const newHeadlineInput = document.createElement('div');
                            newHeadlineInput.className = 'headline-input';
                            newHeadlineInput.style.display = 'block';
                            newHeadlineInput.style.marginBottom = '15px';
                            newHeadlineInput.style.width = '100%';
                            newHeadlineInput.style.paddingBottom = '10px';
                            newHeadlineInput.style.borderBottom = '1px solid #eee';
                            newHeadlineInput.style.position = 'relative';
                            newHeadlineInput.style.zIndex = '10';
                            
                            // Set the inner HTML
                            newHeadlineInput.innerHTML = `
                                <label for="headline-${adsetItem.dataset.adsetId || adsetItem.id}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Headline</label>
                                <input type="text" 
                                       id="headline-${adsetItem.dataset.adsetId || adsetItem.id}" 
                                       name="headline" 
                                       class="form-control headline-field" 
                                       placeholder="Enter ad headline"
                                       style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
                            `;
                            
                            // Insert after ad name input
                            adCreationContainer.insertBefore(newHeadlineInput, adNameInput.nextSibling);
                            console.log('Created missing headline field for adset', adsetItem.dataset.adsetId || adsetItem.id);
                        }
                    });
                }, 300);
            }, 500); // Short delay to ensure adsets are rendered
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
        }
        
        // Log submission data for debugging (excluding large files)
        console.log('Form data collected, fields:', Array.from(formData.keys()));
        
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
        
        // Show success/error message
        if (responseData.success) {
            showToast(responseData.message || 'Ads created successfully!', 'success');
            console.log('Success: Ads created with IDs:', responseData.ad_ids);
            
            // Dispatch event to notify completion
            window.dispatchEvent(new CustomEvent('submissionComplete', {
                detail: { success: true, data: responseData }
            }));
            
            // Redirect if specified
            if (responseData.redirect_url) {
                window.location.href = responseData.redirect_url;
            }
        } else {
            console.error('Error creating ads:', responseData.message || 'Unknown error');
            showToast(responseData.message || 'Error creating ads. Please try again.', 'error');
            
            // Dispatch event to notify completion
            window.dispatchEvent(new CustomEvent('submissionComplete', {
                detail: { success: false, error: responseData.message }
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
    
    // Add a global dragstart listener
    document.addEventListener('dragstart', (e) => {
        console.log('*** Dragstart event detected ***');
        
        // Reset the drop tracking state
        window.lastDropData = null;
        window.dropOccurred = false;
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
