from flask import render_template, request, jsonify, flash
from app import app
import json
import logging
import requests
from urllib.parse import urlparse
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
def check_packing_endpoint():
    """Kiểm tra endpoint thuật toán packing có hoạt động không"""
    try:
        data = request.get_json()
        endpoint_url = data.get('endpoint_url', '')
        
        if not endpoint_url:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng nhập endpoint URL'
            }), 400
        
        # Validate URL format
        try:
            parsed = urlparse(endpoint_url)
            if not all([parsed.scheme, parsed.netloc]):
                return jsonify({
                    'success': False,
                    'message': 'URL không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: http://localhost:3001/pack)'
                }), 400
        except Exception:
            return jsonify({
                'success': False,
                'message': 'URL không hợp lệ'
            }), 400
        
        # Kiểm tra endpoint có phản hồi không
        try:
            # Thử gọi với timeout ngắn
            response = requests.get(endpoint_url.replace('/pack', '/health'), timeout=5)
            if response.status_code == 200:
                return jsonify({
                    'success': True,
                    'message': 'Endpoint hoạt động bình thường',
                    'endpoint_info': response.json() if response.headers.get('content-type', '').startswith('application/json') else None
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Endpoint trả về status code: {response.status_code}'
                }), 400
                
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'message': 'Không thể kết nối tới endpoint. Kiểm tra URL và server có đang chạy không.'
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
        
        # Lấy endpoint URL từ request
        packing_endpoint = data.get('packing_endpoint', '')
        if not packing_endpoint:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng cung cấp packing_endpoint URL'
            }), 400
        
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
        num_unique_items = len(set(item.get('id', 0) for item in items))
        
        # Default stack rule - tất cả items có thể stack trên nhau
        default_stack_rule = []
        for i in range(num_unique_items):
            row = [3] * num_unique_items  # 3 = unlimited stacking
            default_stack_rule.append(row)
        
        # Default lifo order - không có ràng buộc LIFO
        default_lifo_order = [0] * num_unique_items
        
        # Extract parameters from input data
        input_parameters = data.get('parameters', {})
        
        # Handle weights parameter - pass through original format to let algorithm decide
        weights_param = input_parameters.get('weights')
        if weights_param is not None:
            # Pass weights in original format (object or array)
            weights_value = weights_param
            logging.info(f"Passing weights in original format: {type(weights_param).__name__} with {len(weights_param) if hasattr(weights_param, '__len__') else 'N/A'} items")
        else:
            # Default weights object for new format
            weights_value = {
                "W_lifo": 10.0,
                "W_sim_l": -1.0,
                "W_sim_w": -1.0,
                "W_sim_h": 0.0,
                "W_leftover_l_ratio": -5.0,
                "W_leftover_w_ratio": -5.0,
                "W_packable_l": -0.5,
                "W_packable_w": -0.5
            }
            logging.info(f"Using default weights object: {weights_value}")
        
        packing_request = {
            "items": [],
            "bin_size": {
                "L": bin_length,
                "W": bin_width, 
                "H": bin_height
            },
            "parameters": {
                "stack_rule": input_parameters.get('stack_rule', default_stack_rule),
                "lifo_order": input_parameters.get('lifo_order', default_lifo_order),
                "weights": weights_value
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
        
        # Ensure stack_rule is properly sized
        actual_num_items = len(packing_request["items"])
        if len(packing_request["parameters"]["stack_rule"]) != actual_num_items:
            # Recreate stack_rule with correct size
            packing_request["parameters"]["stack_rule"] = [[3] * actual_num_items for _ in range(actual_num_items)]
        
        if len(packing_request["parameters"]["lifo_order"]) != actual_num_items:
            # Recreate lifo_order with correct size  
            packing_request["parameters"]["lifo_order"] = [0] * actual_num_items
        
        logging.info(f"Final item count: {len(packing_request['items'])}")
        logging.info(f"Stack rule size: {len(packing_request['parameters']['stack_rule'])}x{len(packing_request['parameters']['stack_rule'][0]) if packing_request['parameters']['stack_rule'] else 0}")
        logging.info(f"LIFO order size: {len(packing_request['parameters']['lifo_order'])}")
        
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
                
                # Tính utilization dựa trên volume, không phải số lượng items
                bin_volume = bin_length * bin_width * bin_height
                
                # Tính tổng volume của items đã pack (sử dụng kích thước thực tế sau khi xoay)
                packed_volume = 0
                for item in packed_items:
                    packed_volume += item['length'] * item['width'] * item['height']
                
                # Utilization = volume used / total bin volume
                utilization = packed_volume / bin_volume if bin_volume > 0 else 0
                
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

@app.route('/pack_step_by_step', methods=['POST'])
def pack_items_step_by_step():
    """API endpoint for step-by-step packing - trả về từng step một"""
    try:
        import time
        start_time = time.time()
        logging.info("Starting step-by-step packing request...")
        
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Lấy endpoint URL từ request
        packing_endpoint = data.get('packing_endpoint', '')
        if not packing_endpoint:
            return jsonify({
                'success': False, 
                'message': 'Vui lòng cung cấp packing_endpoint URL'
            }), 400
        
        # Get bin size
        bin_size = data.get('bin_size', {})
        bin_length = int(bin_size.get('length', 10))
        bin_width = int(bin_size.get('width', 10))
        bin_height = int(bin_size.get('height', 10))
        
        # Get items
        items = data.get('items', [])
        
        logging.info(f"Received {len(items)} items for step-by-step packing")
        
        if not items:
            return jsonify({'success': False, 'message': 'No items to pack'}), 400
        
        # Chuẩn bị data để gửi tới external endpoint
        packing_request = {
            "items": [],
            "bin_size": {
                "L": bin_length,
                "W": bin_width, 
                "H": bin_height
            },
            "parameters": {
                "return_steps": True,  # Yêu cầu trả về steps
                "step_by_step": True   # Chỉ định step-by-step mode
            }
        }
        
        # Chuyển đổi items sang format API
        for item in items:
            if 'length' in item and 'width' in item and 'height' in item:
                packing_request["items"].append({
                    "id": item.get('id', 0),
                    "request_id": item.get('request_id', item.get('id', 0)),
                    "L": float(item['length']),
                    "W": float(item['width']),
                    "H": float(item['height']),
                    "num_axis": item.get('number_axis', item.get('num_axis', 2)),
                    "quantity": 1
                })
            elif 'L' in item and 'W' in item and 'H' in item:
                packing_request["items"].append({
                    "id": item.get('id', 0),
                    "request_id": item.get('request_id', item.get('id', 0)),
                    "L": float(item['L']),
                    "W": float(item['W']),
                    "H": float(item['H']),
                    "num_axis": item.get('num_axis', 2),
                    "quantity": item.get('quantity', 1)
                })
        
        # Gọi external packing endpoint với step-by-step mode
        try:
            logging.info("Calling external step-by-step packing endpoint...")
            
            response = requests.post(
                packing_endpoint,
                json=packing_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                end_time = time.time()
                
                # Xử lý kết quả step-by-step
                algorithm_steps = result.get('algorithm_steps', [])
                final_result = result.get('final_result', {})
                
                # Chuyển đổi algorithm steps sang format webapp
                webapp_steps = []
                for i, step in enumerate(algorithm_steps):
                    webapp_step = {
                        'step_number': i + 1,
                        'step_type': step.get('type', 'unknown'),
                        'description': step.get('description', f'Algorithm step {i + 1}'),
                        'data': step.get('data', {}),
                        'timestamp': step.get('timestamp', time.time())
                    }
                    webapp_steps.append(webapp_step)
                
                # Xử lý final result như bình thường
                packed_items = []
                leftover_items = []
                
                if 'packed_items' in final_result:
                    for item_group in final_result['packed_items']:
                        positions = item_group.get('positions', [])
                        rotation_ids = item_group.get('rotation_id', [])
                        
                        for i, pos in enumerate(positions):
                            rotation_id = rotation_ids[i] if i < len(rotation_ids) else 0
                            l0, w0, h0 = item_group['L'], item_group['W'], item_group['H']
                            num_axis = item_group.get('num_axis', 2)
                            lock_axis = (num_axis == 2)
                            actual_l, actual_w, actual_h = get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis)
                            
                            packed_items.append({
                                'id': item_group['id'],
                                'request_id': item_group.get('request_id', item_group['id']),
                                'length': actual_l,
                                'width': actual_w,
                                'height': actual_h,
                                'original_length': l0,
                                'original_width': w0,
                                'original_height': h0,
                                'rotation_id': rotation_id,
                                'x': pos['x'],
                                'y': pos['y'],
                                'z': pos['z'],
                                'pack_order': i + 1
                            })
                
                if 'left_over_items' in final_result:
                    for item_group in final_result['left_over_items']:
                        for _ in range(item_group.get('quantity', 1)):
                            leftover_items.append({
                                'id': item_group['id'],
                                'request_id': item_group.get('request_id', item_group['id']),
                                'length': item_group['L'],
                                'width': item_group['W'],
                                'height': item_group['H']
                            })
                
                # Tính utilization
                bin_volume = bin_length * bin_width * bin_height
                packed_volume = sum(item['length'] * item['width'] * item['height'] for item in packed_items)
                utilization = packed_volume / bin_volume if bin_volume > 0 else 0
                
                return jsonify({
                    'success': True,
                    'algorithm_steps': webapp_steps,
                    'packed_items': packed_items,
                    'leftover_items': leftover_items,
                    'bin_size': {
                        'length': bin_length,
                        'width': bin_width,
                        'height': bin_height
                    },
                    'utilization': utilization,
                    'packing_time': end_time - start_time,
                    'total_steps': len(webapp_steps)
                })
                
            else:
                error_msg = f"External endpoint returned status {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f": {error_detail.get('message', error_detail.get('error', 'Unknown error'))}"
                except:
                    error_msg += f": {response.text}"
                    
                logging.error(f"External step-by-step endpoint error: {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), 400
                
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'message': 'Không thể kết nối tới packing endpoint'
            }), 400
        except Exception as e:
            logging.error(f"External step-by-step endpoint call error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi khi gọi external endpoint: {str(e)}'
            }), 500
        
    except Exception as e:
        logging.error(f"Step-by-step packing error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/get_step', methods=['POST'])
def get_specific_step():
    """API endpoint để lấy step cụ thể từ algorithm"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        step_number = data.get('step_number', 0)
        algorithm_steps = data.get('algorithm_steps', [])
        
        if step_number < 0 or step_number >= len(algorithm_steps):
            return jsonify({
                'success': False,
                'message': f'Step number {step_number} out of range (0-{len(algorithm_steps)-1})'
            }), 400
        
        step = algorithm_steps[step_number]
        
        return jsonify({
            'success': True,
            'step': step,
            'step_number': step_number,
            'total_steps': len(algorithm_steps)
        })
        
    except Exception as e:
        logging.error(f"Get step error: {str(e)}")
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

@app.errorhandler(404)
def not_found(error):
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal server error: {str(error)}")
    return jsonify({'success': False, 'message': 'Internal server error'}), 500
