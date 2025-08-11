/**
 * BinPackingVisualizer - Main coordinator class (refactored)
 * Follows SOLID principles by composing specialized managers
 */
class BinPackingVisualizer {
    constructor() {
        // Initialize core managers
        this.itemManager = new ItemManager();
        this.weightManager = new WeightManager();
        this.cameraManager = new CameraManager();
        this.visualizationEngine = new VisualizationEngine(this.cameraManager);
        this.trainingManager = new TrainingManager();
        this.apiService = new APIService();
        this.dataExporter = new DataExporter();
        this.uiManager = new UIManager();
        this.stepManager = new StepManager(this.visualizationEngine);

        // Application state
        this.binSize = { length: 10, width: 10, height: 10 };
        this.packedResults = null;
        this.loadingModal = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.updateBinSize();
        this.updateWarehouseDisplay();
        this.updateWeightsTable();
        this.initializePlot();
        this.updateTrainingWeightsTable();
        this.stepManager.initializeStepControls();
        
        // Start camera backup
        this.cameraManager.startCameraBackup();

        // Setup UI components
        this.uiManager.setupFormValidation();
        this.uiManager.setupCollapseHandlers();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Algorithm endpoint configuration
        document.getElementById('checkEndpoint').addEventListener('click', this.checkEndpoint.bind(this));
        document.getElementById('baseUrl').addEventListener('input', this.onEndpointChange.bind(this));
        
        // Warehouse controls
        document.getElementById('binLength').addEventListener('input', this.updateBinSize.bind(this));
        document.getElementById('binWidth').addEventListener('input', this.updateBinSize.bind(this));
        document.getElementById('binHeight').addEventListener('input', this.updateBinSize.bind(this));
        document.getElementById('reloadWarehouse').addEventListener('click', this.reloadWarehouse.bind(this));
        
        // Item management
        document.getElementById('addItem').addEventListener('click', this.addItem.bind(this));
        document.getElementById('clearItems').addEventListener('click', this.clearItems.bind(this));
        
        // File upload
        document.getElementById('uploadJson').addEventListener('click', this.uploadJson.bind(this));
        document.getElementById('showJsonStructure').addEventListener('click', this.showJsonStructure.bind(this));
        document.getElementById('copyJsonExample').addEventListener('click', this.copyJsonExample.bind(this));
        document.getElementById('downloadJsonExample').addEventListener('click', this.downloadJsonExample.bind(this));
        
        // Visualization upload
        document.getElementById('uploadVisualizationOnly').addEventListener('click', this.uploadVisualizationOnly.bind(this));
        document.getElementById('showVisualizationFormat').addEventListener('click', this.showVisualizationFormat.bind(this));
        
        // Export functions
        document.getElementById('exportItems').addEventListener('click', this.exportOriginalFile.bind(this));
        document.getElementById('exportItemsList').addEventListener('click', this.exportItemsList.bind(this));
        document.getElementById('exportResults').addEventListener('click', this.exportResults.bind(this));
        
        // Weights
        document.getElementById('resetWeights').addEventListener('click', this.resetWeights.bind(this));
        
        // Training Configuration
        document.getElementById('loadTrainingData').addEventListener('click', this.loadTrainingData.bind(this));
        document.getElementById('showTrainingFormat').addEventListener('click', this.showTrainingFormat.bind(this));
        document.getElementById('copyTrainingExample').addEventListener('click', this.copyTrainingExample.bind(this));
        document.getElementById('downloadTrainingExample').addEventListener('click', this.downloadTrainingExample.bind(this));
        document.getElementById('resetTrainingWeights').addEventListener('click', this.resetTrainingWeights.bind(this));
        document.getElementById('exportTrainingData').addEventListener('click', this.exportTrainingData.bind(this));
        document.getElementById('generateFakeData').addEventListener('click', this.generateFakeData.bind(this));
        
        // Training settings
        document.getElementById('trainingSteps').addEventListener('input', this.updateTrainingConfig.bind(this));
        document.getElementById('maxChange').addEventListener('input', this.updateTrainingConfig.bind(this));
        document.getElementById('evaluationMetric').addEventListener('change', this.updateTrainingConfig.bind(this));
        
        // Actions
        document.getElementById('runPacking').addEventListener('click', this.runPacking.bind(this));
        document.getElementById('runTraining').addEventListener('click', this.runTraining.bind(this));
    }

    // ==========================================
    // BIN SIZE AND WAREHOUSE METHODS
    // ==========================================

    updateBinSize() {
        const length = parseInt(document.getElementById('binLength').value) || 1;
        const width = parseInt(document.getElementById('binWidth').value) || 1;
        const height = parseInt(document.getElementById('binHeight').value) || 1;
        
        // Validation
        if (length < 1 || width < 1 || height < 1) {
            this.uiManager.showToast('All dimensions must be greater than 0', 'error');
            return;
        }

        const oldBinSize = { ...this.binSize };
        this.binSize = { 
            length: Math.max(1, length), 
            width: Math.max(1, width), 
            height: Math.max(1, height) 
        };

        // Update visualization engine
        this.visualizationEngine.setBinSize(this.binSize);

        // Reset camera if significant size change
        if (this.cameraManager.shouldResetCamera(oldBinSize, this.binSize)) {
            this.cameraManager.clearSavedState();
        }
    }

    reloadWarehouse() {
        this.cameraManager.preserveCameraForVisualization();
        this.updateWarehouseDisplay();
        this.uiManager.showToast('Warehouse reloaded with new dimensions!', 'success');
    }

    updateWarehouseDisplay() {
        return this.visualizationEngine.updateWarehouseDisplay();
    }

    initializePlot() {
        return this.visualizationEngine.initializePlot();
    }

    // ==========================================
    // ITEM MANAGEMENT METHODS
    // ==========================================

    addItem() {
        try {
            const length = parseInt(document.getElementById('itemLength').value);
            const width = parseInt(document.getElementById('itemWidth').value);
            const height = parseInt(document.getElementById('itemHeight').value);
            const id = parseInt(document.getElementById('itemId').value);
            const numberAxis = parseInt(document.getElementById('itemNumberAxis').value);
            const quantity = parseInt(document.getElementById('itemQuantity').value);

            const result = this.itemManager.addItem(length, width, height, id, numberAxis, quantity);
            
            this.updateItemsList();
            this.updateItemId();
            this.uiManager.clearItemForm();
            this.uiManager.showToast(result.message, 'success');

        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    removeItem(id) {
        const result = this.itemManager.removeItem(id);
        this.updateItemsList();
        this.uiManager.showToast(result.message, result.success ? 'info' : 'error');
    }

    removeItemGroup(requestId) {
        const result = this.itemManager.removeItemGroup(requestId);
        this.updateItemsList();
        this.uiManager.showToast(result.message, 'info');
    }

    clearItems() {
        this.itemManager.clearItems();
        this.packedResults = null;
        this.stepManager.reset();
        this.updateItemsList();
        this.updateStats();
        this.initializePlot();
        this.uiManager.setButtonState('exportResults', false);
        this.uiManager.hideItemsInfo();
        this.uiManager.showToast('All items cleared', 'info');
    }

    updateItemId() {
        this.uiManager.updateItemIdInput(this.itemManager.getNextItemId());
    }

    updateItemsList() {
        const groupedItems = this.itemManager.getGroupedItems();
        const itemCount = this.itemManager.getItemsCount();
        this.uiManager.updateItemsList(groupedItems, itemCount, this.removeItemGroup.bind(this));
    }

    // ==========================================
    // WEIGHT MANAGEMENT METHODS
    // ==========================================

    updateWeightsTable() {
        const weightsTableData = this.weightManager.getWeightsTableData();
        this.uiManager.updateWeightsTable(
            weightsTableData, 
            'visualizer.updateWeight',
            this.resetWeights.bind(this)
        );
    }

    updateWeight(key, value) {
        try {
            const result = this.weightManager.updateWeight(key, value);
            this.uiManager.showToast(result.message, 'success');
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
            this.updateWeightsTable(); // Reset to previous values
        }
    }

    resetWeights() {
        const result = this.weightManager.resetToDefaults();
        this.updateWeightsTable();
        this.uiManager.showToast(result.message, 'info');
    }

    updateTrainingWeightsTable() {
        const weightsTableData = this.weightManager.getWeightsTableData();
        this.uiManager.updateTrainingWeightsTable(
            weightsTableData,
            'visualizer.updateTrainingWeight'
        );
    }

    updateTrainingWeight(key, value) {
        this.updateWeight(key, value); // Same implementation
        this.updateTrainingWeightsTable();
    }

    resetTrainingWeights() {
        this.resetWeights(); // Same implementation
        this.updateTrainingWeightsTable();
    }

    // ==========================================
    // FILE UPLOAD AND JSON METHODS
    // ==========================================

    async uploadJson() {
        const fileInput = document.getElementById('jsonFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.uiManager.showToast('Please select a JSON file', 'warning');
            return;
        }
        
        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            
            // Load items
            const result = this.itemManager.loadFromJson(jsonData);
            
            // Update bin size if provided - support both old format (L,W,H) and new format (length,width,height)
            if (jsonData.bin_size) {
                const binSize = jsonData.bin_size;
                this.binSize = {
                    length: binSize.length || binSize.L,
                    width: binSize.width || binSize.W,
                    height: binSize.height || binSize.H
                };
                this.visualizationEngine.setBinSize(this.binSize);
                this.uiManager.updateBinSizeInputs(this.binSize);
                this.updateWarehouseDisplay();
            }
            
            // Update weights if provided - support multiple weight locations
            const weights = jsonData.algorithm_weights || 
                          jsonData.weights || 
                          (jsonData.parameters && jsonData.parameters.weights);
            if (weights) {
                this.weightManager.importWeights({ algorithm_weights: weights });
                this.updateWeightsTable();
                this.updateTrainingWeightsTable();
            }
            
            this.updateItemsList();
            this.updateItemId();
            this.uiManager.showToast(result.message, 'success');
            
        } catch (error) {
            this.uiManager.showToast(`Error loading JSON: ${error.message}`, 'error');
        }
    }

    async uploadVisualizationOnly() {
        const fileInput = document.getElementById('visualizeFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.uiManager.showToast('Please select a JSON file', 'warning');
            return;
        }
        
        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            
            if (!jsonData.packed_items || !Array.isArray(jsonData.packed_items)) {
                throw new Error('Invalid format: packed_items array is required');
            }
            
            // Update bin size if provided - support both formats
            if (jsonData.bin_size) {
                const binSize = jsonData.bin_size;
                this.binSize = {
                    length: binSize.length || binSize.L,
                    width: binSize.width || binSize.W,
                    height: binSize.height || binSize.H
                };
                this.visualizationEngine.setBinSize(this.binSize);
                this.uiManager.updateBinSizeInputs(this.binSize);
            }
            
            // Visualize packed items
            this.visualizationEngine.visualizePackedItems(jsonData.packed_items);
            this.uiManager.displayItemsInfo(jsonData.packed_items, []);
            
            this.uiManager.showToast(`Visualized ${jsonData.packed_items.length} packed items`, 'success');
            
        } catch (error) {
            this.uiManager.showToast(`Error loading visualization: ${error.message}`, 'error');
        }
    }

    // ==========================================
    // API AND PROCESSING METHODS
    // ==========================================

    async checkEndpoint() {
        const baseUrl = document.getElementById('baseUrl').value.trim();
        if (!baseUrl) {
            this.uiManager.showEndpointStatus('error', 'Please enter a base URL');
            return;
        }

        this.apiService.setBaseUrl(baseUrl);
        
        try {
            const result = await this.apiService.checkEndpoint();
            
            if (result.success) {
                this.uiManager.showEndpointStatus('success', 'All endpoints are available');
            } else {
                this.uiManager.showEndpointStatus('error', result.message, JSON.stringify(result.results, null, 2));
            }
        } catch (error) {
            this.uiManager.showEndpointStatus('error', `Failed to check endpoints: ${error.message}`);
        }
    }

    onEndpointChange() {
        const baseUrl = document.getElementById('baseUrl').value.trim();
        this.apiService.setBaseUrl(baseUrl);
    }

    async runPacking() {
        const items = this.itemManager.getItems();
        if (items.length === 0) {
            this.uiManager.showToast('Please add some items first', 'warning');
            return;
        }

        // Validate items against bin size
        const validation = this.itemManager.validateItemsAgainstBin(this.binSize);
        if (!validation.valid) {
            this.uiManager.showToast(validation.message, 'warning');
        }

        const loadingToast = this.uiManager.showProcessingToast('Running packing algorithm...');
        this.uiManager.showButtonLoading('runPacking', 'Packing...');

        try {
            const weights = this.weightManager.getWeights();
            const result = await this.apiService.runPacking(items, this.binSize, weights);

            if (result.success) {
                this.packedResults = result.data;
                
                // Visualize results
                this.visualizationEngine.visualizeResults(result.data);
                
                // Set up step-by-step if available
                if (result.data.steps) {
                    this.stepManager.setPackingSteps(result.data.steps);
                }
                
                // Update UI
                this.uiManager.displayItemsInfo(
                    result.data.packed_items || [], 
                    result.data.leftover_items || []
                );
                this.updateStats();
                this.uiManager.setButtonState('exportResults', true);
                
                this.uiManager.showToast('Packing completed successfully!', 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            this.uiManager.showToast(`Packing failed: ${this.apiService.getErrorMessage(error)}`, 'error');
        } finally {
            loadingToast.hide();
            this.uiManager.hideButtonLoading('runPacking');
        }
    }

    async runTraining() {
        if (!this.trainingManager.hasTrainingData()) {
            this.uiManager.showToast('Please load training data first', 'warning');
            return;
        }

        const loadingToast = this.uiManager.showProcessingToast('Running training algorithm...');
        this.uiManager.showButtonLoading('runTraining', 'Training...');

        try {
            const trainingData = this.trainingManager.prepareForAPI();
            const initialWeights = this.weightManager.getWeights();
            const config = this.trainingManager.getTrainingConfig();

            const result = await this.apiService.runTraining(trainingData.training_data, initialWeights, config);

            if (result.success) {
                // Update weights with optimized values
                if (result.data.optimized_weights) {
                    this.weightManager.setWeights(result.data.optimized_weights);
                    this.updateWeightsTable();
                    this.updateTrainingWeightsTable();
                }

                this.uiManager.showToast('Training completed successfully!', 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            this.uiManager.showToast(`Training failed: ${this.apiService.getErrorMessage(error)}`, 'error');
        } finally {
            loadingToast.hide();
            this.uiManager.hideButtonLoading('runTraining');
        }
    }

    // ==========================================
    // TRAINING MANAGEMENT METHODS
    // ==========================================

    updateTrainingConfig() {
        try {
            const config = {
                num_steps: document.getElementById('trainingSteps').value,
                max_change: document.getElementById('maxChange').value,
                evaluation_metric: document.getElementById('evaluationMetric').value
            };

            const result = this.trainingManager.updateTrainingConfig(config);
            this.uiManager.updateTrainingConfigInputs(result.config);
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    async loadTrainingData() {
        const fileInput = document.getElementById('trainingFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.uiManager.showToast('Please select a training data file', 'warning');
            return;
        }
        
        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            
            const result = this.trainingManager.loadTrainingData(jsonData);
            
            this.updateTrainingDataInfo();
            this.uiManager.showToast(result.message, 'success');
            
        } catch (error) {
            this.uiManager.showToast(`Error loading training data: ${error.message}`, 'error');
        }
    }

    updateTrainingDataInfo() {
        const hasData = this.trainingManager.hasTrainingData();
        const count = this.trainingManager.getTrainingDataCount();
        this.uiManager.updateTrainingDataInfo(hasData, count);
    }

    async generateFakeData() {
        try {
            const scenarios = document.getElementById('fakeDataCount').value;
            const itemsPerScenario = document.getElementById('fakeNumItems').value;
            const uniqueTypes = document.getElementById('fakeUniqueItems').value;
            const seed = document.getElementById('fakeDataSeed').value;
            const includeWeights = document.getElementById('includeWeights').checked;

            const params = this.trainingManager.generateFakeDataParams(
                scenarios, itemsPerScenario, uniqueTypes, seed, this.binSize, includeWeights
            );

            const loadingToast = this.uiManager.showProcessingToast('Generating fake training data...');
            this.uiManager.showButtonLoading('generateFakeData', 'Generating...');

            const result = await this.apiService.generateFakeData(params);

            if (result.success) {
                const processResult = this.trainingManager.processFakeDataResponse(result);
                this.updateTrainingDataInfo();
                this.uiManager.showToast(processResult.message, 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            this.uiManager.showToast(`Failed to generate fake data: ${error.message}`, 'error');
        } finally {
            if (typeof loadingToast !== 'undefined') loadingToast.hide();
            this.uiManager.hideButtonLoading('generateFakeData');
        }
    }

    // ==========================================
    // EXPORT METHODS
    // ==========================================

    exportOriginalFile() {
        try {
            const originalData = this.itemManager.getOriginalInputData();
            if (originalData) {
                this.dataExporter.exportOriginalInputData(originalData);
            } else {
                // Export current items
                const exportData = this.itemManager.exportToJson();
                exportData.bin_size = { ...this.binSize };
                exportData.algorithm_weights = this.weightManager.getWeights();
                
                this.dataExporter.exportOriginalInputData(exportData);
            }
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    exportItemsList() {
        try {
            const items = this.itemManager.getItems();
            this.dataExporter.exportItemsList(items);
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    exportResults() {
        try {
            if (!this.packedResults) {
                throw new Error('No packing results to export');
            }
            
            const originalData = this.itemManager.getOriginalInputData();
            this.dataExporter.exportPackingResults(this.packedResults, originalData);
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    exportTrainingData() {
        try {
            const trainingData = this.trainingManager.getTrainingData();
            const trainingConfig = this.trainingManager.getTrainingConfig();
            this.dataExporter.exportTrainingData(trainingData, trainingConfig);
        } catch (error) {
            this.uiManager.showToast(error.message, 'error');
        }
    }

    // ==========================================
    // MODAL AND FORMAT METHODS
    // ==========================================

    showJsonStructure() {
        this.uiManager.showModal('jsonStructureModal');
    }

    showVisualizationFormat() {
        this.uiManager.showModal('visualizationFormatModal');
    }

    showTrainingFormat() {
        this.uiManager.showModal('trainingFormatModal');
    }

    copyJsonExample() {
        const example = {
            items: [
                { length: 3, width: 2, height: 1, request_id: 1, quantity: 2, number_axis: 2 },
                { length: 2, width: 2, height: 2, request_id: 2, quantity: 1, number_axis: 6 }
            ],
            bin_size: { length: 10, width: 8, height: 6 },
            algorithm_weights: this.weightManager.getDefaultWeights()
        };
        
        this.dataExporter.copyToClipboard(example).then(result => {
            this.uiManager.showToast(result.message, result.success ? 'success' : 'error');
        });
    }

    downloadJsonExample() {
        const example = {
            items: [
                { length: 3, width: 2, height: 1, request_id: 1, quantity: 2, number_axis: 2 },
                { length: 2, width: 2, height: 2, request_id: 2, quantity: 1, number_axis: 6 }
            ],
            bin_size: { length: 10, width: 8, height: 6 },
            algorithm_weights: this.weightManager.getDefaultWeights()
        };
        
        this.dataExporter.downloadJSON(example, 'example_input.json');
        this.uiManager.showToast('Example JSON downloaded!', 'success');
    }

    copyTrainingExample() {
        const example = this.trainingManager.generateTrainingExample();
        this.dataExporter.copyToClipboard(example).then(result => {
            this.uiManager.showToast(result.message, result.success ? 'success' : 'error');
        });
    }

    downloadTrainingExample() {
        const example = this.trainingManager.generateTrainingExample();
        this.dataExporter.downloadJSON(example, 'training_example.json');
        this.uiManager.showToast('Training example downloaded!', 'success');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    updateStats() {
        if (this.packedResults) {
            const packedCount = this.packedResults.packed_items?.length || 0;
            const leftoverCount = this.packedResults.leftover_items?.length || 0;
            const utilization = this.packedResults.utilization;
            
            this.uiManager.updateStats(packedCount, leftoverCount, utilization);
        } else {
            this.uiManager.updateStats(0, 0, null);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.cameraManager.destroy();
        this.visualizationEngine.destroy();
        this.stepManager.destroy();
        this.uiManager.destroy();
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new BinPackingVisualizer();
});
