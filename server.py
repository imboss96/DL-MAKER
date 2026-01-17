"""
Enhanced Flask Server with Google Sheets Integration
"""

from flask import Flask, jsonify, send_from_directory, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
from datetime import datetime
from google_sheets import GoogleSheetsConnector
from io import BytesIO
import base64
try:
    from pdf417 import encode as pdf417_encode
    PDF417_AVAILABLE = True
except ImportError:
    PDF417_AVAILABLE = False

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
CONFIG = {
    "GOOGLE_SHEET_ID": os.getenv("GOOGLE_SHEET_ID", "YOUR_SHEET_ID_HERE"),
    "CREDENTIALS_FILE": os.getenv("CREDENTIALS_FILE", "credentials.json"),
    "CACHE_TIMEOUT": int(os.getenv("CACHE_TIMEOUT", "300")),
    "DEBUG": os.getenv("DEBUG", "True").lower() == "true"
}

# Check if credentials are in environment variable (for cloud deployment)
credentials_json_str = os.getenv("GOOGLE_CREDENTIALS")
if credentials_json_str:
    try:
        credentials_data = json.loads(credentials_json_str)
        temp_creds_path = "/tmp/credentials.json"
        with open(temp_creds_path, 'w') as f:
            json.dump(credentials_data, f)
        CONFIG["CREDENTIALS_FILE"] = temp_creds_path
    except Exception as e:
        pass


# Initialize Google Sheets connector
sheets_connector = None
cached_data = None
cache_timestamp = None

def init_google_sheets():
    """Initialize Google Sheets connection"""
    global sheets_connector
    
    try:
        if os.path.exists(CONFIG["CREDENTIALS_FILE"]):
            sheets_connector = GoogleSheetsConnector(CONFIG["CREDENTIALS_FILE"])
            print("✅ Google Sheets connector initialized")
        else:
            print("⚠️ Credentials file not found. Using sample data.")
            sheets_connector = None
    except Exception as e:
        print(f"❌ Failed to initialize Google Sheets: {e}")
        sheets_connector = None

def get_license_data(force_refresh=False):
    """Get license data from Google Sheets (with caching)"""
    global cached_data, cache_timestamp, sheets_connector
    
    # Check if cache is still valid
    if not force_refresh and cached_data and cache_timestamp:
        elapsed = (datetime.now() - cache_timestamp).total_seconds()
        if elapsed < CONFIG["CACHE_TIMEOUT"]:
            print(f"📦 Using cached data ({len(cached_data)} licenses)")
            return cached_data
    
    # Try to get data from Google Sheets
    if sheets_connector and CONFIG["GOOGLE_SHEET_ID"] != "YOUR_SHEET_ID_HERE":
        try:
            licenses = sheets_connector.get_license_data(CONFIG["GOOGLE_SHEET_ID"])
            if licenses:
                cached_data = licenses
                cache_timestamp = datetime.now()
                return licenses
        except Exception as e:
            pass
    
    # Fallback to sample data
    try:
        with open('sample_data.json', 'r') as f:
            cached_data = json.load(f)
            cache_timestamp = datetime.now()
            return cached_data
    except:
        return []

# Initialize on startup
init_google_sheets()

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.htm')

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

# API endpoint to get all licenses
@app.route('/api/licenses')
def get_licenses():
    """Get all driver's licenses"""
    try:
        data = get_license_data()
        
        # Apply filters from query parameters
        filtered_data = apply_filters(data, request.args)
        
        return jsonify({
            "success": True,
            "count": len(filtered_data),
            "total": len(data),
            "timestamp": cache_timestamp.isoformat() if cache_timestamp else None,
            "source": "google_sheets" if sheets_connector else "sample_data",
            "licenses": filtered_data
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/licenses/<int:license_id>')
def get_license(license_id):
    """Get a specific license by ID"""
    try:
        data = get_license_data()
        
        # Find license by ID
        license_data = next((item for item in data if item.get('id') == license_id), None)
        
        if license_data:
            return jsonify({
                "success": True,
                "license": license_data
            })
        else:
            return jsonify({
                "success": False,
                "error": f"License with ID {license_id} not found"
            }), 404
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/refresh')
def refresh_data():
    """Force refresh data from Google Sheets"""
    try:
        global cached_data, cache_timestamp
        cached_data = None
        cache_timestamp = None
        
        data = get_license_data(force_refresh=True)
        
        return jsonify({
            "success": True,
            "message": f"Data refreshed. {len(data)} licenses loaded.",
            "count": len(data),
            "timestamp": datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/stats')
def get_stats():
    """Get statistics about licenses"""
    try:
        data = get_license_data()
        
        # Calculate statistics
        stats = {
            "total_licenses": len(data),
            "by_state": {},
            "expiring_soon": 0,
            "expired": 0,
            "organ_donors": 0
        }
        
        today = datetime.now().date()
        
        for license_data in data:
            # Count by state
            state = license_data.get('state', 'Unknown')
            stats["by_state"][state] = stats["by_state"].get(state, 0) + 1
            
            # Count organ donors
            if license_data.get('organDonor'):
                stats["organ_donors"] += 1
            
            # Check expiration
            exp_date_str = license_data.get('expiration', '')
            if exp_date_str:
                try:
                    exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
                    days_until = (exp_date - today).days
                    
                    if days_until < 0:
                        stats["expired"] += 1
                    elif days_until <= 30:
                        stats["expiring_soon"] += 1
                except:
                    pass
        
        return jsonify({
            "success": True,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def apply_filters(data, filters):
    """Apply filters to license data"""
    if not filters:
        return data
    
    filtered_data = data
    
    # Search filter
    search_term = filters.get('search', '').lower()
    if search_term:
        filtered_data = [
            item for item in filtered_data
            if (search_term in item.get('firstName', '').lower() or
                search_term in item.get('lastName', '').lower() or
                search_term in item.get('licenseNumber', '').lower())
        ]
    
    # State filter
    state_filter = filters.get('state', '')
    if state_filter:
        filtered_data = [
            item for item in filtered_data
            if item.get('state', '').upper() == state_filter.upper()
        ]
    
    # Status filter
    status_filter = filters.get('status', '')
    if status_filter:
        today = datetime.now().date()
        
        filtered_data = [
            item for item in filtered_data
            if check_license_status(item, status_filter, today)
        ]
    
    return filtered_data

def check_license_status(license_data, status, today):
    """Check if license matches status filter"""
    exp_date_str = license_data.get('expiration', '')
    if not exp_date_str:
        return False
    
    try:
        exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
        days_until = (exp_date - today).days
        
        if status == 'valid':
            return days_until > 30
        elif status == 'expiring':
            return 0 <= days_until <= 30
        elif status == 'expired':
            return days_until < 0
        else:
            return True
    except:
        return False

@app.route('/api/pdf417')
def generate_pdf417():
    """Generate PDF417 barcode from AAMVA data"""
    try:
        data = request.args.get('data', '')
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        if not PDF417_AVAILABLE:
            return jsonify({
                "success": False,
                "error": "PDF417 library not available"
            }), 500
        
        # Generate PDF417 barcode
        barcode = pdf417_encode(data)
        
        # Create image from barcode
        from PIL import Image, ImageDraw
        
        # Calculate image dimensions
        rows = len(barcode)
        cols = len(barcode[0]) if barcode else 0
        pixel_size = 4
        width = cols * pixel_size + 40
        height = rows * pixel_size + 40
        
        # Create white image
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        # Draw barcode
        for y, row in enumerate(barcode):
            for x, bit in enumerate(row):
                if bit:
                    x1 = x * pixel_size + 20
                    y1 = y * pixel_size + 20
                    x2 = x1 + pixel_size
                    y2 = y1 + pixel_size
                    draw.rectangle([x1, y1, x2, y2], fill='black')
        
        # Convert to base64
        img_io = BytesIO()
        img.save(img_io, 'PNG', quality=95)
        img_io.seek(0)
        img_base64 = base64.b64encode(img_io.getvalue()).decode()
        
        return jsonify({
            "success": True,
            "barcode": f"data:image/png;base64,{img_base64}"
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Driver's License Viewer Server")
    print(f"📊 Data Source: {'Google Sheets' if sheets_connector else 'Sample Data'}")
    print(f"🌐 Web Viewer: http://localhost:5000")
    print(f"📋 API Endpoints:")
    print(f"   GET /api/licenses - Get all licenses")
    print(f"   GET /api/licenses/1 - Get specific license")
    print(f"   GET /api/refresh - Refresh data from Google Sheets")
    print(f"   GET /api/stats - Get statistics")
    print("\nPress Ctrl+C to stop\n")
    
    app.run(debug=CONFIG["DEBUG"], port=5000)