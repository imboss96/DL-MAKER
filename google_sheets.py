"""
Google Sheets API Connection Module
Handles reading data from Google Sheets
"""

import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class GoogleSheetsConnector:
    def __init__(self, credentials_file='credentials.json'):
        """
        Initialize Google Sheets API connection
        
        Args:
            credentials_file: Path to service account credentials JSON file
        """
        self.credentials_file = credentials_file
        self.service = self.authenticate()
    
    def authenticate(self):
        """Authenticate with Google Sheets API using service account"""
        try:
            # Load credentials from JSON file
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_file,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            # Build the Sheets API service
            service = build('sheets', 'v4', credentials=credentials)
            print("✅ Google Sheets API authenticated successfully (with read/write access)")
            return service
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return None
    
    def get_sheet_data(self, spreadsheet_id, range_name='Sheet1!A1:Z1000'):
        """
        Get data from Google Sheets
        
        Args:
            spreadsheet_id: The ID of the Google Sheet
            range_name: The range to read (e.g., 'Sheet1!A1:Z1000')
        
        Returns:
            List of rows from the sheet
        """
        try:
            if not self.service:
                print("❌ Service not initialized. Authentication failed.")
                return []
            
            # Call the Sheets API
            sheet = self.service.spreadsheets()
            result = sheet.values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("❌ No data found in the sheet.")
                return []
            
            print(f"✅ Retrieved {len(values)} rows from Google Sheets")
            return values
            
        except HttpError as err:
            print(f"❌ Google Sheets API error: {err}")
            return []
        except Exception as e:
            print(f"❌ Error reading from Google Sheets: {e}")
            return []
    
    def get_license_data(self, spreadsheet_id):
        """
        Get driver's license data and convert to structured format
        
        Args:
            spreadsheet_id: The ID of your Google Sheet
        
        Returns:
            List of license dictionaries
        """
        # Read all data from the sheet
        raw_data = self.get_sheet_data(spreadsheet_id, 'Sheet1!A1:Z1000')
        
        print(f"DEBUG: raw_data received: {len(raw_data)} rows")
        if raw_data:
            print(f"DEBUG: First row (header): {raw_data[0]}")
            if len(raw_data) > 1:
                print(f"DEBUG: Second row (first data): {raw_data[1]}")
        
        if not raw_data:
            return []
        
        # Assuming first row contains headers
        headers = raw_data[0]
        data_rows = raw_data[1:]  # Skip header row
        
        print(f"DEBUG: Processing {len(data_rows)} data rows")
        
        licenses = []
        
        for i, row in enumerate(data_rows):
            if not row:  # Skip empty rows
                continue
            
            try:
                # Map sheet columns to license fields
                # Sheet structure: A=# B=First C=Last D=Middle E=DOB F=State G=License# H=City I=Street J=ZIP K=Height L=Weight M=Eye N=Hair O=Expiration
                license_data = {
                    'id': i + 1,
                    'firstName': row[1] if len(row) > 1 else '',
                    'lastName': row[2] if len(row) > 2 else '',
                    'middleInitial': row[3] if len(row) > 3 else '',
                    'dateOfBirth': row[4] if len(row) > 4 else '',
                    'state': row[5] if len(row) > 5 else '',
                    'licenseNumber': row[6] if len(row) > 6 else '',
                    'city': row[7] if len(row) > 7 else '',
                    'street': row[8] if len(row) > 8 else '',
                    'zipCode': row[9] if len(row) > 9 else '',
                    'height': row[10] if len(row) > 10 else '',
                    'weight': int(row[11]) if len(row) > 11 and str(row[11]).isdigit() else 0,
                    'eyeColor': row[12] if len(row) > 12 else '',
                    'hairColor': row[13] if len(row) > 13 else '',
                    'expiration': row[14] if len(row) > 14 else '',
                    'licenseClass': '',
                    'restrictions': '',
                    'organDonor': False
                }
                
                licenses.append(license_data)
                
            except Exception as e:
                print(f"⚠️ Error processing row {i + 2}: {e}")
                continue
        
        print(f"DEBUG: Successfully created {len(licenses)} license objects")
        return licenses

# For quick testing
if __name__ == "__main__":
    # Replace with your actual sheet ID
    SAMPLE_SHEET_ID = "YOUR_SHEET_ID_HERE"
    
    connector = GoogleSheetsConnector('credentials.json')
    
    if connector.service:
        print("Testing Google Sheets connection...")
        licenses = connector.get_license_data(SAMPLE_SHEET_ID)
        print(f"Retrieved {len(licenses)} licenses")
        
        if licenses:
            print("\nFirst license sample:")
            for key, value in licenses[0].items():
                print(f"  {key}: {value}")
    else:
        print("Failed to initialize Google Sheets connection")