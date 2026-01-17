"""
Configuration settings for the application
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Google Sheets Configuration
    GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID', 'YOUR_SHEET_ID_HERE')
    CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')
    
    # Application Settings
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '0.0.0.0')
    
    # Cache Settings (seconds)
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 300))
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    
    # Google Sheets Range
    SHEET_RANGE = os.getenv('SHEET_RANGE', 'Sheet1!A1:Z1000')

# For quick access
config = Config()