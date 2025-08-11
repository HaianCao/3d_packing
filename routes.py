from flask import render_template, request, jsonify, flash
from app import app
import json
import logging
import requests
from urllib.parse import urlparse
from numba import njit

@njit
def get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis):
    """
    Trả về (l, w, h) đã xoay tương ứng với rotation_id.

    Parameters:
    - l0, w0, h0: Kích thước gốc
    - rotation_id: ID phép xoay
    - lock_axis: True nếu chỉ xoay đáy (l, w), False nếu xoay cả 3 trục

    Returns:
    - (l, w, h): kích thước sau khi xoay
    """
    if lock_axis:
        if rotation_id == 0:
            return l0, w0, h0
        elif rotation_id == 1:
            return w0, l0, h0
        else:
            return -1, -1, -1  # rotation_id không hợp lệ trong lock_axis
    else:
        if rotation_id == 0:
            return w0, l0, h0
        elif rotation_id == 1:
            return w0, h0, l0
        elif rotation_id == 2:
            return l0, w0, h0
        elif rotation_id == 3:
            return l0, h0, w0
        elif rotation_id == 4:
            return h0, w0, l0
        elif rotation_id == 5:
            return h0, l0, w0
        else:
            return -1, -1, -1  # rotation_id vượt quá 5

@app.route('/')
def index():
    """Main page with 3D visualization interface"""
    return render_template('index.html')

@app.route('/check_endpoint', methods=['POST'])
def check_endpoint():
    """Kiểm tra base URL có hoạt động không"""
    try:
        data = request.get_json()
        base_url = data.get('base_url', '').strip()
        
        if not base_url:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng nhập base URL'
            }), 400
        
        # Chuẩn hóa base URL
        if not base_url.startswith('http'):
            base_url = f"http://{base_url}"
        
        # Validate URL format
        try:
            parsed = urlparse(base_url)
            if not all([parsed.scheme, parsed.netloc]):
                return jsonify({
                    'success': False,
                    'message': 'URL không hợp lệ. Vui lòng nhập base URL (ví dụ: localhost:3000)'
                }), 400
        except Exception:
            return jsonify({
                'success': False,
                'message': 'URL không hợp lệ'
            }), 400
        
        # Kiểm tra endpoint có phản hồi không
        try:
            # Thử gọi với timeout ngắn - kiểm tra /health hoặc root
            health_url = f"{base_url}/health"
            response = requests.get(health_url, timeout=5)
            if response.status_code == 200:
                return jsonify({
                    'success': True,
                    'message': f'Base URL {base_url} hoạt động bình thường',
                    'endpoint_info': {
                        'base_url': base_url,
                        'pack_endpoint': f"{base_url}/pack",
                        'training_endpoint': f"{base_url}/training"
                    }
                })
            else:
                # Thử kiểm tra root endpoint
                root_response = requests.get(base_url, timeout=5)
                if root_response.status_code == 200:
                    return jsonify({
                        'success': True,
                        'message': f'Base URL {base_url} hoạt động bình thường (root endpoint)',
                        'endpoint_info': {
                            'base_url': base_url,
                            'pack_endpoint': f"{base_url}/pack",
                            'training_endpoint': f"{base_url}/training"
                        }
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': f'Base URL trả về status code: {response.status_code}'
                    }), 400
                
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'message': 'Không thể kết nối tới base URL. Kiểm tra URL và server có đang chạy không.'
            }), 400
        except requests.exceptions.Timeout:
            return jsonify({
                'success': False,
                'message': 'Timeout khi kết nối tới endpoint'
            }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi khi kiểm tra endpoint: {str(e)}'
            }), 400
            
    except Exception as e:
        logging.error(f"Check endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Lỗi server: {str(e)}'
        }), 500


@app.route('/pack', methods=['POST'])
def pack_items():
    """API endpoint for packing items - sử dụng external endpoint"""
    try:
        import time
        start_time = time.time()
        logging.info("Starting packing request...")
        
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Lấy base URL và endpoint từ request
        base_url = data.get('base_url', '').strip()
        endpoint = data.get('endpoint', '/pack')
        
        if not base_url:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng cung cấp base_url'
            }), 400
        
        # Chuẩn hóa base URL
        if not base_url.startswith('http'):
            base_url = f"http://{base_url}"
        
        # Tạo full URL
        packing_endpoint = f"{base_url}{endpoint}"
        
        # Get bin size
        bin_size = data.get('bin_size', {})
        bin_length = int(bin_size.get('length', 10))
        bin_width = int(bin_size.get('width', 10))
        bin_height = int(bin_size.get('height', 10))
        
        # Get items
        items = data.get('items', [])
        
        logging.info(f"Received {len(items)} items to pack in bin {bin_length}x{bin_width}x{bin_height}")
        logging.info(f"Using external endpoint: {packing_endpoint}")
        
        if not items:
            return jsonify({'success': False, 'message': 'No items to pack'}), 400
        
        # Chuẩn bị data để gửi tới external endpoint
        # Chuyển đổi format từ webapp sang format của packing API
        
        # Tạo default parameters dựa trên số items
        num_items = len(items)
        
        # Default stack rule - array với length = số items
        default_stack_rule = [100] * num_items  # 100 = unlimited stacking
        
        # Default lifo order - array với length = số items
        default_lifo_order = [0] * num_items
        
        # Get params from request (includes weights)
        params = data.get('params', {})
        weights = params.get('weights', {})
        
        # Default weights if not provided
        default_weights = {
            "W_lifo": 10.0,
            "W_sim_l": -1.0,
            "W_sim_w": -1.0,
            "W_sim_h": 0.0,
            "W_leftover_l_ratio": -5.0,
            "W_leftover_w_ratio": -5.0,
            "W_packable_l": -0.5,
            "W_packable_w": -0.5
        }
        
        # Use provided weights or default
        if not weights:
            weights = default_weights
        
        packing_request = {
            "items": [],
            "bin_size": {
                "L": bin_length,
                "W": bin_width, 
                "H": bin_height
            },
            "parameters": {
                "stack_rule": data.get('stack_rule', default_stack_rule),
                "lifo_order": data.get('lifo_order', default_lifo_order),
                "weights": weights
            }
        }
        
        # Chuyển đổi items sang format API
        for item in items:
            # Kiểm tra format - ưu tiên format cũ (length/width/height) vì đó là format từ webapp
            if 'length' in item and 'width' in item and 'height' in item:
                # Format từ webapp với length/width/height
                packing_request["items"].append({
                    "id": item.get('id', 0),
                    "request_id": item.get('request_id', item.get('id', 0)),
                    "L": float(item['length']),
                    "W": float(item['width']),
                    "H": float(item['height']),
                    "num_axis": item.get('number_axis', item.get('num_axis', 2)),
                    "quantity": 1  # Mỗi item đã được expand sẵn
                })
            elif 'L' in item and 'W' in item and 'H' in item:
                # Format JSON upload với L/W/H
                packing_request["items"].append({
                    "id": item.get('id', 0),
                    "request_id": item.get('request_id', item.get('id', 0)),
                    "L": float(item['L']),
                    "W": float(item['W']),
                    "H": float(item['H']),
                    "num_axis": item.get('num_axis', 2),
                    "quantity": item.get('quantity', 1)
                })
            else:
                logging.error(f"Invalid item format: {item}")
                continue
        
        # Validate dữ liệu trước khi gửi
        if not packing_request["items"]:
            return jsonify({
                'success': False, 
                'message': 'Không có items hợp lệ để pack'
            }), 400
        
        # Ensure stack_rule is properly sized (array format, not matrix)
        actual_num_items = len(packing_request["items"])
        if len(packing_request["parameters"]["stack_rule"]) != actual_num_items:
            # Recreate stack_rule with correct size - array format like JSON sample
            packing_request["parameters"]["stack_rule"] = [100] * actual_num_items
        
        if len(packing_request["parameters"]["lifo_order"]) != actual_num_items:
            # Recreate lifo_order with correct size  
            packing_request["parameters"]["lifo_order"] = [0] * actual_num_items
        
        # Log input data to file before sending to backend
        import json
        import datetime
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"input_log_{timestamp}.json"
        
        try:
            with open(log_filename, 'w', encoding='utf-8') as f:
                json.dump(packing_request, f, indent=2, ensure_ascii=False)
            logging.info(f"Saved input data to {log_filename}")
        except Exception as e:
            logging.warning(f"Failed to save input log: {e}")
        
        logging.info(f"Final item count: {len(packing_request['items'])}")
        logging.info(f"Stack rule length: {len(packing_request['parameters']['stack_rule'])}")
        logging.info(f"LIFO order length: {len(packing_request['parameters']['lifo_order'])}")
        logging.info(f"Weights: {packing_request['parameters']['weights']}")
        
        # Log the complete request for debugging
        logging.debug(f"Complete packing request: {json.dumps(packing_request, indent=2)}")
        
        # Gọi external packing endpoint
        try:
            logging.info("Calling external packing endpoint...")
            logging.info(f"Request data: {json.dumps(packing_request, indent=2)}")
            
            response = requests.post(
                packing_endpoint,
                json=packing_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                end_time = time.time()
                
                # Chuyển đổi kết quả về format webapp
                packed_items = []
                leftover_items = []
                
                # Xử lý packed items - đọc theo thứ tự trong output để có pack_order
                pack_order = 1  # Thứ tự pack bắt đầu từ 1
                if 'packed_items' in result:
                    for item_group in result['packed_items']:
                        positions = item_group.get('positions', [])
                        rotation_ids = item_group.get('rotation_id', [])
                        
                        # Mỗi position tương ứng với 1 item đã pack
                        for i, pos in enumerate(positions):
                            # Lấy rotation_id cho position này
                            rotation_id = rotation_ids[i] if i < len(rotation_ids) else 0
                            
                            # Tính kích thước thực tế sau khi xoay
                            l0, w0, h0 = item_group['L'], item_group['W'], item_group['H']
                            num_axis = item_group.get('num_axis', 2)
                            lock_axis = (num_axis == 2)
                            
                            # Áp dụng rotation
                            actual_l, actual_w, actual_h = get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis)
                            
                            packed_items.append({
                                'id': item_group['id'],
                                'request_id': item_group.get('request_id', item_group['id']),
                                'length': actual_l,  # Kích thước sau khi xoay
                                'width': actual_w,   # Kích thước sau khi xoay
                                'height': actual_h,  # Kích thước sau khi xoay
                                'original_length': l0,  # Kích thước gốc
                                'original_width': w0,   # Kích thước gốc
                                'original_height': h0,  # Kích thước gốc
                                'rotation_id': rotation_id,
                                'x': pos['x'],
                                'y': pos['y'],
                                'z': pos['z'],
                                'pack_order': pack_order,  # Thứ tự pack theo output
                                'position_index': i + 1,  # Vị trí thứ i của item này
                                'total_positions': len(positions),  # Tổng số vị trí của item này
                                'item_type_id': item_group['id']  # ID loại item
                            })
                            pack_order += 1
                
                # Xử lý leftover items
                if 'left_over_items' in result:
                    for item_group in result['left_over_items']:
                        for _ in range(item_group.get('quantity', 1)):
                            leftover_items.append({
                                'id': item_group['id'],
                                'request_id': item_group.get('request_id', item_group['id']),
                                'length': item_group['L'],
                                'width': item_group['W'],
                                'height': item_group['H']
                            })
                
                # Tính utilization
                total_items = len(packed_items) + len(leftover_items)
                utilization = len(packed_items) / total_items if total_items > 0 else 0
                
                # Tạo packing steps từ packed_items theo thứ tự pack_order
                packing_steps = []
                for item in sorted(packed_items, key=lambda x: x['pack_order']):
                    rotation_info = f" (Rotation: {item['rotation_id']})" if 'rotation_id' in item else ""
                    size_info = f"{item['length']}×{item['width']}×{item['height']}"
                    orig_size_info = ""
                    if 'original_length' in item:
                        orig_size_info = f" [Original: {item['original_length']}×{item['original_width']}×{item['original_height']}]"
                    
                    packing_steps.append({
                        'item_id': item['id'],
                        'position': {
                            'x': item['x'],
                            'y': item['y'], 
                            'z': item['z']
                        },
                        'dimensions': {
                            'length': item['length'],
                            'width': item['width'],
                            'height': item['height']
                        },
                        'original_dimensions': {
                            'length': item.get('original_length', item['length']),
                            'width': item.get('original_width', item['width']),
                            'height': item.get('original_height', item['height'])
                        },
                        'rotation_id': item.get('rotation_id', 0),
                        'step': item['pack_order'],
                        'description': f"Packed item {item['id']} (#{item['pack_order']}) at ({item['x']}, {item['y']}, {item['z']}) - Size: {size_info}{orig_size_info}{rotation_info}"
                    })

                logging.info(f"Packing completed in {end_time - start_time:.2f} seconds")
                logging.info(f"Packed: {len(packed_items)}, Leftover: {len(leftover_items)}, Utilization: {utilization:.2%}")

                return jsonify({
                    'success': True,
                    'packed_items': packed_items,
                    'leftover_items': leftover_items,
                    'bin_size': {
                        'length': bin_length,
                        'width': bin_width,
                        'height': bin_height
                    },
                    'utilization': utilization,
                    'packing_time': end_time - start_time,
                    'external_result': result.get('metadata', {}),
                    'packing_steps': packing_steps  # Thêm packing steps cho step-by-step visualization
                })
                
            else:
                error_msg = f"External endpoint returned status {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f": {error_detail.get('message', error_detail.get('error', 'Unknown error'))}"
                except:
                    error_msg += f": {response.text}"
                    
                logging.error(f"External endpoint error: {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), 400
                
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'message': 'Không thể kết nối tới packing endpoint. Kiểm tra URL và server có đang chạy không.'
            }), 400
        except Exception as e:
            logging.error(f"External endpoint call error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi khi gọi external endpoint: {str(e)}'
            }), 500
        
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
                        'height': item['H'],
                        'num_axis': item.get('num_axis', 2),
                        'number_axis': item.get('num_axis', 2)  # For backward compatibility
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

@app.route('/visualize', methods=['POST'])
def visualize_items():
    """API endpoint for visualizing items without packing"""
    try:
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
        
        if not items:
            return jsonify({'success': False, 'message': 'No items to visualize'}), 400
        
        # Convert items to visualization format
        visualization_items = []
        for i, item in enumerate(items):
            # Support both formats
            if 'L' in item and 'W' in item and 'H' in item:
                # New format
                quantity = item.get('quantity', 1)
                for q in range(quantity):
                    visualization_items.append({
                        'id': f"{item['id']}_{q}" if quantity > 1 else item['id'],
                        'length': item['L'],
                        'width': item['W'],
                        'height': item['H'],
                        'x': 0,  # Place all items at origin for visualization
                        'y': 0,
                        'z': 0,
                        'color': f'hsl({(i * 137.5) % 360}, 70%, 50%)'  # Generate colors
                    })
            else:
                # Old format
                visualization_items.append({
                    'id': item['id'],
                    'length': item['length'],
                    'width': item['width'],
                    'height': item['height'],
                    'x': 0,
                    'y': 0,
                    'z': 0,
                    'color': f'hsl({(i * 137.5) % 360}, 70%, 50%)'
                })
        
        return jsonify({
            'success': True,
            'visualization_items': visualization_items,
            'bin_size': {
                'length': bin_length,
                'width': bin_width,
                'height': bin_height
            },
            'item_count': len(visualization_items)
        })
        
    except Exception as e:
        logging.error(f"Visualization error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Visualization error: {str(e)}'
        }), 500

@app.route('/export_items', methods=['POST'])
def export_items():
    """Export current items list as JSON"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        items = data.get('items', [])
        bin_size = data.get('bin_size', {})
        
        # Format for export using new L/W/H format
        export_data = {
            'bin_size': {
                'L': bin_size.get('length', 10),
                'W': bin_size.get('width', 10),
                'H': bin_size.get('height', 10)
            },
            'items': []
        }
        
        # Group items by dimensions to combine quantity
        item_groups = {}
        for item in items:
            key = f"{item['length']}x{item['width']}x{item['height']}"
            if key not in item_groups:
                item_groups[key] = {
                    'id': item['id'],
                    'L': item['length'],
                    'W': item['width'],
                    'H': item['height'],
                    'quantity': 0
                }
            item_groups[key]['quantity'] += 1
        
        export_data['items'] = list(item_groups.values())
        
        return jsonify({
            'success': True,
            'export_data': export_data
        })
        
    except Exception as e:
        logging.error(f"Export error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Export error: {str(e)}'
        }), 500

@app.route('/export_results', methods=['POST'])
def export_results():
    """Export packing results as JSON"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Format results for export - structure compatible with visualization only
        export_data = {
            'bin_size': {
                'length': data.get('bin_size', {}).get('length', 10),
                'width': data.get('bin_size', {}).get('width', 10),
                'height': data.get('bin_size', {}).get('height', 10)
            },
            'packed_items': data.get('packed_items', []),
            'leftover_items': [],
            'utilization': data.get('utilization', 0),
            'packing_time': data.get('packing_time', 0)
        }
        
        # Convert leftover items to export format  
        for item in data.get('leftover_items', []):
            export_data['leftover_items'].append({
                'id': item['id'],
                'length': item['length'],
                'width': item['width'],
                'height': item['height'],
                'quantity': 1
            })
        
        return jsonify({
            'success': True,
            'export_data': export_data
        })
        
    except Exception as e:
        logging.error(f"Export results error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Export results error: {str(e)}'
        }), 500


@app.route('/training', methods=['POST'])
def train_model():
    """API endpoint for training algorithm - sử dụng external endpoint"""
    try:
        import time
        start_time = time.time()
        logging.info("Starting training request...")
        
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Lấy base URL và endpoint từ request
        base_url = data.get('base_url', '').strip()
        endpoint = data.get('endpoint', '/training')
        
        if not base_url:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng cung cấp base_url'
            }), 400
        
        # Chuẩn hóa base URL
        if not base_url.startswith('http'):
            base_url = f"http://{base_url}"
        
        # Tạo full URL
        training_endpoint = f"{base_url}{endpoint}"
        
        # Get bin size
        bin_size = data.get('bin_size', {})
        bin_length = int(bin_size.get('length', 10))
        bin_width = int(bin_size.get('width', 10))
        bin_height = int(bin_size.get('height', 10))
        
        # Get items
        items = data.get('items', [])
        
        logging.info(f"Received {len(items)} items for training in bin {bin_length}x{bin_width}x{bin_height}")
        logging.info(f"Using external training endpoint: {training_endpoint}")
        
        if not items:
            return jsonify({'success': False, 'message': 'No items to train with'}), 400
        
        # Chuẩn bị data để gửi tới external training endpoint
        # Format tương tự như packing nhưng cho training
        
        # Tạo default parameters dựa trên số items
        num_items = len(items)
        
        # Tạo default parameters
        default_parameters = {
            "stack_rule": [],
            "lifo_order": []
        }
        
        # Chuẩn bị request payload cho training API
        training_payload = {
            "bin_size": {
                "L": bin_length,
                "W": bin_width, 
                "H": bin_height
            },
            "items": [],
            "parameters": data.get('params', default_parameters)
        }
        
        # Convert items to training API format
        for item in items:
            training_payload["items"].append({
                "id": item.get("id", 1),
                "request_id": item.get("id", 1),
                "L": float(item.get("length", 1)),
                "W": float(item.get("width", 1)),
                "H": float(item.get("height", 1)),
                "quantity": item.get("quantity", 1)
            })
        
        logging.info(f"Training payload: {training_payload}")
        
        # Gọi external training API
        try:
            response = requests.post(
                training_endpoint,
                json=training_payload,
                timeout=300,  # 5 phút timeout cho training
                headers={'Content-Type': 'application/json'}
            )
            
            logging.info(f"Training API response status: {response.status_code}")
            
            if response.status_code != 200:
                error_msg = f"Training API returned status {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
                
                logging.error(error_msg)
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), 400
            
            training_result = response.json()
            logging.info(f"Training API response: {training_result}")
            
        except requests.exceptions.Timeout:
            return jsonify({
                'success': False,
                'message': 'Training request timeout. Server có thể đang xử lý quá lâu.'
            }), 408
            
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'message': 'Không thể kết nối tới training server. Kiểm tra URL và server có đang chạy không.'
            }), 503
        
        except Exception as e:
            logging.error(f"Training API call failed: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Training API call failed: {str(e)}'
            }), 500
        
        # Xử lý kết quả training tương tự như packing
        end_time = time.time()
        training_time = end_time - start_time
        
        logging.info(f"Training completed in {training_time:.2f} seconds")
        
        # Return formatted response cho frontend
        return jsonify({
            'success': True,
            'message': 'Training completed successfully',
            'packed_items': training_result.get('packed_items', []),
            'leftover_items': training_result.get('leftover_items', []),
            'utilization': training_result.get('utilization', 0),
            'training_time': training_time,
            'algorithm_steps': training_result.get('algorithm_steps', []),
            'training_score': training_result.get('training_score', 0.0),
            'raw_response': training_result
        })
        
    except Exception as e:
        logging.error(f"Training error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Training error: {str(e)}'
        }), 500
@app.errorhandler(404)
def not_found(error):
    return render_template('index.html'), 404

@app.route('/fake_data', methods=['POST'])
def fake_data():
    """API endpoint for generating fake data - sử dụng external endpoint"""
    try:
        import time
        start_time = time.time()
        logging.info("Starting fake data generation request...")
        
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Lấy base URL và endpoint từ request
        base_url = data.get('base_url', '').strip()
        endpoint = data.get('endpoint', '/fake_data')
        
        if not base_url:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng cung cấp base_url'
            }), 400
        
        # Chuẩn hóa base URL
        if not base_url.startswith('http'):
            base_url = f"http://{base_url}"
        
        # URL đích
        target_url = f"{base_url}{endpoint}"
        
        # Chuẩn bị data để gửi đến external API
        api_data = {
            'num_items': data.get('num_items', 10),
            'bin_size': data.get('bin_size', {'L': 10, 'W': 10, 'H': 10}),
            'n_unique': data.get('n_unique', 3),
            'include_weights': data.get('include_weights', True)
        }
        
        # Thêm seed nếu có
        if 'seed' in data and data['seed'] is not None:
            api_data['seed'] = data['seed']
        
        logging.info(f"Sending fake data request to: {target_url}")
        logging.info(f"Request data: {api_data}")
        
        # Gọi external API
        response = requests.post(
            target_url,
            json=api_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        logging.info(f"External API response status: {response.status_code}")
        
        if response.status_code == 200:
            result_data = response.json()
            
            # Tính thời gian xử lý
            processing_time = time.time() - start_time
            
            return jsonify({
                'success': True,
                'message': 'Fake data generated successfully',
                'data': result_data,
                'processing_time': round(processing_time, 2)
            })
        else:
            error_message = f"External API error: {response.status_code}"
            try:
                error_data = response.json()
                if 'message' in error_data:
                    error_message = error_data['message']
                elif 'error' in error_data:
                    error_message = error_data['error']
            except:
                error_message = f"HTTP {response.status_code}: {response.text[:200]}"
            
            logging.error(f"External API error: {error_message}")
            return jsonify({
                'success': False,
                'message': error_message
            }), response.status_code
            
    except requests.exceptions.ConnectionError:
        logging.error(f"Connection failed to {target_url}")
        return jsonify({
            'success': False,
            'message': f'Không thể kết nối đến server {base_url}. Vui lòng kiểm tra base URL và đảm bảo server đang chạy.'
        }), 503
        
    except requests.exceptions.Timeout:
        logging.error(f"Timeout connecting to {target_url}")
        return jsonify({
            'success': False,
            'message': 'Timeout khi gọi external API. Vui lòng thử lại.'
        }), 504
        
    except Exception as e:
        logging.error(f"Fake data generation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Lỗi server: {str(e)}'
        }), 500

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal server error: {str(error)}")
    return jsonify({'success': False, 'message': 'Internal server error'}), 500
