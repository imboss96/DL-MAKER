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
                firstName: 'James',
                lastName: 'Wilson',
                state: 'CA',
                licenseNumber: 'F8723945',
                city: 'Los Angeles'
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

        const fullName = `${license.firstName} ${license.middleInitial}. ${license.lastName}`;
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
        const dobFormatted = license.dateOfBirth ? license.dateOfBirth.replace(/-/g, '') : '';
        const expFormatted = license.expiration ? license.expiration.replace(/-/g, '') : '';
        
        const lines = [
            "@",
            "ANSI 636008080002DL00410287ZA03290015DL",
            `DAA${(license.lastName || '').toUpperCase()}`,
            `DAC${(license.firstName || '').toUpperCase()}`,
            `DAD${(license.middleInitial || '').toUpperCase()}`,
            `DAG${(license.street || '').toUpperCase()}`,
            `DAI${(license.city || '').toUpperCase()}`,
            `DAJ${(license.state || '').toUpperCase()}`,
            `DAK${license.zipCode || ''}`,
            `DAQ${license.licenseNumber || ''}`,
            `DBA${expFormatted}`,
            `DBB${dobFormatted}`,
            "DBC1",
            `DAY${license.eyeColor || ''}`,
            `DAZ${license.hairColor || ''}`,
            `DCF${license.licenseClass || ''}`,
            `DCH${license.restrictions || 'NONE'}`,
            `DCQ${license.organDonor ? 'Y' : 'N'}`
        ];
        
        return lines.filter(line => line.length > 1).join('\n');
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

        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <h4 class="card-title mb-4">
                                ${license.firstName} ${license.middleInitial}. ${license.lastName}
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
                                        <div class="fs-5">${license.height}, ${license.weight} lbs</div>
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
                    <pre class="bg-light p-3 rounded" style="font-size: 0.8rem;" id="aamvaData">${this.generateAAMVA(license)}</pre>
                </div>
            </div>
        `;

        // Generate QR code for modal
        setTimeout(() => {
            this.generateQRCode('modal-qr', this.generateAAMVA(license));
        }, 100);

        // Add event listeners for modal buttons
        document.getElementById('copyAAMVA').addEventListener('click', () => {
            const aamvaText = document.getElementById('aamvaData').textContent;
            navigator.clipboard.writeText(aamvaText).then(() => {
                alert('AAMVA data copied to clipboard!');
            });
        });

        document.getElementById('generateBarcode').addEventListener('click', () => {
            const aamvaText = document.getElementById('aamvaData').textContent;
            const barcodeContainer = document.getElementById('barcodeContainer');
            const barcodeImg = document.getElementById('pdf417Image');
            
            // Show loading state
            barcodeContainer.style.display = 'block';
            barcodeImg.src = '';
            barcodeImg.alt = 'Generating barcode...';
            
            // Call server API to generate barcode
            const encodedData = encodeURIComponent(aamvaText);
            fetch(`/api/pdf417?data=${encodedData}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        barcodeImg.src = data.barcode;
                        barcodeImg.alt = 'PDF417 Barcode';
                    } else {
                        barcodeImg.alt = 'Failed to generate barcode: ' + (data.error || 'Unknown error');
                        barcodeContainer.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle me-2"></i>' + (data.error || 'Failed to generate barcode') + '</p>';
                    }
                })
                .catch(error => {
                    barcodeImg.alt = 'Error: ' + error.message;
                    barcodeContainer.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle me-2"></i>Error: ' + error.message + '</p>';
                });
        });

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('licenseModal'));
        modal.show();
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
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
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