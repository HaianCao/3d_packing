class BinPackingVisualizer {
    constructor() {
        this.items = [];
        this.packedResults = null;
        this.binSize = { length: 10, width: 10, height: 10 };
        this.nextItemId = 1;
        this.loadingModal = null;

        // Store original input data for export
        this.originalInputData = null;

        // Step-by-step visualization
        this.packingSteps = [];
        this.currentStepIndex = -1;
        this.isPlaying = false;
        this.playInterval = null;
        this.stepSpeed = 1000; // ms

        // Algorithm weights and training
        this.weights = {}; // Store original loaded algorithm weights
        this.currentWeights = {}; // Store editable weights

        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.updateBinSize(); // Initialize bin size from input values
        this.updateWarehouseDisplay();
        this.jsonStructureModal = new bootstrap.Modal(document.getElementById('jsonStructureModal'));
        this.initializePlot();
        this.hideWeights(); // Initially hide weights section
        this.setupFormValidation(); // Setup form validation
    }

    initializeEventListeners() {
        // File upload events
        document.getElementById('uploadJson').addEventListener('click', () => this.uploadJson());
        document.getElementById('uploadVisualizationOnly').addEventListener('click', () => this.uploadVisualizationOnly());
        document.getElementById('showJsonStructure').addEventListener('click', () => this.showJsonStructure());
        document.getElementById('showVisualizationFormat').addEventListener('click', () => this.showVisualizationFormat());

        // Item management events
        document.getElementById('addItem').addEventListener('click', () => this.addItem());
        document.getElementById('clearItems').addEventListener('click', () => this.clearItems());
        document.getElementById('exportItems').addEventListener('click', () => this.exportItems());

        // Packing events
        document.getElementById('runPacking').addEventListener('click', () => this.runPacking());
        document.getElementById('reloadWarehouse').addEventListener('click', () => this.reloadWarehouse());

        // Export events
        document.getElementById('exportResults').addEventListener('click', () => this.exportResults());
        document.getElementById('exportItemsList').addEventListener('click', () => this.exportItemsList());
        document.getElementById('resetAll').addEventListener('click', () => this.resetAll());

        // Configuration events
        document.getElementById('checkEndpoint').addEventListener('click', () => this.checkEndpoint());

        // Training events
        document.getElementById('runTraining').addEventListener('click', () => this.runTraining());
        document.getElementById('checkTrainingEndpoint').addEventListener('click', () => this.checkTrainingEndpoint());
        document.getElementById('showTrainingFormat').addEventListener('click', () => this.showTrainingFormat());

        // Modal events
        document.getElementById('copyJsonExample').addEventListener('click', () => this.copyJsonExample());
        document.getElementById('downloadJsonExample').addEventListener('click', () => this.downloadJsonExample());

        // Step control events
        document.getElementById('playPause').addEventListener('click', () => this.togglePlayPauseSteps());
        document.getElementById('nextStep').addEventListener('click', () => this.nextStep());
        document.getElementById('prevStep').addEventListener('click', () => this.prevStep());
        document.getElementById('stepSpeed').addEventListener('input', (e) => this.updateStepSpeed(e.target.value));
    }

    setupFormValidation() {
        const inputs = ['itemLength', 'itemWidth', 'itemHeight', 'itemId', 'binLength', 'binWidth', 'binHeight'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => {
                const value = parseInt(input.value);
                if (value < 1 || isNaN(value)) {
                    input.value = 1;
                }
                // Update bin size if it's a warehouse dimension input
                if (['binLength', 'binWidth', 'binHeight'].includes(id)) {
                    this.updateBinSize();
                }
            });

            // Also handle blur event to ensure validation when user leaves the field
            input.addEventListener('blur', () => {
                const value = parseInt(input.value);
                if (value < 1 || isNaN(value)) {
                    input.value = 1;
                    if (['binLength', 'binWidth', 'binHeight'].includes(id)) {
                        this.updateBinSize();
                    }
                }
            });
        });
    }

    updateBinSize() {
        const length = parseInt(document.getElementById('binLength').value) || 1;
        const width = parseInt(document.getElementById('binWidth').value) || 1;
        const height = parseInt(document.getElementById('binHeight').value) || 1;

        // Validation: ensure values are positive
        if (length < 1) document.getElementById('binLength').value = 1;
        if (width < 1) document.getElementById('binWidth').value = 1;
        if (height < 1) document.getElementById('binHeight').value = 1;

        this.binSize = {
            length: Math.max(1, length),
            width: Math.max(1, width),
            height: Math.max(1, height)
        };
    }

    reloadWarehouse() {
        this.updateBinSize(); // Ensure bin size is updated from inputs
        this.updateWarehouseDisplay();
        this.showToast('Warehouse dimensions updated!', 'success');
    }

    addItem() {
        const length = parseInt(document.getElementById('itemLength').value);
        const width = parseInt(document.getElementById('itemWidth').value);
        const height = parseInt(document.getElementById('itemHeight').value);
        const id = parseInt(document.getElementById('itemId').value);
        const numberAxis = parseInt(document.getElementById('itemNumberAxis').value);
        const quantity = parseInt(document.getElementById('itemQuantity').value);

        // Validation
        if (!length || !width || !height || !id || !quantity) {
            this.showToast('Please fill in all item fields', 'danger');
            return;
        }

        if (length < 1 || width < 1 || height < 1 || id < 1 || quantity < 1) {
            this.showToast('All dimensions, ID and quantity must be positive numbers', 'danger');
            return;
        }

        // Check if request_id already exists
        if (this.items.some(item => {
            const itemRequestId = (item.request_id !== undefined && item.request_id !== null) ? item.request_id : item.id;
            return itemRequestId === id;
        })) {
            this.showToast('Item ID already exists. Please use a different ID.', 'warning');
            return;
        }

        // Create items with similar logic as JSON upload
        let itemsAdded = 0;

        // Add individual items for each quantity using nextItemId for unique IDs
        for (let i = 0; i < quantity; i++) {
            const uniqueId = this.nextItemId + i;
            const item = {
                id: uniqueId,
                request_id: id, // Group items by original ID
                length: length,
                width: width,
                height: height,
                number_axis: numberAxis,
                quantity: quantity, // Store original quantity for display
                original_id: id // Store original form ID
            };
            this.items.push(item);
            itemsAdded++;
        }

        this.nextItemId += quantity;
        this.updateItemsList();
        this.updateItemId();

        // Clear form
        document.getElementById('itemLength').value = 2;
        document.getElementById('itemWidth').value = 1;
        document.getElementById('itemHeight').value = 1;
        document.getElementById('itemQuantity').value = 1;
        document.getElementById('itemNumberAxis').value = 2;

        const message = quantity === 1 ?
            `Item ${id} added successfully!` :
            `${quantity} items added with request ID ${id} (expanded from 1 unique item)`;
        this.showToast(message, 'success');
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.updateItemsList();
        this.showToast(`Item ${id} removed`, 'info');
    }

    removeItemGroup(requestId) {
        const itemsToRemove = this.items.filter(item => {
            const itemRequestId = (item.request_id !== undefined && item.request_id !== null) ? item.request_id : item.id;
            return itemRequestId == requestId; // Use == to handle string/number comparison
        });
        const count = itemsToRemove.length;

        this.items = this.items.filter(item => {
            const itemRequestId = (item.request_id !== undefined && item.request_id !== null) ? item.request_id : item.id;
            return itemRequestId != requestId; // Use != to handle string/number comparison
        });
        this.updateItemsList();

        const message = count === 1 ?
            `Item ${requestId} removed` :
            `${count} items with request ID ${requestId} removed`;
        this.showToast(message, 'info');
    }

    clearItems() {
        this.items = [];
        this.packedResults = null;
        this.packingSteps = [];
        this.currentStepIndex = -1;
        this.pauseAnimation();
        this.updateItemsList();
        this.updateStats();
        this.initializePlot();
        document.getElementById('exportResults').disabled = true;
        document.getElementById('stepControlPanel').style.display = 'none';
        this.showToast('All items cleared', 'info');
    }

    updateItemId() {
        document.getElementById('itemId').value = this.nextItemId;
    }

    updateItemsList() {
        const itemsList = document.getElementById('itemsList');
        const itemCount = document.getElementById('itemCount');

        itemCount.textContent = this.items.length;

        if (this.items.length === 0) {
            itemsList.innerHTML = `
                <div class="text-center p-3 text-muted">
                    <i class="fas fa-box-open fa-2x mb-2"></i>
                    <p>No items added yet</p>
                </div>
            `;
            // Disable export items buttons when no items
            document.getElementById('exportItems').disabled = true;
            document.getElementById('exportItemsList').disabled = true;
            return;
        }

        // Enable export items buttons when items exist
        document.getElementById('exportItems').disabled = false;
        document.getElementById('exportItemsList').disabled = false;

        // Group items by request_id for display similar to JSON upload
        const groupedItems = {};
        this.items.forEach(item => {
            const requestId = (item.request_id !== undefined && item.request_id !== null) ? item.request_id : item.id;
            if (!groupedItems[requestId]) {
                groupedItems[requestId] = [];
            }
            groupedItems[requestId].push(item);
        });

        itemsList.innerHTML = Object.keys(groupedItems).map(requestId => {
            const group = groupedItems[requestId];
            const firstItem = group[0];
            const count = group.length;

            return `
                <div class="item-entry" data-id="${requestId}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Item #${requestId}${count > 1 ? ` (${count} items)` : ''}</strong>
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-cube me-1"></i>
                                ${firstItem.length} × ${firstItem.width} × ${firstItem.height}
                                ${count > 1 ? ` | Qty: ${count}` : ''}
                                ${firstItem.number_axis ? ` | ${firstItem.number_axis}-axis` : ''}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="visualizer.removeItemGroup(${requestId})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async uploadJson() {
        const fileInput = document.getElementById('jsonFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('Please select a JSON file', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate JSON structure
            const response = await fetch('/validate_json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success) {
                this.showToast(`JSON validation failed: ${result.message}`, 'danger');
                return;
            }

            // Store original input data for export
            this.originalInputData = data;

            // Apply data - use processed items from server if available
            if (result.processed_items) {
                this.items = result.processed_items;
            } else {
                // Fallback for old validation format
                this.items = data.items.map(item => ({
                    id: item.id,
                    request_id: item.request_id || item.id,
                    length: item.length || item.L,
                    width: item.width || item.W,
                    height: item.height || item.H
                }));
            }
            this.binSize = result.bin_size;

            // Update UI
            document.getElementById('binLength').value = this.binSize.length;
            document.getElementById('binWidth').value = this.binSize.width;
            document.getElementById('binHeight').value = this.binSize.height;
            this.updateBinSize();
            this.updateItemsList();
            this.updateWarehouseDisplay();

            // Display weights if available
            if (data.parameters && data.parameters.weights) {
                this.showWeights(data.parameters.weights);
            } else {
                this.hideWeights();
            }

            this.nextItemId = Math.max(...this.items.map(item => item.id), 0) + 1;
            this.updateItemId();

            const itemMessage = result.original_item_count && result.original_item_count !== result.item_count
                ? `Loaded ${result.item_count} items (expanded from ${result.original_item_count} unique items) from JSON file`
                : `Loaded ${result.item_count} items from JSON file`;
            this.showToast(itemMessage, 'success');

        } catch (error) {
            this.showToast(`Failed to load JSON file: ${error.message}`, 'danger');
        }
    }



    visualizeItemsOnly(items) {
        // Create plot data for visualization only
        const traces = [];

        // Add bin outline
        traces.push(this.createWarehouseOutline());

        // Add items as colored boxes
        items.forEach((item, index) => {
            const color = item.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;

            traces.push({
                type: 'mesh3d',
                x: [item.x, item.x + item.length, item.x + item.length, item.x,
                    item.x, item.x + item.length, item.x + item.length, item.x],
                y: [item.y, item.y, item.y + item.width, item.y + item.width,
                    item.y, item.y, item.y + item.width, item.y + item.width],
                z: [item.z, item.z, item.z, item.z,
                    item.z + item.height, item.z + item.height, item.z + item.height, item.z + item.height],
                i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
                j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
                k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
                color: color,
                opacity: 0.8,
                name: `Item ${item.id}`,
                hovertemplate: `<b>Item ${item.id}</b><br>` +
                              `Size: ${item.length}×${item.width}×${item.height}<br>` +
                              `Position: (${item.x}, ${item.y}, ${item.z})<br>` +
                              '<extra></extra>'
            });
        });

        const layout = {
            scene: {
                xaxis: { title: 'Length', range: [0, this.binSize.length] },
                yaxis: { title: 'Width', range: [0, this.binSize.width] },
                zaxis: { title: 'Height', range: [0, this.binSize.height] },
                aspectmode: 'cube'
            },
            title: 'Items Visualization (No Packing)',
            showlegend: false,
            margin: { l: 0, r: 0, b: 0, t: 30 }
        };

        Plotly.newPlot('plot3d', traces, layout);

        // Update stats
        document.getElementById('placedBadge').textContent = `Visualized: ${items.length}`;
        document.getElementById('leftoverBadge').textContent = 'Leftover: 0';
        document.getElementById('utilizationBadge').textContent = 'Utilization: N/A';
        document.getElementById('trainingScoreBadge').textContent = 'Training Score: N/A';
    }

    async uploadVisualizationOnly() {
        const fileInput = document.getElementById('visualizeFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('Please select a JSON file for visualization', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate that the data has the expected packing result structure
            if (!data.bin_size || !data.packed_items) {
                this.showToast('Invalid format: Expected packing result structure with bin_size and packed_items', 'danger');
                return;
            }

            // Extract bin size
            const binSize = data.bin_size;
            this.binSize = {
                length: binSize.length || binSize.L || 10,
                width: binSize.width || binSize.W || 10,
                height: binSize.height || binSize.H || 10
            };

            // Update UI with bin size
            document.getElementById('binLength').value = this.binSize.length;
            document.getElementById('binWidth').value = this.binSize.width;
            document.getElementById('binHeight').value = this.binSize.height;
            this.updateBinSize();

            // Use packed items directly for visualization
            const packedItems = data.packed_items || [];
            const leftoverItems = data.leftover_items || [];

            // Set packed results to enable full interface like packing algorithm
            this.packedResults = {
                packed_items: packedItems,
                leftover_items: leftoverItems,
                utilization: data.utilization || 0,
                packing_time: data.packing_time || 0,
                bin_size: this.binSize,
                steps: [] // Empty steps for visualization only
            };

            // Use same visualization flow as packing algorithm
            setTimeout(() => {
                try {
                    // Use the regular visualization function to match packing algorithm interface
                    this.visualizePacking();

                    // Update stats like packing algorithm
                    this.updateStats();

                    // Show step controls (even if empty)
                    this.initializeStepControls();

                    // Show items information panel
                    this.displayItemsInfo(packedItems, leftoverItems);

                    // Enable export like packing algorithm
                    document.getElementById('exportResults').disabled = false;
                    document.getElementById('exportItemsList').disabled = false;

                    this.showToast(`Visualized ${packedItems.length} packed items from result file`, 'success');
                } catch (error) {
                    console.error('Visualization error:', error);
                    this.showToast('Error rendering visualization. Please try again.', 'danger');
                }
            }, 10);

        } catch (error) {
            this.showToast(`Failed to load packing result file: ${error.message}`, 'danger');
        }
    }

    visualizePackedItems(packedItems) {
        // Create plot data for packed items with their coordinates
        const traces = [];

        // Add warehouse outline
        traces.push(this.createWarehouseOutline());

        // Add each packed item as a colored box at its packed position
        packedItems.forEach((item, index) => {
            const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;

            traces.push({
                type: 'mesh3d',
                x: [item.x, item.x + item.length, item.x + item.length, item.x,
                    item.x, item.x + item.length, item.x + item.length, item.x],
                y: [item.y, item.y, item.y + item.width, item.y + item.width,
                    item.y, item.y, item.y + item.width, item.y + item.width],
                z: [item.z, item.z, item.z, item.z,
                    item.z + item.height, item.z + item.height, item.z + item.height, item.z + item.height],
                i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
                j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
                k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
                color: color,
                opacity: 0.8,
                name: `Item ${item.id}`,
                hovertemplate: `<b>Item ${item.id}</b><br>` +
                              `Size: ${item.length}×${item.width}×${item.height}<br>` +
                              `Position: (${item.x}, ${item.y}, ${item.z})<br>` +
                              '<extra></extra>'
            });
        });

        const layout = {
            scene: {
                xaxis: { title: 'Length', range: [0, this.binSize.length] },
                yaxis: { title: 'Width', range: [0, this.binSize.width] },
                zaxis: { title: 'Height', range: [0, this.binSize.height] },
                aspectmode: 'cube'
            },
            title: 'Packed Items Visualization',
            showlegend: false,
            margin: { l: 0, r: 0, b: 0, t: 30 }
        };

        Plotly.newPlot('plot3d', traces, layout);

        // Update stats
        document.getElementById('placedBadge').textContent = `Packed: ${packedItems.length}`;
        document.getElementById('leftoverBadge').textContent = 'Leftover: N/A';
        document.getElementById('utilizationBadge').textContent = 'Utilization: N/A';
    }

    showVisualizationFormat() {
        // Create and show a modal with visualization JSON format
        const modalContent = `
            <div class="modal fade" id="visualizationFormatModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-secondary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-eye me-2"></i>
                                Visualization JSON Format
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">Use this JSON format for visualization-only uploads (packing result structure):</p>
                            <div class="bg-light p-3 rounded">
                                <pre><code>{
  "bin_size": {
    "length": 5,
    "width": 3,
    "height": 3
  },
  "packed_items": [
    {
      "id": 0,
      "length": 1,
      "width": 2,
      "height": 1,
      "x": 2,
      "y": 0,
      "z": 0,
      "item_type_id": 0,
      "request_id": 0,
      "pack_order": 1,
      "position_index": 1,
      "rotation_id": 1,
      "total_positions": 1,
      "original_length": 2,
      "original_width": 1,
      "original_height": 1
    }
  ],
  "leftover_items": [
    {
      "height": 1870,
      "id": 84,
      "length": 900,
      "quantity": 1,
      "width": 680
    }
  ],
  "packing_time": 0.55,
  "utilization": 44.44
}</code></pre>
                            </div>
                            <div class="mt-3">
                                <h6>Format Details:</h6>
                                <ul>
                                    <li><strong>bin_size:</strong> Warehouse dimensions (length, width, height)</li>
                                    <li><strong>packed_items:</strong> Array of successfully packed items with coordinates and rotation info</li>
                                    <li><strong>leftover_items:</strong> Array of items that couldn't be packed with original dimensions and quantity</li>
                                    <li><strong>packing_time:</strong> Processing time in seconds (float)</li>
                                    <li><strong>utilization:</strong> Space utilization percentage (float)</li>
                                    <li><strong>id:</strong> Unique identifier for each item</li>
                                    <li><strong>length, width, height:</strong> Item dimensions after rotation</li>
                                    <li><strong>original_length, original_width, original_height:</strong> Original item dimensions before rotation</li>
                                    <li><strong>x, y, z:</strong> Item position coordinates in the warehouse (only for packed items)</li>
                                    <li><strong>rotation_id:</strong> Applied rotation (0=no rotation, 1=90° rotation, etc.)</li>
                                    <li><strong>pack_order:</strong> Order in which items were packed</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="copyVisualizationExample">
                                <i class="fas fa-copy me-2"></i>
                                Copy Example
                            </button>
                            <button type="button" class="btn btn-outline-secondary" id="downloadVisualizationExample">
                                <i class="fas fa-download me-2"></i>
                                Download Example
                            </button>
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if it exists
        const existingModal = document.getElementById('visualizationFormatModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('visualizationFormatModal'));
        modal.show();

        // Add event listeners for copy and download
        document.getElementById('copyVisualizationExample').addEventListener('click', this.copyVisualizationExample.bind(this));
        document.getElementById('downloadVisualizationExample').addEventListener('click', this.downloadVisualizationExample.bind(this));
    }

    copyVisualizationExample() {
        const example = {
            bin_size: {
                length: 1000,
                width: 800,
                height: 600
            },
            packed_items: [
                {
                    id: 1,
                    length: 300,
                    width: 200,
                    height: 150,
                    x: 0,
                    y: 0,
                    z: 0
                },
                {
                    id: 2,
                    length: 250,
                    width: 180,
                    height: 120,
                    x: 300,
                    y: 0,
                    z: 0
                }
            ]
        };

        navigator.clipboard.writeText(JSON.stringify(example, null, 2)).then(() => {
            this.showToast('Visualization example copied to clipboard!', 'success');
        }).catch(() => {
            this.fallbackCopyToClipboard(example);
        });
    }

    fallbackCopyToClipboard(example) {
        const text = JSON.stringify(example, null, 2);
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showToast('Visualization example copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('Failed to copy to clipboard. Please copy manually.', 'warning');
        }

        document.body.removeChild(textArea);
    }

    downloadVisualizationExample() {
        const example = {
            bin_size: {
                length: 1000,
                width: 800,
                height: 600
            },
            packed_items: [
                {
                    id: 1,
                    length: 300,
                    width: 200,
                    height: 150,
                    x: 0,
                    y: 0,
                    z: 0
                },
                {
                    id: 2,
                    length: 250,
                    width: 180,
                    height: 120,
                    x: 300,
                    y: 0,
                    z: 0
                }
            ]
        };

        const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visualization_example.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Visualization example downloaded!', 'success');
    }

    displayItemsInfo(packedItems, leftoverItems = []) {
        const tableBody = document.getElementById('itemsInfoTable');
        tableBody.innerHTML = '';

        // Show packed items
        packedItems.forEach(item => {
            const volume = item.length * item.width * item.height;
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.length}</td>
                <td>${item.width}</td>
                <td>${item.height}</td>
                <td>${volume.toLocaleString()}</td>
                <td><span class="badge bg-success">Packed</span></td>
                <td>(${item.x}, ${item.y}, ${item.z})</td>
            `;
        });

        // Show leftover items if any
        leftoverItems.forEach(item => {
            const volume = item.length * item.width * item.height;
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.length}</td>
                <td>${item.width}</td>
                <td>${item.height}</td>
                <td>${volume.toLocaleString()}</td>
                <td><span class="badge bg-warning">Leftover</span></td>
                <td>-</td>
            `;
        });

        // Show the items info panel
        document.getElementById('itemsInfoPanel').style.display = 'block';
    }

    visualizePacking() {
        if (!this.packedResults) return;

        const data = [];

        // Add warehouse outline
        data.push(this.createWarehouseOutline());

        // Color palette for items
        const colors = [
            '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5',
            '#A8E6CF', '#FFB3BA', '#FFDFBA', '#FFFFBA',
            '#BAE1FF', '#DDA0DD', '#98FB98', '#F0E68C'
        ];

        // Show all packed items (no limit to match visualization only mode)
        const packedItems = this.packedResults.packed_items || [];

        // Add placed items
        packedItems.forEach((item, index) => {
            const color = colors[index % colors.length];
            const itemMesh = this.createItemMesh(item, color);
            data.push(itemMesh);
        });

        const aspectRatio = this.calculateAspectRatio();

        // Update plot
        const layout = {
            scene: {
                xaxis: {
                    title: 'Length',
                    range: [0, this.binSize.length],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                yaxis: {
                    title: 'Width',
                    range: [0, this.binSize.width],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                zaxis: {
                    title: 'Height',
                    range: [0, this.binSize.height],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                bgcolor: '#F8F9FA',
                camera: {
                    eye: { x: 1.5 * aspectRatio.x, y: 1.5 * aspectRatio.y, z: 1.5 * aspectRatio.z }
                },
                aspectmode: 'manual',
                aspectratio: {
                    x: aspectRatio.x,
                    y: aspectRatio.y,
                    z: aspectRatio.z
                }
            },
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'transparent',
            showlegend: false
        };


        Plotly.react('plot3d', data, layout);

        // Add click event for item details
        document.getElementById('plot3d').on('plotly_click', (eventData) => {
            if (eventData.points[0] && eventData.points[0].customdata) {
                this.showItemDetails(eventData.points[0].customdata);
            }
        });
    }

    // Algorithm Endpoint Configuration Functions
    async checkEndpoint() {
        const endpointUrl = document.getElementById('packingEndpoint').value.trim();
        const statusDiv = document.getElementById('endpointStatus');
        const checkBtn = document.getElementById('checkEndpoint');

        if (!endpointUrl) {
            this.showEndpointStatus('error', 'Vui lòng nhập endpoint URL');
            return;
        }

        // Show loading state
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        checkBtn.disabled = true;
        statusDiv.innerHTML = '<div class="text-info"><i class="fas fa-spinner fa-spin me-1"></i>Đang kiểm tra...</div>';

        try {
            const response = await fetch('/check_endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint_url: endpointUrl
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showEndpointStatus('success', result.message, result.endpoint_info);
                this.showToast('Endpoint hoạt động bình thường!', 'success');
            } else {
                this.showEndpointStatus('error', result.message);
                this.showToast(`Endpoint error: ${result.message}`, 'danger');
            }

        } catch (error) {
            console.error('Check endpoint error:', error);
            this.showEndpointStatus('error', 'Lỗi kết nối khi kiểm tra endpoint');
            this.showToast('Lỗi kết nối khi kiểm tra endpoint', 'danger');
        } finally {
            // Restore button state
            checkBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
            checkBtn.disabled = false;
        }
    }

    showEndpointStatus(type, message, info = null) {
        const statusDiv = document.getElementById('endpointStatus');
        let iconClass, bgClass, textClass;

        switch (type) {
            case 'success':
                iconClass = 'fas fa-check-circle';
                bgClass = 'bg-success';
                textClass = 'text-success';
                break;
            case 'error':
                iconClass = 'fas fa-exclamation-triangle';
                bgClass = 'bg-danger';
                textClass = 'text-danger';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-circle';
                bgClass = 'bg-warning';
                textClass = 'text-warning';
                break;
            default:
                iconClass = 'fas fa-info-circle';
                bgClass = 'bg-info';
                textClass = 'text-info';
        }

        let html = `
            <div class="alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show p-2 mt-2" role="alert">
                <i class="${iconClass} me-1"></i>
                <small>${message}</small>
        `;

        if (info) {
            html += `
                <br><small class="text-muted">
                    Service: ${info.service || 'Unknown'} |
                    Version: ${info.version || 'Unknown'}
                </small>
            `;
        }

        html += `
                <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert"></button>
            </div>
        `;

        statusDiv.innerHTML = html;
    }

    onEndpointChange() {
        // Clear status when endpoint URL changes
        document.getElementById('endpointStatus').innerHTML = '';
    }

    async runPacking() {
        if (this.items.length === 0) {
            this.showToast('Please add items before running the packing algorithm', 'warning');
            return;
        }

        // Get endpoint configuration
        const packingEndpoint = document.getElementById('packingEndpoint').value.trim();

        if (!packingEndpoint) {
            this.showToast('Vui lòng cấu hình endpoint thuật toán packing trước', 'warning');
            return;
        }

        // Show brief processing toast instead of modal
        this.showProcessingToast('Processing packing algorithm...');

        try {
            console.log('Starting packing request...');
            const requestData = {
                packing_endpoint: packingEndpoint,
                bin_size: this.binSize,
                items: this.items,
                algorithm_steps: true
            };

            // Add current weights if available
            const currentWeights = this.getCurrentWeights();
            if (currentWeights) {
                requestData.parameters = {
                    weights: currentWeights
                };
                console.log('Sending weights with request:', currentWeights);
            }

            console.log('Request data:', requestData);

            const response = await fetch('/pack', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response received, parsing JSON...');
            const result = await response.json();
            console.log('Packing result:', result);

            if (!result.success) {
                this.showToast(`Packing failed: ${result.message}`, 'danger');
                return;
            }

            console.log('Setting packed results...');
            this.packedResults = result;

            // Process results immediately without blocking UI
            setTimeout(() => {
                try {
                    console.log('Starting visualization...');
                    this.visualizePacking();

                    console.log('Updating stats...');
                    this.updateStats();

                    console.log('Initializing step controls...');
                    this.initializeStepControls();

                    console.log('Displaying items info...');
                    this.displayItemsInfo(result.packed_items || [], result.leftover_items || []);

                    console.log('Enabling export...');
                    document.getElementById('exportResults').disabled = false;

                    console.log('Showing success message...');
                    this.showToast('Packing completed successfully!', 'success');

                    console.log('All processing completed.');
                } catch (error) {
                    console.error('Visualization error:', error);
                    this.showToast('Error rendering visualization. Please try again.', 'danger');
                }
            }, 10);

        } catch (error) {
            console.error('Packing error:', error);
            this.showToast(`Network error: ${error.message}`, 'danger');
        }
    }

    calculateAspectRatio() {
        // Calculate proper aspect ratios based on bin dimensions
        const maxDim = Math.max(this.binSize.length, this.binSize.width, this.binSize.height);
        return {
            x: this.binSize.length / maxDim,
            y: this.binSize.width / maxDim,
            z: this.binSize.height / maxDim
        };
    }

    initializePlot() {
        const data = [];

        // Create warehouse outline
        const warehouseOutline = this.createWarehouseOutline();
        data.push(warehouseOutline);

        const aspectRatio = this.calculateAspectRatio();

        const layout = {
            scene: {
                xaxis: {
                    title: 'Length',
                    range: [0, this.binSize.length],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                yaxis: {
                    title: 'Width',
                    range: [0, this.binSize.width],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                zaxis: {
                    title: 'Height',
                    range: [0, this.binSize.height],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                bgcolor: '#F8F9FA',
                camera: {
                    eye: { x: 1.5 * aspectRatio.x, y: 1.5 * aspectRatio.y, z: 1.5 * aspectRatio.z }
                },
                aspectmode: 'manual',
                aspectratio: {
                    x: aspectRatio.x,
                    y: aspectRatio.y,
                    z: aspectRatio.z
                }
            },
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'transparent',
            showlegend: false
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
            displaylogo: false
        };

        Plotly.newPlot('plot3d', data, layout, config);
    }

    createWarehouseOutline() {
        const { length, width, height } = this.binSize;

        // Define the 8 vertices of the warehouse
        const vertices = [
            [0, 0, 0], [length, 0, 0], [length, width, 0], [0, width, 0],  // bottom
            [0, 0, height], [length, 0, height], [length, width, height], [0, width, height]  // top
        ];

        // Define the 12 edges
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  // bottom edges
            [4, 5], [5, 6], [6, 7], [7, 4],  // top edges
            [0, 4], [1, 5], [2, 6], [3, 7]   // vertical edges
        ];

        const x = [], y = [], z = [];

        edges.forEach(edge => {
            const [start, end] = edge;
            x.push(vertices[start][0], vertices[end][0], null);
            y.push(vertices[start][1], vertices[end][1], null);
            z.push(vertices[start][2], vertices[end][2], null);
        });

        return {
            type: 'scatter3d',
            mode: 'lines',
            x: x,
            y: y,
            z: z,
            line: {
                color: '#4CAF50',
                width: 3
            },
            name: 'Warehouse'
        };
    }

    createItemMesh(item, color) {
        const { x, y, z, length, width, height } = item;

        // Define the 8 vertices of the box
        const vertices = [
            [x, y, z],                          // 0: bottom-front-left
            [x + length, y, z],                 // 1: bottom-front-right
            [x + length, y + width, z],         // 2: bottom-back-right
            [x, y + width, z],                  // 3: bottom-back-left
            [x, y, z + height],                 // 4: top-front-left
            [x + length, y, z + height],        // 5: top-front-right
            [x + length, y + width, z + height], // 6: top-back-right
            [x, y + width, z + height]          // 7: top-back-left
        ];

        // Define proper triangular faces with correct winding order (counter-clockwise)
        const faces = [
            // Bottom face (z = z) - normal pointing down
            [0, 1, 2], [0, 2, 3],
            // Top face (z = z + height) - normal pointing up
            [4, 7, 6], [4, 6, 5],
            // Front face (y = y) - normal pointing forward
            [0, 4, 5], [0, 5, 1],
            // Back face (y = y + width) - normal pointing backward
            [2, 6, 7], [2, 7, 3],
            // Left face (x = x) - normal pointing left
            [0, 3, 7], [0, 7, 4],
            // Right face (x = x + length) - normal pointing right
            [1, 5, 6], [1, 6, 2]
        ];

        // Extract i, j, k arrays for mesh3d
        const i = [], j = [], k = [];
        faces.forEach(face => {
            i.push(face[0]);
            j.push(face[1]);
            k.push(face[2]);
        });

        const x_coords = vertices.map(v => v[0]);
        const y_coords = vertices.map(v => v[1]);
        const z_coords = vertices.map(v => v[2]);

        return {
            type: 'mesh3d',
            x: x_coords,
            y: y_coords,
            z: z_coords,
            i: i,
            j: j,
            k: k,
            color: color,
            opacity: 1.0,
            lighting: {
                ambient: 0.7,
                diffuse: 1.0,
                specular: 0.1,
                roughness: 0.9,
                fresnel: 0.1
            },
            lightposition: {
                x: 100,
                y: 200,
                z: 0
            },
            customdata: item,
            hovertemplate: `
                <b>Item #${item.id}</b><br>
                <b>Request ID:</b> ${item.request_id || item.id}<br>
                <b>Pack Order:</b> ${item.pack_order || 'N/A'}<br>
                <b>Position:</b> (${item.x}, ${item.y}, ${item.z})<br>
                <b>Size (rotated):</b> ${item.length}×${item.width}×${item.height}<br>
                ${item.original_length ? `<b>Original Size:</b> ${item.original_length}×${item.original_width}×${item.original_height}<br>` : ''}
                ${item.rotation_id !== undefined ? `<b>Rotation ID:</b> ${item.rotation_id}<br>` : ''}
                ${item.position_index ? `<b>Instance:</b> ${item.position_index}/${item.total_positions}<br>` : ''}
                <extra></extra>
            `,
            showscale: false,
            flatshading: true
        };
    }

    showItemDetails(item) {
        const detailsPanel = document.getElementById('detailsPanel');
        const detailsContent = document.getElementById('detailsContent');

        detailsContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary-bright">Item Information</h6>
                    <p><strong>ID:</strong> ${item.id}</p>
                    <p><strong>Request ID:</strong> ${item.request_id}</p>
                    ${item.pack_order ? `<p><strong>Pack Order:</strong> #${item.pack_order}</p>` : ''}
                    ${item.position_index ? `<p><strong>Instance:</strong> ${item.position_index} of ${item.total_positions}</p>` : ''}
                    ${item.rotation_id !== undefined ? `<p><strong>Rotation ID:</strong> ${item.rotation_id}</p>` : ''}
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary-bright">Position</h6>
                    <p><strong>X:</strong> ${item.x}</p>
                    <p><strong>Y:</strong> ${item.y}</p>
                    <p><strong>Z:</strong> ${item.z}</p>
                </div>
                <div class="col-12">
                    <h6 class="text-primary-bright">Dimensions</h6>
                    <p><strong>Rotated Size:</strong> ${item.length} × ${item.width} × ${item.height}</p>
                    ${item.original_length ? `<p><strong>Original Size:</strong> ${item.original_length} × ${item.original_width} × ${item.original_height}</p>` : ''}
                    <p><strong>Volume:</strong> ${item.length * item.width * item.height} cubic units</p>
                </div>
            </div>
        `;

        detailsPanel.style.display = 'block';
        detailsPanel.classList.add('fade-in');
    }

    updateStats() {
        const placedBadge = document.getElementById('placedBadge');
        const leftoverBadge = document.getElementById('leftoverBadge');
        const utilizationBadge = document.getElementById('utilizationBadge');
        const trainingScoreBadge = document.getElementById('trainingScoreBadge');

        if (this.packedResults) {
            const placed = (this.packedResults.packed_items || []).length;
            const leftover = (this.packedResults.leftover_items || []).length;
            const utilization = Math.round((this.packedResults.utilization || 0) * 100);
            const trainingScore = (this.packedResults.training_score || 0).toFixed(4);

            placedBadge.innerHTML = `<i class="fas fa-check-circle me-1"></i>Packed: ${placed}`;
            leftoverBadge.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>Leftover: ${leftover}`;
            utilizationBadge.innerHTML = `<i class="fas fa-chart-pie me-1"></i>Utilization: ${utilization}%`;
            trainingScoreBadge.innerHTML = `<i class="fas fa-brain me-1"></i>Training Score: ${trainingScore}`;
        } else {
            placedBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i>Packed: 0';
            leftoverBadge.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Leftover: 0';
            utilizationBadge.innerHTML = '<i class="fas fa-chart-pie me-1"></i>Utilization: 0%';
            trainingScoreBadge.innerHTML = '<i class="fas fa-brain me-1"></i>Training Score: 0.0000';
        }
    }

    updateWarehouseDisplay() {
        this.initializePlot();
    }

    async exportResults() {
        if (!this.packedResults) {
            this.showToast('No packing results to export', 'warning');
            return;
        }

        try {
            // Send results to server for proper formatting
            const response = await fetch('/export_results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...this.packedResults,
                    bin_size: this.binSize
                })
            });

            const result = await response.json();

            if (!result.success) {
                this.showToast(`Export failed: ${result.message}`, 'danger');
                return;
            }

            console.log('Creating blob and download...', result.export_data);
            const blob = new Blob([JSON.stringify(result.export_data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `packing_results_${Date.now()}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);

            console.log('Triggering download...', a.download);
            a.click();

            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            this.showToast('Results exported successfully!', 'success');

        } catch (error) {
            this.showToast(`Export failed: ${error.message}`, 'danger');
        }
    }

    exportOriginalFile() {
        // Export original input file if available, otherwise export current items
        if (this.originalInputData) {
            // Export the original file data without timestamp
            const exportData = {
                ...this.originalInputData
            };

            console.log('Creating original file export blob...', exportData);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `original_input_file_${Date.now()}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);

            console.log('Triggering original file download...', a.download);
            a.click();

            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            this.showToast('Original input file exported successfully!', 'success');
        } else {
            // Fallback to current items export if no original file
            this.exportItemsList();
        }
    }

    async exportItemsList() {
        if (!this.items || this.items.length === 0) {
            this.showToast('No items to export', 'warning');
            return;
        }

        try {
            // Send items to server for proper formatting
            const response = await fetch('/export_items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: this.items,
                    bin_size: this.binSize
                })
            });

            const result = await response.json();

            if (!result.success) {
                this.showToast(`Export failed: ${result.message}`, 'danger');
                return;
            }

            console.log('Creating items export blob...', result.export_data);
            const blob = new Blob([JSON.stringify(result.export_data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `items_list_${Date.now()}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);

            console.log('Triggering items download...', a.download);
            a.click();

            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            this.showToast('Items list exported successfully!', 'success');

        } catch (error) {
            this.showToast(`Export failed: ${error.message}`, 'danger');
        }
    }

    resetAll() {
        this.items = [];
        this.packedResults = null;
        this.packingSteps = [];
        this.currentStepIndex = -1;
        this.nextItemId = 1;
        this.originalInputData = null; // Clear original input data
        this.weights = {}; // Reset weights
        this.currentWeights = {}; // Reset editable weights
        this.pauseAnimation();

        // Reset form values
        document.getElementById('binLength').value = 10;
        document.getElementById('binWidth').value = 10;
        document.getElementById('binHeight').value = 10;
        document.getElementById('itemLength').value = 2;
        document.getElementById('itemWidth').value = 1;
        document.getElementById('itemHeight').value = 1;
        document.getElementById('itemId').value = 1;
        document.getElementById('itemQuantity').value = 1;
        document.getElementById('itemNumberAxis').value = 2;
        document.getElementById('jsonFile').value = '';
        document.getElementById('visualizeFile').value = ''; // Clear visualize file input
        document.getElementById('trainingFile').value = ''; // Clear training file input
        document.getElementById('trainingEndpoint').value = ''; // Clear training endpoint

        this.binSize = { length: 10, width: 10, height: 10 };
        this.updateBinSize();
        this.updateItemsList();
        this.updateStats();
        this.initializePlot();
        this.hideWeights(); // Hide weights section after reset

        document.getElementById('exportResults').disabled = true;
        document.getElementById('exportItemsList').disabled = this.items.length === 0;
        document.getElementById('stepControlPanel').style.display = 'none';

        this.showToast('All data reset to default values', 'info');
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast_' + Date.now();
        const bgClass = {
            success: 'bg-success',
            danger: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        // Show toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
        toast.show();

        // Remove from DOM after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    showProcessingToast(message) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create small processing toast
        const toastId = 'processing_toast_' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-primary border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        ${message}
                    </div>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        // Show toast with short delay (auto-hide in 1.5 seconds)
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 1500 });
        toast.show();

        // Remove from DOM after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        // Return toast ID for manual hiding if needed
        return toastId;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Step-by-step visualization methods
    initializeStepControls() {
        if (!this.packedResults || !this.packedResults.packing_steps || this.packedResults.packing_steps.length === 0) {
            document.getElementById('stepControlPanel').style.display = 'none';
            return;
        }

        this.packingSteps = this.packedResults.packing_steps;
        // Start at the final step instead of beginning
        this.currentStepIndex = this.packingSteps.length - 1;

        document.getElementById('stepControlPanel').style.display = 'block';
        document.getElementById('totalSteps').textContent = this.packingSteps.length;
        
        // Update controls to show final step
        this.updateStepControls();
        
        // Reset play state
        this.isPlaying = false;
        this.updatePlayPauseButton();

        // Initialize with final step visualization (show all items packed)
        this.showStepVisualization(this.currentStepIndex);
    }

    previousStep() {
        if (this.currentStepIndex > -1) {
            this.currentStepIndex--;
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
        }
    }

    nextStep() {
        if (this.currentStepIndex < this.packingSteps.length - 1) {
            this.currentStepIndex++;
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
        }
    }

    togglePlayPauseSteps() { // Renamed to avoid conflict with global togglePlayPause
        if (this.isPlaying) {
            this.pauseAnimation();
        } else {
            this.playAnimation();
        }
    }

    playAnimation() {
        // If at final step, reset to beginning for animation
        if (this.currentStepIndex >= this.packingSteps.length - 1) {
            this.currentStepIndex = -1; // Start from beginning
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
        }

        this.isPlaying = true;
        this.updatePlayPauseButton();

        this.playInterval = setInterval(() => {
            if (this.currentStepIndex < this.packingSteps.length - 1) {
                this.nextStep();
            } else {
                this.pauseAnimation();
                // Stay at final step after animation completes
            }
        }, this.stepSpeed);
    }

    pauseAnimation() {
        this.isPlaying = false;
        this.updatePlayPauseButton();

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    updatePlayPauseButton() {
        const button = document.getElementById('playPause');
        const icon = button.querySelector('i');

        if (this.isPlaying) {
            icon.className = 'fas fa-pause me-2';
            button.innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
        } else {
            icon.className = 'fas fa-play me-2';
            button.innerHTML = '<i class="fas fa-play me-2"></i>Play';
        }
    }

    updateStepSpeed(value) { // Accept value directly
        this.stepSpeed = parseInt(value);
        document.getElementById('speedValue').textContent = this.stepSpeed + 'ms';

        // If playing, restart with new speed
        if (this.isPlaying) {
            this.pauseAnimation();
            this.playAnimation();
        }
    }

    updateStepControls() {
        const currentStepNum = this.currentStepIndex + 1;
        document.getElementById('currentStep').textContent = currentStepNum;

        // Update progress bar
        const progress = this.packingSteps.length > 0 ?
            (currentStepNum / this.packingSteps.length) * 100 : 0;
        document.getElementById('stepProgressBar').style.width = progress + '%';

        // Update description
        if (this.currentStepIndex === -1) {
            document.getElementById('stepDescription').textContent = 'Ready to start';
        } else if (this.currentStepIndex < this.packingSteps.length) {
            const step = this.packingSteps[this.currentStepIndex];
            if (this.currentStepIndex === this.packingSteps.length - 1) {
                document.getElementById('stepDescription').textContent = 'Packing completed - All items packed';
            } else {
                document.getElementById('stepDescription').textContent =
                    step.description || `Placing Item #${step.item_id} (Order: ${step.step}) at (${step.position.x}, ${step.position.y}, ${step.position.z})`;
            }
        }

        // Update button states
        document.getElementById('prevStep').disabled = this.currentStepIndex <= -1;
        document.getElementById('nextStep').disabled = this.currentStepIndex >= this.packingSteps.length - 1;
    }

    showStepVisualization(stepIndex) {
        const data = [];

        // Add warehouse outline
        data.push(this.createWarehouseOutline());

        // Color palette for items
        const colors = [
            '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5',
            '#A8E6CF', '#FFB3BA', '#FFDFBA', '#FFFFBA',
            '#BAE1FF', '#DDA0DD', '#98FB98', '#F0E68C'
        ];

        // Show items up to the current step
        if (stepIndex >= 0 && this.packedResults && this.packedResults.packed_items) {
            // Lấy các items đã pack đến step hiện tại (dựa trên pack_order)
            const itemsToShow = this.packedResults.packed_items.filter(item =>
                item.pack_order && item.pack_order <= stepIndex + 1
            );

            itemsToShow.forEach((item, index) => {
                const color = colors[item.pack_order % colors.length];
                const itemMesh = this.createItemMesh(item, color);
                data.push(itemMesh);
            });
        }

        const aspectRatio = this.calculateAspectRatio();

        // Update plot
        const layout = {
            scene: {
                xaxis: {
                    title: 'Length',
                    range: [0, this.binSize.length],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                yaxis: {
                    title: 'Width',
                    range: [0, this.binSize.width],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                zaxis: {
                    title: 'Height',
                    range: [0, this.binSize.height],
                    showgrid: true,
                    gridcolor: '#E0E0E0'
                },
                bgcolor: '#F8F9FA',
                camera: {
                    eye: { x: 1.5 * aspectRatio.x, y: 1.5 * aspectRatio.y, z: 1.5 * aspectRatio.z }
                },
                aspectmode: 'manual',
                aspectratio: {
                    x: aspectRatio.x,
                    y: aspectRatio.y,
                    z: aspectRatio.z
                }
            },
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'transparent',
            showlegend: false
        };


        Plotly.react('plot3d', data, layout);
    }

    // JSON Structure Modal methods
    showJsonStructure() {
        this.jsonStructureModal.show();
    }

    copyJsonExample() {
        const activeExample = document.getElementById('jsonExampleNew');
        const jsonText = activeExample.textContent;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(jsonText).then(() => {
                this.showToast('JSON example copied to clipboard!', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(jsonText);
            });
        } else {
            this.fallbackCopyToClipboard(jsonText);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showToast('JSON example copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('Failed to copy to clipboard. Please copy manually.', 'warning');
        }

        document.body.removeChild(textArea);
    }

    downloadJsonExample() {
        const exampleData = {
            "items": [
                {
                    "id": 0,
                    "request_id": 1,
                    "L": 983,
                    "W": 375,
                    "H": 2470,
                    "num_axis": 2,
                    "quantity": 5
                }
            ],
            "bin_size": {
                "L": 9590,
                "W": 2390,
                "H": 2570
            },
            "parameters": {
                "stack_rule": [],
                "lifo_order": [],
                "weights": {}
            }
        };
        const filename = 'bin_packing_example.json';

        const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Example JSON file downloaded!', 'success');
    }

    // Weights display and update methods
    showWeights(weights) {
        const section = document.getElementById('weightsSection');
        const display = document.getElementById('weightsDisplay');

        if (!weights || Object.keys(weights).length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        this.weights = weights;
        // Store current weights for editing
        this.currentWeights = { ...weights };

        const weightsHtml = Object.entries(weights).map(([key, value]) => {
            const keyDisplay = key.replace('W_', '').replace(/_/g, ' ').toUpperCase();
            return `
                <div class="row mb-2 align-items-center">
                    <div class="col-6">
                        <label class="form-label fw-bold small mb-0">${keyDisplay}</label>
                    </div>
                    <div class="col-6">
                        <input type="text" class="form-control form-control-sm weight-input"
                               data-weight-key="${key}" value="${value}" placeholder="Enter value">
                    </div>
                </div>
            `;
        }).join('');

        display.innerHTML = weightsHtml;

        // Add event listeners for weight changes
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const weightKey = e.target.dataset.weightKey;
                const newValue = parseFloat(e.target.value);
                this.onWeightChange(weightKey, newValue);
            });
        });
    }

    hideWeights() {
        const section = document.getElementById('weightsSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    onWeightChange(key, value) {
        console.log(`Updated weight ${key} to ${value}`);
        // Initialize weights with defaults if not exists
        if (!this.currentWeights) {
            this.currentWeights = {
                "W_lifo": 10.0,
                "W_sim_l": -1.0,
                "W_sim_w": -1.0,
                "W_sim_h": 0.0,
                "W_leftover_l_ratio": -5.0,
                "W_leftover_w_ratio": -5.0,
                "W_packable_l": -0.5,
                "W_packable_w": -0.5,
                "W_max_l": 1000.0,
                "W_size_score": 3.299999952316284
            };
        }
        this.currentWeights[key] = parseFloat(value);
    }

    getCurrentWeights() {
        // Return current weights from the weights display
        const weightsDisplay = document.getElementById('weightsDisplay');
        if (!weightsDisplay || weightsDisplay.innerHTML.includes('No weights available')) {
            return null;
        }

        // Always return complete weights object with all required keys
        const weights = {
            "W_lifo": 10.0,
            "W_sim_l": -1.0,
            "W_sim_w": -1.0,
            "W_sim_h": 0.0,
            "W_leftover_l_ratio": -5.0,
            "W_leftover_w_ratio": -5.0,
            "W_packable_l": -0.5,
            "W_packable_w": -0.5,
            "W_max_l": 1000.0,
            "W_size_score": 3.299999952316284
        };

        // Update with current values from UI inputs
        const weightInputs = weightsDisplay.querySelectorAll('input[data-weight-key]');
        weightInputs.forEach(input => {
            const key = input.getAttribute('data-weight-key');
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                weights[key] = value;
            }
        });

        return weights;
    }


    async runTraining() {
        const fileInput = document.getElementById('trainingFile');
        const file = fileInput.files[0];
        const endpoint = document.getElementById('trainingEndpoint').value;

        if (!file) {
            this.showToast('Please select a training data file', 'warning');
            return;
        }

        if (!endpoint) {
            this.showToast('Please enter training endpoint URL', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const trainingData = JSON.parse(text);

            this.showProcessingToast('Starting algorithm training...');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trainingData)
            });

            if (!response.ok) {
                throw new Error(`Training failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Training result:', result);

            // Update weights with best_weights from training result
            if (result.best_weights) {
                this.weights = result.best_weights; // Store the best weights
                this.currentWeights = {...result.best_weights}; // Update editable weights
                this.showWeights(this.currentWeights); // Display updated weights
                this.showToast(`Training completed! Best efficiency: ${(result.best_average_efficiency * 100).toFixed(2)}%`, 'success');
            } else {
                this.showToast('Training completed but no weights returned', 'warning');
            }

        } catch (error) {
            console.error('Training error:', error);
            this.showToast(`Training failed: ${error.message}`, 'danger');
        }
    }

    async checkTrainingEndpoint() {
        const endpoint = document.getElementById('trainingEndpoint').value;
        const statusDiv = document.getElementById('trainingEndpointStatus');

        if (!endpoint) {
            statusDiv.innerHTML = '<small class="text-warning">Please enter endpoint URL</small>';
            return;
        }

        try {
            statusDiv.innerHTML = '<small class="text-info"><i class="fas fa-spinner fa-spin me-1"></i>Checking...</small>';

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check-circle me-1"></i>Training endpoint is accessible</small>';
            } else {
                statusDiv.innerHTML = '<small class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>Endpoint responded but may not be ready</small>';
            }
        } catch (error) {
            statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-times-circle me-1"></i>Cannot reach training endpoint</small>';
        }
    }

    showTrainingFormat() {
        const modalHtml = `
            <div class="modal fade" id="trainingFormatModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-dumbbell me-2"></i>
                                Training Data Format
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6 class="text-warning">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Training Data Format
                                </h6>
                                <p class="text-muted mb-3">
                                    Use this JSON structure for training the algorithm:
                                </p>
                            </div>
                            <div class="position-relative">
                                <pre class="bg-light p-3 border rounded" style="font-size: 0.9rem; overflow-x: auto;">
{
  "training_data": [
    {
      "items": [
        {
          "id": 0,
          "request_id": 0,
          "L": 1830,
          "W": 2370,
          "H": 2470,
          "num_axis": 2,
          "quantity": 1
        }
      ],
      "bin_size": {
        "L": 9590,
        "W": 2390,
        "H": 2570
      },
      "parameters": {
        "stack_rule": [100, 100, 100],
        "lifo_order": [0, 0, 0]
      }
    }
  ],
  "algorithm_weights": {
    "W_lifo": 1.0,
    "W_sim_l": 1.0,
    "W_sim_w": 1.0,
    "W_sim_h": 0.0,
    "W_leftover_l_ratio": 1.0,
    "W_leftover_w_ratio": 1.0,
    "W_packable_l": 1.0,
    "W_packable_w": 1.0,
    "W_max_l": 1000.0,
    "W_size_score": 3.299999952316284
  },
  "training_config": {
    "num_steps": 2,
    "max_change": 0.1
  }
}</pre>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('trainingFormatModal');
        if (existing) existing.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('trainingFormatModal'));
        modal.show();
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new BinPackingVisualizer();
});