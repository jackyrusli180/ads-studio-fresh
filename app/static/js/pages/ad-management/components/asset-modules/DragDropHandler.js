/**
 * Drag and Drop Handler Module
 * Handles the drag and drop functionality for assets to adsets
 * This is the main entry point that coordinates all the drag-drop subsystems
 */

import { showToast } from '../../../../utils/common.js';
import { addDragDropStyles, addAnimationStyles } from './DragDropStyles.js';
import { setupDropZone, observeNewDropZones, findDropZone } from './DropZoneUtils.js';
import { handleDragEnter, handleDragOver, handleDragLeave, createDropHandler } from './DragEventHandlers.js';
import { returnAssetToPanel } from './AssetManager.js';

/**
 * Set up drag and drop functionality
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 */
export function setupDragAndDrop(elements, state) {
    console.log('Setting up drag and drop functionality...');
    
    // Add CSS styles for drag and drop
    addDragDropStyles();
    addAnimationStyles();
    
    // Add body class for styling during drag operations
    document.addEventListener('dragstart', () => {
        document.body.classList.add('body-dragging');
    });
    
    document.addEventListener('dragend', () => {
        document.body.classList.remove('body-dragging');
    });
    
    // Set up direct drop event handlers on document to catch all drops
    document.addEventListener('dragover', (e) => {
        e.preventDefault(); // Required for drop to work
    });
    
    // Setup drop event handler with current state
    const handleDrop = createDropHandler(state);
    
    // Set up drop zones for adsets - MOVED HERE AFTER handleDrop is defined
    setupDropZones();
    
    /**
     * Attach the initial drop zones
     */
    function setupInitialDropZones() {
        console.log('Setting up initial drop zones...');
        const dropZones = document.querySelectorAll('.asset-drop-zone');
        dropZones.forEach(dropZone => {
            setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
        });
    }
    
    // Re-check for drop zones after a short delay to catch late-rendered zones
    setTimeout(setupInitialDropZones, 500);
    
    /**
     * Setup drop zones for all adset items
     */
    function setupDropZones() {
        // Find all asset drop zones
        const dropZones = document.querySelectorAll('.asset-drop-zone');
        
        console.log('Setting up drop zones, found:', dropZones.length);
        
        dropZones.forEach(dropZone => {
            setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
        });
        
        // Set up observer for dynamically created drop zones
        observeNewDropZones(dropZone => {
            setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
        });
    }
    
    // Return public API
    return {
        returnAssetToPanel: (assetData) => returnAssetToPanel(assetData, state),
        findDropZone,
        setupDropZones
    };
} 