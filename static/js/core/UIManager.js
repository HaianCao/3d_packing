/**
 * UIManager - Handles UI interactions and event management
 * Single Responsibility: Managing UI updates, event handling, and user feedback
 */
class UIManager {
    constructor() {
        this.modals = {};
        this.toastContainer = null;
        this.setupToastContainer();
    }

    /**
     * Setup toast container for notifications
     */
    setupToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        this.toastContainer = container;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastId = `toast_${Date.now()}`;
        const icon = this.getToastIcon(type);
        const bgClass = this.getToastBackgroundClass(type);
        
        const toastHtml = `
            <div class="toast ${bgClass} text-white" role="alert" id="${toastId}" data-bs-autohide="true" data-bs-delay="${duration}">
                <div class="toast-header ${bgClass} text-white border-0">
                    <i class="${icon} me-2"></i>
                    <strong class="me-auto">${this.getToastTitle(type)}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        this.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        
        // Auto-remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
        
        toast.show();
        
        return toast;
    }

    /**
     * Show processing toast (doesn't auto-hide)
     */
    showProcessingToast(message) {
        const toastId = `processing_toast_${Date.now()}`;
        
        const toastHtml = `
            <div class="toast bg-info text-white" role="alert" id="${toastId}" data-bs-autohide="false">
                <div class="toast-header bg-info text-white border-0">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <strong class="me-auto">Processing</strong>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        this.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        return {
            toast: toast,
            element: toastElement,
            hide: () => {
                toast.hide();
                setTimeout(() => toastElement.remove(), 500);
            }
        };
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get toast background class based on type
     */
    getToastBackgroundClass(type) {
        const classes = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        };
        return classes[type] || classes.info;
    }

    /**
     * Get toast title based on type
     */
    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || titles.info;
    }

    /**
     * Update items list display
     */
    updateItemsList(groupedItems, itemCount, onRemoveCallback) {
        const itemsList = document.getElementById('itemsListContent');
        const itemCountDisplay = document.getElementById('itemCount');
        
        if (itemCountDisplay) {
            itemCountDisplay.textContent = itemCount;
        }
        
        if (!itemsList) return;
        
        if (itemCount === 0) {
            itemsList.innerHTML = `
                <div class="text-center p-3 text-muted">
                    <i class="fas fa-box-open fa-2x mb-2"></i>
                    <p>No items added yet</p>
                </div>
            `;
            
            // Disable export buttons
            this.setButtonState('exportItems', false);
            this.setButtonState('exportItemsList', false);
        } else {
            // Enable export buttons
            this.setButtonState('exportItems', false);
            this.setButtonState('exportItemsList', false);
            
            itemsList.innerHTML = Object.keys(groupedItems).map(requestId => {
                const group = groupedItems[requestId];
                return `
                    <div class="item-group mb-2 p-2 border rounded bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong class="text-primary">ID: ${group.request_id}</strong>
                                <small class="text-muted ms-2">(${group.count} items)</small>
                            </div>
                            <button class="btn btn-outline-danger btn-sm" onclick="visualizer.removeItemGroup(${group.request_id})" title="Remove all items with this ID">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="mt-1">
                            <small class="text-muted">
                                <i class="fas fa-cube me-1"></i>
                                ${group.dimensions.length} × ${group.dimensions.width} × ${group.dimensions.height}
                                <span class="ms-2">
                                    <i class="fas fa-sync-alt me-1"></i>
                                    ${group.dimensions.number_axis}-axis
                                </span>
                            </small>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Update weights table display
     */
    updateWeightsTable(weightsTableData, onWeightChangeCallback, onResetCallback) {
        const weightsSection = document.getElementById('weightsSection');
        const weightsTable = document.getElementById('weightsTable');
        const weightsWarning = document.getElementById('weightsWarning');
        
        if (!weightsSection || !weightsTable) return;
        
        // Always show weights section
        weightsSection.style.display = 'block';
        
        if (!weightsTableData || weightsTableData.length === 0) {
            weightsWarning.style.display = 'block';
            weightsTable.style.display = 'none';
            return;
        }
        
        // Show table, hide warning
        weightsWarning.style.display = 'none';
        weightsTable.style.display = 'block';
        
        // Generate table
        const tableHtml = `
            <table class="table table-sm mb-0">
                <thead class="table-warning">
                    <tr>
                        <th>Weight Parameter</th>
                        <th style="width: 120px;">Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${weightsTableData.map(({ key, value, isDefault }) => `
                        <tr${isDefault ? '' : ' class="table-info"'}>
                            <td><code>${key}</code></td>
                            <td>
                                <input type="number" 
                                       class="form-control form-control-sm" 
                                       value="${value}" 
                                       step="0.1" 
                                       onchange="${onWeightChangeCallback}('${key}', this.value)">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        weightsTable.innerHTML = tableHtml;
    }

    /**
     * Update training weights table
     */
    updateTrainingWeightsTable(weightsTableData, onWeightChangeCallback) {
        const trainingWeightsTable = document.getElementById('trainingWeightsTable');
        
        if (!trainingWeightsTable || !weightsTableData) return;
        
        const tableHtml = `
            <table class="table table-sm mb-0">
                <thead class="table-success">
                    <tr>
                        <th>Weight Parameter</th>
                        <th style="width: 120px;">Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${weightsTableData.map(({ key, value, isDefault }) => `
                        <tr${isDefault ? '' : ' class="table-info"'}>
                            <td><code>${key}</code></td>
                            <td>
                                <input type="number" 
                                       class="form-control form-control-sm" 
                                       value="${value}" 
                                       step="0.1" 
                                       onchange="${onWeightChangeCallback}('${key}', this.value)">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        trainingWeightsTable.innerHTML = tableHtml;
    }

    /**
     * Update training data info display
     */
    updateTrainingDataInfo(hasData, scenarioCount = 0) {
        const trainingDataInfo = document.getElementById('trainingDataInfo');
        const trainingDataCount = document.getElementById('trainingDataCount');
        const exportTrainingButton = document.getElementById('exportTrainingData');
        
        if (trainingDataInfo) {
            trainingDataInfo.style.display = hasData ? 'block' : 'none';
        }
        
        if (trainingDataCount) {
            trainingDataCount.textContent = scenarioCount;
        }
        
        if (exportTrainingButton) {
            exportTrainingButton.disabled = !hasData;
        }
    }

    /**
     * Update training config inputs
     */
    updateTrainingConfigInputs(config) {
        const stepsInput = document.getElementById('trainingSteps');
        const maxChangeInput = document.getElementById('maxChange');
        const metricSelect = document.getElementById('evaluationMetric');
        
        if (stepsInput) stepsInput.value = config.num_steps;
        if (maxChangeInput) maxChangeInput.value = config.max_change;
        if (metricSelect) metricSelect.value = config.evaluation_metric;
    }

    /**
     * Update statistics display
     */
    updateStats(packedCount = 0, leftoverCount = 0, utilization = null) {
        const placedBadge = document.getElementById('placedBadge');
        const leftoverBadge = document.getElementById('leftoverBadge');
        const utilizationBadge = document.getElementById('utilizationBadge');
        
        if (placedBadge) {
            placedBadge.textContent = `Packed: ${packedCount}`;
        }
        
        if (leftoverBadge) {
            leftoverBadge.textContent = `Leftover: ${leftoverCount}`;
        }
        
        if (utilizationBadge) {
            const utilizationText = utilization !== null ? 
                `${utilization.toFixed(1)}%` : 'N/A';
            utilizationBadge.textContent = `Utilization: ${utilizationText}`;
        }
    }

    /**
     * Show endpoint status
     */
    showEndpointStatus(type, message, info = null) {
        const statusDiv = document.getElementById('endpointStatus');
        if (!statusDiv) return;
        
        const alertClass = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        }[type] || 'alert-info';
        
        const icon = this.getToastIcon(type);
        
        let content = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="${icon} me-2"></i>
                ${message}
        `;
        
        if (info) {
            content += `<br><small>${info}</small>`;
        }
        
        content += `
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        statusDiv.innerHTML = content;
    }

    /**
     * Set button state (enabled/disabled)
     */
    setButtonState(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled;
        }
    }

    /**
     * Setup form validation for inputs
     */
    setupFormValidation() {
        const inputs = ['itemLength', 'itemWidth', 'itemHeight', 'itemId', 'binLength', 'binWidth', 'binHeight'];
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.validateNumericInput(e.target);
                });
            }
        });
    }

    /**
     * Validate numeric input
     */
    validateNumericInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min) || 1;
        const max = parseFloat(input.max) || Infinity;
        
        input.classList.remove('is-valid', 'is-invalid');
        
        if (isNaN(value) || value < min || value > max) {
            input.classList.add('is-invalid');
            return false;
        } else {
            input.classList.add('is-valid');
            return true;
        }
    }

    /**
     * Setup collapse handlers for sidebar cards
     */
    setupCollapseHandlers() {
        const collapseButtons = document.querySelectorAll('.collapse-btn');
        
        collapseButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                const icon = button.querySelector('i');
                
                if (targetElement) {
                    if (targetElement.style.display === 'none') {
                        targetElement.style.display = 'block';
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    } else {
                        targetElement.style.display = 'none';
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-chevron-down');
                    }
                }
            });
        });
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            if (!this.modals[modalId]) {
                this.modals[modalId] = new bootstrap.Modal(modalElement);
            }
            this.modals[modalId].show();
        }
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        if (this.modals[modalId]) {
            this.modals[modalId].hide();
        }
    }

    /**
     * Update bin size inputs
     */
    updateBinSizeInputs(binSize) {
        const lengthInput = document.getElementById('binLength');
        const widthInput = document.getElementById('binWidth');
        const heightInput = document.getElementById('binHeight');
        
        if (lengthInput) lengthInput.value = binSize.length;
        if (widthInput) widthInput.value = binSize.width;
        if (heightInput) heightInput.value = binSize.height;
    }

    /**
     * Update item ID input to next available ID
     */
    updateItemIdInput(nextId) {
        const itemIdInput = document.getElementById('itemId');
        if (itemIdInput) {
            itemIdInput.value = nextId;
        }
    }

    /**
     * Clear form inputs
     */
    clearItemForm() {
        const inputs = ['itemLength', 'itemWidth', 'itemHeight', 'itemQuantity'];
        const defaults = { itemLength: 2, itemWidth: 1, itemHeight: 1, itemQuantity: 1 };
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = defaults[id] || '';
                input.classList.remove('is-valid', 'is-invalid');
            }
        });
        
        // Reset select inputs
        const numberAxisSelect = document.getElementById('itemNumberAxis');
        if (numberAxisSelect) {
            numberAxisSelect.value = '2';
        }
    }

    /**
     * Show loading state for button
     */
    showButtonLoading(buttonId, loadingText = 'Loading...') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.setAttribute('data-original-text', button.innerHTML);
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                ${loadingText}
            `;
        }
    }

    /**
     * Hide loading state for button
     */
    hideButtonLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
        }
    }

    /**
     * Display items information in a table
     */
    displayItemsInfo(packedItems, leftoverItems = []) {
        const itemsPanel = document.getElementById('itemsInfoPanel');
        const tableBody = document.getElementById('itemsTableBody');
        
        if (!tableBody || !itemsPanel) return;
        
        tableBody.innerHTML = '';
        
        // Show packed items
        packedItems.forEach(item => {
            const row = `
                <tr class="table-success">
                    <td><i class="fas fa-check-circle text-success me-1"></i>${item.id}</td>
                    <td>${item.length}×${item.width}×${item.height}</td>
                    <td>${item.x}, ${item.y}, ${item.z}</td>
                    <td><span class="badge bg-success">Packed</span></td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        
        // Show leftover items
        leftoverItems.forEach(item => {
            const row = `
                <tr class="table-warning">
                    <td><i class="fas fa-exclamation-triangle text-warning me-1"></i>${item.id}</td>
                    <td>${item.length}×${item.width}×${item.height}</td>
                    <td>-</td>
                    <td><span class="badge bg-warning">Leftover</span></td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        
        // Show the panel
        itemsPanel.style.display = 'block';
    }

    /**
     * Hide items information panel
     */
    hideItemsInfo() {
        const itemsPanel = document.getElementById('itemsInfoPanel');
        if (itemsPanel) {
            itemsPanel.style.display = 'none';
        }
    }

    /**
     * Destroy UI manager and clean up resources
     */
    destroy() {
        // Clean up modals
        Object.values(this.modals).forEach(modal => {
            if (modal.dispose) {
                modal.dispose();
            }
        });
        this.modals = {};
        
        // Clean up toast container
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
