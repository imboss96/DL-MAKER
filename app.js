// Enhanced License Viewer with Google Sheets API integration
class LicenseViewer {
    constructor() {
        this.licenses = [];
        this.filteredLicenses = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.states = new Set();
        this.dataSource = 'Loading...';
        this.init();
    }

    async init() {
        // Show loading state
        this.showLoading();
        
        // Load data from API
        await this.loadDataFromAPI();
        this.setupFilters();
        this.setupSearch();
        this.setupRefreshButton();
        this.applyFilters();
    }

    async loadDataFromAPI() {
        try {
            const response = await fetch('/api/licenses');
            const data = await response.json();
            
            if (data.success) {
                this.licenses = data.licenses;
                this.dataSource = data.source === 'google_sheets' ? 'AMVA DATASOURCE' : 'Sample Data';
                
                // Extract unique states for filter
                this.licenses.forEach(license => {
                    if (license.state) {
                        this.states.add(license.state);
                    }
                });
                
                // Populate state filter dropdown
                const stateFilter = document.getElementById('stateFilter');
                const sortedStates = Array.from(this.states).sort();
                
                // Clear existing options except the first one
                while (stateFilter.options.length > 1) {
                    stateFilter.remove(1);
                }
                
                sortedStates.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state;
                    option.textContent = state;
                    stateFilter.appendChild(option);
                });
                
                this.updateDataSourceInfo(data.timestamp);
                
            } else {
                throw new Error(data.error || 'Failed to load data');
            }
            
        } catch (error) {
            this.showError(`Failed to load data: ${error.message}`);
            this.loadSampleData();
        }
    }

    showError(message) {
        const mainContent = document.getElementById('licensesContainer') || document.getElementById('main');
        if (mainContent) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
            mainContent.insertAdjacentElement('afterbegin', errorDiv);
        }
    }

    loadSampleData() {
        this.licenses = [
            {
                id: 1,
                firstName: 'Amy',
                lastName: 'Hill',
                state: 'GA',
                licenseNumber: '373072006',
                city: 'Savannah',
                dateOfBirth: '1997-05-07',
                expiration: '2028-12-18',
                middleInitial: 'Q',
                licenseClass: 'C',
                street: '1175 Maple Dr',
                zipCode: '64081',
                eyeColor: 'GRN',
                hairColor: 'BRO',
                height: '505',
                weight: '140',
                restrictions: 'NON',
                endorsements: 'NON',
                organDonor: true,
                sex: '1',
                issueDate: '2023-01-01',
                county: ''
            }
        ];
        this.dataSource = 'Sample Data';
        this.renderLicenses();
    }

    updateDataSourceInfo(timestamp) {
        const sourceElement = document.getElementById('dataSourceInfo');
        if (sourceElement) {
            const time = timestamp ? new Date(timestamp).toLocaleTimeString() : 'Unknown';
            sourceElement.innerHTML = `
                <i class="fas fa-database me-1"></i>
                Source: ${this.dataSource} | Updated: ${time}
            `;
        }
    }

    setupFilters() {
        const stateFilter = document.getElementById('stateFilter');
        const statusFilter = document.getElementById('statusFilter');
        const pageSize = document.getElementById('pageSize');
        const resetBtn = document.getElementById('resetFilters');

        stateFilter.addEventListener('change', () => this.applyFilters());
        statusFilter.addEventListener('change', () => this.applyFilters());
        pageSize.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderLicenses();
        });
        resetBtn.addEventListener('click', () => this.resetFilters());
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        searchBtn.addEventListener('click', () => this.applyFilters());
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
                
                try {
                    const response = await fetch('/api/refresh');
                    const data = await response.json();
                    
                    if (data.success) {
                        await this.loadDataFromAPI();
                        this.applyFilters();
                        alert(`✅ Data refreshed! ${data.message}`);
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    alert(`❌ Failed to refresh data: ${error.message}`);
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh Data';
                }
            });
        }
    }

    async getStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.success) {
                return data.stats;
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
        return null;
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedState = document.getElementById('stateFilter').value;
        const selectedStatus = document.getElementById('statusFilter').value;

        this.filteredLicenses = this.licenses.filter(license => {
            // Search filter
            const searchMatch = !searchTerm || 
                (license.firstName && license.firstName.toLowerCase().includes(searchTerm)) ||
                (license.lastName && license.lastName.toLowerCase().includes(searchTerm)) ||
                (license.licenseNumber && license.licenseNumber.toLowerCase().includes(searchTerm)) ||
                ((license.firstName + ' ' + license.lastName).toLowerCase().includes(searchTerm));

            // State filter
            const stateMatch = !selectedState || license.state === selectedState;

            // Status filter
            let statusMatch = true;
            if (selectedStatus && license.expiration) {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Handle YYYY-MM-DD format
                    const expDate = new Date(license.expiration + 'T00:00:00');
                    
                    if (!isNaN(expDate.getTime())) {
                        const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
                        
                        if (selectedStatus === 'valid') {
                            statusMatch = daysUntilExpiry > 30;
                        } else if (selectedStatus === 'expiring') {
                            statusMatch = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                        } else if (selectedStatus === 'expired') {
                            statusMatch = daysUntilExpiry < 0;
                        }
                    } else {
                        statusMatch = true;
                    }
                } catch (e) {
                    statusMatch = true;
                }
            }

            return searchMatch && stateMatch && statusMatch;
        });

        this.currentPage = 1;
        this.renderLicenses();
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('stateFilter').value = '';
        document.getElementById('statusFilter').value = '';
        this.applyFilters();
    }

    renderLicenses() {
        const grid = document.getElementById('licenseGrid');
        const resultCount = document.getElementById('resultCount');
        const pageInfo = document.getElementById('pageInfo');
        
        // Calculate pagination
        const totalLicenses = this.filteredLicenses.length;
        const totalPages = Math.ceil(totalLicenses / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, totalLicenses);
        const pageLicenses = this.filteredLicenses.slice(startIndex, endIndex);

        // Update info
        if (resultCount) resultCount.textContent = totalLicenses;
        if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

        // Clear grid
        grid.innerHTML = '';

        if (pageLicenses.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-search fa-3x text-muted mb-3"></i>
                            <h4 class="text-muted">No licenses found</h4>
                            <p class="text-muted">Try adjusting your filters or search terms</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Render license cards
            pageLicenses.forEach(license => {
                const card = this.createLicenseCard(license);
                grid.appendChild(card);
            });
        }

        // Render pagination
        this.renderPagination(totalPages);
    }

    createLicenseCard(license) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        // Calculate expiry status
        const today = new Date();
        const expDate = new Date(license.expiration);
        const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        
        let expiryClass, expiryText;
        if (daysUntilExpiry < 0) {
            expiryClass = 'expiry-expired';
            expiryText = 'EXPIRED';
        } else if (daysUntilExpiry <= 30) {
            expiryClass = 'expiry-soon';
            expiryText = 'EXPIRES SOON';
        } else {
            expiryClass = 'expiry-valid';
            expiryText = 'VALID';
        }

        const fullName = `${license.firstName} ${license.middleInitial ? license.middleInitial + '.' : ''} ${license.lastName}`.trim();
        const address = `${license.street}, ${license.city}, ${license.state} ${license.zipCode}`;
        const aamvaData = this.generateAAMVA(license);

        col.innerHTML = `
            <div class="card card-license h-100">
                <div class="license-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="state-badge bg-primary text-white">${license.state}</span>
                            <span class="badge ${expiryClass} expiry-badge ms-2">${expiryText}</span>
                        </div>
                        <small class="text-muted">#${license.id}</small>
                    </div>
                    <h5 class="mt-2 mb-0">${fullName}</h5>
                </div>
                <div class="card-body">
                    <div class="info-row d-flex">
                        <span class="info-label flex-grow-1">License #:</span>
                        <span class="info-value font-monospace">${license.licenseNumber}</span>
                    </div>
                    <div class="info-row d-flex">
                        <span class="info-label flex-grow-1">DOB:</span>
                        <span class="info-value">${license.dateOfBirth}</span>
                    </div>
                    <div class="info-row d-flex">
                        <span class="info-label flex-grow-1">Expires:</span>
                        <span class="info-value">${license.expiration}</span>
                    </div>
                    <div class="info-row d-flex">
                        <span class="info-label flex-grow-1">Address:</span>
                        <span class="info-value text-truncate" title="${address}">${license.city}, ${license.state}</span>
                    </div>
                    <div class="info-row d-flex">
                        <span class="info-label flex-grow-1">Class:</span>
                        <span class="info-value">${license.licenseClass}</span>
                    </div>
                    <div class="row mt-3">
                        <div class="col-6">
                            <div class="qr-code-container text-center">
                                <div class="qr-code" id="qr-${license.id}"></div>
                                <small class="text-muted d-block mt-1">Scan ID</small>
                            </div>
                        </div>
                        <div class="col-6 d-flex flex-column justify-content-between">
                            <div class="mb-2">
                                <span class="badge ${license.organDonor ? 'bg-success' : 'bg-secondary'}">
                                    <i class="fas fa-heart me-1"></i>
                                    ${license.organDonor ? 'Organ Donor' : 'Not a Donor'}
                                </span>
                            </div>
                            <div class="mt-auto">
                                <button class="btn btn-sm btn-outline-primary w-100 view-details" 
                                        data-id="${license.id}">
                                    <i class="fas fa-eye me-1"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Generate QR code
        setTimeout(() => {
            this.generateQRCode(`qr-${license.id}`, aamvaData);
        }, 100);

        // Add event listener for details button
        col.querySelector('.view-details').addEventListener('click', () => {
            this.showLicenseDetails(license);
        });

        return col;
    }

    generateQRCode(elementId, data) {
        try {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            // Clear previous QR code if exists
            element.innerHTML = '';
            
            // Use QR Server API to generate QR code
            const encodedData = encodeURIComponent(data);
            const img = document.createElement('img');
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedData}`;
            img.alt = 'QR Code';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            element.appendChild(img);
        } catch (error) {
            // Silently fail if QR code generation fails
        }
    }

    generateAAMVA(license) {
        // Helper function to format strings for AAMVA with correct padding
        const formatField = (value, maxLength, padChar = ' ') => {
            if (!value) return ''.padEnd(maxLength, padChar);
            const str = value.toString().toUpperCase();
            // For names and addresses, left-justify with spaces on right
            return str.padEnd(maxLength, padChar).substring(0, maxLength);
        };
        
        // Format dates to YYYYMMDD
        const formatDate = (dateStr) => {
            if (!dateStr) return '19000101';
            return dateStr.replace(/-/g, '');
        };
        
        // Format height - ensure it's exactly 3 digits
        const formatHeight = (heightStr) => {
            if (!heightStr) return '511';
            
            // Handle height in different formats
            let inches = 0;
            
            if (typeof heightStr === 'string') {
                // Remove any non-numeric characters except dash
                const cleanHeight = heightStr.replace(/[^\d-]/g, '');
                
                if (cleanHeight.includes('-')) {
                    // Format: "5-11"
                    const parts = cleanHeight.split('-');
                    if (parts.length >= 2) {
                        inches = (parseInt(parts[0]) * 12) + parseInt(parts[1]);
                    }
                } else if (cleanHeight.length === 3) {
                    // Format: "511"
                    const feet = parseInt(cleanHeight.charAt(0));
                    const inch = parseInt(cleanHeight.substring(1));
                    inches = (feet * 12) + inch;
                } else {
                    // Try to parse as inches directly
                    inches = parseInt(cleanHeight) || 70;
                }
            } else {
                // Assume it's already in inches
                inches = parseInt(heightStr) || 70;
            }
            
            // Ensure valid range (48-96 inches typical)
            inches = Math.max(48, Math.min(96, inches));
            return inches.toString().padStart(3, '0');
        };
        
        // Generate document discriminator (12+ characters, unique to card)
        const docDiscriminator = license.documentDiscriminator || 
            (license.licenseNumber || '').substring(0, 9) + 
            (license.state || 'XX') + 
            formatDate(license.dateOfBirth).substring(2); // Use YYMMDD format
        
        // Get values from license or use defaults
        const lastName = license.lastName || '';
        const firstName = license.firstName || '';
        const middleInitial = license.middleInitial || '';
        const street = license.street || '';
        const city = license.city || '';
        const eyeColor = license.eyeColor || 'UNK';
        const hairColor = license.hairColor || 'UNK';
        const weight = license.weight || '140';
        const licenseClass = license.licenseClass || 'C';
        const restrictions = license.restrictions || 'NON';
        const endorsements = license.endorsements || 'NON';
        const county = license.county || '';
        
        // ANSI 636 AAMVA standard format (Version 09.00)
        const aamvaLines = [
            '@',  // Start sentinel
            'ANSIBIN',  // Binary indicator
            'AAMVA6360090101',  // AAMVA version 09.00
            '',  // Empty line for spacing
            'DLDCAG01',  // Jurisdiction version number
            'DCB',  // Optional field indicator
            'DCS' + formatField(lastName, 40),  // Last Name (40 chars max)
            'DAC' + formatField(firstName, 40),  // First Name
            'DAD' + formatField(middleInitial, 4),  // Middle Initial/Name
            'DBD' + formatDate(license.issueDate || '20230101'),  // Issue Date (YYYYMMDD)
            'DBB' + formatDate(license.dateOfBirth),  // Date of Birth
            'DBC' + (license.sex || '1'),  // Sex (1=Male, 2=Female, 9=Not specified)
            'DBA' + formatDate(license.expiration),  // Expiration Date
            'DAU' + formatHeight(license.height),  // Height in inches (e.g., 505 = 5'05")
            'DAY' + formatField(eyeColor, 3),  // Eye Color (BRN, BLU, GRN, HAZ, etc.)
            'DAZ' + formatField(hairColor, 3),  // Hair Color
            'DAG' + formatField(street, 40),  // Street Address
            'DAI' + formatField(city, 40),  // City
            'DAJ' + formatField(license.state, 2),  // State
            'DAK' + formatField(license.zipCode, 9),  // ZIP Code (5 or 9 digits)
            'DAQ' + formatField(license.licenseNumber, 20),  // License Number
            'DCF' + formatField(docDiscriminator, 12),  // Document Discriminator
            'DCGUSA',  // Country
            'DDE' + formatField(endorsements, 3),  // Endorsements
            'DDF' + formatField(restrictions, 3),  // Restrictions
            'DDG' + formatField(licenseClass, 2),  // Vehicle Class
            'DAW' + formatField(weight, 3),  // Weight in pounds
            'DDA' + (license.organDonor ? 'Y' : 'N'),  // Organ Donor Indicator
            'DDB' + 'Y',  // Veteran Indicator (Y/N)
            'DDK' + formatField(county, 40),  // County
            'DCH' + '111111111'  // Audit information
        ];
        
        // Join with newlines, removing empty lines
        return aamvaLines.filter(line => line !== '').join('\n');
    }

    renderPagination(totalPages) {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderLicenses();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        pagination.appendChild(prevLi);

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageLi.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentPage = i;
                this.renderLicenses();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            pagination.appendChild(pageLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderLicenses();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        pagination.appendChild(nextLi);
    }

    showLicenseDetails(license) {
        const modalBody = document.getElementById('modalBody');
        
        // Calculate age
        const dob = new Date(license.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        
        // Calculate expiry status
        const expDate = new Date(license.expiration);
        const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        
        let expiryStatus;
        if (daysUntilExpiry < 0) {
            expiryStatus = '<span class="badge bg-danger">Expired</span>';
        } else if (daysUntilExpiry <= 30) {
            expiryStatus = `<span class="badge bg-warning text-dark">Expires in ${daysUntilExpiry} days</span>`;
        } else {
            expiryStatus = '<span class="badge bg-success">Valid</span>';
        }

        // Generate AAMVA data for display
        const aamvaData = this.generateAAMVA(license);

        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <h4 class="card-title mb-4">
                                ${license.firstName} ${license.middleInitial ? license.middleInitial + '.' : ''} ${license.lastName}
                                <span class="badge bg-primary float-end">${license.state}</span>
                            </h4>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-muted">License Number</label>
                                        <div class="fs-5 font-monospace">${license.licenseNumber}</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Date of Birth</label>
                                        <div class="fs-5">${license.dateOfBirth} (Age: ${age})</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">License Class</label>
                                        <div class="fs-5">Class ${license.licenseClass}</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Restrictions</label>
                                        <div class="fs-5">${license.restrictions}</div>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Expiration Date</label>
                                        <div class="fs-5">${license.expiration} ${expiryStatus}</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Physical Description</label>
                                        <div class="fs-5">${this.formatHeightForDisplay(license.height)}, ${license.weight} lbs</div>
                                        <div class="text-muted">Eyes: ${license.eyeColor}, Hair: ${license.hairColor}</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Organ Donor</label>
                                        <div class="fs-5">
                                            <span class="badge ${license.organDonor ? 'bg-success' : 'bg-secondary'}">
                                                ${license.organDonor ? 'YES' : 'NO'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label text-muted">Issue Date</label>
                                        <div class="fs-5">${license.issueDate || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-4">
                                <label class="form-label text-muted">Address</label>
                                <div class="fs-5">
                                    ${license.street}<br>
                                    ${license.city}, ${license.state} ${license.zipCode}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5 class="card-title">Scan Code</h5>
                            <div class="qr-code mx-auto" id="modal-qr"></div>
                            <p class="text-muted mt-3 small">
                                Scan this QR code to view license data on mobile devices
                            </p>
                            
                            <div class="mt-4">
                                <button class="btn btn-outline-primary w-100 mb-2" id="copyAAMVA">
                                    <i class="fas fa-copy me-2"></i>Copy AAMVA Data
                                </button>
                                <button class="btn btn-outline-secondary w-100" id="generateBarcode">
                                    <i class="fas fa-barcode me-2"></i>Generate PDF417
                                </button>
                            </div>
                            
                            <div class="mt-3" id="barcodeContainer" style="display:none;">
                                <div class="text-center p-3 border rounded bg-light">
                                    <img id="pdf417Image" src="" alt="PDF417 Barcode" style="max-width: 100%; height: auto;">
                                    <p class="text-muted small mt-2 mb-0">PDF417 Barcode (temporary - refreshes on page reload)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <div class="card-body">
                    <h6 class="card-title">AAMVA Data (for barcode generation)</h6>
                    <pre class="bg-light p-3 rounded" style="font-size: 0.8rem; max-height: 300px; overflow-y: auto;" id="aamvaData">${aamvaData}</pre>
                    <p class="text-muted small mb-0">
                        <i class="fas fa-info-circle me-1"></i>This is the standardized AAMVA format used in PDF417 barcodes on US driver's licenses
                    </p>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-body">
                    <h6 class="card-title mb-3">
                        <i class="fas fa-barcode me-2"></i>Generate 1D Barcode
                    </h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Barcode Format</label>
                            <select class="form-select form-select-sm" id="modal-barcode-format">
                                <option value="code128" selected>Code128</option>
                                <option value="code39">Code39</option>
                                <option value="ean13">EAN-13</option>
                                <option value="upca">UPC-A</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Data</label>
                            <input type="text" class="form-control form-control-sm" id="modal-barcode-data" 
                                   value="${license.licenseNumber}" placeholder="Enter barcode data">
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary w-100 mt-3" id="modal-generate-1d-btn">
                        <i class="fas fa-cog me-2"></i>Generate 1D Barcode
                    </button>
                    
                    <div id="modal-barcode1d-result" style="display: none;" class="mt-3">
                        <div class="text-center p-3 border rounded bg-light">
                            <p class="text-muted small mb-2"><strong id="modal-barcode1d-type">Code128</strong> Barcode:</p>
                            <img id="modal-barcode1d-image" src="" alt="1D Barcode" style="max-width: 100%; max-height: 120px;">
                            <p class="text-muted small mt-2 mb-0">
                                <code id="modal-barcode1d-data"></code>
                            </p>
                        </div>
                    </div>
                    
                    <div id="modal-barcode1d-error" style="display: none;" class="mt-3">
                        <div class="alert alert-danger alert-sm p-2 mb-0">
                            <small><i class="fas fa-exclamation-circle me-1"></i><span id="modal-barcode1d-error-msg"></span></small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Generate QR code for modal
        setTimeout(() => {
            this.generateQRCode('modal-qr', aamvaData);
        }, 100);

        // Add event listeners for modal buttons
        document.getElementById('copyAAMVA').addEventListener('click', () => {
            const aamvaText = document.getElementById('aamvaData').textContent;
            navigator.clipboard.writeText(aamvaText).then(() => {
                const toast = new bootstrap.Toast(document.getElementById('copyToast'));
                toast.show();
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard. Please try again.');
            });
        });

        document.getElementById('generateBarcode').addEventListener('click', () => {
            const aamvaText = document.getElementById('aamvaData').textContent.trim();
            const barcodeContainer = document.getElementById('barcodeContainer');
            const barcodeImg = document.getElementById('pdf417Image');
            
            // Show loading state
            barcodeContainer.style.display = 'block';
            barcodeImg.src = '';
            barcodeImg.alt = 'Generating barcode...';
            
            // Remove newlines and join for barcode encoding
            const compactData = aamvaText.replace(/\n/g, '');
            const encodedData = encodeURIComponent(compactData);
            
            // Call server API to generate barcode
            fetch(`/api/pdf417?data=${encodedData}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        barcodeImg.src = data.barcode;
                        barcodeImg.alt = 'PDF417 Barcode';
                    } else {
                        barcodeContainer.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle me-2"></i>' + (data.error || 'Failed to generate barcode') + '</p>';
                    }
                })
                .catch(error => {
                    barcodeContainer.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle me-2"></i>Error: ' + error.message + '</p>';
                });
        });

        // 1D Barcode generation in modal
        const generate1DBtn = document.getElementById('modal-generate-1d-btn');
        if (generate1DBtn) {
            generate1DBtn.addEventListener('click', async () => {
                const format = document.getElementById('modal-barcode-format').value;
                const data = document.getElementById('modal-barcode-data').value.trim();
                const resultDiv = document.getElementById('modal-barcode1d-result');
                const errorDiv = document.getElementById('modal-barcode1d-error');
                
                if (!data) {
                    alert('Please enter barcode data');
                    return;
                }
                
                if (data.length > 100) {
                    alert('Data is too long (max 100 characters)');
                    return;
                }
                
                resultDiv.style.display = 'none';
                errorDiv.style.display = 'none';
                generate1DBtn.disabled = true;
                generate1DBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
                
                try {
                    const encodedData = encodeURIComponent(data);
                    const response = await fetch(`/api/barcode1d?format=${format}&data=${encodedData}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        document.getElementById('modal-barcode1d-image').src = result.barcode;
                        document.getElementById('modal-barcode1d-type').textContent = result.type.toUpperCase();
                        document.getElementById('modal-barcode1d-data').textContent = result.data;
                        resultDiv.style.display = 'block';
                    } else {
                        throw new Error(result.error || 'Failed to generate barcode');
                    }
                } catch (error) {
                    errorDiv.style.display = 'block';
                    document.getElementById('modal-barcode1d-error-msg').textContent = error.message;
                } finally {
                    generate1DBtn.disabled = false;
                    generate1DBtn.innerHTML = '<i class="fas fa-cog me-2"></i>Generate 1D Barcode';
                }
            });
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('licenseModal'));
        modal.show();
    }

    formatHeightForDisplay(heightStr) {
        if (!heightStr) return "5'11\"";
        
        const inches = parseInt(heightStr);
        if (isNaN(inches)) return heightStr;
        
        const feet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return `${feet}'${remainingInches.toString().padStart(2, '0')}"`;
    }

    showLoading() {
        const grid = document.getElementById('licenseGrid');
        grid.innerHTML = `
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-body text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <h4 class="mt-3">Loading Driver's License Data...</h4>
                        <p class="text-muted">Connecting to DIY DATABASE...</p>
                    </div>
                </div>
            </div>
        `;
    }

    showError(message) {
        const grid = document.getElementById('licenseGrid');
        grid.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Error:</strong> ${message}
                    <br>
                    <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">
                        <i class="fas fa-redo me-1"></i>Retry
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize the viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.licenseViewer = new LicenseViewer();
});

// Global helper functions
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show toast notification if available
        const toast = new bootstrap.Toast(document.getElementById('copyToast'));
        toast.show();
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        document.getElementById('searchInput').value = '';
        if (window.licenseViewer) {
            window.licenseViewer.applyFilters();
        }
    }
});

// 1D Barcode Generation
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBarcode1DBtn');
    const clearBtn = document.getElementById('clearBarcode1D');
    const formatSelect = document.getElementById('barcodeFormat');
    const dataInput = document.getElementById('barcodeData');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            const format = formatSelect.value;
            const data = dataInput.value.trim();
            
            if (!data) {
                alert('Please enter barcode data');
                return;
            }
            
            if (data.length > 100) {
                alert('Data is too long (max 100 characters)');
                return;
            }
            
            // Hide previous results
            document.getElementById('barcode1DResult').style.display = 'none';
            document.getElementById('barcode1DError').style.display = 'none';
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
            
            try {
                const encodedData = encodeURIComponent(data);
                const response = await fetch(`/api/barcode1d?format=${format}&data=${encodedData}`);
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('barcode1DImage').src = result.barcode;
                    document.getElementById('barcode1DType').textContent = result.type.toUpperCase();
                    document.getElementById('barcode1DDataDisplay').textContent = result.data;
                    document.getElementById('barcode1DResult').style.display = 'block';
                    
                    // Store current barcode for download
                    window.currentBarcode1D = result.barcode;
                    window.currentBarcode1DFormat = result.type;
                } else {
                    throw new Error(result.error || 'Failed to generate barcode');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('barcode1DErrorMessage').textContent = error.message;
                document.getElementById('barcode1DError').style.display = 'block';
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-cog me-2"></i>Generate 1D Barcode';
            }
        });
        
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                dataInput.value = 'DL12345678';
                document.getElementById('barcode1DResult').style.display = 'none';
                document.getElementById('barcode1DError').style.display = 'none';
            });
        }
        
        // Download barcode button
        const downloadBtn = document.getElementById('download1DBarcode');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                if (!window.currentBarcode1D) {
                    alert('No barcode to download. Generate one first.');
                    return;
                }
                
                // Create download link
                const link = document.createElement('a');
                link.href = window.currentBarcode1D;
                link.download = `barcode-${window.currentBarcode1DFormat}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    }
});

// PDF417 Barcode Generation
document.addEventListener('DOMContentLoaded', () => {
    const generateBarcodesBtn = document.getElementById('generateBarcodesBtn');
    const viewBarcodesBtn = document.getElementById('viewBarcodesBtn');
    const barcodeCountInput = document.getElementById('barcodeCount');
    
    if (generateBarcodesBtn) {
        generateBarcodesBtn.addEventListener('click', async function() {
            const count = parseInt(barcodeCountInput.value) || 10;
            
            if (count < 1 || count > 1000) {
                alert('Please enter a number between 1 and 1000');
                return;
            }
            
            // Show progress
            document.getElementById('barcodeProgress').style.display = 'block';
            document.getElementById('barcodeResult').style.display = 'none';
            document.getElementById('barcodeError').style.display = 'none';
            generateBarcodesBtn.disabled = true;
            
            try {
                const response = await fetch('/api/generate-barcodes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ count: count })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    document.getElementById('progressMessage').textContent = `Successfully generated ${data.count} barcodes!`;
                    document.getElementById('progressBar').style.width = '100%';
                    document.getElementById('progressText').textContent = '100%';
                    
                    document.getElementById('barcodeProgress').style.display = 'none';
                    document.getElementById('barcodeResult').style.display = 'block';
                    document.getElementById('resultCount').textContent = data.count;
                    document.getElementById('resultPath').textContent = data.output_dir + '/';
                    viewBarcodesBtn.style.display = 'inline-block';
                } else {
                    throw new Error(data.error || 'Failed to generate barcodes');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('barcodeProgress').style.display = 'none';
                document.getElementById('barcodeError').style.display = 'block';
                document.getElementById('errorMessage').textContent = error.message;
            } finally {
                generateBarcodesBtn.disabled = false;
            }
        });
        
        if (viewBarcodesBtn) {
            viewBarcodesBtn.addEventListener('click', function() {
                // On Windows, open the file explorer
                if (navigator.platform.indexOf('Win') > -1) {
                    fetch('/open-folder?path=pdf417_barcodes').catch(() => {
                        alert('Open the pdf417_barcodes folder in your file explorer to view the generated barcodes.');
                    });
                } else {
                    alert('Generated barcodes are saved in the pdf417_barcodes folder.');
                }
            });
        }
    }
});