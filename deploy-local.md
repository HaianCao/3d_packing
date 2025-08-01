# Local Deployment Guide

## Cách 1: Chạy đơn giản (Development)

### Bước 1: Cài đặt dependencies
```bash
pip install flask numpy gunicorn
```

### Bước 2: Chạy ứng dụng
```bash
# Chạy development server
python main.py

# Hoặc chạy production server
gunicorn --bind 0.0.0.0:5000 --workers 4 main:app
```

Truy cập: http://localhost:5000

---

## Cách 2: Sử dụng Docker (Recommended)

### Bước 1: Build Docker image
```bash
docker build -t bin-packing-app .
```

### Bước 2: Chạy container
```bash
docker run -p 5000:5000 -e SESSION_SECRET=your-secret-key bin-packing-app
```

### Hoặc sử dụng Docker Compose
```bash
# Chạy ứng dụng với nginx reverse proxy
docker-compose up -d

# Chỉ chạy ứng dụng
docker-compose up bin-packing-app
```

Truy cập: 
- Ứng dụng trực tiếp: http://localhost:5000
- Qua nginx: http://localhost

---

## Cách 3: Deploy với systemd (Linux Production)

### Bước 1: Tạo systemd service
Tạo file `/etc/systemd/system/bin-packing.service`:

```ini
[Unit]
Description=3D Bin Packing Visualizer
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/opt/bin-packing
ExecStart=/usr/local/bin/gunicorn --bind 0.0.0.0:5000 --workers 4 main:app
Restart=always
RestartSec=5
Environment=SESSION_SECRET=your-secret-key
Environment=FLASK_ENV=production

[Install]
WantedBy=multi-user.target
```

### Bước 2: Kích hoạt service
```bash
sudo systemctl daemon-reload
sudo systemctl enable bin-packing
sudo systemctl start bin-packing
sudo systemctl status bin-packing
```

---

## Cách 4: Deploy với Apache/Nginx

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Apache Configuration (với mod_wsgi)
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /opt/bin-packing
    
    WSGIDaemonProcess binpacking python-path=/opt/bin-packing
    WSGIProcessGroup binpacking
    WSGIScriptAlias / /opt/bin-packing/app.wsgi
    
    <Directory /opt/bin-packing>
        WSGIApplicationGroup %{GLOBAL}
        Require all granted
    </Directory>
</VirtualHost>
```

---

## Environment Variables

Các biến môi trường cần thiết:

```bash
export SESSION_SECRET="your-secret-key-here"
export FLASK_ENV="production"
export FLASK_APP="main.py"
```

---

## Performance Tuning

### Gunicorn Configuration
```bash
gunicorn \
  --bind 0.0.0.0:5000 \
  --workers 4 \
  --worker-class sync \
  --timeout 60 \
  --keepalive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  main:app
```

### Nginx Optimization
- Enable gzip compression
- Set proper cache headers for static files
- Use SSL/TLS certificates
- Configure rate limiting

---

## Monitoring và Logs

### Xem logs
```bash
# Docker logs
docker logs -f container_name

# Systemd logs  
journalctl -u bin-packing -f

# Nginx logs
tail -f /var/log/nginx/access.log
```

### Health Check
Endpoint: `http://localhost:5000/` 
Status: 200 OK nghĩa là ứng dụng hoạt động bình thường