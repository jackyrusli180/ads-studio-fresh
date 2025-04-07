document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing asset library...");
    
    // Debug: Log all approved assets
    const approvedAssets = document.querySelectorAll('.asset-item[data-status="approved"]');
    console.log(`Found ${approvedAssets.length} approved assets`);
    
    // Add a click handler for the body element to toggle bulk mode when clicking any checkbox
    document.body.addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('asset-checkbox')) {
            console.log("Checkbox clicked:", e.target.checked, e.target.dataset.id);
            updateBulkActions();
        }
    });

    // View toggle functionality
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const assetGrid = document.getElementById('assetGrid');
    const assetList = document.getElementById('assetList');

    if (gridView && listView && assetGrid && assetList) {
        gridView.addEventListener('click', () => {
            gridView.classList.add('active');
            listView.classList.remove('active');
            assetGrid.classList.add('view-active');
            assetList.classList.remove('view-active');
        });

        listView.addEventListener('click', () => {
            listView.classList.add('active');
            gridView.classList.remove('active');
            assetList.classList.add('view-active');
            assetGrid.classList.remove('view-active');
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchAssets');
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterAssets();
        }, 300);
    });

    // Filter functionality
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');

    typeFilter.addEventListener('change', filterAssets);
    statusFilter.addEventListener('change', filterAssets);

    function filterAssets() {
        const searchTerm = searchInput.value.toLowerCase();
        const typeValue = typeFilter.value;
        const statusValue = statusFilter.value;

        const assets = document.querySelectorAll('.asset-item, .asset-list tr[data-id]');
        
        assets.forEach(asset => {
            const name = asset.querySelector('.asset-name').textContent.toLowerCase();
            const type = asset.querySelector('.asset-type').textContent.toLowerCase();
            const status = asset.querySelector('.asset-status').textContent.toLowerCase();

            const matchesSearch = name.includes(searchTerm);
            const matchesType = !typeValue || type === typeValue;
            const matchesStatus = !statusValue || status === statusValue;

            if (matchesSearch && matchesType && matchesStatus) {
                asset.style.display = '';
            } else {
                asset.style.display = 'none';
            }
        });
    }

    // Asset selection and bulk actions
    const selectAllCheckbox = document.getElementById('selectAll');
    const bulkActionsBtn = document.getElementById('bulkActions');
    const assetCheckboxes = document.querySelectorAll('.asset-select');

    selectAllCheckbox?.addEventListener('change', () => {
        const isChecked = selectAllCheckbox.checked;
        assetCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateBulkActionsState();
    });

    assetCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionsState);
    });

    function updateBulkActionsState() {
        const selectedCount = document.querySelectorAll('.asset-select:checked').length;
        bulkActionsBtn.disabled = selectedCount === 0;
        bulkActionsBtn.textContent = `Bulk Actions (${selectedCount})`;
    }

    // Upload functionality
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const uploadDropzone = document.getElementById('uploadDropzone');
    const fileInput = uploadDropzone.querySelector('input[type="file"]');
    const uploadList = document.getElementById('uploadList');
    const startUploadBtn = document.getElementById('startUpload');
    const uploadForm = document.getElementById('uploadForm');

    // Show upload modal when upload button is clicked
    uploadBtn?.addEventListener('click', () => {
        uploadModal.style.display = 'block';
        uploadList.innerHTML = '';
    });

    // Handle file selection
    uploadDropzone?.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    // Handle drag and drop
    uploadDropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
    });

    uploadDropzone?.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('dragover');
    });

    uploadDropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput?.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        uploadList.innerHTML = '';
        Array.from(files).forEach(file => {
            const item = document.createElement('div');
            item.className = 'upload-item';
            item.innerHTML = `
                <div class="upload-item-name">${file.name}</div>
                <div class="upload-progress">
                    <div class="upload-progress-bar" style="width: 0%"></div>
                </div>
            `;
            uploadList.appendChild(item);
        });
    }

    // Handle upload submission
    startUploadBtn?.addEventListener('click', async () => {
        const files = fileInput.files;
        if (!files.length) {
            showToast('Please select files to upload', 'error');
            return;
        }

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files[]', file);
        });

        try {
            const response = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showToast('Files uploaded successfully');
                uploadModal.style.display = 'none';
                // Refresh the asset list
                location.reload();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Close modal when clicking close button
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn?.addEventListener('click', () => {
            uploadModal.style.display = 'none';
        });
    });

    // Preview functionality
    const previewModal = document.getElementById('previewModal');
    const previewBtns = document.querySelectorAll('.preview-btn');
    const previewContainer = document.querySelector('.preview-container');
    const metadataList = document.querySelector('.metadata-list');
    const historyList = document.querySelector('.history-list');

    previewBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const assetId = btn.closest('[data-id]').dataset.id;
            await showAssetPreview(assetId);
        });
    });

    async function showAssetPreview(assetId) {
        try {
            const response = await fetch(`/api/assets/${assetId}`);
            const asset = await response.json();

            // Update preview content
            previewContainer.innerHTML = asset.type === 'image' 
                ? `<img src="${asset.file_path}" alt="${asset.name}">`
                : `<video src="${asset.file_path}" controls></video>`;

            // Update metadata
            metadataList.innerHTML = Object.entries(asset.metadata)
                .map(([key, value]) => `
                    <div class="metadata-item">
                        <div class="metadata-key">${key}</div>
                        <div class="metadata-value">${value}</div>
                    </div>
                `).join('');

            // Update history
            historyList.innerHTML = asset.approval_history
                .map(action => `
                    <div class="history-item">
                        <div class="history-action">${action.action}</div>
                        <div class="history-user">${action.user_id}</div>
                        <div class="history-time">${formatDate(action.timestamp)}</div>
                        <div class="history-comment">${action.comment}</div>
                    </div>
                `).join('');

            previewModal.style.display = 'block';
        } catch (error) {
            showToast('Failed to load asset preview', 'error');
        }
    }

    // Utility functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    function updateBulkActions() {
        const selectedCheckboxes = document.querySelectorAll('.asset-checkbox:checked');
        const selectionControls = document.getElementById('selectionControls');
        const selectedCount = document.getElementById('selectedCount');
        
        console.log(`Selected checkboxes: ${selectedCheckboxes.length}`);
        
        if (selectedCheckboxes.length > 0) {
            document.body.classList.add('bulk-mode');
            if (selectionControls) selectionControls.style.display = 'flex';
            if (selectedCount) selectedCount.textContent = selectedCheckboxes.length;
            
            // Mark parent items as selected
            selectedCheckboxes.forEach(checkbox => {
                const item = checkbox.closest('.asset-item');
                if (item) item.classList.add('selected');
            });
        } else {
            document.body.classList.remove('bulk-mode');
            if (selectionControls) selectionControls.style.display = 'none';
            
            // Remove selected class from all items
            document.querySelectorAll('.asset-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }

    // Call this on page load to ensure correct initial state
    updateBulkActions();
    
    // Debug: Log all checkboxes
    const checkboxes = document.querySelectorAll('.asset-checkbox');
    console.log(`Found ${checkboxes.length} checkboxes on the page`);
    checkboxes.forEach((checkbox, index) => {
        console.log(`Checkbox ${index}: `, checkbox.parentElement.style.display);
    });

    // Add this immediately after the DOM is loaded
    console.log("Checking for asset items and checkboxes...");
    
    // Log all asset items
    const assetItems = document.querySelectorAll('.asset-item');
    console.log(`Found ${assetItems.length} asset items on the page`);
    
    // Log checkbox visibility
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('.asset-checkbox');
        console.log(`Found ${checkboxes.length} checkboxes on the page`);
        
        checkboxes.forEach((checkbox, i) => {
            const rect = checkbox.getBoundingClientRect();
            console.log(`Checkbox ${i}: visible=${rect.width > 0 && rect.height > 0}, top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
            
            // Make sure parent is visible
            const parent = checkbox.closest('.asset-item-checkbox');
            if (parent) {
                const parentStyle = window.getComputedStyle(parent);
                console.log(`Checkbox parent ${i}: display=${parentStyle.display}, visibility=${parentStyle.visibility}, opacity=${parentStyle.opacity}`);
            }
        });
    }, 1000); // Wait a second to make sure everything's rendered

    console.log("Setting up simplified Create Ads flow");
    
    // Track selected assets - must be accessible to all functions
    let selectedAssets = [];
    
    // Function to log selected assets for debugging
    function logSelectedState() {
        console.log("-------- SELECTED ASSETS STATE --------");
        console.log(`Total selected assets: ${selectedAssets.length}`);
        console.log("Selected asset IDs:", selectedAssets.map(a => a.id));
        
        // Check checkboxes
        const checked = document.querySelectorAll('.asset-checkbox:checked');
        console.log(`Checked checkboxes: ${checked.length}`);
        checked.forEach((cb, i) => {
            const assetId = cb.closest('.asset-item')?.dataset?.id;
            console.log(`Checkbox ${i}: asset ID=${assetId}`);
        });
        
        // Check selected class
        const selectedItems = document.querySelectorAll('.asset-item.selected');
        console.log(`Items with 'selected' class: ${selectedItems.length}`);
        console.log("-----------------------------------");
    }
    
    // Initialize from checked checkboxes
    function initializeFromCheckboxes() {
        selectedAssets = []; // Reset
        const checked = document.querySelectorAll('.asset-checkbox:checked, input[type="checkbox"]:checked');
        console.log(`Found ${checked.length} checked checkboxes`);
        
        checked.forEach(checkbox => {
            console.log("Processing checkbox:", checkbox);
            
            // Get the ID directly from the checkbox or its parent element
            let assetId = checkbox.dataset.id || checkbox.value;
            
            // If we have no ID yet, try getting it from the parent or the checkbox value
            if (!assetId) {
                if (checkbox.parentElement && checkbox.parentElement.dataset && checkbox.parentElement.dataset.id) {
                    assetId = checkbox.parentElement.dataset.id;
                } else {
                    // As a fallback, use the checkbox's unique ID from the DOM
                    assetId = checkbox.id || Math.random().toString(36).substring(2);
                }
            }
            
            console.log(`Using asset ID: ${assetId}`);
            
            // Add to selected assets array regardless of parent structure
            selectedAssets.push({
                id: assetId,
                path: checkbox.dataset.path || ''
            });
            
            // Try to find parent for visual feedback
            const assetItem = checkbox.closest('.asset-item, [data-id]');
            if (assetItem) {
                assetItem.classList.add('selected');
            }
        });
        
        // Update the selection count display in the UI
        const selectionCount = document.getElementById('selectionCount');
        if (selectionCount) {
            selectionCount.textContent = selectedAssets.length;
        }
        
        // Update the next button status
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.disabled = selectedAssets.length === 0;
        }
        
        console.log(`Updated selection count: ${selectedAssets.length} assets`);
        return selectedAssets.length;
    }
    
    // Run initialization
    initializeFromCheckboxes();
    
    // Handle create ads button click
    const createAdsBtn = document.getElementById('createAdsBtn');
    const createAdsForm = document.getElementById('createAdsForm');
    
    if (createAdsBtn) {
        // Add a direct click handler
        console.log("Adding click handler to Create Ads button");
        createAdsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Create Ads button clicked");
            
            // Re-check approved selections
            initializeFromCheckboxes();
            
            if (selectedAssets.length === 0) {
                console.log("No approved assets selected, showing alert");
                window.alert('Please select at least one approved asset');
                return false;
            }
            
            if (!createAdsForm) {
                console.error("Create Ads form not found!");
                return false;
            }
            
            // Build hidden inputs for selected assets
            createAdsForm.innerHTML = '';
            selectedAssets.forEach((asset) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'selected_assets[]';
                input.value = asset.id;
                createAdsForm.appendChild(input);
                console.log(`Added asset ${asset.id}`);
            });
            
            console.log("Submitting form to /ads_builder");
            createAdsForm.submit();
            return false;
        });
    }
});

// Add debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

class AssetLibrary {
    constructor() {
        this.assets = [];
        this.filters = {
            search: '',
            type: '',
            status: '',
            resolution: ''
        };
        this.view = 'grid';
        this.currentPage = 1;
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.initializeEventListeners();
        this.initializeUpload();
        this.loadAssets();
    }

    initializeEventListeners() {
        // View toggle - Add proper event handlers
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        
        gridViewBtn?.addEventListener('click', () => {
            console.log('Grid view clicked');
            this.setView('grid');
        });
        
        listViewBtn?.addEventListener('click', () => {
            console.log('List view clicked');
            this.setView('list');
        });
        
        // Search and filters - add console logs for debugging
        document.getElementById('searchAssets')?.addEventListener('input', 
            debounce((e) => {
                console.log('Search input:', e.target.value);
                this.updateFilters({ search: e.target.value });
            }, 300)
        );
        
        document.getElementById('typeFilter')?.addEventListener('change', 
            (e) => {
                console.log('Type filter changed:', e.target.value);
                this.updateFilters({ type: e.target.value });
            }
        );
        
        document.getElementById('statusFilter')?.addEventListener('change', 
            (e) => {
                console.log('Status filter changed:', e.target.value);
                this.updateFilters({ status: e.target.value });
            }
        );
        
        document.getElementById('resolutionFilter')?.addEventListener('change', 
            (e) => {
                console.log('Resolution filter changed:', e.target.value);
                this.updateFilters({ resolution: e.target.value });
            }
        );

        // Floating upload button
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            this.showUploadArea();
        });
    }

    initializeUpload() {
        const dropzone = document.getElementById('uploadDropzone');
        const fileInput = dropzone?.querySelector('input[type="file"]');
        
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            
            dropzone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    await this.handleFiles(e.dataTransfer.files);
                }
            });
            
            dropzone.addEventListener('click', () => {
                fileInput?.click();
            });
            
            fileInput?.addEventListener('change', async (e) => {
                if (e.target.files.length) {
                    await this.handleFiles(e.target.files);
                }
            });
        }
    }

    showUploadArea() {
        const container = document.getElementById('assetContent');
        if (!container) return;

        container.innerHTML = this.renderUploadContainer();
        this.initializeUpload(); // Reinitialize upload listeners for the new elements
    }

    async handleFiles(files) {
        try {
            this.showLoading();
            
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files[]', file);
            });
            
            const response = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Upload failed');
            
            // Update assets and re-render
            await this.loadAssets();
            this.showToast('Files uploaded successfully', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadAssets() {
        try {
            this.showLoading();
            const response = await fetch('/api/assets');
            if (!response.ok) throw new Error('Failed to load assets');
            
            const data = await response.json();
            if (Array.isArray(data)) {
                this.assets = data;
            } else if (data && typeof data === 'object') {
                this.assets = data.assets || [];
            } else {
                this.assets = [];
                console.error('Received invalid assets data:', data);
            }
            this.renderAssets();
            
        } catch (error) {
            this.showToast(error.message, 'error');
            this.assets = []; // Ensure it's an array even on error
        } finally {
            this.hideLoading();
        }
    }

    renderAssets() {
        console.log('Rendering assets with view:', this.view);
        const container = document.getElementById('assetContent');
        if (!container) return;

        // Apply filters
        const filteredAssets = this.filterAssets();
        console.log('Filtered assets count:', filteredAssets.length);

        if (filteredAssets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No assets found. Try adjusting your filters.</p>
                </div>
            `;
            return;
        }

        if (this.view === 'grid') {
            this.renderGridView(container, filteredAssets);
        } else {
            this.renderListView(container, filteredAssets);
        }

        // Reinitialize event listeners
        this.initializeAssetPreview();
        this.initializePagination();
    }

    renderUploadContainer() {
        return `
            <div class="upload-container">
                <form id="uploadForm" enctype="multipart/form-data">
                    <div id="uploadDropzone" class="upload-dropzone">
                        <input type="file" name="files[]" multiple accept="image/*,video/*" style="display: none;">
                        <div class="upload-prompt">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag and drop files here or click to browse</p>
                            <span class="upload-hint">Supports images and videos</span>
                        </div>
                        <div class="upload-progress" style="display: none;">
                            <div class="progress-text">Uploading...</div>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="progress-status">0%</div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        // You can implement a toast notification here
        alert(message); // Temporary basic notification
    }

    renderGridView(container, filteredAssets) {
        // Calculate pagination
        const itemsPerPage = 16; // 4x4 grid
        const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
        const currentPage = Math.min(this.currentPage || 1, totalPages) || 1;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const visibleAssets = filteredAssets.slice(startIndex, endIndex);
        
        container.innerHTML = `
            <div class="asset-grid">
                <div class="virtual-scroll-content">
                    ${visibleAssets.map(asset => this.renderAssetItem(asset)).join('')}
                </div>
                
                <div class="pagination">
                    <button class="btn btn-icon page-prev" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
                    <button class="btn btn-icon page-next" ${currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <button class="floating-upload-btn" id="uploadBtn">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
    
    renderListView(container, filteredAssets) {
        // Calculate pagination
        const itemsPerPage = 10; // 10 rows per page
        const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
        const currentPage = Math.min(this.currentPage || 1, totalPages) || 1;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const visibleAssets = filteredAssets.slice(startIndex, endIndex);
        
        container.innerHTML = `
            <div class="asset-list view-active">
                <table>
                    <thead>
                        <tr>
                            <th>Preview</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Date Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleAssets.map(asset => `
                            <tr class="asset-row" data-id="${asset.id}">
                                <td class="preview-cell">
                                    ${asset.type === 'image' 
                                        ? `<img src="${asset.thumbnail}" alt="${asset.name}">`
                                        : `<video src="${asset.file_path}" poster="${asset.thumbnail}"></video>`
                                    }
                                </td>
                                <td>${asset.name}</td>
                                <td>${asset.type}</td>
                                <td>
                                    <span class="status-badge status-${asset.status}">${asset.status}</span>
                                </td>
                                <td>${this.formatDate(asset.created_at)}</td>
                                <td>
                                    <button class="btn btn-icon preview-btn" 
                                            data-path="${asset.file_path}" 
                                            data-type="${asset.type}" 
                                            title="Preview">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="pagination">
                    <button class="btn btn-icon page-prev" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
                    <button class="btn btn-icon page-next" ${currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <button class="floating-upload-btn" id="uploadBtn">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
    
    initializePagination() {
        document.querySelector('.page-prev')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderAssets();
            }
        });
        
        document.querySelector('.page-next')?.addEventListener('click', () => {
            const itemsPerPage = this.view === 'grid' ? 16 : 10;
            const totalPages = Math.ceil(this.assets.length / itemsPerPage);
            
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderAssets();
            }
        });
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    renderAssetItem(asset) {
        return `
            <div class="asset-item" 
                 data-id="${asset.id}"
                 data-type="${asset.type}"
                 data-status="${asset.status}">
                <div class="asset-item-checkbox">
                    <input type="checkbox" class="asset-checkbox" data-id="${asset.id}" data-path="${asset.file_path}">
                </div>
                <div class="asset-preview">
                    <img src="${asset.thumbnail}" alt="${asset.name}" loading="lazy">
                    <div class="asset-overlay">
                        <button class="btn btn-icon preview-btn" data-path="${asset.file_path}" data-type="${asset.type}" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="asset-info">
                    <div class="asset-name">${asset.name}</div>
                    <div class="asset-meta">
                        <span class="asset-type">${asset.type}</span>
                        <span class="asset-status">${asset.status}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    initializeAssetPreview() {
        // Add event listeners for preview buttons
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showAssetPreview(e.currentTarget.dataset.path, e.currentTarget.dataset.type);
            });
        });
    }
    
    showAssetPreview(path, type) {
        const modal = document.getElementById('previewModal');
        const container = modal.querySelector('.preview-container');
        
        if (!modal || !container) return;
        
        if (type === 'image') {
            container.innerHTML = `<img src="${path}" alt="Asset Preview" class="preview-image">`;
        } else if (type === 'video') {
            container.innerHTML = `
                <video controls autoplay class="preview-video">
                    <source src="${path}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        }
        
        modal.classList.remove('hidden');
        modal.style.display = 'block';
        
        // Add close functionality
        modal.querySelector('.close-modal')?.addEventListener('click', () => {
            modal.style.display = 'none';
            container.innerHTML = '';
        });
    }

    setView(viewType) {
        console.log('Setting view to:', viewType);
        this.view = viewType;
        
        // Update active state on buttons
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        
        if (gridViewBtn) {
            gridViewBtn.classList.toggle('active', viewType === 'grid');
            gridViewBtn.setAttribute('aria-pressed', viewType === 'grid');
        }
        
        if (listViewBtn) {
            listViewBtn.classList.toggle('active', viewType === 'list');
            listViewBtn.setAttribute('aria-pressed', viewType === 'list');
        }
        
        // Re-render with the new view
        this.renderAssets();
    }

    updateFilters(filters) {
        console.log('Updating filters:', filters);
        this.filters = { ...this.filters, ...filters };
        this.currentPage = 1; // Reset to first page when filters change
        this.renderAssets();
    }

    filterAssets() {
        if (!Array.isArray(this.assets)) {
            console.error('Assets is not an array:', this.assets);
            this.assets = []; // Convert to empty array
            return [];
        }
        
        return this.assets.filter(asset => {
            // Search filter
            const matchesSearch = !this.filters.search || 
                asset.name.toLowerCase().includes(this.filters.search.toLowerCase());
            
            // Type filter
            const matchesType = !this.filters.type || 
                asset.type === this.filters.type;
            
            // Status filter
            const matchesStatus = !this.filters.status || 
                asset.status === this.filters.status;
            
            // Resolution filter
            let matchesResolution = true;
            if (this.filters.resolution) {
                const metadata = asset.metadata || {};
                const width = metadata.width || 0;
                const height = metadata.height || 0;
                const aspectRatio = width / height;
                
                switch(this.filters.resolution) {
                    case '1080':
                        matchesResolution = height >= 1080 || width >= 1080;
                        break;
                    case '720':
                        matchesResolution = (height >= 720 && height < 1080) || 
                                          (width >= 720 && width < 1080);
                        break;
                    case 'sd':
                        matchesResolution = height < 720 && width < 720;
                        break;
                    case 'square':
                        matchesResolution = Math.abs(aspectRatio - 1) < 0.1; // Close to 1:1
                        break;
                    case 'portrait':
                        matchesResolution = aspectRatio < 0.9; // Taller than wide
                        break;
                    case 'landscape':
                        matchesResolution = aspectRatio > 1.1; // Wider than tall
                        break;
                }
            }
            
            return matchesSearch && matchesType && matchesStatus && matchesResolution;
        });
    }
}

// Initialize the library
document.addEventListener('DOMContentLoaded', () => {
    new AssetLibrary();
});

// Direct selection handler - simpler approach
document.addEventListener('DOMContentLoaded', function() {
    // Get the necessary elements
    const selectionCount = document.getElementById('selectionCount');
    const nextBtn = document.getElementById('nextBtn');
    const createAdsForm = document.getElementById('createAdsForm');
    const selectionControls = document.getElementById('selectionControls');
    
    // Function to update the UI and form based on checkbox selection
    function updateSelection() {
        // Get all checked checkboxes
        const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
        console.log("Direct selection handler found", checkedBoxes.length, "checked boxes");
        
        // Update the selection count
        if (selectionCount) {
            selectionCount.textContent = checkedBoxes.length;
        }
        
        // Enable/disable next button
        if (nextBtn) {
            nextBtn.disabled = checkedBoxes.length === 0;
        }
        
        // Show/hide selection controls
        if (selectionControls) {
            selectionControls.style.display = checkedBoxes.length > 0 ? 'flex' : 'none';
        }
        
        // Handle Next button click 
        if (nextBtn) {
            nextBtn.onclick = function() {
                if (checkedBoxes.length === 0) {
                    alert('Please select at least one approved asset');
                    return false;
                }
                
                // Clear form and add selected assets
                if (createAdsForm) {
                    createAdsForm.innerHTML = '';
                    checkedBoxes.forEach(checkbox => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'selected_assets[]';
                        input.value = checkbox.dataset.id || checkbox.id || Math.random().toString(36).substring(2);
                        createAdsForm.appendChild(input);
                    });
                    
                    // Submit the form
                    console.log("Submitting form with", checkedBoxes.length, "selected assets");
                    createAdsForm.submit();
                }
                
                return false;
            };
        }
    }
    
    // Listen for changes to checkboxes
    document.body.addEventListener('change', function(e) {
        if (e.target && e.target.type === 'checkbox') {
            updateSelection();
        }
    });
    
    // Initial update
    updateSelection();
});

// Update this code so it targets the correct form action
function submitAssetsToAdsBuilder(selectedAssets) {
    const createAdsForm = document.getElementById('createAdsForm');
    
    // Make sure the form is properly set up
    createAdsForm.action = '/ads_builder';  // Not '/ads-builder'
    createAdsForm.method = 'post';
    
    // Clear existing inputs
    createAdsForm.innerHTML = '';
    
    // Add selected assets as hidden inputs
    selectedAssets.forEach(asset => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_assets[]';
        input.value = asset.id;
        createAdsForm.appendChild(input);
    });
    
    // Submit the form
    console.log("Submitting form to /ads_builder");
    createAdsForm.submit();
} 