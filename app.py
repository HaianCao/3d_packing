import os
import logging
from flask import Flask

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# Import routes after app creation to avoid circular imports
from routes import *

# Register all routes
register_routes(app)

# This section is not needed as we use gunicorn
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
