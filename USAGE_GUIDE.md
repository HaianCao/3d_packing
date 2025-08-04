# Hướng Dẫn Sử dụng 3D Bin Packing System

## Tổng quan

Hệ thống bao gồm 2 phần chính:
1. **Frontend Web App** (cổng 5000) - Giao diện người dùng
2. **Backend Packing API** (cổng 3001) - Thuật toán xử lý

## Cách chạy hệ thống

### 1. Khởi động Backend API (Thuật toán Packing)

```bash
# Nếu có module packing_3d hoàn chỉnh
python run_server.py

# Hoặc chạy trực tiếp nếu có sẵn
cd packing_3d
python server.py
```

Backend sẽ chạy tại: `http://localhost:3001`

### 2. Khởi động Frontend Web App

```bash
# Chạy webapp
python app.py
```

Frontend sẽ chạy tại: `http://localhost:5000`

## Cách sử dụng

### Bước 1: Cấu hình Algorithm Endpoint

1. Mở webapp tại `http://localhost:5000`
2. Trong phần **Algorithm Configuration**:
   - Nhập URL endpoint: `http://localhost:3001/pack`
   - Click nút kiểm tra (✓) để verify endpoint hoạt động
   - Cấu hình tùy chọn:
     - ✅ Use Local Search Optimization
     - Max Iterations: 30

### Bước 2: Cấu hình Warehouse

1. Trong phần **Warehouse Settings**:
   - Length: 10 (hoặc kích thước mong muốn)
   - Width: 10
   - Height: 10

### Bước 3: Thêm Items

**Cách 1: Thêm thủ công**
1. Trong phần **Add Items**:
   - Nhập kích thước L/W/H của item
   - Nhập ID
   - Click "Add Item"

**Cách 2: Upload JSON**
1. Trong phần **Import Data**:
   - Click "Show JSON Format" để xem cấu trúc
   - Upload file JSON với format:

```json
{
    "items": [
        {
            "id": 0,
            "request_id": 0,
            "L": 100.0,
            "W": 50.0,
            "H": 30.0,
            "num_axis": 2,
            "quantity": 5
        }
    ],
    "bin_size": {
        "L": 500,
        "W": 300,
        "H": 200
    },
    "parameters": {
        "stack_rule": [[3, 2], [2, 3]],
        "lifo_order": [0, 0]
    }
}
```

### Bước 4: Chạy Thuật toán

1. Click **"Run Packing Algorithm"**
2. Hệ thống sẽ:
   - Gửi dữ liệu tới backend endpoint
   - Xử lý thuật toán packing
   - Hiển thị kết quả 3D visualization

### Bước 5: Xem kết quả

- **3D Visualization**: Xem items đã được pack trong bin
- **Statistics**: Hiệu suất packing, số items còn lại
- **Export**: Xuất kết quả ra file JSON

## API Endpoints

### Backend Packing API (Port 3001)

- `GET /health` - Health check
- `POST /pack` - Thực hiện packing
- `POST /pack/analyze` - Phân tích configuration

### Frontend Web App (Port 5000)

- `GET /` - Giao diện chính
- `POST /pack` - Proxy tới backend API
- `POST /check_endpoint` - Kiểm tra endpoint
- `POST /validate_json` - Validate JSON input

## Troubleshooting

### Lỗi "Endpoint not available"
- Kiểm tra backend server có đang chạy không (`python run_server.py`)
- Verify URL endpoint đúng: `http://localhost:3001/pack`
- Kiểm tra firewall/antivirus không block port 3001

### Lỗi "No items to pack"
- Thêm ít nhất 1 item trước khi chạy
- Kiểm tra items đã được load đúng chưa

### Lỗi timeout
- Giảm số lượng items hoặc kích thước bin
- Tăng max iterations nếu cần

### Lỗi format JSON
- Sử dụng "Show JSON Format" để xem cấu trúc đúng
- Kiểm tra file JSON valid (sử dụng JSON validator)

## Advanced Usage

### Custom Weights Configuration

Trong request có thể cấu hình weights cho scoring function:

```javascript
{
    "options": {
        "weights": [5, 1, 1, 5, 5, 1, 1, 1, 3, -1000, -1, -1, -1000]
    }
}
```

### Multiple Endpoints

Có thể sử dụng các endpoint khác nhau:
- `http://localhost:3001/pack` - Local API
- `http://other-server:3001/pack` - Remote API
- `https://api.example.com/pack` - Cloud API

### Performance Tips

1. **Số lượng items**: < 100 items cho hiệu suất tốt
2. **Bin size**: Không quá lớn (< 1000x1000x1000)
3. **Local search**: Bật để có kết quả tốt hơn, tắt để nhanh hơn
4. **Iterations**: 10-50 iterations là hợp lý

## File Structure

```
3d_packing/
├── app.py                 # Frontend Flask app
├── routes.py              # API routes và logic
├── run_server.py          # Backend launcher
├── test_client.py         # Test client
├── templates/
│   └── index.html         # Giao diện chính
├── static/
│   ├── css/style.css      # Styles
│   └── js/main.js         # Frontend logic
└── packing_3d/            # Packing algorithm module
    ├── server.py          # Backend API server
    └── ...                # Các module khác
```

## Support

Để được hỗ trợ:
1. Kiểm tra logs trong console browser (F12)
2. Kiểm tra logs trong terminal backend
3. Verify dữ liệu input đúng format
4. Test endpoint bằng test_client.py
