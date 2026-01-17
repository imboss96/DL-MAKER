"""
Generate 1000 USA Driver's License entries and save directly to Google Sheets
Requires: credentials.json and Sheet ID in .env file
"""

import random
import csv
import json
from datetime import date, timedelta
from google_sheets import GoogleSheetsConnector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LicenseGenerator:
    def __init__(self):
        # Data pools
        self.first_names = [
            "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", 
            "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
            "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
            "Matthew", "Margaret", "Anthony", "Betty", "Donald", "Sandra", "Mark", "Ashley",
            "Paul", "Dorothy", "Steven", "Kimberly", "Andrew", "Emily", "Kenneth", "Donna",
            "Joshua", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
            "Edward", "Deborah", "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Laura",
            "Jeffrey", "Helen", "Ryan", "Sharon", "Jacob", "Cynthia", "Gary", "Kathleen",
            "Nicholas", "Amy", "Eric", "Shirley", "Jonathan", "Angela", "Stephen", "Anna",
            "Larry", "Ruth", "Justin", "Brenda", "Scott", "Pamela", "Brandon", "Nicole",
            "Benjamin", "Katherine", "Samuel", "Emma", "Gregory", "Samantha", "Frank", "Christine"
        ]
        
        self.last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
            "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
            "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
            "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
            "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
            "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
            "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
            "Collins", "Edwards", "Stewart", "Flores", "Morris", "Morales", "Murphy", "Cook",
            "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed",
            "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Brooks", "Gray", "James"
        ]
        
        # State-specific data
        self.states_data = {
            "CA": {"cities": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno"], "pattern": "F#######"},
            "TX": {"cities": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth"], "pattern": "#########"},
            "FL": {"cities": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"], "pattern": "A######B"},
            "NY": {"cities": ["New York", "Buffalo", "Rochester", "Yonkers", "Syracuse"], "pattern": "########"},
            "IL": {"cities": ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford"], "pattern": "A#########"},
            "PA": {"cities": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading"], "pattern": "##-###-###"},
            "OH": {"cities": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"], "pattern": "A######"},
            "GA": {"cities": ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah"], "pattern": "#########"},
            "MI": {"cities": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor"], "pattern": "A######"},
            "NC": {"cities": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem"], "pattern": "#########"},
            "WA": {"cities": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"], "pattern": "WDL######"},
            "NJ": {"cities": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison"], "pattern": "A##-##-###"},
            "MA": {"cities": ["Boston", "Worcester", "Springfield", "Lowell", "Cambridge"], "pattern": "S#########"},
            "AZ": {"cities": ["Phoenix", "Tucson", "Mesa", "Chandler", "Glendale"], "pattern": "A#######"},
            "VA": {"cities": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News"], "pattern": "A######"},
            "CO": {"cities": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood"], "pattern": "A#######"},
            "IN": {"cities": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel"], "pattern": "#########"},
            "MN": {"cities": ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington"], "pattern": "A######"},
            "TN": {"cities": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville"], "pattern": "#########"},
            "MO": {"cities": ["Kansas City", "Saint Louis", "Springfield", "Columbia", "Independence"], "pattern": "A##-##-###"}
        }
        
        self.streets = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine St", "Elm St", 
                       "Washington Ave", "Park Blvd", "Lake View", "Hill St", "River Rd"]
        
        self.eye_colors = ["BRO", "BLU", "GRN", "HAZ", "GRY"]
        self.hair_colors = ["BRO", "BLK", "BLN", "RED", "GRY"]
        self.license_classes = ["C", "D", "C", "C", "C", "M", "B"]  # Weighted toward Class C
        self.restrictions = ["NONE", "A", "B", "A,B", "NONE", "NONE", "F"]
        
    def generate_license_number(self, state):
        """Generate state-specific license number"""
        pattern = self.states_data[state]["pattern"]
        license_num = ""
        
        for char in pattern:
            if char == '#':
                license_num += str(random.randint(0, 9))
            elif char == 'A':
                license_num += random.choice('ABCDEFGHJKLMNPRSTUVWXYZ')
            elif char == 'B':
                license_num += random.choice('ABCDEFGHJKLMNPRSTUVWXYZ')
            elif char == 'F':
                license_num += 'F'
            elif char == 'S':
                license_num += 'S'
            elif char == 'W':
                license_num += 'WDL'
            else:
                license_num += char
                
        return license_num
    
    def generate_date(self, start_year, end_year):
        """Generate random date between years"""
        start = date(start_year, 1, 1)
        end = date(end_year, 12, 31)
        delta = (end - start).days
        random_days = random.randint(0, delta)
        return start + timedelta(days=random_days)
    
    def generate_entry(self, entry_id):
        """Generate a single license entry"""
        # Personal info
        first_name = random.choice(self.first_names)
        last_name = random.choice(self.last_names)
        middle = random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        
        # State and location
        state = random.choice(list(self.states_data.keys()))
        city = random.choice(self.states_data[state]["cities"])
        
        # Generate data
        dob = self.generate_date(1990, 2001)
        issue_date = self.generate_date(2018, 2023)
        expiration_date = issue_date.replace(year=issue_date.year + random.choice([4, 5, 6]))
        
        # Ensure expiration is in future
        if expiration_date < date.today():
            expiration_date = expiration_date.replace(year=expiration_date.year + 4)
        
        # Physical description
        height_feet = random.randint(5, 6)
        height_inches = random.randint(0, 11)
        height = f"{height_feet}'{height_inches}\""
        weight = random.randint(120, 250)
        
        # Address
        street_num = random.randint(100, 9999)
        street = f"{street_num} {random.choice(self.streets)}"
        zip_code = f"{random.randint(10000, 99999)}"
        
        # License details
        license_number = self.generate_license_number(state)
        license_class = random.choice(self.license_classes)
        restriction = random.choice(self.restrictions)
        organ_donor = random.choice(["YES", "NO", "YES", "YES"])  # Bias toward YES
        
        return [
            entry_id,
            first_name,
            last_name,
            middle,
            dob.strftime("%Y-%m-%d"),
            state,
            license_number,
            city,
            street,
            zip_code,
            height,
            weight,
            random.choice(self.eye_colors),
            random.choice(self.hair_colors),
            expiration_date.strftime("%Y-%m-%d"),
            f"CLASS {license_class}",
            restriction,
            organ_donor
        ]
    
    def generate_csv(self, count=1000, filename="driver_licenses_1000.csv"):
        """Generate CSV file with license entries"""
        headers = ["ID", "First Name", "Last Name", "Middle", "DOB", "State", 
                  "License Number", "City", "Street Address", "ZIP", "Height", 
                  "Weight", "Eye Color", "Hair Color", "Expiration", 
                  "License Class", "Restrictions", "Organ Donor"]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            for i in range(1, count + 1):
                entry = self.generate_entry(i)
                writer.writerow(entry)
                if i % 100 == 0:
                    print(f"Generated {i} entries...")
        
        print(f"\n✅ CSV file created: {filename}")
        print(f"📊 Total entries: {count}")
        return filename
    
    def upload_to_google_sheets(self, sheet_id, count=1000):
        """Generate entries and append to Google Sheets (without clearing existing data)"""
        print("🚀 Generating 1000 license entries...")
        
        # Prepare data (without headers - we'll append to existing data)
        data = []
        
        for i in range(1, count + 1):
            entry = self.generate_entry(i)
            data.append(entry)
            if i % 100 == 0:
                print(f"Generated {i} entries...")
        
        print(f"\n✅ Generated {count} license entries")
        print("📤 Uploading to Google Sheets...")
        
        # Connect to Google Sheets
        try:
            connector = GoogleSheetsConnector('credentials.json')
            
            if not connector.service:
                print("❌ Failed to connect to Google Sheets API")
                print("Check if credentials.json exists and is valid")
                return False
            
            # Get the next available row
            print("📊 Finding next available row...")
            result = connector.service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range='Sheet1!A:A'
            ).execute()
            
            values = result.get('values', [])
            next_row = len(values) + 1
            
            # Append new data
            print(f"📤 Appending new data starting at row {next_row}...")
            body = {
                'values': data
            }
            
            result = connector.service.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=f'Sheet1!A{next_row}',
                valueInputOption='RAW',
                body=body
            ).execute()
            
            print(f"✅ Successfully uploaded {result.get('updates', {}).get('updatedCells')} cells")
            print(f"📊 {count} new license entries appended to your Google Sheet")
            print(f"🔗 Sheet URL: https://docs.google.com/spreadsheets/d/{sheet_id}/edit")
            
            return True
            
        except Exception as e:
            print(f"❌ Error uploading to Google Sheets: {e}")
            print("\n💡 Try this instead:")
            print("1. Generate CSV file first")
            print("2. Manually import CSV to Google Sheets")
            print("3. Or check your Google Sheets API setup")
            return False
    
    def upload_from_csv(self, csv_file, sheet_id):
        """Upload existing CSV file to Google Sheets (append instead of replace)"""
        print(f"📂 Reading CSV file: {csv_file}")
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                data = list(reader)
            
            # Skip header row if present (assume first row is headers)
            data_to_append = data[1:] if len(data) > 1 else data
            print(f"📊 Found {len(data_to_append)} entries in CSV")
            
            # Connect to Google Sheets
            connector = GoogleSheetsConnector('credentials.json')
            
            if not connector.service:
                print("❌ Failed to connect to Google Sheets API")
                return False
            
            # Get the next available row
            print("📊 Finding next available row...")
            result = connector.service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range='Sheet1!A:A'
            ).execute()
            
            values = result.get('values', [])
            next_row = len(values) + 1
            
            # Append data
            print(f"📤 Appending data starting at row {next_row}...")
            body = {
                'values': data_to_append
            }
            
            result = connector.service.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=f'Sheet1!A{next_row}',
                valueInputOption='RAW',
                body=body
            ).execute()
            
            print(f"✅ Successfully uploaded {result.get('updates', {}).get('updatedCells')} cells")
            print(f"📊 {len(data_to_append)} license entries appended to your Google Sheet")
            
            return True
            
        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file}")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

def main():
    """Main function with menu options"""
    print("=" * 60)
    print("🚗 USA DRIVER'S LICENSE GENERATOR")
    print("Generate 1000 realistic entries for Google Sheets")
    print("=" * 60)
    
    # Get Sheet ID from environment or user input
    sheet_id = os.getenv('GOOGLE_SHEET_ID')
    
    if not sheet_id:
        print("\n⚠️  No Google Sheet ID found in .env file")
        sheet_id = input("Please enter your Google Sheet ID: ").strip()
    
    generator = LicenseGenerator()
    
    while True:
        print("\n📋 OPTIONS:")
        print("1. Generate 1000 entries & upload to Google Sheets")
        print("2. Generate CSV file only (save locally)")
        print("3. Upload existing CSV file to Google Sheets")
        print("4. Generate and save both CSV and upload")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == "1":
            print("\n" + "=" * 60)
            print("OPTION 1: Generate & Upload Directly")
            print("=" * 60)
            generator.upload_to_google_sheets(sheet_id, 1000)
            break
            
        elif choice == "2":
            print("\n" + "=" * 60)
            print("OPTION 2: Generate CSV File Only")
            print("=" * 60)
            filename = generator.generate_csv(1000)
            print(f"\n✅ CSV file saved: {filename}")
            print("💡 You can now manually import this to Google Sheets")
            break
            
        elif choice == "3":
            print("\n" + "=" * 60)
            print("OPTION 3: Upload Existing CSV")
            print("=" * 60)
            csv_file = input("Enter CSV filename (e.g., licenses.csv): ").strip()
            if not csv_file:
                csv_file = "driver_licenses_1000.csv"
            generator.upload_from_csv(csv_file, sheet_id)
            break
            
        elif choice == "4":
            print("\n" + "=" * 60)
            print("OPTION 4: Generate CSV & Upload")
            print("=" * 60)
            # Generate CSV
            filename = generator.generate_csv(1000)
            print(f"\n✅ CSV file saved: {filename}")
            
            # Ask to upload
            upload = input("\nUpload to Google Sheets now? (y/n): ").strip().lower()
            if upload == 'y':
                generator.upload_from_csv(filename, sheet_id)
            break
            
        elif choice == "5":
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    # First, make sure we have the required Google Sheets module
    try:
        from google_sheets import GoogleSheetsConnector
        main()
    except ImportError:
        print("❌ google_sheets.py not found!")
        print("\n💡 Make sure you have these files in the same folder:")
        print("   - google_sheets.py (from earlier instructions)")
        print("   - credentials.json (from Google Cloud Console)")
        print("   - .env file with GOOGLE_SHEET_ID")
        
        # Offer to create a minimal version
        create_minimal = input("\nCreate minimal google_sheets.py? (y/n): ").strip().lower()
        if create_minimal == 'y':
            create_minimal_google_sheets()
            print("\n✅ Created google_sheets.py")
            print("⚠️  You still need credentials.json from Google Cloud Console")
            print("   Run the script again after setting up credentials.json")