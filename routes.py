from flask import render_template, request, jsonify, flash
from app import app
from local_search_algorithm import LocalSearchPackingAlgorithm
import json
import logging

@app.route('/')
def index():
    """Main page with 3D visualization interface"""
    return render_template('index.html')

@app.route('/pack', methods=['POST'])
def pack_items():
    """API endpoint for packing items"""
    try:
        import time
        start_time = time.time()
        logging.info("Starting packing request...")
        
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Get bin size
        bin_size = data.get('bin_size', {})
        bin_length = int(bin_size.get('length', 10))
        bin_width = int(bin_size.get('width', 10))
        bin_height = int(bin_size.get('height', 10))
        
        # Get items
        items = data.get('items', [])
        
        logging.info(f"Received {len(items)} items to pack in bin {bin_length}x{bin_width}x{bin_height}")
        
        if not items:
            return jsonify({'success': False, 'message': 'No items to pack'}), 400
        
        # Validate items - support both old and new formats
        for i, item in enumerate(items):
            # Check for new format (L, W, H) or old format (length, width, height)
            if 'L' in item and 'W' in item and 'H' in item:
                required_fields = ['L', 'W', 'H', 'id']
            else:
                required_fields = ['length', 'width', 'height', 'id']
                
            for field in required_fields:
                if field not in item:
                    return jsonify({
                        'success': False, 
                        'message': f'Item {i} missing required field: {field}'
                    }), 400
                
                try:
                    int(item[field])
                except (ValueError, TypeError):
                    return jsonify({
                        'success': False,
                        'message': f'Item {i} field {field} must be a number'
                    }), 400
        
        # Run packing algorithm
        logging.info("Starting packing algorithm...")
        packing = LocalSearchPackingAlgorithm((bin_length, bin_width, bin_height))
        
        # Get algorithm steps for visualization
        algorithm_steps = data.get('algorithm_steps', False)
        
        # Detect format and use appropriate packing method
        if items and 'L' in items[0]:  # New format with L/W/H
            result = packing.pack_json_format(items, algorithm_steps)
        else:  # Original format with length/width/height
            result = packing.pack(items, algorithm_steps)
        
        end_time = time.time()
        logging.info(f"Packing completed in {end_time - start_time:.2f} seconds")
        
        return jsonify({
            'success': True,
            'packed_items': result['packed_items'],
            'leftover_items': result['leftover_items'],
            'bin_size': result['bin_size'],
            'utilization': result['utilization'],
            'packing_time': result['packing_time'],
            'packing_steps': result.get('packing_steps', [])
        })
        
    except Exception as e:
        logging.error(f"Packing error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/validate_json', methods=['POST'])
def validate_json():
    """Validate uploaded JSON file"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No JSON data provided'}), 400
        
        # Check required structure
        if 'bin_size' not in data:
            return jsonify({'success': False, 'message': 'Missing bin_size in JSON'}), 400
        
        if 'items' not in data:
            return jsonify({'success': False, 'message': 'Missing items in JSON'}), 400
        
        bin_size = data['bin_size']
        
        # Support both old format (length, width, height) and new format (L, W, H)
        if 'L' in bin_size and 'W' in bin_size and 'H' in bin_size:
            # New format with L, W, H
            bin_size_normalized = {
                'length': bin_size['L'],
                'width': bin_size['W'],
                'height': bin_size['H']
            }
        elif 'length' in bin_size and 'width' in bin_size and 'height' in bin_size:
            # Old format
            bin_size_normalized = bin_size
        else:
            return jsonify({
                'success': False,
                'message': 'bin_size must contain either (L, W, H) or (length, width, height)'
            }), 400
        
        items = data['items']
        if not isinstance(items, list):
            return jsonify({'success': False, 'message': 'Items must be an array'}), 400
        
        # Validate each item - support both formats
        processed_items = []
        for i, item in enumerate(items):
            if 'id' not in item:
                return jsonify({
                    'success': False,
                    'message': f'Item {i} missing required field: id'
                }), 400
                
            # Support both old format (length, width, height) and new format (L, W, H)
            if 'L' in item and 'W' in item and 'H' in item:
                # New format with L, W, H - expand items based on quantity
                quantity = item.get('quantity', 1)
                for q in range(quantity):
                    processed_items.append({
                        'id': f"{item['id']}_{q}" if quantity > 1 else item['id'],
                        'request_id': item.get('request_id', item['id']),
                        'length': item['L'],
                        'width': item['W'],
                        'height': item['H']
                    })
            elif 'length' in item and 'width' in item and 'height' in item:
                # Old format
                processed_items.append({
                    'id': item['id'],
                    'request_id': item.get('request_id', item['id']),
                    'length': item['length'],
                    'width': item['width'],
                    'height': item['height']
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Item {i} must contain either (L, W, H) or (length, width, height)'
                }), 400
        
        return jsonify({
            'success': True,
            'message': 'JSON structure is valid',
            'item_count': len(processed_items),
            'original_item_count': len(items),
            'bin_size': bin_size_normalized,
            'processed_items': processed_items
        })
        
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid JSON format'}), 400
    except Exception as e:
        logging.error(f"JSON validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Validation error: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal server error: {str(error)}")
    return jsonify({'success': False, 'message': 'Internal server error'}), 500
