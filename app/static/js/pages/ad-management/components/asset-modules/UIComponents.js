/**
 * UI Components Module
 * Handles the creation of UI elements for the drag and drop interface
 */

/**
 * Create an ad container with all needed elements
 * @param {Object} assetData - Asset data object
 * @returns {HTMLElement} - The ad container element
 */
export function createAdContainer(assetData) {
    console.log('Creating new ad container for asset:', assetData);
    
    // Create new ad container
    const adContainer = document.createElement('div');
    adContainer.className = 'ad-container new-ad-animation';
    adContainer.dataset.assetId = assetData.id;
    
    // Add animation class and remove it after animation completes
    setTimeout(() => {
        adContainer.classList.remove('new-ad-animation');
    }, 800);
    
    return adContainer;
}

/**
 * Create an ad name input container
 * @param {string} defaultName - Default name for the ad
 * @returns {HTMLElement} - The ad name container element
 */
export function createAdNameInput(defaultName = '') {
    // Create ad name input container
    const adNameContainer = document.createElement('div');
    adNameContainer.className = 'ad-name-container';
    
    const adNameInput = document.createElement('input');
    adNameInput.type = 'text';
    adNameInput.className = 'ad-name-input';
    adNameInput.placeholder = 'Enter ad name';
    adNameInput.value = defaultName || `Ad ${Date.now().toString().slice(-4)}`;  // Default name
    
    adNameContainer.appendChild(adNameInput);
    
    return adNameContainer;
}

/**
 * Create a delete button for ad containers
 * @param {Function} onDelete - Callback function when delete is clicked
 * @returns {HTMLElement} - The delete button element
 */
export function createDeleteButton(onDelete) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-ad-button';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', onDelete);
    
    return deleteButton;
}

/**
 * Create an empty message element
 * @param {string} message - The message to display
 * @returns {HTMLElement} - The empty message element
 */
export function createEmptyMessage(message = 'No items to display') {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-panel-message';
    emptyMessage.textContent = message;
    return emptyMessage;
}

/**
 * Create or get an ads container within an adset
 * @param {HTMLElement} adsetContent - The adset content element
 * @returns {HTMLElement} - The ads container element
 */
export function getOrCreateAdsContainer(adsetContent) {
    // Find the ads container or create one if it doesn't exist
    let adsContainer = adsetContent.querySelector('.ads-container');
    
    if (!adsContainer) {
        console.log('Creating new ads container');
        adsContainer = document.createElement('div');
        adsContainer.className = 'ads-container';
        adsetContent.appendChild(adsContainer);
    }
    
    return adsContainer;
}

/**
 * Check if an asset already exists in an adset
 * @param {HTMLElement} adsetItem - The adset item element
 * @param {string} assetId - The asset ID to check
 * @returns {HTMLElement|null} - The existing asset element or null if not found
 */
export function findExistingAsset(adsetItem, assetId) {
    return adsetItem.querySelector(`.ad-container[data-asset-id="${assetId}"]`);
}

/**
 * Highlight an existing asset in an adset
 * @param {HTMLElement} existingAsset - The existing asset element to highlight
 */
export function highlightExistingAsset(existingAsset) {
    existingAsset.classList.add('highlight');
    setTimeout(() => {
        existingAsset.classList.remove('highlight');
    }, 2000);
}

/**
 * Trigger a change event to notify of asset changes
 */
export function triggerChangeEvent() {
    // Create and dispatch a custom event
    const event = new CustomEvent('adset-changed', {
        bubbles: true,
        detail: { time: new Date() }
    });
    document.dispatchEvent(event);
} 