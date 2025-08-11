/**
 * CameraManager - Handles 3D camera state management
 * Single Responsibility: Managing camera state, preservation, and restoration
 */
class CameraManager {
    constructor() {
        this.savedCameraState = null;
        this.cameraBackupInterval = null;
        this.defaultCameraConfig = {
            eye: { x: 1.5, y: 1.5, z: 1.5 },
            center: { x: 0.5, y: 0.5, z: 0.5 },
            up: { x: 0, y: 0, z: 1 }
        };
    }

    /**
     * Start periodic camera state backup
     */
    startCameraBackup() {
        // Clear any existing interval
        this.stopCameraBackup();
        
        // Backup camera state every 2 seconds
        this.cameraBackupInterval = setInterval(() => {
            this.backupCurrentCameraState();
        }, 2000);
    }

    /**
     * Stop camera backup interval
     */
    stopCameraBackup() {
        if (this.cameraBackupInterval) {
            clearInterval(this.cameraBackupInterval);
            this.cameraBackupInterval = null;
        }
    }

    /**
     * Backup current camera state from plot
     */
    backupCurrentCameraState() {
        try {
            const plotDiv = document.getElementById('plot3d');
            if (plotDiv && plotDiv._fullLayout && plotDiv._fullLayout.scene && plotDiv._fullLayout.scene.camera) {
                const camera = plotDiv._fullLayout.scene.camera;
                if (camera.eye && camera.center && camera.up) {
                    this.savedCameraState = {
                        eye: { ...camera.eye },
                        center: { ...camera.center },
                        up: { ...camera.up }
                    };
                }
            }
        } catch (error) {
            console.warn('Failed to backup camera state:', error);
        }
    }

    /**
     * Get current camera state from plot
     */
    getCurrentCameraState() {
        try {
            const plotDiv = document.getElementById('plot3d');
            if (plotDiv && plotDiv._fullLayout && plotDiv._fullLayout.scene && plotDiv._fullLayout.scene.camera) {
                const camera = plotDiv._fullLayout.scene.camera;
                if (camera.eye && camera.center && camera.up) {
                    return {
                        eye: { ...camera.eye },
                        center: { ...camera.center },
                        up: { ...camera.up }
                    };
                }
            }
        } catch (error) {
            console.warn('Failed to get current camera state:', error);
        }
        return null;
    }

    /**
     * Force save current camera state
     */
    forceSaveCameraState() {
        const currentState = this.getCurrentCameraState();
        if (currentState) {
            this.savedCameraState = currentState;
            return true;
        }
        return false;
    }

    /**
     * Get default camera based on aspect ratio
     */
    getDefaultCamera(binSize = { length: 10, width: 10, height: 10 }) {
        const aspectRatio = this.calculateAspectRatio(binSize);
        
        // Adjust camera position based on aspect ratio
        let eye = { x: 1.5, y: 1.5, z: 1.5 };
        let center = { x: 0.5, y: 0.5, z: 0.5 };
        
        if (aspectRatio.isWide) {
            eye.y = Math.max(1.5, aspectRatio.ratio * 1.2);
        } else if (aspectRatio.isTall) {
            eye.z = Math.max(1.5, aspectRatio.ratio * 1.2);
        } else if (aspectRatio.isLong) {
            eye.x = Math.max(1.5, aspectRatio.ratio * 1.2);
        }

        return {
            eye: eye,
            center: center,
            up: { x: 0, y: 0, z: 1 }
        };
    }

    /**
     * Calculate aspect ratio for camera positioning
     */
    calculateAspectRatio(binSize) {
        const { length, width, height } = binSize;
        const maxDim = Math.max(length, width, height);
        const minDim = Math.min(length, width, height);
        const ratio = maxDim / minDim;
        
        return {
            ratio: ratio,
            isWide: width === maxDim && width > length * 1.5,
            isTall: height === maxDim && height > Math.max(length, width) * 1.5,
            isLong: length === maxDim && length > Math.max(width, height) * 1.5,
            isBalanced: ratio < 2
        };
    }

    /**
     * Preserve camera state for visualization updates
     */
    preserveCameraForVisualization() {
        const currentState = this.getCurrentCameraState();
        if (currentState) {
            this.savedCameraState = currentState;
        }
    }

    /**
     * Get layout with preserved camera
     */
    getLayoutWithCamera(binSize, title = 'Warehouse Visualization') {
        const camera = this.savedCameraState || this.getDefaultCamera(binSize);
        
        return {
            scene: {
                xaxis: { 
                    title: 'Length', 
                    range: [0, binSize.length],
                    showgrid: true,
                    zeroline: false
                },
                yaxis: { 
                    title: 'Width', 
                    range: [0, binSize.width],
                    showgrid: true,
                    zeroline: false
                },
                zaxis: { 
                    title: 'Height', 
                    range: [0, binSize.height],
                    showgrid: true,
                    zeroline: false
                },
                aspectmode: 'data',
                camera: camera
            },
            title: title,
            showlegend: false,
            margin: { l: 0, r: 0, b: 0, t: 30 }
        };
    }

    /**
     * Attach camera tracking event listener to plot
     */
    attachCameraTrackingListener() {
        const plotDiv = document.getElementById('plot3d');
        if (plotDiv) {
            // Remove existing listener if any
            plotDiv.removeAllListeners?.('plotly_relayout');
            
            // Add new listener
            plotDiv.on('plotly_relayout', (eventData) => {
                if (eventData['scene.camera']) {
                    const camera = eventData['scene.camera'];
                    if (camera.eye && camera.center && camera.up) {
                        this.savedCameraState = {
                            eye: { ...camera.eye },
                            center: { ...camera.center },
                            up: { ...camera.up }
                        };
                    }
                }
            });
        }
    }

    /**
     * Save camera state after render is complete
     */
    saveCameraStateAfterRender() {
        // Wait for render to complete, then save camera state
        setTimeout(() => {
            this.backupCurrentCameraState();
            this.attachCameraTrackingListener();
        }, 100);
    }

    /**
     * Reset camera to default position
     */
    resetToDefault(binSize) {
        this.savedCameraState = this.getDefaultCamera(binSize);
        return this.savedCameraState;
    }

    /**
     * Get saved camera state
     */
    getSavedCameraState() {
        return this.savedCameraState ? { ...this.savedCameraState } : null;
    }

    /**
     * Set camera state manually
     */
    setCameraState(cameraState) {
        if (this.validateCameraState(cameraState)) {
            this.savedCameraState = {
                eye: { ...cameraState.eye },
                center: { ...cameraState.center },
                up: { ...cameraState.up }
            };
            return true;
        }
        return false;
    }

    /**
     * Validate camera state structure
     */
    validateCameraState(cameraState) {
        if (!cameraState || typeof cameraState !== 'object') {
            return false;
        }

        const { eye, center, up } = cameraState;
        
        // Check if all required properties exist and are objects with x, y, z
        const isValidVector = (vector) => {
            return vector && 
                   typeof vector === 'object' && 
                   typeof vector.x === 'number' && 
                   typeof vector.y === 'number' && 
                   typeof vector.z === 'number';
        };

        return isValidVector(eye) && isValidVector(center) && isValidVector(up);
    }

    /**
     * Clear saved camera state
     */
    clearSavedState() {
        this.savedCameraState = null;
    }

    /**
     * Check if camera should be reset based on bin size change
     */
    shouldResetCamera(oldBinSize, newBinSize) {
        if (!oldBinSize || !newBinSize) return true;
        
        // Calculate size change percentage
        const sizeChanges = {
            length: Math.abs(newBinSize.length - oldBinSize.length) / oldBinSize.length,
            width: Math.abs(newBinSize.width - oldBinSize.width) / oldBinSize.width,
            height: Math.abs(newBinSize.height - oldBinSize.height) / oldBinSize.height
        };
        
        // Reset if any dimension changed by more than 50%
        const maxChange = Math.max(sizeChanges.length, sizeChanges.width, sizeChanges.height);
        return maxChange > 0.5;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopCameraBackup();
        this.clearSavedState();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraManager;
}
