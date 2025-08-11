/**
 * DataExporter - Handles data export functionality
 * Single Responsibility: Managing data export operations (JSON, files, downloads)
 */
class DataExporter {
    constructor() {
        this.exportFormats = ['json', 'csv', 'txt'];
    }

    /**
     * Export original input data
     */
    exportOriginalInputData(originalData) {
        if (!originalData) {
            throw new Error('No original input data to export');
        }

        const filename = `input_${this.generateTimestamp()}.json`;
        this.downloadJSON(originalData, filename);
        
        return {
            success: true,
            message: 'Original input data exported successfully',
            filename: filename
        };
    }

    /**
     * Export items list in standard format
     */
    exportItemsList(items) {
        if (!items || items.length === 0) {
            throw new Error('No items to export');
        }

        // Group items by request_id
        const groupedItems = this.groupItemsByRequestId(items);
        
        const exportData = {
            items: Object.values(groupedItems).map(group => ({
                length: group.dimensions.length,
                width: group.dimensions.width,
                height: group.dimensions.height,
                request_id: group.request_id,
                quantity: group.count,
                number_axis: group.dimensions.number_axis
            })),
            export_info: {
                total_items: items.length,
                unique_types: Object.keys(groupedItems).length,
                exported_at: new Date().toISOString()
            }
        };

        const filename = `items_list_${this.generateTimestamp()}.json`;
        this.downloadJSON(exportData, filename);
        
        return {
            success: true,
            message: 'Items list exported successfully',
            filename: filename,
            itemCount: items.length
        };
    }

    /**
     * Export packing results
     */
    exportPackingResults(results, originalData = null) {
        if (!results) {
            throw new Error('No packing results to export');
        }

        const exportData = {
            packing_results: {
                packed_items: results.packed_items || [],
                leftover_items: results.leftover_items || [],
                utilization: results.utilization || null,
                bin_size: results.bin_size || null,
                algorithm_weights: results.algorithm_weights || null
            },
            statistics: {
                total_items: (results.packed_items?.length || 0) + (results.leftover_items?.length || 0),
                packed_count: results.packed_items?.length || 0,
                leftover_count: results.leftover_items?.length || 0,
                utilization_percentage: results.utilization || 0
            },
            original_input: originalData,
            export_info: {
                exported_at: new Date().toISOString(),
                export_type: 'packing_results'
            }
        };

        const filename = `packing_results_${this.generateTimestamp()}.json`;
        this.downloadJSON(exportData, filename);
        
        return {
            success: true,
            message: 'Packing results exported successfully',
            filename: filename
        };
    }

    /**
     * Export training data
     */
    exportTrainingData(trainingData, trainingConfig) {
        if (!trainingData || trainingData.length === 0) {
            throw new Error('No training data to export');
        }

        const exportData = {
            training_data: trainingData,
            training_config: trainingConfig,
            statistics: {
                scenario_count: trainingData.length,
                total_items: trainingData.reduce((sum, scenario) => sum + scenario.items.length, 0)
            },
            export_info: {
                exported_at: new Date().toISOString(),
                export_type: 'training_data'
            }
        };

        const filename = `training_data_${this.generateTimestamp()}.json`;
        this.downloadJSON(exportData, filename);
        
        return {
            success: true,
            message: 'Training data exported successfully',
            filename: filename,
            scenarioCount: trainingData.length
        };
    }

    /**
     * Export algorithm weights
     */
    exportWeights(weights) {
        if (!weights) {
            throw new Error('No weights to export');
        }

        const exportData = {
            algorithm_weights: weights,
            export_info: {
                exported_at: new Date().toISOString(),
                export_type: 'algorithm_weights'
            }
        };

        const filename = `weights_${this.generateTimestamp()}.json`;
        this.downloadJSON(exportData, filename);
        
        return {
            success: true,
            message: 'Algorithm weights exported successfully',
            filename: filename
        };
    }

    /**
     * Export visualization data
     */
    exportVisualizationData(packedItems, binSize) {
        if (!packedItems || packedItems.length === 0) {
            throw new Error('No visualization data to export');
        }

        const exportData = {
            bin_size: binSize,
            packed_items: packedItems,
            statistics: {
                item_count: packedItems.length,
                utilization: this.calculateUtilization(packedItems, binSize)
            },
            export_info: {
                exported_at: new Date().toISOString(),
                export_type: 'visualization_data'
            }
        };

        const filename = `visualization_${this.generateTimestamp()}.json`;
        this.downloadJSON(exportData, filename);
        
        return {
            success: true,
            message: 'Visualization data exported successfully',
            filename: filename
        };
    }

    /**
     * Export items as CSV format
     */
    exportItemsAsCSV(items) {
        if (!items || items.length === 0) {
            throw new Error('No items to export');
        }

        const groupedItems = this.groupItemsByRequestId(items);
        
        // Create CSV content
        const headers = ['Request ID', 'Length', 'Width', 'Height', 'Quantity', 'Number Axis'];
        const rows = Object.values(groupedItems).map(group => [
            group.request_id,
            group.dimensions.length,
            group.dimensions.width,
            group.dimensions.height,
            group.count,
            group.dimensions.number_axis
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        const filename = `items_${this.generateTimestamp()}.csv`;
        this.downloadText(csvContent, filename, 'text/csv');
        
        return {
            success: true,
            message: 'Items exported as CSV successfully',
            filename: filename
        };
    }

    /**
     * Download JSON data as file
     */
    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        this.downloadText(jsonString, filename, 'application/json');
    }

    /**
     * Download text content as file
     */
    downloadText(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
    }

    /**
     * Copy data to clipboard
     */
    async copyToClipboard(data) {
        const jsonString = JSON.stringify(data, null, 2);
        
        try {
            await navigator.clipboard.writeText(jsonString);
            return {
                success: true,
                message: 'Data copied to clipboard successfully'
            };
        } catch (error) {
            // Fallback for older browsers
            return this.fallbackCopyToClipboard(jsonString);
        }
    }

    /**
     * Fallback copy to clipboard method
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            return {
                success: successful,
                message: successful ? 
                    'Data copied to clipboard successfully' : 
                    'Failed to copy data to clipboard'
            };
        } catch (error) {
            document.body.removeChild(textArea);
            return {
                success: false,
                message: 'Failed to copy data to clipboard',
                error: error.message
            };
        }
    }

    /**
     * Generate timestamp for filenames
     */
    generateTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}_${hour}${minute}${second}`;
    }

    /**
     * Group items by request_id for export
     */
    groupItemsByRequestId(items) {
        const groupedItems = {};
        
        items.forEach(item => {
            const requestId = item.request_id;
            if (!groupedItems[requestId]) {
                groupedItems[requestId] = {
                    request_id: requestId,
                    items: [],
                    count: 0,
                    dimensions: null
                };
            }
            
            groupedItems[requestId].items.push(item);
            groupedItems[requestId].count++;
            
            // Set dimensions from first item (they should all be the same for a request_id)
            if (!groupedItems[requestId].dimensions) {
                groupedItems[requestId].dimensions = {
                    length: item.length,
                    width: item.width,
                    height: item.height,
                    number_axis: item.number_axis
                };
            }
        });
        
        return groupedItems;
    }

    /**
     * Calculate utilization for export statistics
     */
    calculateUtilization(packedItems, binSize) {
        if (!packedItems || packedItems.length === 0 || !binSize) {
            return 0;
        }

        const totalPackedVolume = packedItems.reduce((sum, item) => {
            return sum + (item.length * item.width * item.height);
        }, 0);

        const binVolume = binSize.length * binSize.width * binSize.height;
        return (totalPackedVolume / binVolume) * 100;
    }

    /**
     * Validate export data
     */
    validateExportData(data, exportType) {
        const errors = [];

        if (!data) {
            errors.push('No data provided for export');
            return { valid: false, errors };
        }

        switch (exportType) {
            case 'items':
                if (!Array.isArray(data) || data.length === 0) {
                    errors.push('Items data must be a non-empty array');
                }
                break;
            
            case 'packing_results':
                if (!data.packed_items && !data.leftover_items) {
                    errors.push('Packing results must contain packed_items or leftover_items');
                }
                break;
            
            case 'training_data':
                if (!Array.isArray(data) || data.length === 0) {
                    errors.push('Training data must be a non-empty array');
                }
                break;
            
            case 'weights':
                if (typeof data !== 'object' || Object.keys(data).length === 0) {
                    errors.push('Weights data must be a non-empty object');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get export statistics
     */
    getExportStatistics(data, exportType) {
        const stats = {
            exportType: exportType,
            timestamp: new Date().toISOString(),
            dataSize: JSON.stringify(data).length
        };

        switch (exportType) {
            case 'items':
                stats.itemCount = Array.isArray(data) ? data.length : 0;
                stats.uniqueTypes = Array.isArray(data) ? 
                    new Set(data.map(item => item.request_id)).size : 0;
                break;
            
            case 'packing_results':
                stats.packedCount = data.packed_items?.length || 0;
                stats.leftoverCount = data.leftover_items?.length || 0;
                stats.utilization = data.utilization || 0;
                break;
            
            case 'training_data':
                stats.scenarioCount = Array.isArray(data) ? data.length : 0;
                stats.totalItems = Array.isArray(data) ? 
                    data.reduce((sum, scenario) => sum + (scenario.items?.length || 0), 0) : 0;
                break;
        }

        return stats;
    }

    /**
     * Create export summary
     */
    createExportSummary(exportResults) {
        const summary = {
            total_exports: exportResults.length,
            successful_exports: exportResults.filter(r => r.success).length,
            failed_exports: exportResults.filter(r => !r.success).length,
            export_types: [...new Set(exportResults.map(r => r.type))],
            total_file_size: exportResults.reduce((sum, r) => sum + (r.fileSize || 0), 0),
            export_session: {
                started_at: exportResults[0]?.timestamp,
                completed_at: exportResults[exportResults.length - 1]?.timestamp
            }
        };

        return summary;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataExporter;
}
