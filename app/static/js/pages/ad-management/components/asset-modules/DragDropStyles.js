/**
 * Drag and Drop Styles Module
 * Handles the CSS styles for the drag and drop functionality
 */

/**
 * Add CSS styles for drag and drop UI
 */
export function addDragDropStyles() {
    // Check if styles already exist
    if (document.getElementById('drag-drop-styles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'drag-drop-styles';
    styleEl.textContent = `
        .asset-drop-zone {
            border: 2px dashed #ccc;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            min-height: 100px;
            background-color: #f9f9f9;
            transition: all 0.3s ease;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            position: relative;
            z-index: 10;
            pointer-events: auto !important;
        }
        
        .asset-drop-zone * {
            pointer-events: auto !important;
        }
        
        .asset-drop-zone.drag-over {
            border-color: #2c7be5;
            background-color: rgba(44, 123, 229, 0.1);
            transform: scale(1.02);
            box-shadow: 0 0 15px rgba(0, 123, 255, 0.3);
        }
        
        .body-dragging .asset-drop-zone:not(.drag-over) {
            border-color: #6c757d;
            opacity: 0.7;
        }
        
        .body-dragging .asset-drop-zone.drag-over {
            border-color: #28a745;
            border-width: 3px;
            background-color: rgba(40, 167, 69, 0.1);
        }
        
        .drop-placeholder {
            width: 100%;
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 10px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
        
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
    `;
    
    document.head.appendChild(styleEl);
}

/**
 * Add animation styles for drop effects
 */
export function addAnimationStyles() {
    // Create animation style if it doesn't exist
    if (!document.getElementById('animation-styles')) {
        const style = document.createElement('style');
        style.id = 'animation-styles';
        style.innerHTML = `
            @keyframes ripple-effect {
                0% { transform: scale(1.1); opacity: 1; border-color: #4CAF50; }
                100% { transform: scale(1.3); opacity: 0; border-color: transparent; }
            }
            
            @keyframes newAdAnimation {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes deleteAnimation {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
} 