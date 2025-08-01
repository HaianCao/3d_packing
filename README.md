# 3D Bin Packing Visualizer

A sophisticated web application for optimizing warehouse space utilization through advanced 3D bin packing algorithms with real-time interactive visualization.

## 🎯 Overview

The 3D Bin Packing Visualizer is a powerful tool designed for warehouse managers and logistics professionals to visualize how items can be efficiently packed into containers or storage spaces. The application helps maximize space utilization and reduce shipping costs through intelligent placement algorithms and interactive 3D visualization.

## ✨ Key Features

### Core Functionality
- **Advanced Packing Algorithms**: Local Search 3D algorithm for enhanced packing efficiency
- **Interactive 3D Visualization**: Real-time 3D plotting with Plotly.js for comprehensive warehouse views
- **Step-by-Step Analysis**: View algorithm execution step-by-step with play/pause controls
- **Flexible Input Formats**: Support for JSON file uploads with multiple format options
- **Performance Optimization**: Handles large datasets (100+ items) efficiently

### User Experience
- **Camera State Preservation**: Maintains user's viewing angle when navigating between steps
- **Proportional Visualization**: Accurate scale representation based on warehouse dimensions
- **Interactive Controls**: Mouse-controlled camera manipulation with zoom and rotation
- **Detailed Item Information**: Enhanced hover tooltips with position, dimensions, and IDs
- **Export Capabilities**: Download results and example JSON formats

### Technical Features
- **Responsive Design**: Bootstrap 5 framework for all device types
- **Modern Architecture**: Single Page Application with modular JavaScript classes
- **Real-time Processing**: Instant visualization updates and algorithm progress tracking
- **Error Handling**: Comprehensive error states with actionable feedback

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Git
- Modern web browser with WebGL support
- Internet connection for CDN dependencies

### Installation (Windows Local Setup)

1. **Clone the repository from GitHub**
   ```bash
   git clone https://github.com/HaianCao/3d_packing.git
   cd 3d_packing
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask flask-sqlalchemy gunicorn numpy psycopg2-binary email-validator
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## 📖 Usage Guide

### 1. Setting Up Warehouse Dimensions

1. **Configure Warehouse Size**
   - Enter length, width, and height in the warehouse controls
   - Values must be positive integers
   - Click "Reload Warehouse" to update the 3D visualization

### 2. Adding Items

#### Manual Input
1. **Individual Items**
   - Enter item dimensions (length, width, height)
   - Assign a unique item ID
   - Click "Add Item" to include in the packing list

#### Bulk Import via JSON
1. **Upload JSON File**
   - Click "Upload JSON" to select your file
   - Use the "JSON Structure Guide" for format reference
   - Supported format:
   ```json
   {
     "bin_size": {
       "L": 9590,
       "W": 2390,
       "H": 2570
     },
     "items": [
       {
         "id": 1,
         "request_id": 1,
         "L": 610.0,
         "W": 575.0,
         "H": 1005.0,
         "quantity": 16
       }
     ],
     "parameters": {
       "stack_rule": [],
       "lifo_order": []
     }
   }
   ```

### 3. Running Packing Algorithm

1. **Execute Packing**
   - Click "Run Packing" to start the algorithm
   - Monitor progress in real-time
   - View results in the 3D visualization

2. **Analyze Results**
   - Review packing statistics (efficiency, leftover items)
   - Use step controls to understand the packing process
   - Export results for documentation

### 4. Interactive Visualization

#### Camera Controls
- **Mouse Navigation**: Click and drag to rotate the view
- **Zoom**: Use mouse wheel to zoom in/out
- **Reset View**: Camera position is preserved between steps

#### Step-by-Step Analysis
- **Previous/Next**: Navigate through packing steps
- **Play/Pause**: Automatic step progression
- **Speed Control**: Adjust animation speed

#### Item Inspection
- **Hover Information**: View item details on mouse hover
- **Click Details**: Click items for comprehensive information
- **Visual Feedback**: Color-coded items for easy identification

### 5. Exporting Results

1. **Download Results**
   - Click "Export Results" after successful packing
   - Receive JSON file with complete packing solution
   - Includes item positions, rotations, and statistics

2. **Copy Examples**
   - Use "Copy JSON Example" for template formats
   - Download example files for reference

## 🏗️ Architecture

### Frontend Architecture
- **Technology Stack**: HTML5, CSS3, JavaScript (ES6)
- **UI Framework**: Bootstrap 5 for responsive design
- **Visualization**: Plotly.js for interactive 3D plotting
- **Architecture Pattern**: Single Page Application (SPA)

### Backend Architecture
- **Framework**: Flask (Python) with modular organization
- **Application Structure**:
  - `app.py`: Flask application initialization
  - `routes.py`: API endpoints and route handlers
- **API Design**: RESTful JSON API for packing operations

### Core Algorithm
- **Technology**: NumPy-based Local Search 3D algorithm
- **Features**: Position optimization, rotation support, overlap detection
- **Performance**: Optimized for large datasets without timeout issues
- **Input Processing**: Dual JSON format support with quantity handling

## 🔧 Configuration

### Customization Options
- **Step Speed**: Adjustable animation timing (100ms - 3000ms)
- **Item Limits**: Performance optimization for large datasets
- **Camera Settings**: Default viewing angles and zoom levels

## 📁 Project Structure

```
3d-bin-packing-visualizer/
├── static/
│   ├── css/
│   │   └── style.css
│   ├── icons/
│   │   ├── box.svg
│   │   ├── upload.svg
│   │   └── warehouse.svg
│   └── js/
│       └── main.js
├── templates/
│   └── index.html
├── app.py
├── routes.py
├── packing_algorithm.py
├── local_search_algorithm.py
├── requirements.txt
├── nginx.conf
└── README.md
```

## 🚀 Recent Updates (August 2025)

- **Camera State Preservation**: Maintains user's viewing angle during step navigation
- **Proportional Visualization**: Accurate scale representation based on warehouse dimensions
- **Local Search 3D Algorithm**: Advanced packing efficiency with research-based implementation
- **Enhanced JSON Support**: Full format compatibility with quantity fields
- **Performance Optimization**: Streamlined processing for large datasets
- **Step-by-Step Visualization**: Interactive algorithm execution controls
- **Improved User Experience**: Enhanced hover tooltips and visual feedback

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛠️ Technical Support

### Browser Requirements
- Modern browser with WebGL support
- JavaScript ES6 compatibility
- Minimum screen resolution: 1024x768

### Known Limitations
- Maximum recommended items: 500 (for optimal performance)
- Large warehouse dimensions may affect visualization performance
- WebGL required for 3D rendering

### Troubleshooting

#### Common Issues
1. **Visualization Not Loading**
   - Ensure WebGL is enabled in your browser
   - Check browser console for JavaScript errors
   - Verify internet connection for CDN resources

2. **Performance Issues**
   - Reduce number of items for better performance
   - Use step-by-step mode for large datasets
   - Clear browser cache if experiencing slow loading

3. **JSON Upload Errors**
   - Validate JSON format using the structure guide
   - Ensure all required fields are present
   - Check file size limits (recommended: <1MB)

### Support Channels
- Create an issue on GitHub for bug reports
- Use discussions for feature requests
- Check existing documentation and examples

## 🙏 Acknowledgments

- Plotly.js team for excellent 3D visualization capabilities
- Bootstrap team for responsive design framework
- Research community for bin packing algorithm innovations
- Contributors and users for continuous feedback and improvements