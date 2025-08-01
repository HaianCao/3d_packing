import numpy as np
from typing import Dict, List, Tuple
import json
from collections import defaultdict

# Constants from the original notebook
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

class PackingAlgorithm:
    def __init__(self, bin_size: Tuple[int, int, int]):
        self.bin_size = bin_size
        self.bin_length, self.bin_width, self.bin_height = bin_size
        
    def create_items_array(self, items_data: List[Dict]) -> np.ndarray:
        """
        Convert items data from web form to numpy array format
        """
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
    
    def insert_pq(self, pq: np.ndarray, item: np.ndarray) -> np.ndarray:
        """
        Insert item into priority queue sorted by z coordinate
        """
        z = item[ITEMS_POS_Z]
        pq_id = np.searchsorted(pq[:, ITEMS_POS_Z], np.array([z]))[0]
        pq = np.concatenate((pq[:pq_id], item.reshape(1, -1), pq[pq_id:]))
        return pq
    
    def can_place_item(self, item: np.ndarray, position: Tuple[int, int, int], placed_items: np.ndarray) -> bool:
        """
        Check if an item can be placed at the given position without overlapping
        """
        x, y, z = position
        item_l, item_w, item_h = item[ITEMS_L], item[ITEMS_W], item[ITEMS_H]
        
        # Check bin boundaries
        if (x + item_l > self.bin_length or 
            y + item_w > self.bin_width or 
            z + item_h > self.bin_height):
            return False
        
        # Check overlaps with placed items
        for placed_item in placed_items:
            if placed_item[ITEMS_POS_X] == -1:  # Skip unplaced items
                continue
                
            px, py, pz = placed_item[ITEMS_POS_X], placed_item[ITEMS_POS_Y], placed_item[ITEMS_POS_Z]
            pl, pw, ph = placed_item[ITEMS_L], placed_item[ITEMS_W], placed_item[ITEMS_H]
            
            # Check for overlap in all three dimensions
            overlap_x = not (x >= px + pl or px >= x + item_l)
            overlap_y = not (y >= py + pw or py >= y + item_w)
            overlap_z = not (z >= pz + ph or pz >= z + item_h)
            
            if overlap_x and overlap_y and overlap_z:
                return False
                
        return True
    
    def find_placement_positions(self, placed_items: np.ndarray) -> List[Tuple[int, int, int]]:
        """
        Find potential placement positions based on placed items (optimized)
        """
        positions = [(0, 0, 0)]  # Start with origin
        
        for placed_item in placed_items:
            if placed_item[ITEMS_POS_X] == -1:  # Skip unplaced items
                continue
                
            x, y, z = placed_item[ITEMS_POS_X], placed_item[ITEMS_POS_Y], placed_item[ITEMS_POS_Z]
            l, w, h = placed_item[ITEMS_L], placed_item[ITEMS_W], placed_item[ITEMS_H]
            
            # Add only essential positions
            positions.extend([
                (x + l, y, z),      # Right
                (x, y + w, z),      # Back  
                (x, y, z + h),      # Top
            ])
        
        # Remove duplicates, filter invalid positions, and sort
        unique_positions = []
        seen = set()
        
        for pos in positions:
            x, y, z = pos
            # Filter out positions outside bin boundaries
            if (x >= 0 and y >= 0 and z >= 0 and 
                x < self.bin_length and y < self.bin_width and z < self.bin_height):
                if pos not in seen:
                    unique_positions.append(pos)
                    seen.add(pos)
        
        # Sort by z, then y, then x (bottom-left-front first)
        unique_positions.sort(key=lambda pos: (pos[2], pos[1], pos[0]))
        
        # Limit number of positions to check (optimization)
        return unique_positions[:50]  # Max 50 positions to avoid excessive computation
    
    def simple_packing_algorithm(self, items: np.ndarray) -> Tuple[np.ndarray, List[Dict]]:
        """
        Simple bottom-left-fill packing algorithm with step tracking and timeout
        """
        import time
        start_time = time.time()
        timeout = 30.0  # 30 second timeout
        
        placed_items = items.copy()
        n_items = len(items)
        packing_steps = []
        
        for i in range(n_items):
            # Check timeout
            if time.time() - start_time > timeout:
                break
                
            if placed_items[i, ITEMS_POS_X] != -1:  # Already placed
                continue
                
            current_item = placed_items[i]
            positions = self.find_placement_positions(placed_items)
            
            # Try to place item at each position
            placed = False
            for pos in positions:
                if self.can_place_item(current_item, pos, placed_items):
                    placed_items[i, ITEMS_POS_X] = pos[0]
                    placed_items[i, ITEMS_POS_Y] = pos[1]
                    placed_items[i, ITEMS_POS_Z] = pos[2]
                    placed = True
                    
                    # Save the step
                    step = {
                        'step_number': len(packing_steps) + 1,
                        'item_id': int(current_item[ITEMS_ID]),
                        'position': {'x': int(pos[0]), 'y': int(pos[1]), 'z': int(pos[2])},
                        'item_dimensions': {
                            'length': int(current_item[ITEMS_L]),
                            'width': int(current_item[ITEMS_W]),
                            'height': int(current_item[ITEMS_H])
                        },
                        'placed_items_so_far': self._get_current_state(placed_items, i + 1)
                    }
                    packing_steps.append(step)
                    break
            
            if not placed:
                # Item couldn't be placed - mark as leftover
                continue
                
        return placed_items, packing_steps
    
    def _get_current_state(self, placed_items: np.ndarray, up_to_index: int) -> List[Dict]:
        """
        Get current state of placed items up to a certain index
        """
        current_items = []
        for i in range(up_to_index):
            item = placed_items[i]
            if item[ITEMS_POS_X] != -1:  # Item is placed
                current_items.append({
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
        return current_items
    
    def pack_items(self, items_data: List[Dict]) -> Dict:
        """
        Main packing function that returns results in JSON format
        """
        if not items_data:
            return {
                'success': False,
                'message': 'No items to pack',
                'placed_items': [],
                'leftover_items': []
            }
        
        try:
            items = self.create_items_array(items_data)
            packed_items, packing_steps = self.simple_packing_algorithm(items)
            
            placed_items = []
            leftover_items = []
            
            for item in packed_items:
                item_dict = {
                    'id': int(item[ITEMS_ID]),
                    'request_id': int(item[ITEMS_REQUEST_ID]),
                    'length': int(item[ITEMS_L]),
                    'width': int(item[ITEMS_W]),
                    'height': int(item[ITEMS_H]),
                }
                
                if item[ITEMS_POS_X] != -1:  # Successfully placed
                    item_dict.update({
                        'x': int(item[ITEMS_POS_X]),
                        'y': int(item[ITEMS_POS_Y]),
                        'z': int(item[ITEMS_POS_Z]),
                        'rotation': int(item[ITEMS_ROTATION])
                    })
                    placed_items.append(item_dict)
                else:  # Leftover
                    leftover_items.append(item_dict)
            
            return {
                'success': True,
                'message': f'Packed {len(placed_items)} out of {len(items)} items',
                'placed_items': placed_items,
                'leftover_items': leftover_items,
                'packing_steps': packing_steps,
                'bin_size': {
                    'length': self.bin_length,
                    'width': self.bin_width,
                    'height': self.bin_height
                },
                'utilization': len(placed_items) / len(items) * 100 if items_data else 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Packing error: {str(e)}',
                'placed_items': [],
                'leftover_items': []
            }
