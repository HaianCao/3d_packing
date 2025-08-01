# Overview

This is a 3D Bin Packing Visualizer web application that helps optimize warehouse space utilization. The application allows users to define warehouse dimensions and item specifications, then calculates optimal placement using a bin packing algorithm. It features an interactive 3D visualization interface built with Plotly.js to display packing results in real-time.

The application serves as a tool for warehouse managers and logistics professionals to visualize how items can be efficiently packed into containers or storage spaces, helping to maximize space utilization and reduce shipping costs.

## Recent Updates (August 2025)
- **Local Search 3D Algorithm**: Replaced original packing algorithm with advanced local search 3D algorithm from research notebook
- **Enhanced JSON Support**: Full support for both old format (length/width/height) and new format (L/W/H) with quantity fields
- **Performance Optimization**: Simplified algorithm implementation for faster processing of large datasets
- **Step-by-Step Visualization**: Added controls to view algorithm execution step-by-step with play/pause functionality
- **JSON Format Guide**: Integrated modal showing required JSON file structure with copy/download features
- **Algorithm Progress Tracking**: Enhanced packing algorithm to save intermediate steps for visualization

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Technology Stack**: HTML5, CSS3, JavaScript (ES6), Bootstrap 5, Plotly.js
- **UI Framework**: Bootstrap 5 for responsive design and component styling
- **Visualization**: Plotly.js for interactive 3D plotting and warehouse visualization
- **Architecture Pattern**: Single Page Application (SPA) with modular JavaScript classes
- **Styling**: Custom CSS with CSS variables for consistent theming, gradient-based color palette

## Backend Architecture
- **Framework**: Flask (Python) with modular route organization
- **Application Structure**: 
  - `app.py`: Main Flask application initialization
  - `routes.py`: API endpoints and route handlers
  - `main.py`: Application entry point
- **API Design**: RESTful JSON API for packing operations
- **Algorithm Module**: Separate `packing_algorithm.py` for core bin packing logic using NumPy

## Core Algorithm Design
- **Technology**: NumPy-based Local Search 3D algorithm for enhanced packing efficiency
- **Algorithm**: Simplified local search implementation with position optimization and rotation support
- **Data Structure**: Structured arrays to represent items and bins with position, rotation, and dimension data
- **Approach**: Greedy placement with overlap detection and support for both 2-axis and 6-axis rotation
- **Input Processing**: Supports dual JSON formats - classic (length/width/height) and modern (L/W/H with quantity)
- **Performance**: Optimized for handling large datasets (100+ items) without timeout issues

## Session Management
- **Session Handling**: Flask sessions with configurable secret key
- **Security**: Environment-based secret key configuration with development fallback

## File Organization
- **Static Assets**: Organized into `css/` and `js/` subdirectories
- **Templates**: Jinja2 templating with component-based HTML structure
- **Modular Design**: Separation of concerns between algorithm logic, web routes, and frontend components

# External Dependencies

## Frontend Libraries
- **Bootstrap 5**: UI framework and responsive design components
- **Font Awesome 6**: Icon library for user interface elements
- **Plotly.js**: Interactive 3D visualization and plotting library

## Backend Dependencies
- **Flask**: Web framework for Python
- **NumPy**: Numerical computing library for algorithm implementation

## Development Tools
- **Python Logging**: Built-in logging configuration for debugging
- **Environment Variables**: Configuration management for deployment flexibility

## Browser Requirements
- **Modern Browser Support**: Requires WebGL support for 3D visualizations
- **JavaScript ES6**: Modern JavaScript features for frontend functionality