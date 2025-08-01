import numpy as np
from typing import Dict, List, Tuple
import json
from collections import defaultdict
import time

# Constants from the notebook
ITEMS_POS_X = 0
ITEMS_POS_Y = 1
ITEMS_POS_Z = 2
ITEMS_ROTATION = 3
ITEMS_L = 4
ITEMS_W = 5
ITEMS_H = 6
ITEMS_ID = 7
ITEMS_REQUEST_ID = 8

ITEMS_SHAPE = 9
ITEMS_SIZE = np.array([ITEMS_L, ITEMS_W, ITEMS_H], np.int32)
ITEMS_POS = np.array([ITEMS_POS_X, ITEMS_POS_Y, ITEMS_POS_Z], np.int32)

BIN_POS_X = 0
BIN_POS_Y = 1
BIN_POS_Z = 2

EPS = 10

# Core rotation and geometry functions
def get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis=True):
    """Get rotated dimensions based on rotation ID"""
    if lock_axis:
        # Only allow L/W rotation when lock_axis is True
        if rotation_id == 0:
            return l0, w0, h0
        elif rotation_id == 1:
            return w0, l0, h0
        else:
            return l0, w0, h0
    else:
        # Full 3D rotation when lock_axis is False
        rotations = [
            (l0, w0, h0),  # 0: original
            (w0, l0, h0),  # 1: swap L,W
            (l0, h0, w0),  # 2: swap W,H
            (w0, h0, l0),  # 3: swap L,W + W,H
            (h0, w0, l0),  # 4: swap L,H
            (h0, l0, w0),  # 5: swap L,H + L,W
        ]
        if 0 <= rotation_id < len(rotations):
            return rotations[rotation_id]
        return l0, w0, h0

def is_overlap(x1, y1, z1, l1, w1, h1, x2, y2, z2, l2, w2, h2):
    """Check if two 3D boxes overlap"""
    return not (x1 + l1 <= x2 or x2 + l2 <= x1 or
                y1 + w1 <= y2 or y2 + w2 <= y1 or
                z1 + h1 <= z2 or z2 + h2 <= z1)

def lifo_collide(item1, item2, px, py, pz, lock_axis):
    """Check if two items collide in LIFO order"""
    r1 = int(item1[ITEMS_ROTATION])
    l1, w1, h1 = get_rotation_by_id(item1[ITEMS_L], item1[ITEMS_W], item1[ITEMS_H], r1, lock_axis)
    
    r2 = int(item2[ITEMS_ROTATION])
    l2, w2, h2 = get_rotation_by_id(item2[ITEMS_L], item2[ITEMS_W], item2[ITEMS_H], r2, lock_axis)
    
    px2, py2, pz2 = item2[ITEMS_POS_X], item2[ITEMS_POS_Y], item2[ITEMS_POS_Z]
    
    return is_overlap(px, py, pz, l1, w1, h1, px2, py2, pz2, l2, w2, h2)

# Bin state management
def update_bin_state(bin_state: np.ndarray, item: np.ndarray, lock_axis: bool):
    """Update bin state matrix when placing an item"""
    px, py, pz = item[ITEMS_POS_X], item[ITEMS_POS_Y], item[ITEMS_POS_Z]
    r_id = int(item[ITEMS_ROTATION])
    l0, w0, h0 = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
    l, w, h = get_rotation_by_id(l0, w0, h0, r_id, lock_axis)
    
    # Update the height at each position covered by this item
    new_height = pz + h
    bin_state[px:px+l, py:py+w] = new_height

def create_bin_state(bin_l: int, bin_w: int, packed_items: np.ndarray = None, lock_axis: bool = True) -> np.ndarray:
    """Create bin state matrix from packed items"""
    bin_state = np.zeros((bin_l, bin_w), dtype=np.int32)
    
    if packed_items is None:
        return bin_state
    
    if packed_items.shape[0] == 0:
        return bin_state
    
    for i in range(packed_items.shape[0]):
        if packed_items[i][ITEMS_POS_X] < 0:
            continue
        update_bin_state(bin_state, packed_items[i], lock_axis)
    
    return bin_state

# Constraint checking functions
def constraint_within_bin(pos_x: int, pos_y: int, rotation_id: int,
                         item: np.ndarray, bin_state: np.ndarray, bin_h: int,
                         lock_axis: bool, debug=False) -> bool:
    """Check if item fits within bin boundaries"""
    l0, w0, h0 = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
    l, w, h = get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis)
    
    # Check X, Y boundaries
    bin_l, bin_w = bin_state.shape
    if not (pos_x >= 0 and pos_y >= 0 and pos_x + l <= bin_l and pos_y + w <= bin_w):
        return False
    
    # Check Z boundary
    pos_z = bin_state[pos_x, pos_y]
    return (pos_z + h <= bin_h)

def constraint_has_support(pos_x: int, pos_y: int,
                          item: np.ndarray, rotation_id: int,
                          bin_state: np.ndarray, lock_axis: bool, debug=False) -> bool:
    """Check if item has flat support underneath"""
    l0, w0, h0 = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
    l, w, h = get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis)
    
    bin_l, bin_w = bin_state.shape
    if not (pos_x >= 0 and pos_y >= 0 and pos_x + l <= bin_l and pos_y + w <= bin_w):
        return False
    
    # Check if support surface is flat
    support_z = bin_state[pos_x, pos_y]
    is_flat = np.all(bin_state[pos_x:pos_x + l, pos_y:pos_y + w] == support_z)
    
    return bool(is_flat)

def constraint_no_overlap(pos_x, pos_y, pos_z, l0, w0, h0, rotation_id,
                         placed_items, lock_axis, debug=False) -> bool:
    """Check if item overlaps with any placed items"""
    l, w, h = get_rotation_by_id(l0, w0, h0, rotation_id, lock_axis)
    
    for i in range(len(placed_items)):
        px = placed_items[i, ITEMS_POS_X]
        py = placed_items[i, ITEMS_POS_Y]
        pz = placed_items[i, ITEMS_POS_Z]
        if px < 0 or py < 0 or pz < 0:
            continue
        
        r_id = placed_items[i, ITEMS_ROTATION]
        pl0 = placed_items[i, ITEMS_L]
        pw0 = placed_items[i, ITEMS_W]
        ph0 = placed_items[i, ITEMS_H]
        pl, pw, ph = get_rotation_by_id(pl0, pw0, ph0, r_id, lock_axis)
        
        if is_overlap(pos_x, pos_y, pos_z, l, w, h, px, py, pz, pl, pw, ph):
            return False
    
    return True

def check_all_constraints(pos_x, pos_y, bin_state, item: np.ndarray, rotation_id,
                         bin_l, bin_w, bin_h, placed_items, stack_rule, lifo_order,
                         lock_axis, debug=False):
    """Check all constraints for placing an item"""
    const_bin = constraint_within_bin(pos_x, pos_y, rotation_id, item, bin_state,
                                     bin_h, lock_axis, debug)
    if not const_bin:
        return False
    
    const_support = constraint_has_support(pos_x, pos_y, item, rotation_id,
                                          bin_state, lock_axis, debug)
    
    return const_bin and const_support

# Core packing functions
def add_new_item(bin_state: np.ndarray, item: np.ndarray, px, py, pz, r_id, lock_axis):
    """Add new item to bin state"""
    item[ITEMS_POS_X] = px
    item[ITEMS_POS_Y] = py
    item[ITEMS_POS_Z] = pz
    item[ITEMS_ROTATION] = r_id
    update_bin_state(bin_state, item, lock_axis)
    return bin_state, item

def compute_score(item, r_id, px, py, pz, bin_l, bin_w, bin_h, weights, lock_axis):
    """Compute placement score for an item"""
    l0, w0, h0 = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
    l, w, h = get_rotation_by_id(l0, w0, h0, r_id, lock_axis)
    
    # Simple scoring: prefer lower positions and corner placements
    position_score = weights.get('position', 1.0) * (bin_l - px + bin_w - py + bin_h - pz)
    corner_score = weights.get('corner', 1.0) * (1.0 / (px + py + 1))
    volume_score = weights.get('volume', 1.0) * (l * w * h)
    
    return position_score + corner_score + volume_score

def find_best_item_to_pack(unpacked_items, bin_positions, bin_l, bin_w, bin_h,
                          packed_items, stack_rule, lifo_order, weights, lock_axis=True):
    """Find the best item and position combination"""
    best_score = -1
    best_item_idx = -1
    best_position = None
    best_rotation = 0
    
    for item_idx, item in enumerate(unpacked_items):
        if item[ITEMS_POS_X] >= 0:  # Already placed
            continue
            
        for pos_idx, pos in enumerate(bin_positions):
            px, py = pos[BIN_POS_X], pos[BIN_POS_Y]
            
            # Try different rotations
            max_rotations = 2 if lock_axis else 6
            for r_id in range(max_rotations):
                bin_state = create_bin_state(bin_l, bin_w, packed_items, lock_axis)
                
                if check_all_constraints(px, py, bin_state, item, r_id,
                                       bin_l, bin_w, bin_h, packed_items,
                                       stack_rule, lifo_order, lock_axis):
                    pz = bin_state[px, py]
                    score = compute_score(item, r_id, px, py, pz, bin_l, bin_w, bin_h, weights, lock_axis)
                    
                    if score > best_score:
                        best_score = score
                        best_item_idx = item_idx
                        best_position = (px, py, pz)
                        best_rotation = r_id
    
    return best_item_idx, best_position, best_rotation, best_score

def get_possible_bin_positions(packed_items, bin_state, bin_h, lock_axis=True):
    """Get possible positions for placing new items"""
    bin_l, bin_w = bin_state.shape
    positions = []
    
    # Always include corner position
    positions.append(np.array([0, 0, 0], dtype=np.int32))
    
    # Add positions next to existing items
    for item in packed_items:
        if item[ITEMS_POS_X] < 0:
            continue
            
        px, py, pz = item[ITEMS_POS_X], item[ITEMS_POS_Y], item[ITEMS_POS_Z]
        r_id = item[ITEMS_ROTATION]
        l0, w0, h0 = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
        l, w, h = get_rotation_by_id(l0, w0, h0, r_id, lock_axis)
        
        # Add positions around this item
        candidates = [
            [px + l, py, 0],      # Right
            [px, py + w, 0],      # Back
            [px + l, py + w, 0],  # Corner
        ]
        
        for candidate in candidates:
            if (0 <= candidate[0] < bin_l and 0 <= candidate[1] < bin_w):
                positions.append(np.array(candidate, dtype=np.int32))
    
    # Remove duplicates
    unique_positions = []
    for pos in positions:
        if not any(np.array_equal(pos[:2], upos[:2]) for upos in unique_positions):
            unique_positions.append(pos)
    
    return np.array(unique_positions, dtype=np.int32)

def simple_pack_with_steps(items, bin_l, bin_w, bin_h, lock_axis=True, save_steps=False):
    """Simplified packing function with step-by-step tracking"""
    packed_items = []
    remaining_items = items.copy()
    steps = []
    
    for item_idx, item in enumerate(remaining_items):
        if item[ITEMS_POS_X] >= 0:  # Already packed
            continue
            
        best_position = None
        best_rotation = 0
        
        # Try simple positions: corners and next to existing items
        positions_to_try = [(0, 0)]  # Start with corner
        
        # Add positions next to existing items
        for packed_item in packed_items:
            px, py = packed_item[ITEMS_POS_X], packed_item[ITEMS_POS_Y]
            r_id = packed_item[ITEMS_ROTATION]
            l0, w0, h0 = packed_item[ITEMS_L], packed_item[ITEMS_W], packed_item[ITEMS_H]
            l, w, h = get_rotation_by_id(l0, w0, h0, r_id, lock_axis)
            
            positions_to_try.extend([
                (px + l, py),
                (px, py + w),
                (px + l, py + w)
            ])
        
        # Try each position and rotation
        for pos_x, pos_y in positions_to_try:
            if pos_x >= bin_l or pos_y >= bin_w:
                continue
                
            # Calculate z position based on existing items
            pos_z = 0
            for packed_item in packed_items:
                px, py, pz = packed_item[ITEMS_POS_X], packed_item[ITEMS_POS_Y], packed_item[ITEMS_POS_Z]
                r_id = packed_item[ITEMS_ROTATION]
                l0, w0, h0 = packed_item[ITEMS_L], packed_item[ITEMS_W], packed_item[ITEMS_H]
                pl, pw, ph = get_rotation_by_id(l0, w0, h0, r_id, lock_axis)
                
                # Check if this position overlaps with existing item
                item_l, item_w, item_h = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
                if (pos_x < px + pl and pos_x + item_l > px and 
                    pos_y < py + pw and pos_y + item_w > py):
                    pos_z = max(pos_z, pz + ph)
            
            # Try different rotations
            max_rotations = 2 if lock_axis else 6
            for r_id in range(max_rotations):
                l, w, h = get_rotation_by_id(item[ITEMS_L], item[ITEMS_W], item[ITEMS_H], r_id, lock_axis)
                
                # Check if item fits in bin
                if (pos_x + l <= bin_l and pos_y + w <= bin_w and pos_z + h <= bin_h):
                    # Check for overlaps with existing items
                    overlap = False
                    for packed_item in packed_items:
                        px, py, pz = packed_item[ITEMS_POS_X], packed_item[ITEMS_POS_Y], packed_item[ITEMS_POS_Z]
                        pr_id = packed_item[ITEMS_ROTATION]
                        pl0, pw0, ph0 = packed_item[ITEMS_L], packed_item[ITEMS_W], packed_item[ITEMS_H]
                        pl, pw, ph = get_rotation_by_id(pl0, pw0, ph0, pr_id, lock_axis)
                        
                        if is_overlap(pos_x, pos_y, pos_z, l, w, h, px, py, pz, pl, pw, ph):
                            overlap = True
                            break
                    
                    if not overlap:
                        best_position = (pos_x, pos_y, pos_z)
                        best_rotation = r_id
                        break
            
            if best_position:
                break
        
        # Pack the item if a valid position was found
        if best_position:
            px, py, pz = best_position
            item[ITEMS_POS_X] = px
            item[ITEMS_POS_Y] = py
            item[ITEMS_POS_Z] = pz
            item[ITEMS_ROTATION] = best_rotation
            packed_items.append(item.copy())
            
            # Save step for visualization
            if save_steps:
                step_packed_items = []
                for packed_item in packed_items:
                    step_packed_items.append({
                        'id': int(packed_item[ITEMS_ID]),
                        'request_id': int(packed_item[ITEMS_REQUEST_ID]),
                        'x': int(packed_item[ITEMS_POS_X]),
                        'y': int(packed_item[ITEMS_POS_Y]),
                        'z': int(packed_item[ITEMS_POS_Z]),
                        'length': int(packed_item[ITEMS_L]),
                        'width': int(packed_item[ITEMS_W]),
                        'height': int(packed_item[ITEMS_H]),
                        'rotation': int(packed_item[ITEMS_ROTATION])
                    })
                
                steps.append({
                    'item_id': int(item[ITEMS_ID]),
                    'position': {'x': int(px), 'y': int(py), 'z': int(pz)},
                    'rotation': int(best_rotation),
                    'packed_items': step_packed_items.copy()
                })
    
    # Separate packed and leftover items
    packed_result = []
    leftover_result = []
    
    for item in remaining_items:
        if item[ITEMS_POS_X] >= 0:
            packed_result.append(item)
        else:
            leftover_result.append(item)
    
    packed_array = np.array(packed_result, dtype=np.int32) if packed_result else np.zeros((0, ITEMS_SHAPE), dtype=np.int32)
    leftover_array = np.array(leftover_result, dtype=np.int32) if leftover_result else np.zeros((0, ITEMS_SHAPE), dtype=np.int32)
    
    return packed_array, leftover_array, steps

def simple_pack(items, bin_l, bin_w, bin_h, lock_axis=True):
    """Simplified packing function for better performance"""
    packed_array, leftover_array, _ = simple_pack_with_steps(items, bin_l, bin_w, bin_h, lock_axis, save_steps=False)
    return packed_array, leftover_array

def local_search_3D(_packed_items, _left_over, items, bin_l, bin_w, bin_h,
                   stack_rule, lifo_order, weights, max_iter=30, lock_axis=True):
    """Main local search 3D algorithm - simplified version"""
    # Combine all items for packing
    if len(_left_over) > 0 and len(_packed_items) > 0:
        all_items = np.concatenate((_packed_items, _left_over))
    elif len(_left_over) > 0:
        all_items = _left_over.copy()
    elif len(_packed_items) > 0:
        all_items = _packed_items.copy()
    else:
        all_items = items.copy()
    
    # Reset all positions for fresh packing
    all_items[:, ITEMS_POS_X] = -1
    all_items[:, ITEMS_POS_Y] = -1
    all_items[:, ITEMS_POS_Z] = -1
    all_items[:, ITEMS_ROTATION] = 0
    
    # Run simplified packing algorithm
    final_packed, final_leftover = simple_pack(all_items, bin_l, bin_w, bin_h, lock_axis)
    
    return final_packed, final_leftover

class LocalSearchPackingAlgorithm:
    """Local Search 3D Packing Algorithm Implementation"""
    
    def __init__(self, bin_size: Tuple[int, int, int]):
        self.bin_size = bin_size
        self.bin_length, self.bin_width, self.bin_height = bin_size
        self.steps = []  # Store algorithm steps
        
    def create_items_array(self, items_data: List[Dict]) -> np.ndarray:
        """Convert items data from web form to numpy array format"""
        n_items = len(items_data)
        items = np.zeros((n_items, ITEMS_SHAPE), dtype=np.int32)
        
        for i, item in enumerate(items_data):
            items[i, ITEMS_POS_X] = -1  # Not placed yet
            items[i, ITEMS_POS_Y] = -1
            items[i, ITEMS_POS_Z] = -1
            items[i, ITEMS_ROTATION] = 0
            items[i, ITEMS_L] = int(item['length'])
            items[i, ITEMS_W] = int(item['width'])
            items[i, ITEMS_H] = int(item['height'])
            items[i, ITEMS_ID] = int(item['id'])
            items[i, ITEMS_REQUEST_ID] = int(item.get('request_id', item['id']))
            
        return items
    
    def create_items_from_json_new_format(self, items_data: List[Dict]) -> np.ndarray:
        """Create items array from new JSON format with L/W/H and quantity"""
        all_items = []
        item_counter = 0
        
        for item_type in items_data:
            quantity = item_type.get('quantity', 1)
            for _ in range(quantity):
                item = np.zeros(ITEMS_SHAPE, dtype=np.int32)
                item[ITEMS_POS_X] = -1
                item[ITEMS_POS_Y] = -1
                item[ITEMS_POS_Z] = -1
                item[ITEMS_ROTATION] = 0
                item[ITEMS_L] = int(item_type['L'])
                item[ITEMS_W] = int(item_type['W'])
                item[ITEMS_H] = int(item_type['H'])
                item[ITEMS_ID] = int(item_type['id'])
                item[ITEMS_REQUEST_ID] = int(item_type.get('request_id', item_type['id']))
                all_items.append(item)
                item_counter += 1
        
        return np.array(all_items, dtype=np.int32) if all_items else np.zeros((0, ITEMS_SHAPE), dtype=np.int32)
    
    def pack(self, items_data: List[Dict], algorithm_steps: bool = False) -> Dict:
        """Main packing method using simplified algorithm"""
        start_time = time.time()
        self.steps = []
        
        # Convert items to numpy array
        items_array = self.create_items_array(items_data)
        
        # Run simplified packing algorithm with step tracking
        final_packed, final_leftover, packing_steps = simple_pack_with_steps(
            items_array, self.bin_length, self.bin_width, self.bin_height, 
            lock_axis=True, save_steps=algorithm_steps
        )
        
        # Store steps for visualization
        if algorithm_steps:
            self.steps = packing_steps
        
        # Convert back to required format
        packed_list = []
        for item in final_packed:
            if item[ITEMS_POS_X] >= 0:  # Only include placed items
                packed_list.append({
                    'id': int(item[ITEMS_ID]),
                    'request_id': int(item[ITEMS_REQUEST_ID]),
                    'x': int(item[ITEMS_POS_X]),
                    'y': int(item[ITEMS_POS_Y]),
                    'z': int(item[ITEMS_POS_Z]),
                    'length': int(item[ITEMS_L]),
                    'width': int(item[ITEMS_W]),
                    'height': int(item[ITEMS_H]),
                    'rotation': int(item[ITEMS_ROTATION])
                })
        
        leftover_list = []
        for item in final_leftover:
            leftover_list.append({
                'id': int(item[ITEMS_ID]),
                'request_id': int(item[ITEMS_REQUEST_ID]),
                'length': int(item[ITEMS_L]),
                'width': int(item[ITEMS_W]),
                'height': int(item[ITEMS_H])
            })
        
        packing_time = time.time() - start_time
        
        return {
            'packed_items': packed_list,
            'leftover_items': leftover_list,
            'bin_size': {
                'length': self.bin_length,
                'width': self.bin_width,
                'height': self.bin_height
            },
            'packing_time': packing_time,
            'utilization': self._calculate_utilization(packed_list),
            'packing_steps': self.steps if algorithm_steps else []
        }
    
    def pack_json_format(self, items_data: List[Dict], algorithm_steps: bool = False) -> Dict:
        """Pack items from new JSON format with L/W/H and quantity"""
        start_time = time.time()
        self.steps = []
        
        # Convert items to numpy array
        items_array = self.create_items_from_json_new_format(items_data)
        
        if len(items_array) == 0:
            return {
                'packed_items': [],
                'leftover_items': [],
                'bin_size': {
                    'length': self.bin_length,
                    'width': self.bin_width,
                    'height': self.bin_height
                },
                'packing_time': 0.0,
                'utilization': 0.0,
                'packing_steps': []
            }
        
        # Run simplified packing algorithm with step tracking
        final_packed, final_leftover, packing_steps = simple_pack_with_steps(
            items_array, self.bin_length, self.bin_width, self.bin_height, 
            lock_axis=True, save_steps=algorithm_steps
        )
        
        # Store steps for visualization
        if algorithm_steps:
            self.steps = packing_steps
        
        # Store step for visualization
        if algorithm_steps:
            self.steps.append({
                'packed_items': final_packed.copy(),
                'leftover_items': final_leftover.copy(),
                'timestamp': time.time() - start_time
            })
        
        # Convert back to required format
        packed_list = []
        for item in final_packed:
            if item[ITEMS_POS_X] >= 0:  # Only include placed items
                packed_list.append({
                    'id': int(item[ITEMS_ID]),
                    'request_id': int(item[ITEMS_REQUEST_ID]),
                    'x': int(item[ITEMS_POS_X]),
                    'y': int(item[ITEMS_POS_Y]),
                    'z': int(item[ITEMS_POS_Z]),
                    'length': int(item[ITEMS_L]),
                    'width': int(item[ITEMS_W]),
                    'height': int(item[ITEMS_H]),
                    'rotation': int(item[ITEMS_ROTATION])
                })
        
        leftover_list = []
        for item in final_leftover:
            leftover_list.append({
                'id': int(item[ITEMS_ID]),
                'request_id': int(item[ITEMS_REQUEST_ID]),
                'length': int(item[ITEMS_L]),
                'width': int(item[ITEMS_W]),
                'height': int(item[ITEMS_H])
            })
        
        packing_time = time.time() - start_time
        
        return {
            'packed_items': packed_list,
            'leftover_items': leftover_list,
            'bin_size': {
                'length': self.bin_length,
                'width': self.bin_width,
                'height': self.bin_height
            },
            'packing_time': packing_time,
            'utilization': self._calculate_utilization(packed_list),
            'packing_steps': self.steps if algorithm_steps else []
        }
    
    def _calculate_utilization(self, packed_items: List[Dict]) -> float:
        """Calculate space utilization percentage"""
        if not packed_items:
            return 0.0
        
        total_item_volume = sum(
            item['length'] * item['width'] * item['height'] 
            for item in packed_items
        )
        bin_volume = self.bin_length * self.bin_width * self.bin_height
        
        return (total_item_volume / bin_volume) * 100.0 if bin_volume > 0 else 0.0
    
    def get_algorithm_steps(self) -> List[Dict]:
        """Get step-by-step algorithm execution for visualization"""
        return self.steps