/**
 * VisualizationEngine - Handles 3D visualization with Plotly
 * Single Responsibility: Managing 3D visualization, plotting, and rendering
 */
class VisualizationEngine {
    constructor(cameraManager) {
        this.cameraManager = cameraManager;
        this.plotId = 'plot3d';
        this.colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
        ];
        this.binSize = { length: 10, width: 10, height: 10 };
    }

    /**
     * Set bin size for visualization
     */
    setBinSize(binSize) {
        this.binSize = { ...binSize };
    }

    /**
     * Get bin size
     */
    getBinSize() {
        return { ...this.binSize };
    }

    /**
     * Initialize empty plot
     */
    initializePlot() {
        const traces = [this.createWarehouseOutline()];
        const layout = this.cameraManager.getLayoutWithCamera(this.binSize, 'Warehouse Visualization');
        
        return Plotly.newPlot(this.plotId, traces, layout).then(() => {
            this.cameraManager.saveCameraStateAfterRender();
        });
    }

    /**
     * Update warehouse display with current bin size
     */
    updateWarehouseDisplay() {
        this.cameraManager.preserveCameraForVisualization();
        return this.initializePlot();
    }

    /**
     * Create warehouse outline trace
     */
    createWarehouseOutline() {
        const { length, width, height } = this.binSize;
        
        // Define the 8 corners of the warehouse
        const corners = [
            [0, 0, 0], [length, 0, 0], [length, width, 0], [0, width, 0], // bottom
            [0, 0, height], [length, 0, height], [length, width, height], [0, width, height] // top
        ];
        
        // Define the 12 edges of the warehouse
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // bottom edges
            [4, 5], [5, 6], [6, 7], [7, 4], // top edges
            [0, 4], [1, 5], [2, 6], [3, 7]  // vertical edges
        ];
        
        const x = [], y = [], z = [];
        
        edges.forEach(edge => {
            const [start, end] = edge;
            x.push(corners[start][0], corners[end][0], null);
            y.push(corners[start][1], corners[end][1], null);
            z.push(corners[start][2], corners[end][2], null);
        });
        
        return {
            type: 'scatter3d',
            mode: 'lines',
            x: x,
            y: y,
            z: z,
            line: {
                color: '#333333',
                width: 3
            },
            showlegend: false,
            hoverinfo: 'skip',
            name: 'Warehouse'
        };
    }

    /**
     * Create item mesh for 3D visualization
     */
    createItemMesh(item, colorIndex = 0) {
        const color = this.colorPalette[colorIndex % this.colorPalette.length];
        const { x: itemX = 0, y: itemY = 0, z: itemZ = 0, length, width, height } = item;
        
        // Define the 8 vertices of the box
        const vertices = [
            [itemX, itemY, itemZ],
            [itemX + length, itemY, itemZ],
            [itemX + length, itemY + width, itemZ],
            [itemX, itemY + width, itemZ],
            [itemX, itemY, itemZ + height],
            [itemX + length, itemY, itemZ + height],
            [itemX + length, itemY + width, itemZ + height],
            [itemX, itemY + width, itemZ + height]
        ];
        
        // Define the 12 triangular faces (2 triangles per face, 6 faces)
        const faces = [
            [0, 1, 2], [0, 2, 3], // bottom
            [4, 7, 6], [4, 6, 5], // top
            [0, 4, 5], [0, 5, 1], // front
            [2, 6, 7], [2, 7, 3], // back
            [0, 3, 7], [0, 7, 4], // left
            [1, 5, 6], [1, 6, 2]  // right
        ];
        
        const xCoords = [], yCoords = [], zCoords = [], i = [], j = [], k = [];
        
        vertices.forEach(vertex => {
            xCoords.push(vertex[0]);
            yCoords.push(vertex[1]);
            zCoords.push(vertex[2]);
        });
        
        faces.forEach(face => {
            i.push(face[0]);
            j.push(face[1]);
            k.push(face[2]);
        });
        
        return {
            type: 'mesh3d',
            x: xCoords,
            y: yCoords,
            z: zCoords,
            i: i,
            j: j,
            k: k,
            color: color,
            opacity: 0.8,
            showlegend: false,
            hovertemplate: 
                `<b>Item ${item.id}</b><br>` +
                `Position: (${itemX}, ${itemY}, ${itemZ})<br>` +
                `Size: ${length} × ${width} × ${height}<br>` +
                `<extra></extra>`,
            name: `Item ${item.id}`
        };
    }

    /**
     * Visualize items only (without packing)
     */
    visualizeItemsOnly(items) {
        this.cameraManager.preserveCameraForVisualization();
        
        const traces = [this.createWarehouseOutline()];
        
        // Add items as colored boxes at origin (stacked for visibility)
        items.forEach((item, index) => {
            const itemCopy = { ...item, x: 0, y: 0, z: index * (item.height + 0.1) };
            traces.push(this.createItemMesh(itemCopy, index));
        });
        
        const layout = this.cameraManager.getLayoutWithCamera(this.binSize, 'Items Visualization (No Packing)');
        layout.margin.t = 30;
        
        return this.reactToPlot(traces, layout);
    }

    /**
     * Visualize packed items with coordinates
     */
    visualizePackedItems(packedItems) {
        this.cameraManager.preserveCameraForVisualization();
        
        const traces = [this.createWarehouseOutline()];
        
        packedItems.forEach((item, index) => {
            traces.push(this.createItemMesh(item, index));
        });
        
        const layout = this.cameraManager.getLayoutWithCamera(this.binSize, 'Packed Items Visualization');
        layout.margin.t = 30;
        
        return this.reactToPlot(traces, layout);
    }

    /**
     * Visualize packing results
     */
    visualizeResults(result) {
        this.cameraManager.preserveCameraForVisualization();
        
        const packedItems = result.packed_items || [];
        const leftoverItems = result.leftover_items || [];
        
        const traces = [this.createWarehouseOutline()];
        
        // Add packed items
        packedItems.forEach((item, index) => {
            traces.push(this.createItemMesh(item, index));
        });
        
        const layout = this.cameraManager.getLayoutWithCamera(this.binSize, 'Packing Results');
        
        return this.reactToPlot(traces, layout).then(() => {
            // Update statistics
            this.updateVisualizationStats(packedItems, leftoverItems, result.utilization);
        });
    }

    /**
     * Visualize step-by-step packing
     */
    visualizeStep(stepData, stepIndex, totalSteps) {
        this.cameraManager.preserveCameraForVisualization();
        
        const traces = [this.createWarehouseOutline()];
        
        // Add items placed up to this step
        stepData.forEach((item, index) => {
            traces.push(this.createItemMesh(item, index));
        });
        
        const layout = this.cameraManager.getLayoutWithCamera(
            this.binSize, 
            `Packing Step ${stepIndex + 1} of ${totalSteps}`
        );
        
        return this.reactToPlot(traces, layout);
    }

    /**
     * React to plot (preserve camera if plot exists, otherwise create new)
     */
    reactToPlot(traces, layout) {
        const plotDiv = document.getElementById(this.plotId);
        
        if (plotDiv.data && plotDiv.data.length > 0) {
            // Use Plotly.react to preserve camera state
            return Plotly.react(this.plotId, traces, layout).then(() => {
                this.cameraManager.saveCameraStateAfterRender();
            });
        } else {
            // Create new plot
            return Plotly.newPlot(this.plotId, traces, layout).then(() => {
                this.cameraManager.saveCameraStateAfterRender();
            });
        }
    }

    /**
     * Update visualization statistics
     */
    updateVisualizationStats(packedItems, leftoverItems = [], utilization = null) {
        const placedBadge = document.getElementById('placedBadge');
        const leftoverBadge = document.getElementById('leftoverBadge');
        const utilizationBadge = document.getElementById('utilizationBadge');
        
        if (placedBadge) {
            placedBadge.textContent = `Packed: ${packedItems.length}`;
        }
        
        if (leftoverBadge) {
            leftoverBadge.textContent = `Leftover: ${leftoverItems.length}`;
        }
        
        if (utilizationBadge) {
            const utilizationText = utilization !== null ? 
                `${utilization.toFixed(1)}%` : 'N/A';
            utilizationBadge.textContent = `Utilization: ${utilizationText}`;
        }
    }

    /**
     * Calculate utilization based on volume
     */
    calculateUtilization(packedItems) {
        if (!packedItems || packedItems.length === 0) {
            return 0;
        }
        
        const totalPackedVolume = packedItems.reduce((sum, item) => {
            return sum + (item.length * item.width * item.height);
        }, 0);
        
        const binVolume = this.binSize.length * this.binSize.width * this.binSize.height;
        return (totalPackedVolume / binVolume) * 100;
    }

    /**
     * Show item details in a modal or tooltip
     */
    showItemDetails(item) {
        const details = {
            id: item.id,
            dimensions: `${item.length} × ${item.width} × ${item.height}`,
            position: item.x !== undefined ? `(${item.x}, ${item.y}, ${item.z})` : 'Not placed',
            volume: item.length * item.width * item.height,
            requestId: item.request_id,
            numberAxis: item.number_axis
        };
        
        return details;
    }

    /**
     * Export visualization as image
     */
    exportAsImage(filename = 'visualization.png', format = 'png', width = 1200, height = 800) {
        const plotDiv = document.getElementById(this.plotId);
        
        if (!plotDiv || !plotDiv.data) {
            throw new Error('No visualization to export');
        }
        
        return Plotly.toImage(plotDiv, {
            format: format,
            width: width,
            height: height,
            filename: filename
        });
    }

    /**
     * Clear visualization
     */
    clear() {
        return this.initializePlot();
    }

    /**
     * Resize plot to fit container
     */
    resize() {
        const plotDiv = document.getElementById(this.plotId);
        if (plotDiv) {
            return Plotly.Plots.resize(plotDiv);
        }
    }

    /**
     * Get color for item based on index
     */
    getItemColor(index) {
        return this.colorPalette[index % this.colorPalette.length];
    }

    /**
     * Update color palette
     */
    setColorPalette(colors) {
        if (Array.isArray(colors) && colors.length > 0) {
            this.colorPalette = [...colors];
        }
    }

    /**
     * Destroy visualization
     */
    destroy() {
        const plotDiv = document.getElementById(this.plotId);
        if (plotDiv) {
            Plotly.purge(plotDiv);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizationEngine;
}
