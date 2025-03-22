/**
 * TikTok Video Requirements Module
 * Helpers for validating and displaying TikTok video requirements
 */

/**
 * TikTok video requirements for ads
 */
export const TIKTOK_VIDEO_REQUIREMENTS = {
    aspectRatios: [
        { name: "9:16 (vertical)", min: 0.5, max: 0.6, example: "540x960px" },
        { name: "1:1 (square)", min: 0.9, max: 1.1, example: "640x640px" },
        { name: "16:9 (horizontal)", min: 1.7, max: 1.8, example: "960x540px" }
    ],
    minResolutions: [
        { name: "9:16 (vertical)", width: 540, height: 960 },
        { name: "1:1 (square)", width: 640, height: 640 },
        { name: "16:9 (horizontal)", width: 960, height: 540 }
    ],
    duration: {
        min: 5,
        max: 600,
        recommended: "9-15 seconds"
    },
    maxFileSize: {
        bytes: 500 * 1024 * 1024,
        readable: "500 MB"
    },
    formats: ["MP4", "MOV", "MPEG", "3GP", "AVI"]
};

/**
 * Validate a video asset against TikTok requirements
 * @param {Object} assetData - The asset data to validate
 * @returns {Object} Validation result with success flag and messages
 */
export function validateTikTokVideo(assetData) {
    if (!assetData || assetData.type !== 'video') {
        return { 
            isValid: false, 
            messages: ["Not a valid video asset"]
        };
    }

    const warnings = [];

    // Check URL
    if (!assetData.url || !assetData.url.trim()) {
        return {
            isValid: false,
            messages: ["Video has no URL"]
        };
    }

    // Need dimensions to validate aspect ratio
    if (!assetData.width || !assetData.height || assetData.width <= 0 || assetData.height <= 0) {
        warnings.push("Couldn't determine video dimensions. TikTok requires specific aspect ratios and resolutions.");
        return {
            isValid: true,
            hasWarnings: true,
            messages: warnings
        };
    }

    // Check aspect ratio
    const aspectRatio = assetData.width / assetData.height;
    let validAspectRatio = false;
    let aspectRatioName = "";
    
    for (const ratio of TIKTOK_VIDEO_REQUIREMENTS.aspectRatios) {
        if (aspectRatio >= ratio.min && aspectRatio <= ratio.max) {
            validAspectRatio = true;
            aspectRatioName = ratio.name;
            break;
        }
    }
    
    if (!validAspectRatio) {
        warnings.push(`Video aspect ratio (${aspectRatio.toFixed(2)}:1) doesn't match TikTok requirements. TikTok requires 9:16, 1:1, or 16:9 aspect ratios.`);
    } else {
        console.log(`Video has valid TikTok aspect ratio: ${aspectRatioName}`);
    }

    // Check resolution
    let validResolution = false;
    for (const res of TIKTOK_VIDEO_REQUIREMENTS.minResolutions) {
        if (assetData.width >= res.width && assetData.height >= res.height) {
            validResolution = true;
            break;
        }
    }
    
    if (!validResolution) {
        warnings.push(`Video resolution (${assetData.width}x${assetData.height}) is below TikTok minimum requirements. TikTok requires at least 540x960px (9:16), 640x640px (1:1), or 960x540px (16:9).`);
    }

    // Check duration if available
    if (assetData.duration) {
        if (assetData.duration < TIKTOK_VIDEO_REQUIREMENTS.duration.min) {
            warnings.push(`Video is too short (${assetData.duration.toFixed(1)}s). TikTok requires videos to be at least 5 seconds long.`);
        } else if (assetData.duration > TIKTOK_VIDEO_REQUIREMENTS.duration.max) {
            const minutes = Math.floor(assetData.duration / 60);
            const seconds = Math.floor(assetData.duration % 60);
            warnings.push(`Video is too long (${minutes}m ${seconds}s). TikTok requires videos to be maximum 10 minutes long.`);
        }
    }

    return {
        isValid: warnings.length === 0,
        hasWarnings: warnings.length > 0,
        messages: warnings
    };
}

/**
 * Display a TikTok video requirements panel
 * @param {HTMLElement} container - The container to add the panel to
 * @param {Object} assetData - The asset data to validate (optional)
 */
export function showTikTokVideoRequirements(container, assetData = null) {
    if (!container) return;
    
    // Create or get existing requirements panel
    let requirementsPanel = container.querySelector('.tiktok-video-requirements');
    if (!requirementsPanel) {
        requirementsPanel = document.createElement('div');
        requirementsPanel.className = 'tiktok-video-requirements';
        requirementsPanel.style.marginTop = '15px';
        requirementsPanel.style.padding = '12px 15px';
        requirementsPanel.style.backgroundColor = '#f8fafc';
        requirementsPanel.style.border = '1px solid #e2e8f0';
        requirementsPanel.style.borderRadius = '6px';
        requirementsPanel.style.fontSize = '14px';
        container.appendChild(requirementsPanel);
    }
    
    // Build the requirements HTML
    let requirementsHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center;">
            <i class="fab fa-tiktok" style="margin-right: 8px;"></i> TikTok Video Requirements
        </div>
        <ul style="padding-left: 20px; margin: 0;">
            <li>Aspect ratio: 9:16 (vertical), 1:1 (square), or 16:9 (horizontal)</li>
            <li>Minimum resolution: 540x960px (9:16), 640x640px (1:1), or 960x540px (16:9)</li>
            <li>Duration: 5 seconds to 10 minutes (9-15 seconds recommended)</li>
            <li>Maximum file size: 500 MB</li>
            <li>Formats: MP4, MOV, MPEG, 3GP, AVI</li>
        </ul>
    `;
    
    // If we have asset data, validate and show warnings
    if (assetData && assetData.type === 'video') {
        const validation = validateTikTokVideo(assetData);
        
        if (validation.hasWarnings) {
            requirementsHTML += `
                <div style="margin-top: 12px; padding: 10px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; color: #92400e;">
                    <div style="font-weight: 600; margin-bottom: 5px;">Video may not meet TikTok requirements:</div>
                    <ul style="padding-left: 20px; margin: 0;">
                        ${validation.messages.map(msg => `<li>${msg}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            requirementsHTML += `
                <div style="margin-top: 12px; padding: 10px; background-color: #dcfce7; border: 1px solid #22c55e; border-radius: 4px; color: #166534;">
                    <div style="font-weight: 600;">✓ Video appears to meet TikTok requirements</div>
                </div>
            `;
        }
    }
    
    requirementsPanel.innerHTML = requirementsHTML;
    return requirementsPanel;
}

/**
 * Hide the TikTok video requirements panel if it exists
 * @param {HTMLElement} container - The container that has the panel
 */
export function hideTikTokVideoRequirements(container) {
    if (!container) return;
    
    const requirementsPanel = container.querySelector('.tiktok-video-requirements');
    if (requirementsPanel) {
        requirementsPanel.style.display = 'none';
    }
}

/**
 * Helper to create tooltip with TikTok video requirements
 * @param {HTMLElement} element - Element to attach tooltip to
 */
export function addTikTokRequirementsTooltip(element) {
    if (!element) return;
    
    element.title = `TikTok Video Requirements:
• Aspect ratios: 9:16, 1:1, or 16:9
• Min resolution: 540x960 (9:16), 640x640 (1:1), 960x540 (16:9)
• Duration: 5s - 10min (9-15s recommended)
• Max size: 500 MB`;
    
    element.style.cursor = 'help';
} 