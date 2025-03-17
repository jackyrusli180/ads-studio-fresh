/**
 * Drop Zone Utilities Module
 * Helper functions for managing drop zones
 */

/**
 * Set up a single drop zone with all needed event handlers
 * @param {HTMLElement} dropZone - The drop zone element
 * @param {Function} handleDragOver - The dragover event handler
 * @param {Function} handleDragEnter - The dragenter event handler
 * @param {Function} handleDragLeave - The dragleave event handler
 * @param {Function} handleDrop - The drop event handler
 */
export function setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop) {
    if (!dropZone) return;
    
    console.log('Setting up drop zone:', dropZone.dataset.adsetId);
    
    // Remove existing listeners to prevent duplicates
    dropZone.removeEventListener('dragover', handleDragOver);
    dropZone.removeEventListener('dragenter', handleDragEnter);
    dropZone.removeEventListener('dragleave', handleDragLeave);
    dropZone.removeEventListener('drop', handleDrop);
    
    // Add all event listeners
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Make sure the correct attributes are set
    dropZone.setAttribute('droppable', 'true');
}

/**
 * Set up MutationObserver to watch for new drop zones
 * @param {Function} setupDropZoneCallback - Function to call when new drop zones are found
 */
export function observeNewDropZones(setupDropZoneCallback) {
    const adsetContainer = document.querySelector('.adsets-container');
    if (!adsetContainer) return;
    
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const newDropZones = node.querySelectorAll('.asset-drop-zone');
                    if (newDropZones.length) {
                        console.log('New drop zones added, setting up:', newDropZones.length);
                        newDropZones.forEach(setupDropZoneCallback);
                    }
                }
            });
        });
    });
    
    observer.observe(adsetContainer, { childList: true, subtree: true });
    return observer;
}

/**
 * Find the closest drop zone element from the event target
 * @param {HTMLElement} target - The element where the drop occurred
 * @returns {HTMLElement|null} - The closest drop zone element or null if none found
 */
export function findDropZone(target) {
    console.log('Finding drop zone from target:', target);
    
    // Check if the target itself is a drop zone
    if (target.classList && target.classList.contains('asset-drop-zone')) {
        console.log('Target itself is a drop zone');
        return target;
    }
    
    // Look for a parent element that is a drop zone
    const dropZone = target.closest('.asset-drop-zone');
    
    if (dropZone) {
        console.log('Found parent drop zone:', dropZone);
        return dropZone;
    }
    
    // Look for a parent ad creation container
    const creationContainer = target.closest('.ad-creation-container');
    if (creationContainer) {
        // Look for a drop zone within the container
        const containerDropZone = creationContainer.querySelector('.asset-drop-zone');
        if (containerDropZone) {
            console.log('Found drop zone in ad creation container:', containerDropZone);
            return containerDropZone;
        }
    }
    
    // Find the adset container in case we need to fall back to that
    const adsetItem = target.closest('.adset-item');
    
    if (adsetItem) {
        // Try to find the ad creation container in this adset
        const adCreationContainer = adsetItem.querySelector('.ad-creation-container');
        
        if (adCreationContainer) {
            // Look for a drop zone within the creation container
            const adsetDropZone = adCreationContainer.querySelector('.asset-drop-zone');
            
            if (adsetDropZone) {
                console.log('Found drop zone within adset creation container:', adsetDropZone);
                return adsetDropZone;
            }
        }
        
        // If still not found, look directly in adset content
        const adsetContent = adsetItem.querySelector('.adset-content');
        if (adsetContent) {
            // Look for a drop zone within adset content
            const contentDropZone = adsetContent.querySelector('.asset-drop-zone');
            
            if (contentDropZone) {
                console.log('Found drop zone within adset content:', contentDropZone);
                return contentDropZone;
            }
            
            console.log('No formal drop zone found, but drop occurred in adset content area');
            
            // If no drop zone found, let's create one dynamically
            const newDropZone = document.createElement('div');
            newDropZone.className = 'asset-drop-zone drag-over';
            newDropZone.style.display = 'flex';
            newDropZone.dataset.adsetId = adsetItem.dataset.adsetId || adsetItem.dataset.id;
            newDropZone.dataset.platform = adsetItem.dataset.platform;
            newDropZone.dataset.accountId = adsetItem.dataset.accountId;
            
            // Create ad creation container if needed
            let adCreation = adsetContent.querySelector('.ad-creation-container');
            if (!adCreation) {
                adCreation = document.createElement('div');
                adCreation.className = 'ad-creation-container';
                adsetContent.appendChild(adCreation);
            }
            
            // Create placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.innerHTML = `
                <i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <div>Drop to add asset</div>
            `;
            newDropZone.appendChild(placeholder);
            adCreation.appendChild(newDropZone);
            console.log('Created new dynamic drop zone in adset:', newDropZone);
            
            return newDropZone;
        }
    }
    
    console.warn('No valid drop zone found from target:', target);
    return null;
}

/**
 * Show animation when asset is dropped
 * @param {HTMLElement} element - The element to animate
 */
export function showDropAnimation(element) {
    // Add a ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'drop-effect';
    ripple.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 6px;
        border: 2px solid #4CAF50;
        opacity: 1;
        background-color: rgba(76, 175, 80, 0.1);
        transform: scale(1.1);
        pointer-events: none;
        z-index: 100;
        animation: ripple-effect 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    // Remove the ripple effect after animation completes
    setTimeout(() => {
        ripple.remove();
    }, 800);
} 